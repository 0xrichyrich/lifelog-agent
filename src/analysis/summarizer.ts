/**
 * Daily Summary Generator
 * Creates human-readable summaries and stores in SQLite + markdown
 */

import fs from 'fs';
import path from 'path';
import { format, parseISO, subDays } from 'date-fns';
import {
  Config,
  DailySummaryContent,
  ActivityCategory,
} from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { Analyzer } from './analyzer.js';
import { PatternDetector } from './patterns.js';

export class Summarizer {
  private config: Config;
  private db: LifeLogDatabase;
  private analyzer: Analyzer;
  private patterns: PatternDetector;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.analyzer = new Analyzer(config, db);
    this.patterns = new PatternDetector(config, db);
  }

  /**
   * Generate a daily summary for the given date
   */
  async generateSummary(date: string): Promise<DailySummaryContent> {
    console.log(`📝 Generating summary for ${date}...`);

    // First, ensure analysis is complete
    await this.analyzer.analyzeDate(date);

    // Get patterns for the day
    const dailyPatterns = await this.patterns.detectDailyPatterns(date);

    // Get check-ins
    const checkIns = this.db.getCheckInsByDate(date);
    const checkInMessages = checkIns.map(c => `[${format(parseISO(c.timestamp), 'HH:mm')}] ${c.message}`);

    // Generate insights
    const insights = this.generateInsights(dailyPatterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(dailyPatterns);

    // Get comparison to previous day
    const previousDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
    const comparison = await this.patterns.compareDays(date, previousDate);

    // Build summary content
    const summary: DailySummaryContent = {
      date,
      generatedAt: new Date().toISOString(),
      
      totalTrackedMinutes: dailyPatterns.timeBlocks.reduce((sum, b) => sum + b.durationMinutes, 0),
      categoryBreakdown: dailyPatterns.categoryBreakdown,
      
      focusScore: dailyPatterns.focusScore,
      deepWorkSessions: dailyPatterns.deepWorkSessions,
      deepWorkMinutes: dailyPatterns.deepWorkMinutes,
      contextSwitches: dailyPatterns.contextSwitches,
      
      peakProductivityHours: dailyPatterns.peakProductivityHours,
      insights,
      recommendations,
      
      comparison: comparison.productivityChange !== 'N/A' ? comparison : undefined,
      
      checkIns: checkInMessages,
    };

    // Save to SQLite
    this.db.upsertSummary({
      date,
      content_json: JSON.stringify(summary),
    });

    // Save to markdown file
    await this.writeMarkdownSummary(summary);

    console.log(`✅ Summary generated for ${date}`);
    return summary;
  }

  /**
   * Generate insights from daily patterns
   */
  private generateInsights(patterns: ReturnType<PatternDetector['detectDailyPatterns']> extends Promise<infer T> ? T : never): string[] {
    const insights: string[] = [];

    // Peak productivity
    if (patterns.peakProductivityHours.length > 0) {
      insights.push(`Most productive hours: ${patterns.peakProductivityHours.join(', ')}`);
    }

    // Deep work
    if (patterns.deepWorkSessions > 0) {
      const avgSessionLength = Math.round(patterns.deepWorkMinutes / patterns.deepWorkSessions);
      insights.push(`${patterns.deepWorkSessions} deep work session(s), averaging ${avgSessionLength} min each`);
    } else {
      insights.push('No deep work sessions detected (30+ min focused blocks)');
    }

    // Category breakdown insights
    const totalMinutes = Object.values(patterns.categoryBreakdown).reduce((a, b) => a + b, 0);
    if (totalMinutes > 0) {
      const codingPct = Math.round((patterns.categoryBreakdown.coding / totalMinutes) * 100);
      const meetingPct = Math.round((patterns.categoryBreakdown.meetings / totalMinutes) * 100);
      const socialPct = Math.round((patterns.categoryBreakdown.social / totalMinutes) * 100);

      if (codingPct >= 40) {
        insights.push(`Strong coding day: ${codingPct}% of tracked time`);
      }
      if (meetingPct >= 30) {
        insights.push(`Meeting-heavy day: ${meetingPct}% of tracked time`);
      }
      if (socialPct >= 20) {
        insights.push(`High social media usage: ${socialPct}% of tracked time`);
      }
    }

    // Context switching
    if (patterns.contextSwitches > 10) {
      insights.push(`High context switching: ${patterns.contextSwitches} switches detected`);
    } else if (patterns.contextSwitches <= 5 && patterns.timeBlocks.length > 5) {
      insights.push(`Good focus: Only ${patterns.contextSwitches} context switches`);
    }

    // Focus score interpretation
    if (patterns.focusScore >= 75) {
      insights.push(`Excellent focus score: ${patterns.focusScore}/100`);
    } else if (patterns.focusScore >= 60) {
      insights.push(`Good focus score: ${patterns.focusScore}/100`);
    } else if (patterns.focusScore < 50) {
      insights.push(`Low focus score: ${patterns.focusScore}/100 — consider reducing distractions`);
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(patterns: ReturnType<PatternDetector['detectDailyPatterns']> extends Promise<infer T> ? T : never): string[] {
    const recommendations: string[] = [];
    const totalMinutes = Object.values(patterns.categoryBreakdown).reduce((a, b) => a + b, 0);

    // Deep work recommendations
    if (patterns.deepWorkSessions === 0) {
      recommendations.push('Try blocking 90 minutes tomorrow for uninterrupted deep work');
    }

    // Social media recommendations
    const socialMinutes = patterns.categoryBreakdown.social;
    if (socialMinutes > 60) {
      recommendations.push(`Reduce social media time (${socialMinutes}min today). Try app blockers during focus hours.`);
    }

    // Context switching recommendations
    if (patterns.contextSwitches > 15) {
      recommendations.push('Batch similar tasks together to reduce context switching');
    }

    // Break recommendations
    const breakMinutes = patterns.categoryBreakdown.breaks;
    const workMinutes = totalMinutes - breakMinutes;
    if (workMinutes > 240 && breakMinutes < 30) {
      recommendations.push('Remember to take breaks! 5-10 min every hour helps maintain focus.');
    }

    // Peak hour recommendations
    if (patterns.peakProductivityHours.length > 0) {
      const peakHour = patterns.peakProductivityHours[0];
      recommendations.push(`Schedule your hardest tasks during ${peakHour} when you're most productive`);
    }

    // Meeting balance
    const meetingMinutes = patterns.categoryBreakdown.meetings;
    if (meetingMinutes > 180) {
      recommendations.push(`Heavy meeting day (${Math.round(meetingMinutes / 60)}hrs). Consider blocking meeting-free focus time tomorrow.`);
    }

    return recommendations;
  }

  /**
   * Write summary to markdown file
   */
  private async writeMarkdownSummary(summary: DailySummaryContent): Promise<void> {
    const summariesDir = this.config.summariesDir || './summaries';
    
    if (!fs.existsSync(summariesDir)) {
      fs.mkdirSync(summariesDir, { recursive: true });
    }

    const filePath = path.join(summariesDir, `${summary.date}.md`);
    const totalMinutes = summary.totalTrackedMinutes;

    let content = `# Daily Summary: ${summary.date}\n\n`;
    content += `> Generated at ${format(parseISO(summary.generatedAt), 'HH:mm')}\n\n`;

    // Overview
    content += `## 📊 Overview\n\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    const mdHours = Math.floor(totalMinutes / 60);
    const mdMins = totalMinutes % 60;
    content += `| Total Tracked | ${mdHours > 0 ? mdHours + 'h ' : ''}${mdMins}m |\n`;
    content += `| Focus Score | ${summary.focusScore}/100 |\n`;
    content += `| Deep Work Sessions | ${summary.deepWorkSessions} |\n`;
    content += `| Deep Work Time | ${summary.deepWorkMinutes}min |\n`;
    content += `| Context Switches | ${summary.contextSwitches} |\n`;
    content += `\n`;

    // Comparison
    if (summary.comparison) {
      content += `### vs Yesterday\n`;
      const focusDir = summary.comparison.focusScoreChange >= 0 ? '↑' : '↓';
      const workDir = summary.comparison.deepWorkChange >= 0 ? '↑' : '↓';
      content += `- Focus Score: ${focusDir}${Math.abs(summary.comparison.focusScoreChange)} points\n`;
      content += `- Deep Work: ${workDir}${Math.abs(summary.comparison.deepWorkChange)} minutes\n`;
      content += `- Overall: ${summary.comparison.productivityChange}\n\n`;
    }

    // Time breakdown
    content += `## ⏰ Time Breakdown\n\n`;
    content += `| Category | Time | % |\n`;
    content += `|----------|------|---|\n`;
    
    const sortedCategories = Object.entries(summary.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, mins]) => mins > 0);

    for (const [category, minutes] of sortedCategories) {
      const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      const emoji = this.getCategoryEmoji(category as ActivityCategory);
      content += `| ${emoji} ${category} | ${minutes}min | ${pct}% |\n`;
    }
    content += `\n`;

    // Peak hours
    if (summary.peakProductivityHours.length > 0) {
      content += `## 🔥 Peak Productivity\n\n`;
      content += `Your most productive hours: **${summary.peakProductivityHours.join(', ')}**\n\n`;
    }

    // Insights
    if (summary.insights.length > 0) {
      content += `## 💡 Insights\n\n`;
      for (const insight of summary.insights) {
        content += `- ${insight}\n`;
      }
      content += `\n`;
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      content += `## 🎯 Recommendations\n\n`;
      for (const rec of summary.recommendations) {
        content += `- ${rec}\n`;
      }
      content += `\n`;
    }

    // Check-ins
    if (summary.checkIns.length > 0) {
      content += `## 📝 Check-ins\n\n`;
      for (const checkIn of summary.checkIns) {
        content += `- ${checkIn}\n`;
      }
      content += `\n`;
    }

    // Footer
    content += `---\n`;
    content += `*Generated by LifeLog Agent*\n`;

    fs.writeFileSync(filePath, content);
    console.log(`   📄 Written to ${filePath}`);
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: ActivityCategory): string {
    const emojis: Record<ActivityCategory, string> = {
      coding: '💻',
      meetings: '📞',
      browsing: '🌐',
      social: '📱',
      email: '📧',
      breaks: '☕',
      other: '📦',
    };
    return emojis[category] || '📦';
  }

  /**
   * Get existing summary for a date
   */
  getSummary(date: string): DailySummaryContent | null {
    const summary = this.db.getSummary(date);
    if (!summary) return null;

    try {
      return JSON.parse(summary.content_json);
    } catch {
      return null;
    }
  }

  /**
   * Format summary for CLI output
   */
  formatSummaryForCLI(summary: DailySummaryContent): string {
    const totalMinutes = summary.totalTrackedMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    let output = `\n📊 Daily Summary: ${summary.date}\n`;
    output += '═'.repeat(50) + '\n\n';

    output += `⏱️  Total Tracked: ${hours > 0 ? hours + 'h ' : ''}${mins}m\n`;
    output += `🎯 Focus Score: ${summary.focusScore}/100\n`;
    output += `💪 Deep Work: ${summary.deepWorkSessions} sessions, ${summary.deepWorkMinutes}min total\n`;
    output += `🔀 Context Switches: ${summary.contextSwitches}\n\n`;

    // Comparison
    if (summary.comparison) {
      const focusIcon = summary.comparison.focusScoreChange >= 0 ? '📈' : '📉';
      output += `${focusIcon} vs Yesterday: ${summary.comparison.productivityChange}\n`;
      output += `   Focus: ${summary.comparison.focusScoreChange >= 0 ? '+' : ''}${summary.comparison.focusScoreChange} | `;
      output += `Deep Work: ${summary.comparison.deepWorkChange >= 0 ? '+' : ''}${summary.comparison.deepWorkChange}min\n\n`;
    }

    // Time breakdown
    output += '⏰ Time Breakdown:\n';
    const sortedCategories = Object.entries(summary.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, mins]) => mins > 0);

    for (const [category, minutes] of sortedCategories) {
      const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      const emoji = this.getCategoryEmoji(category as ActivityCategory);
      output += `   ${emoji} ${category.padEnd(10)} ${bar} ${minutes}min (${pct}%)\n`;
    }
    output += '\n';

    // Peak hours
    if (summary.peakProductivityHours.length > 0) {
      output += `🔥 Peak Hours: ${summary.peakProductivityHours.join(', ')}\n\n`;
    }

    // Insights
    if (summary.insights.length > 0) {
      output += '💡 Insights:\n';
      for (const insight of summary.insights) {
        output += `   • ${insight}\n`;
      }
      output += '\n';
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      output += '🎯 Recommendations:\n';
      for (const rec of summary.recommendations) {
        output += `   • ${rec}\n`;
      }
      output += '\n';
    }

    return output;
  }
}
