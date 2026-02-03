/**
 * Nudge System for Heartbeat Integration
 * Checks current activity and generates timely nudges
 */

import fs from 'fs';
import path from 'path';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Config, DailySummaryContent } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { GoalManager, GoalProgress } from '../goals/manager.js';
import { Coach } from './coach.js';

interface NudgeState {
  lastNudgeTimestamp: string | null;
  lastNudgeType: string | null;
  nudgeCount: number; // nudges today
  lastResetDate: string;
}

interface NudgeResult {
  shouldNudge: boolean;
  nudgeType?: 'distraction' | 'break' | 'goal' | 'streak';
  message?: string;
  reason?: string;
}

export class Nudger {
  private config: Config;
  private db: LifeLogDatabase;
  private goalManager: GoalManager;
  private coach: Coach;
  private stateFilePath: string;
  private state: NudgeState;

  // Rate limiting
  private static MAX_NUDGES_PER_HOUR = 1;
  private static MIN_MINUTES_BETWEEN_NUDGES = 60;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.goalManager = new GoalManager(config, db);
    this.coach = new Coach(config, db);
    this.stateFilePath = path.join(process.cwd(), 'nudge-state.json');
    this.state = this.loadState();
  }

  /**
   * Load nudge state from file
   */
  private loadState(): NudgeState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading nudge state:', error);
    }
    return {
      lastNudgeTimestamp: null,
      lastNudgeType: null,
      nudgeCount: 0,
      lastResetDate: format(new Date(), 'yyyy-MM-dd'),
    };
  }

  /**
   * Save nudge state to file
   */
  private saveState(): void {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Check if enough time has passed since last nudge
   */
  private canNudge(): boolean {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Reset counter if new day
    if (this.state.lastResetDate !== today) {
      this.state.lastResetDate = today;
      this.state.nudgeCount = 0;
    }

    // Check time since last nudge
    if (this.state.lastNudgeTimestamp) {
      const minutesSinceLastNudge = differenceInMinutes(
        new Date(),
        parseISO(this.state.lastNudgeTimestamp)
      );
      
      if (minutesSinceLastNudge < Nudger.MIN_MINUTES_BETWEEN_NUDGES) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record that a nudge was sent
   */
  private recordNudge(type: string): void {
    this.state.lastNudgeTimestamp = new Date().toISOString();
    this.state.lastNudgeType = type;
    this.state.nudgeCount += 1;
    this.saveState();
  }

  /**
   * Main check function - called during heartbeat
   * Returns a nudge message if warranted, null otherwise
   */
  async checkForNudge(): Promise<NudgeResult> {
    // Check rate limiting
    if (!this.canNudge()) {
      return { shouldNudge: false };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const currentHour = new Date().getHours();

    // Don't nudge late at night or early morning
    if (currentHour < 7 || currentHour > 22) {
      return { shouldNudge: false };
    }

    // Get recent activity from check-ins and media analysis
    const recentActivity = await this.getRecentActivity();
    
    // Get goal progress
    const goalProgress = await this.goalManager.getAllGoalsProgress(today);

    // Check for various nudge conditions
    let result: NudgeResult = { shouldNudge: false };

    // 1. Check for distraction (>30min on social/browsing)
    result = this.checkForDistraction(recentActivity);
    if (result.shouldNudge) {
      const message = await this.coach.generateNudge(
        result.reason || 'distraction', 
        recentActivity.durationMinutes || 30
      );
      if (message) {
        this.recordNudge('distraction');
        return { ...result, message };
      }
    }

    // 2. Check for long work session (>2hrs without break)
    result = this.checkForLongWorkSession(recentActivity);
    if (result.shouldNudge) {
      const message = await this.coach.generateNudge(
        'deep work session',
        recentActivity.durationMinutes || 120
      );
      if (message) {
        this.recordNudge('break');
        return { ...result, message };
      }
    }

    // 3. Check for goals at risk (afternoon check)
    if (currentHour >= 14) {
      result = this.checkForGoalsAtRisk(goalProgress);
      if (result.shouldNudge) {
        const message = await this.coach.generateNudge(
          result.reason || 'goal deadline',
          0
        );
        if (message) {
          this.recordNudge('goal');
          return { ...result, message };
        }
      }
    }

    // 4. Check for streaks at risk (evening check)
    if (currentHour >= 17) {
      result = this.checkForStreaksAtRisk(goalProgress);
      if (result.shouldNudge) {
        this.recordNudge('streak');
        return result;
      }
    }

    return { shouldNudge: false };
  }

  /**
   * Get recent activity from the database
   */
  private async getRecentActivity(): Promise<{
    category: string | null;
    durationMinutes: number;
    description: string | null;
  }> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Get recent media with analysis
    const media = this.db.getMediaByDate(today);
    const recentAnalyzed = media
      .filter(m => m.analysis_json)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    if (recentAnalyzed.length === 0) {
      return { category: null, durationMinutes: 0, description: null };
    }

    // Analyze recent activity pattern
    const analyses = recentAnalyzed.map(m => {
      try {
        return JSON.parse(m.analysis_json!);
      } catch {
        return null;
      }
    }).filter(a => a);

    if (analyses.length === 0) {
      return { category: null, durationMinutes: 0, description: null };
    }

    // Find most common recent category
    const categoryCounts: Record<string, number> = {};
    for (const analysis of analyses) {
      const cat = analysis.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const dominantCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Estimate duration based on number of consistent entries
    // Each media entry represents roughly 5-10 minutes
    const consistentEntries = analyses.filter(a => a.category === dominantCategory).length;
    const estimatedDuration = consistentEntries * 10; // rough estimate

    return {
      category: dominantCategory,
      durationMinutes: estimatedDuration,
      description: analyses[0]?.description || null,
    };
  }

  /**
   * Check if user has been distracted for too long
   */
  private checkForDistraction(recentActivity: {
    category: string | null;
    durationMinutes: number;
    description: string | null;
  }): NudgeResult {
    const distractingCategories = ['social', 'browsing'];
    
    if (
      recentActivity.category && 
      distractingCategories.includes(recentActivity.category) &&
      recentActivity.durationMinutes >= 30
    ) {
      return {
        shouldNudge: true,
        nudgeType: 'distraction',
        reason: `${recentActivity.durationMinutes}min on ${recentActivity.category}`,
      };
    }

    return { shouldNudge: false };
  }

  /**
   * Check if user needs a break from work
   */
  private checkForLongWorkSession(recentActivity: {
    category: string | null;
    durationMinutes: number;
    description: string | null;
  }): NudgeResult {
    const workCategories = ['coding', 'meetings'];
    
    if (
      recentActivity.category &&
      workCategories.includes(recentActivity.category) &&
      recentActivity.durationMinutes >= 120
    ) {
      return {
        shouldNudge: true,
        nudgeType: 'break',
        reason: `${recentActivity.durationMinutes}min focused work without a break`,
      };
    }

    return { shouldNudge: false };
  }

  /**
   * Check if daily goals are at risk of not being met
   */
  private checkForGoalsAtRisk(goalProgress: GoalProgress[]): NudgeResult {
    const atRiskGoals = goalProgress.filter(p => 
      !p.met && 
      p.percentage < 50 && 
      p.goal.type === 'daily'
    );

    if (atRiskGoals.length > 0) {
      const goalNames = atRiskGoals.map(g => g.goal.name).join(', ');
      return {
        shouldNudge: true,
        nudgeType: 'goal',
        reason: `Goals at risk: ${goalNames}`,
        message: `⚠️ Some of your daily goals might not be met: ${goalNames}. Still time to turn it around!`,
      };
    }

    return { shouldNudge: false };
  }

  /**
   * Check if any streaks are at risk of breaking
   */
  private checkForStreaksAtRisk(goalProgress: GoalProgress[]): NudgeResult {
    const goals = this.goalManager.getAllGoals();
    const streakGoals = goals.filter(g => 
      g.currentStreak >= 3 && 
      this.goalManager.isStreakAtRisk(g)
    );

    if (streakGoals.length > 0) {
      const streakInfo = streakGoals.map(g => 
        `${g.name} (${g.currentStreak} days)`
      ).join(', ');
      
      return {
        shouldNudge: true,
        nudgeType: 'streak',
        reason: `Streaks at risk: ${streakInfo}`,
        message: `🔥 Don't break your streak! ${streakInfo} - still time to keep it going today!`,
      };
    }

    return { shouldNudge: false };
  }

  /**
   * Generate HEARTBEAT.md content for OpenClaw integration
   */
  generateHeartbeatConfig(): string {
    return `# LifeLog Heartbeat Config

During heartbeat checks, run the nudge system:

\`\`\`
cd ~/Skynet/lifelog-agent && npx lifelog coach nudge
\`\`\`

If output is not "HEARTBEAT_OK", send the nudge message to the active channel.

Nudge conditions checked:
- Distraction: >30min on social media/browsing
- Break needed: >2hrs of deep work without break  
- Goal at risk: Daily goals <50% complete after 2pm
- Streak at risk: Active streaks that haven't been hit today (after 5pm)

Rate limit: Max 1 nudge per hour.
`;
  }

  /**
   * Get nudge state for status display
   */
  getState(): NudgeState {
    return this.state;
  }
}
