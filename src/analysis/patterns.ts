/**
 * Pattern Detection Engine
 * Identifies productivity patterns, peaks, and trends from analyzed data
 */

import { format, parseISO, startOfDay, endOfDay, differenceInMinutes, subDays } from 'date-fns';
import { 
  Config, 
  ActivityCategory, 
  TimeBlock, 
  DailyPatterns, 
  TrendData,
  DailySummaryContent 
} from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { Analyzer } from './analyzer.js';

const ALL_CATEGORIES: ActivityCategory[] = ['coding', 'meetings', 'browsing', 'social', 'email', 'breaks', 'other'];

export class PatternDetector {
  private config: Config;
  private db: LifeLogDatabase;
  private analyzer: Analyzer;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.analyzer = new Analyzer(config, db);
  }

  /**
   * Detect patterns for a single day
   */
  async detectDailyPatterns(date: string): Promise<DailyPatterns> {
    console.log(`📊 Detecting patterns for ${date}...`);

    // Get time blocks from analyzed media
    const rawBlocks = await this.analyzer.getTimeBlocks(date);
    
    // Convert to TimeBlock format with durations
    const timeBlocks = this.calculateTimeBlocks(rawBlocks, date);
    
    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(timeBlocks);
    
    // Find peak productivity hours
    const peakProductivityHours = this.findPeakProductivityHours(timeBlocks);
    
    // Count deep work sessions (>30min of focused coding/work)
    const deepWorkSessions = this.countDeepWorkSessions(timeBlocks);
    
    // Calculate total deep work minutes
    const deepWorkMinutes = timeBlocks
      .filter(b => b.isDeepWork)
      .reduce((sum, b) => sum + b.durationMinutes, 0);
    
    // Count context switches
    const contextSwitches = this.countContextSwitches(timeBlocks);
    
    // Calculate average focus score
    const focusScore = timeBlocks.length > 0
      ? Math.round(timeBlocks.reduce((sum, b) => sum + (b.focusScore || 50), 0) / timeBlocks.length)
      : 50;

    return {
      date,
      timeBlocks,
      categoryBreakdown,
      peakProductivityHours,
      deepWorkSessions,
      deepWorkMinutes,
      contextSwitches,
      focusScore,
    };
  }

  /**
   * Convert raw time points into blocks with durations
   */
  private calculateTimeBlocks(
    rawBlocks: Array<{ timestamp: string; category: ActivityCategory; focusScore: number; description: string }>,
    date: string
  ): TimeBlock[] {
    if (rawBlocks.length === 0) return [];

    const timeBlocks: TimeBlock[] = [];
    
    // Minimum duration for any activity (5 minutes)
    const MIN_DURATION = 5;
    // Maximum duration for any single block (60 minutes - gaps longer than this suggest breaks)
    const MAX_DURATION = 60;
    
    for (let i = 0; i < rawBlocks.length; i++) {
      const current = rawBlocks[i];
      const next = rawBlocks[i + 1];
      
      const startTime = current.timestamp;
      // If there's a next block, duration is until that; otherwise estimate 5 minutes
      const endTime = next?.timestamp || new Date(new Date(startTime).getTime() + MIN_DURATION * 60000).toISOString();
      
      let durationMinutes = differenceInMinutes(new Date(endTime), new Date(startTime));
      
      // Apply min/max caps
      durationMinutes = Math.max(durationMinutes, MIN_DURATION); // Minimum 5 minutes per entry
      durationMinutes = Math.min(durationMinutes, MAX_DURATION); // Cap at 60 minutes
      
      // Determine if this is deep work (focused coding/work for significant duration)
      const isDeepWork = 
        ['coding', 'meetings'].includes(current.category) &&
        (current.focusScore || 50) >= 60 &&
        durationMinutes >= 15; // At least 15 min for a meaningful block
      
      timeBlocks.push({
        startTime,
        endTime: new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString(),
        category: current.category,
        durationMinutes,
        focusScore: current.focusScore,
        isDeepWork,
      });
    }

    return timeBlocks;
  }

  /**
   * Calculate time spent per category
   */
  private calculateCategoryBreakdown(timeBlocks: TimeBlock[]): Record<ActivityCategory, number> {
    const breakdown: Record<ActivityCategory, number> = {
      coding: 0,
      meetings: 0,
      browsing: 0,
      social: 0,
      email: 0,
      breaks: 0,
      other: 0,
    };

    for (const block of timeBlocks) {
      breakdown[block.category] += block.durationMinutes;
    }

    return breakdown;
  }

  /**
   * Find hours of peak productivity
   */
  private findPeakProductivityHours(timeBlocks: TimeBlock[]): string[] {
    // Group blocks by hour and calculate productivity score
    const hourlyScores: Record<number, { totalScore: number; count: number }> = {};
    
    for (const block of timeBlocks) {
      const hour = new Date(block.startTime).getHours();
      if (!hourlyScores[hour]) {
        hourlyScores[hour] = { totalScore: 0, count: 0 };
      }
      
      // Score is higher for coding/meetings with good focus
      const productivityWeight = 
        block.category === 'coding' ? 1.5 :
        block.category === 'meetings' ? 1.0 :
        block.category === 'email' ? 0.8 :
        block.category === 'browsing' ? 0.5 :
        block.category === 'social' ? 0.3 :
        0.2;
      
      const score = (block.focusScore || 50) * productivityWeight;
      hourlyScores[hour].totalScore += score * block.durationMinutes;
      hourlyScores[hour].count += block.durationMinutes;
    }

    // Find top hours
    const hourlyAverages = Object.entries(hourlyScores)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
      }))
      .filter(h => h.avgScore > 50) // Only above-average hours
      .sort((a, b) => b.avgScore - a.avgScore);

    // Convert to hour ranges
    const peakHours = hourlyAverages.slice(0, 3).map(h => {
      const startHour = h.hour.toString().padStart(2, '0');
      const endHour = ((h.hour + 1) % 24).toString().padStart(2, '0');
      return `${startHour}:00-${endHour}:00`;
    });

    return peakHours;
  }

  /**
   * Count deep work sessions (>30min uninterrupted focus)
   */
  private countDeepWorkSessions(timeBlocks: TimeBlock[]): number {
    let sessions = 0;
    let currentSessionMinutes = 0;
    let lastCategory: ActivityCategory | null = null;
    
    for (const block of timeBlocks) {
      // Check if this continues a deep work session
      const isProductiveCategory = ['coding', 'meetings'].includes(block.category);
      const isFocused = (block.focusScore || 50) >= 60;
      
      if (isProductiveCategory && isFocused && 
          (lastCategory === null || lastCategory === block.category)) {
        currentSessionMinutes += block.durationMinutes;
      } else {
        // Session break - check if previous session was deep work
        if (currentSessionMinutes >= 30) {
          sessions++;
        }
        currentSessionMinutes = isProductiveCategory && isFocused ? block.durationMinutes : 0;
      }
      
      lastCategory = block.category;
    }
    
    // Don't forget the last session
    if (currentSessionMinutes >= 30) {
      sessions++;
    }
    
    return sessions;
  }

  /**
   * Count context switches (category changes)
   */
  private countContextSwitches(timeBlocks: TimeBlock[]): number {
    let switches = 0;
    let lastCategory: ActivityCategory | null = null;
    
    for (const block of timeBlocks) {
      if (lastCategory !== null && lastCategory !== block.category) {
        switches++;
      }
      lastCategory = block.category;
    }
    
    return switches;
  }

  /**
   * Detect trends over multiple days
   */
  async detectTrends(days: number = 7): Promise<TrendData> {
    const endDate = new Date();
    const summaries: DailySummaryContent[] = [];
    
    // Load existing summaries for trend analysis
    for (let i = 0; i < days; i++) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd');
      const summary = this.db.getSummary(date);
      if (summary) {
        try {
          summaries.push(JSON.parse(summary.content_json));
        } catch {
          // Skip invalid summaries
        }
      }
    }

    if (summaries.length === 0) {
      return this.createEmptyTrends(days);
    }

    // Calculate averages
    const avgDailyFocusScore = Math.round(
      summaries.reduce((sum, s) => sum + s.focusScore, 0) / summaries.length
    );
    
    const avgDeepWorkMinutes = Math.round(
      summaries.reduce((sum, s) => sum + s.deepWorkMinutes, 0) / summaries.length
    );

    // Aggregate category trends
    const categoryTrends: Record<ActivityCategory, number> = {
      coding: 0, meetings: 0, browsing: 0, social: 0, email: 0, breaks: 0, other: 0,
    };
    
    for (const summary of summaries) {
      for (const cat of ALL_CATEGORIES) {
        categoryTrends[cat] += (summary.categoryBreakdown[cat] || 0) / summaries.length;
      }
    }

    // Calculate productivity by day of week
    const productivityByDayOfWeek: Record<string, number> = {};
    const dayOfWeekCounts: Record<string, number> = {};
    
    for (const summary of summaries) {
      const dayOfWeek = format(parseISO(summary.date), 'EEEE');
      productivityByDayOfWeek[dayOfWeek] = (productivityByDayOfWeek[dayOfWeek] || 0) + summary.focusScore;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    }
    
    for (const day of Object.keys(productivityByDayOfWeek)) {
      productivityByDayOfWeek[day] = Math.round(productivityByDayOfWeek[day] / dayOfWeekCounts[day]);
    }

    // Calculate productivity by hour (from peak hours)
    const productivityByHour: Record<number, number> = {};
    for (const summary of summaries) {
      for (const hourRange of summary.peakProductivityHours || []) {
        const hour = parseInt(hourRange.split(':')[0]);
        productivityByHour[hour] = (productivityByHour[hour] || 0) + 1;
      }
    }

    // Generate insights
    const improvements: string[] = [];
    const concerns: string[] = [];

    // Check for improvements
    if (summaries.length >= 2) {
      const recent = summaries.slice(0, Math.ceil(summaries.length / 2));
      const older = summaries.slice(Math.ceil(summaries.length / 2));
      
      const recentFocus = recent.reduce((s, x) => s + x.focusScore, 0) / recent.length;
      const olderFocus = older.reduce((s, x) => s + x.focusScore, 0) / older.length;
      
      if (recentFocus > olderFocus + 5) {
        improvements.push(`Focus score improving: ${Math.round(recentFocus)} vs ${Math.round(olderFocus)} last period`);
      } else if (recentFocus < olderFocus - 5) {
        concerns.push(`Focus score declining: ${Math.round(recentFocus)} vs ${Math.round(olderFocus)} last period`);
      }
    }

    // Check category balance
    const codingRatio = categoryTrends.coding / (Object.values(categoryTrends).reduce((a, b) => a + b, 1));
    const socialRatio = categoryTrends.social / (Object.values(categoryTrends).reduce((a, b) => a + b, 1));
    
    if (codingRatio > 0.5) {
      improvements.push(`Strong coding focus: ${Math.round(codingRatio * 100)}% of tracked time`);
    }
    if (socialRatio > 0.2) {
      concerns.push(`High social media time: ${Math.round(socialRatio * 100)}% of tracked time`);
    }

    return {
      period: `Last ${days} days`,
      avgDailyFocusScore,
      avgDeepWorkMinutes,
      categoryTrends,
      productivityByDayOfWeek,
      productivityByHour,
      improvements,
      concerns,
    };
  }

  /**
   * Create empty trends when no data available
   */
  private createEmptyTrends(days: number): TrendData {
    return {
      period: `Last ${days} days`,
      avgDailyFocusScore: 0,
      avgDeepWorkMinutes: 0,
      categoryTrends: { coding: 0, meetings: 0, browsing: 0, social: 0, email: 0, breaks: 0, other: 0 },
      productivityByDayOfWeek: {},
      productivityByHour: {},
      improvements: [],
      concerns: ['No data available for trend analysis'],
    };
  }

  /**
   * Compare two days for summary comparison
   */
  async compareDays(date1: string, date2: string): Promise<{
    focusScoreChange: number;
    deepWorkChange: number;
    productivityChange: string;
  }> {
    const summary1 = this.db.getSummary(date1);
    const summary2 = this.db.getSummary(date2);

    if (!summary1 || !summary2) {
      return { focusScoreChange: 0, deepWorkChange: 0, productivityChange: 'N/A' };
    }

    try {
      const data1 = JSON.parse(summary1.content_json) as DailySummaryContent;
      const data2 = JSON.parse(summary2.content_json) as DailySummaryContent;

      const focusScoreChange = data1.focusScore - data2.focusScore;
      const deepWorkChange = data1.deepWorkMinutes - data2.deepWorkMinutes;
      
      let productivityChange = 'same';
      if (focusScoreChange > 5 || deepWorkChange > 30) {
        productivityChange = 'improved';
      } else if (focusScoreChange < -5 || deepWorkChange < -30) {
        productivityChange = 'declined';
      }

      return { focusScoreChange, deepWorkChange, productivityChange };
    } catch {
      return { focusScoreChange: 0, deepWorkChange: 0, productivityChange: 'N/A' };
    }
  }

  /**
   * Get formatted pattern report for CLI output
   */
  async getPatternReport(days: number = 7): Promise<string> {
    const trends = await this.detectTrends(days);
    
    let report = `\n📊 Productivity Patterns (${trends.period})\n`;
    report += '═'.repeat(50) + '\n\n';

    report += `📈 Average Focus Score: ${trends.avgDailyFocusScore}/100\n`;
    report += `🎯 Average Deep Work: ${trends.avgDeepWorkMinutes} min/day\n\n`;

    report += '⏰ Time Distribution:\n';
    const totalMinutes = Object.values(trends.categoryTrends).reduce((a, b) => a + b, 1);
    for (const [cat, mins] of Object.entries(trends.categoryTrends)) {
      if (mins > 0) {
        const pct = Math.round((mins / totalMinutes) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        report += `   ${cat.padEnd(10)} ${bar} ${Math.round(mins)}min (${pct}%)\n`;
      }
    }

    if (Object.keys(trends.productivityByDayOfWeek).length > 0) {
      report += '\n📅 Productivity by Day:\n';
      for (const [day, score] of Object.entries(trends.productivityByDayOfWeek)) {
        report += `   ${day.padEnd(10)} ${score}/100\n`;
      }
    }

    if (trends.improvements.length > 0) {
      report += '\n✅ Improvements:\n';
      for (const imp of trends.improvements) {
        report += `   • ${imp}\n`;
      }
    }

    if (trends.concerns.length > 0) {
      report += '\n⚠️ Concerns:\n';
      for (const concern of trends.concerns) {
        report += `   • ${concern}\n`;
      }
    }

    return report;
  }
}
