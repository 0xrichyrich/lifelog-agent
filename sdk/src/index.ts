/**
 * @lifelog/sdk - Add wellness tracking to any app
 * 
 * Simple API for logging activities, tracking goals, and earning $LIFE tokens.
 */

export interface LifeLogConfig {
  /** Your LifeLog API key (get one at lifelog.app/developers) */
  apiKey?: string;
  /** Custom API endpoint (default: https://api.lifelog.app) */
  baseUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Store data locally only (no API calls) */
  localOnly?: boolean;
}

export interface CheckInOptions {
  /** What are you doing? */
  message: string;
  /** Category: coding, exercise, reading, meditation, social, work, etc. */
  category?: string;
  /** How long (in minutes) */
  duration?: number;
  /** Mood: 1-5 scale */
  mood?: number;
  /** Energy: 1-5 scale */
  energy?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface GoalOptions {
  /** Goal name */
  name: string;
  /** Current progress */
  progress: number;
  /** Total target */
  total: number;
  /** Unit (minutes, reps, sessions, etc.) */
  unit?: string;
  /** Category for filtering */
  category?: string;
}

export interface ActivityOptions {
  /** Activity type: start_session, end_session, achievement, milestone */
  type: 'start_session' | 'end_session' | 'achievement' | 'milestone' | 'custom';
  /** Activity name */
  name: string;
  /** Duration in minutes (for end_session) */
  duration?: number;
  /** Points earned (for achievements) */
  points?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface StreakInfo {
  /** Streak name */
  name: string;
  /** Current streak count */
  current: number;
  /** Longest streak ever */
  longest: number;
  /** Last activity date */
  lastActivity: string;
}

export interface TokenBalance {
  /** Current $LIFE balance */
  balance: number;
  /** Unclaimed rewards */
  unclaimed: number;
  /** Total earned all-time */
  totalEarned: number;
}

export interface InsightSummary {
  /** Date of summary */
  date: string;
  /** Total productive minutes */
  productiveMinutes: number;
  /** Categories with time spent */
  categories: Record<string, number>;
  /** Goals completed */
  goalsCompleted: number;
  /** Goals total */
  goalsTotal: number;
  /** AI-generated insight */
  insight: string;
}

// Storage for local-only mode
interface LocalStorage {
  checkIns: CheckInOptions[];
  goals: Map<string, { current: number; target: number }>;
  activities: ActivityOptions[];
  streaks: Map<string, { count: number; lastDate: string }>;
}

/**
 * LifeLog SDK - Main class for wellness tracking
 * 
 * @example
 * ```typescript
 * import { LifeLog } from '@lifelog/sdk';
 * 
 * const lifelog = new LifeLog({ apiKey: 'your-api-key' });
 * 
 * // Log a check-in
 * await lifelog.checkIn({
 *   message: "Finished sprint planning",
 *   category: "work",
 *   mood: 4
 * });
 * 
 * // Track goal progress
 * await lifelog.trackGoal({
 *   name: "Deep work today",
 *   progress: 90,
 *   total: 240,
 *   unit: "minutes"
 * });
 * ```
 */
export class LifeLog {
  private config: Required<LifeLogConfig>;
  private localStorage: LocalStorage;

  constructor(config: LifeLogConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.LIFELOG_API_KEY || '',
      baseUrl: config.baseUrl || 'https://api.lifelog.app',
      debug: config.debug || false,
      localOnly: config.localOnly ?? true, // Default to local-only for hackathon
    };

    this.localStorage = {
      checkIns: [],
      goals: new Map(),
      activities: [],
      streaks: new Map(),
    };

    if (this.config.debug) {
      console.log('[LifeLog] Initialized with config:', {
        ...this.config,
        apiKey: this.config.apiKey ? '***' : 'not set',
      });
    }
  }

