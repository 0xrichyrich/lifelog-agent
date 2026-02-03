/**
 * AI Coaching System
 * Generates personalized coaching messages using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { format, parseISO, subDays, startOfWeek, endOfWeek, isToday, isSunday } from 'date-fns';
import { Config, DailySummaryContent, TrendData } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { GoalManager, GoalProgress } from '../goals/manager.js';
import { PatternDetector } from '../analysis/patterns.js';

export interface CoachingMessage {
  type: 'briefing' | 'review' | 'nudge' | 'weekly' | 'insight';
  message: string;
  timestamp: string;
  goalsIncluded: boolean;
}

export class Coach {
  private config: Config;
  private db: LifeLogDatabase;
  private goalManager: GoalManager;
  private patterns: PatternDetector;
  private anthropic: Anthropic;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.goalManager = new GoalManager(config, db);
    this.patterns = new PatternDetector(config, db);
    
    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: config.analysis?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate morning briefing
   */
  async generateMorningBriefing(): Promise<string> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Get yesterday's summary
    const yesterdaySummary = this.getSummary(yesterday);

    // Get today's check-ins (if any early ones)
    const todayCheckIns = this.db.getCheckInsByDate(today);

    // Get goal progress
    const goals = this.goalManager.getAllGoals();
    const goalProgress = await this.goalManager.getAllGoalsProgress(yesterday);

    // Get recent patterns (last 7 days)
    const trends = await this.patterns.detectTrends(7);

    // Build context for Claude
    const context = this.buildBriefingContext(yesterdaySummary, goalProgress, trends, todayCheckIns);

    // Generate with Claude
    const message = await this.generateWithClaude('briefing', context);
    
    return message;
  }

  /**
   * Generate evening review
   */
  async generateEveningReview(): Promise<string> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Get today's summary
    const todaySummary = this.getSummary(today);
    const yesterdaySummary = this.getSummary(yesterday);

    // Get goal progress
    const goalProgress = await this.goalManager.getAllGoalsProgress(today);

    // Get streaks at risk
    const goals = this.goalManager.getAllGoals();
    const streaksAtRisk = goals.filter(g => this.goalManager.isStreakAtRisk(g, today));

    // Build context
    const context = this.buildReviewContext(todaySummary, yesterdaySummary, goalProgress, streaksAtRisk);

    // Generate with Claude
    const message = await this.generateWithClaude('review', context);
    
    return message;
  }

  /**
   * Generate weekly insights (for Sundays)
   */
  async generateWeeklyInsights(): Promise<string> {
    // Get this week's trends
    const trends = await this.patterns.detectTrends(7);

    // Get last week's trends for comparison
    const lastWeekTrends = await this.patterns.detectTrends(14);

    // Get goal progress for the week
    const goalProgress = await this.goalManager.getAllGoalsProgress();

    // Build context
    const context = this.buildWeeklyContext(trends, lastWeekTrends, goalProgress);

    // Generate with Claude
    const message = await this.generateWithClaude('weekly', context);
    
    return message;
  }

  /**
   * Generate a nudge based on current activity
   */
  async generateNudge(currentActivity: string, durationMinutes: number): Promise<string | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const goalProgress = await this.goalManager.getAllGoalsProgress(today);

    // Check if nudge is warranted
    const shouldNudge = this.shouldGenerateNudge(currentActivity, durationMinutes, goalProgress);
    if (!shouldNudge.nudge) return null;

    const context = {
      currentActivity,
      durationMinutes,
      reason: shouldNudge.reason,
      goalProgress: goalProgress.map(p => ({
        name: p.goal.name,
        percentage: p.percentage,
        met: p.met,
      })),
    };

    const message = await this.generateWithClaude('nudge', JSON.stringify(context, null, 2));
    return message;
  }

  /**
   * Check if a nudge should be generated
   */
  private shouldGenerateNudge(
    activity: string,
    durationMinutes: number,
    goalProgress: GoalProgress[]
  ): { nudge: boolean; reason: string } {
    const activityLower = activity.toLowerCase();

    // Distraction nudge: >30min on social media, browsing, etc.
    if (
      (activityLower.includes('social') || 
       activityLower.includes('twitter') || 
       activityLower.includes('reddit') ||
       activityLower.includes('youtube') ||
       activityLower.includes('instagram')) &&
      durationMinutes >= 30
    ) {
      return { 
        nudge: true, 
        reason: `Extended distraction detected: ${durationMinutes}min on ${activity}` 
      };
    }

    // Break nudge: >2hrs of deep work without break
    if (
      (activityLower.includes('coding') || 
       activityLower.includes('work') ||
       activityLower.includes('focus')) &&
      durationMinutes >= 120
    ) {
      return { 
        nudge: true, 
        reason: `Long work session: ${durationMinutes}min without a break` 
      };
    }

    // Goal deadline approaching
    const unmetGoals = goalProgress.filter(p => !p.met && p.percentage < 50);
    const hours = new Date().getHours();
    
    if (unmetGoals.length > 0 && hours >= 17) {
      return {
        nudge: true,
        reason: `Goals at risk of not being met today: ${unmetGoals.map(g => g.goal.name).join(', ')}`,
      };
    }

    return { nudge: false, reason: '' };
  }

  /**
   * Build context for morning briefing
   */
  private buildBriefingContext(
    yesterday: DailySummaryContent | null,
    goalProgress: GoalProgress[],
    trends: TrendData,
    todayCheckIns: { timestamp: string; message: string }[]
  ): string {
    let context = '## Morning Briefing Context\n\n';

    // Yesterday's summary
    if (yesterday) {
      context += '### Yesterday\'s Summary:\n';
      context += `- Total tracked time: ${Math.round(yesterday.totalTrackedMinutes / 60)}h ${yesterday.totalTrackedMinutes % 60}m\n`;
      context += `- Focus score: ${yesterday.focusScore}/100\n`;
      context += `- Deep work: ${yesterday.deepWorkSessions} sessions, ${yesterday.deepWorkMinutes}min total\n`;
      context += `- Peak productivity hours: ${yesterday.peakProductivityHours.join(', ')}\n`;
      
      if (yesterday.insights.length > 0) {
        context += `- Key insights: ${yesterday.insights.slice(0, 3).join('; ')}\n`;
      }
    } else {
      context += '### Yesterday: No data recorded\n';
    }

    // Goals
    context += '\n### Goals:\n';
    if (goalProgress.length > 0) {
      for (const progress of goalProgress) {
        const status = progress.met ? '✅' : '⭕';
        context += `- ${status} ${progress.goal.name}: ${progress.percentage}% (${progress.current}/${progress.target})\n`;
        if (progress.streak > 0) {
          context += `  - Current streak: ${progress.streak} days\n`;
        }
      }
    } else {
      context += '- No goals set\n';
    }

    // Trends
    context += '\n### Recent Patterns (7 days):\n';
    context += `- Average focus score: ${trends.avgDailyFocusScore}/100\n`;
    context += `- Average deep work: ${trends.avgDeepWorkMinutes}min/day\n`;
    
    if (Object.keys(trends.productivityByDayOfWeek).length > 0) {
      const bestDay = Object.entries(trends.productivityByDayOfWeek)
        .sort((a, b) => b[1] - a[1])[0];
      context += `- Most productive day: ${bestDay[0]} (${bestDay[1]}/100)\n`;
    }

    // Today's check-ins
    if (todayCheckIns.length > 0) {
      context += '\n### Already logged today:\n';
      for (const ci of todayCheckIns) {
        context += `- ${ci.message}\n`;
      }
    }

    return context;
  }

  /**
   * Build context for evening review
   */
  private buildReviewContext(
    today: DailySummaryContent | null,
    yesterday: DailySummaryContent | null,
    goalProgress: GoalProgress[],
    streaksAtRisk: { name: string; currentStreak: number }[]
  ): string {
    let context = '## Evening Review Context\n\n';

    // Today's summary
    if (today) {
      context += '### Today\'s Performance:\n';
      context += `- Total tracked time: ${Math.round(today.totalTrackedMinutes / 60)}h ${today.totalTrackedMinutes % 60}m\n`;
      context += `- Focus score: ${today.focusScore}/100\n`;
      context += `- Deep work: ${today.deepWorkSessions} sessions, ${today.deepWorkMinutes}min total\n`;
      context += `- Context switches: ${today.contextSwitches}\n`;
      
      // Category breakdown
      context += '\n### Time breakdown:\n';
      const sortedCategories = Object.entries(today.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, mins]) => mins > 0);
      for (const [cat, mins] of sortedCategories) {
        context += `- ${cat}: ${mins}min\n`;
      }

      // Comparison to yesterday
      if (yesterday) {
        const focusDiff = today.focusScore - yesterday.focusScore;
        const deepWorkDiff = today.deepWorkMinutes - yesterday.deepWorkMinutes;
        context += '\n### vs Yesterday:\n';
        context += `- Focus score: ${focusDiff >= 0 ? '+' : ''}${focusDiff}\n`;
        context += `- Deep work: ${deepWorkDiff >= 0 ? '+' : ''}${deepWorkDiff}min\n`;
      }
    } else {
      context += '### Today: No data recorded yet\n';
    }

    // Goal progress
    context += '\n### Goal Progress:\n';
    if (goalProgress.length > 0) {
      const met = goalProgress.filter(p => p.met).length;
      context += `Goals met: ${met}/${goalProgress.length}\n`;
      
      for (const progress of goalProgress) {
        const status = progress.met ? '✅' : '❌';
        context += `- ${status} ${progress.goal.name}: ${progress.percentage}% (${progress.current}/${progress.target})\n`;
      }
    } else {
      context += '- No goals set\n';
    }

    // Streaks at risk
    if (streaksAtRisk.length > 0) {
      context += '\n### ⚠️ Streaks at Risk:\n';
      for (const goal of streaksAtRisk) {
        context += `- ${goal.name}: ${goal.currentStreak} day streak\n`;
      }
    }

    return context;
  }

  /**
   * Build context for weekly insights
   */
  private buildWeeklyContext(
    thisWeek: TrendData,
    previousPeriod: TrendData,
    goalProgress: GoalProgress[]
  ): string {
    let context = '## Weekly Insights Context\n\n';

    // This week's summary
    context += '### This Week:\n';
    context += `- Average focus score: ${thisWeek.avgDailyFocusScore}/100\n`;
    context += `- Average deep work: ${thisWeek.avgDeepWorkMinutes}min/day\n`;

    // Category breakdown
    context += '\n### Time Distribution:\n';
    const totalMins = Object.values(thisWeek.categoryTrends).reduce((a, b) => a + b, 0);
    for (const [cat, mins] of Object.entries(thisWeek.categoryTrends)) {
      if (mins > 0) {
        const pct = Math.round((mins / totalMins) * 100);
        context += `- ${cat}: ${Math.round(mins)}min avg/day (${pct}%)\n`;
      }
    }

    // Productivity by day
    if (Object.keys(thisWeek.productivityByDayOfWeek).length > 0) {
      context += '\n### Productivity by Day:\n';
      for (const [day, score] of Object.entries(thisWeek.productivityByDayOfWeek)) {
        context += `- ${day}: ${score}/100\n`;
      }
    }

    // Improvements and concerns
    if (thisWeek.improvements.length > 0) {
      context += '\n### ✅ Improvements:\n';
      for (const imp of thisWeek.improvements) {
        context += `- ${imp}\n`;
      }
    }

    if (thisWeek.concerns.length > 0) {
      context += '\n### ⚠️ Concerns:\n';
      for (const concern of thisWeek.concerns) {
        context += `- ${concern}\n`;
      }
    }

    // Goal streaks
    context += '\n### Goal Streaks:\n';
    for (const progress of goalProgress) {
      if (progress.goal.currentStreak > 0 || progress.goal.longestStreak > 0) {
        context += `- ${progress.goal.name}: ${progress.streak} current, ${progress.goal.longestStreak} best\n`;
      }
    }

    return context;
  }

  /**
   * Generate message with Claude
   */
  private async generateWithClaude(type: string, context: string): Promise<string> {
    const systemPrompts: Record<string, string> = {
      briefing: `You are a supportive AI life coach providing a morning briefing. Be encouraging, specific, and actionable. Keep it concise (2-3 short paragraphs max). Use emojis sparingly but naturally. Focus on:
1. Quick acknowledgment of yesterday's performance
2. Key goals/priorities for today
3. One motivational insight or tip based on their patterns

Don't be overly enthusiastic or fake. Be genuine, helpful, and human.`,

      review: `You are a supportive AI life coach providing an evening review. Be honest but encouraging. Keep it concise (2-3 short paragraphs max). Use emojis sparingly but naturally. Focus on:
1. What went well today
2. Goal progress (celebrate wins, acknowledge gaps without judgment)
3. One small suggestion for tomorrow

Don't be preachy or lecture. Be a supportive friend who wants them to succeed.`,

      weekly: `You are a supportive AI life coach providing a weekly insights summary. Be analytical but encouraging. Keep it concise (3-4 short paragraphs max). Use emojis sparingly. Focus on:
1. Key trends this week (good and bad)
2. Patterns they should be aware of
3. Specific, actionable suggestions for next week
4. Celebrate progress and streaks

Be data-driven but human. Avoid generic advice - make it specific to their patterns.`,

      nudge: `You are a supportive AI life coach sending a gentle nudge. Be brief (1-2 sentences max). Don't be annoying or preachy. Just a friendly reminder. Options:
- If distraction: Gentle redirect without judgment
- If long work session: Suggest a short break
- If goal at risk: Friendly reminder of what's at stake

Be like a helpful friend, not a nagging parent.`,
    };

    const response = await this.anthropic.messages.create({
      model: this.config.analysis?.model || 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompts[type] || systemPrompts.briefing,
      messages: [
        {
          role: 'user',
          content: context,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text || 'Unable to generate coaching message.';
  }

  /**
   * Get summary from database
   */
  private getSummary(date: string): DailySummaryContent | null {
    const summary = this.db.getSummary(date);
    if (!summary) return null;

    try {
      return JSON.parse(summary.content_json);
    } catch {
      return null;
    }
  }
}