  /**
   * Log a check-in (what you're doing right now)
   */
  async checkIn(options: CheckInOptions): Promise<{ success: boolean; id: string }> {
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    if (this.config.debug) {
      console.log('[LifeLog] Check-in:', options.message, `(${options.category || 'uncategorized'})`);
    }

    if (this.config.localOnly) {
      this.localStorage.checkIns.push({ ...options });
      
      // Update streaks
      const today = new Date().toISOString().split('T')[0];
      const streakKey = options.category || 'general';
      const streak = this.localStorage.streaks.get(streakKey);
      
      if (streak) {
        const lastDate = new Date(streak.lastDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak.count++;
        } else if (diffDays > 1) {
          streak.count = 1;
        }
        streak.lastDate = today;
      } else {
        this.localStorage.streaks.set(streakKey, { count: 1, lastDate: today });
      }

      return { success: true, id };
    }

    // API mode (future)
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/check-ins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ ...options, timestamp }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, id: data.id };
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Check-in failed:', error);
      }
      // Fallback to local storage
      this.localStorage.checkIns.push({ ...options });
      return { success: true, id };
    }
  }

  /**
   * Track progress toward a goal
   */
  async trackGoal(options: GoalOptions): Promise<{ success: boolean; completed: boolean; reward?: number }> {
    if (this.config.debug) {
      console.log('[LifeLog] Goal progress:', options.name, `${options.progress}/${options.total}`);
    }

    const completed = options.progress >= options.total;
    const reward = completed ? 100 : 0; // 100 $LIFE per goal completion

    if (this.config.localOnly) {
      this.localStorage.goals.set(options.name, {
        current: options.progress,
        target: options.total,
      });
      return { success: true, completed, reward };
    }

    // API mode (future)
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/goals/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, completed: data.completed, reward: data.reward };
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Goal tracking failed:', error);
      }
      this.localStorage.goals.set(options.name, {
        current: options.progress,
        target: options.total,
      });
      return { success: true, completed, reward };
    }
  }

  /**
   * Log an activity event (session start/end, achievements, etc.)
   */
  async logActivity(options: ActivityOptions): Promise<{ success: boolean; lifeEarned?: number }> {
    if (this.config.debug) {
      console.log('[LifeLog] Activity:', options.type, options.name);
    }

    let lifeEarned = 0;
    if (options.type === 'achievement') {
      lifeEarned = options.points || 50;
    } else if (options.type === 'milestone') {
      lifeEarned = 200;
    }

    if (this.config.localOnly) {
      this.localStorage.activities.push({ ...options });
      return { success: true, lifeEarned };
    }

    // API mode
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, lifeEarned: data.lifeEarned };
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Activity logging failed:', error);
      }
      this.localStorage.activities.push({ ...options });
      return { success: true, lifeEarned };
    }
  }

  /**
   * Get current streak info
   */
  async getStreaks(): Promise<StreakInfo[]> {
    if (this.config.localOnly) {
      return Array.from(this.localStorage.streaks.entries()).map(([name, data]) => ({
        name,
        current: data.count,
        longest: data.count, // In local mode, current is longest we've seen
        lastActivity: data.lastDate,
      }));
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/streaks`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Streak fetch failed:', error);
      }
      return [];
    }
  }

  /**
   * Get $LIFE token balance
   */
  async getTokenBalance(walletAddress?: string): Promise<TokenBalance> {
    if (this.config.localOnly) {
      // Calculate based on local activities
      let balance = 0;
      for (const activity of this.localStorage.activities) {
        if (activity.type === 'achievement') balance += (activity.points || 50);
        if (activity.type === 'milestone') balance += 200;
      }
      for (const [, goal] of this.localStorage.goals) {
        if (goal.current >= goal.target) balance += 100;
      }
      return {
        balance,
        unclaimed: 0,
        totalEarned: balance,
      };
    }

    try {
      const url = walletAddress 
        ? `${this.config.baseUrl}/v1/token/balance/${walletAddress}`
        : `${this.config.baseUrl}/v1/token/balance`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Balance fetch failed:', error);
      }
      return { balance: 0, unclaimed: 0, totalEarned: 0 };
    }
  }

  /**
   * Get daily insight summary
   */
  async getDailyInsight(date?: string): Promise<InsightSummary | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (this.config.localOnly) {
      // Generate insight from local data
      const categories: Record<string, number> = {};
      let productiveMinutes = 0;
      
      for (const checkIn of this.localStorage.checkIns) {
        const cat = checkIn.category || 'general';
        const mins = checkIn.duration || 30;
        categories[cat] = (categories[cat] || 0) + mins;
        if (['coding', 'work', 'reading', 'exercise'].includes(cat)) {
          productiveMinutes += mins;
        }
      }

      let goalsCompleted = 0;
      let goalsTotal = this.localStorage.goals.size;
      for (const [, goal] of this.localStorage.goals) {
        if (goal.current >= goal.target) goalsCompleted++;
      }

      return {
        date: targetDate,
        productiveMinutes,
        categories,
        goalsCompleted,
        goalsTotal,
        insight: productiveMinutes > 120 
          ? "Great productivity today! Keep up the momentum 🚀"
          : "Room to grow. Try a focused work block tomorrow 💪",
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/insights/${targetDate}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('[LifeLog] Insight fetch failed:', error);
      }
      return null;
    }
  }

  /**
   * Export all local data (useful for syncing later)
   */
  exportLocalData(): LocalStorage & { exportedAt: string } {
    return {
      ...this.localStorage,
      goals: Object.fromEntries(this.localStorage.goals) as unknown as Map<string, { current: number; target: number }>,
      streaks: Object.fromEntries(this.localStorage.streaks) as unknown as Map<string, { count: number; lastDate: string }>,
      exportedAt: new Date().toISOString(),
    };
  }

  private generateId(): string {
    return `ll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Convenience exports
export default LifeLog;

// Quick functions for simple use cases
export async function checkIn(message: string, category?: string): Promise<void> {
  const client = new LifeLog({ localOnly: true });
  await client.checkIn({ message, category });
}

export async function trackGoal(name: string, progress: number, total: number): Promise<boolean> {
  const client = new LifeLog({ localOnly: true });
  const result = await client.trackGoal({ name, progress, total });
  return result.completed;
}

export async function logAchievement(name: string, points?: number): Promise<void> {
  const client = new LifeLog({ localOnly: true });
  await client.logActivity({ type: 'achievement', name, points });
}
