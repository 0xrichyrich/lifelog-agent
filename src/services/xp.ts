import Database from 'better-sqlite3';

// XP Activity types and their base rewards
export enum XPActivity {
  DAILY_CHECKIN = 'DAILY_CHECKIN',
  MOOD_LOG = 'MOOD_LOG',
  GOAL_COMPLETE = 'GOAL_COMPLETE',
  STREAK_7DAY = 'STREAK_7DAY',
  STREAK_30DAY = 'STREAK_30DAY',
  BADGE_EARNED = 'BADGE_EARNED',
  AGENT_INTERACTION = 'AGENT_INTERACTION',
}

export const XP_REWARDS: Record<XPActivity, number> = {
  [XPActivity.DAILY_CHECKIN]: 10,
  [XPActivity.MOOD_LOG]: 5,
  [XPActivity.GOAL_COMPLETE]: 25,
  [XPActivity.STREAK_7DAY]: 50,
  [XPActivity.STREAK_30DAY]: 200,
  [XPActivity.BADGE_EARNED]: 100,
  [XPActivity.AGENT_INTERACTION]: 2,
};

// Redemption constants
const BASE_REDEMPTION_RATE = 100; // 1000 XP = 100 NUDGE (so 10 XP per NUDGE)
const XP_PER_NUDGE = 10;

export interface UserXP {
  id?: number;
  userId: string;
  totalXP: number;      // Lifetime XP earned
  currentXP: number;    // Redeemable XP balance
  level: number;
  lastActivityAt: string;
}

export interface XPTransaction {
  id?: number;
  userId: string;
  amount: number;
  activity: XPActivity;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface XPRedemption {
  id?: number;
  userId: string;
  xpSpent: number;
  nudgeReceived: number;
  txHash: string | null;
  createdAt: string;
}

export interface XPStatus {
  userId: string;
  totalXP: number;
  currentXP: number;
  level: number;
  nextLevelXP: number;
  progressToNextLevel: number; // 0-100 percentage
  redemptionBoost: number;     // Percentage boost (0, 10, 25, or 50)
}

export interface LeaderboardEntry {
  userId: string;
  totalXP: number;
  level: number;
  rank: number;
}

/**
 * XP Service - Gamification system for Nudge
 * 
 * Level formula: level = floor(sqrt(totalXP / 100))
 * - Level 1: 100 XP
 * - Level 5: 2,500 XP  
 * - Level 10: 10,000 XP
 * - Level 20: 40,000 XP
 * 
 * Redemption rates (base: 1000 XP = 100 NUDGE):
 * - Level 5+: 10% boost
 * - Level 10+: 25% boost
 * - Level 20+: 50% boost
 */
export class XPService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Calculate level from total XP
   * Formula: level = floor(sqrt(totalXP / 100))
   */
  static calculateLevel(totalXP: number): number {
    if (totalXP < 100) return 0;
    return Math.floor(Math.sqrt(totalXP / 100));
  }

  /**
   * Calculate XP required to reach a specific level
   * Formula: xp = level^2 * 100
   */
  static xpForLevel(level: number): number {
    return level * level * 100;
  }

  /**
   * Get redemption boost percentage based on level
   */
  static getRedemptionBoost(level: number): number {
    if (level >= 20) return 50;
    if (level >= 10) return 25;
    if (level >= 5) return 10;
    return 0;
  }

  /**
   * Calculate NUDGE tokens received for XP redemption
   * Base: 1000 XP = 100 NUDGE (10 XP per NUDGE)
   * With boosts applied based on level
   */
  static calculateNudgeForXP(xpAmount: number, level: number): number {
    const boost = XPService.getRedemptionBoost(level);
    const baseNudge = xpAmount / XP_PER_NUDGE;
    return Math.floor(baseNudge * (1 + boost / 100));
  }

  /**
   * Get or create user XP record
   */
  getOrCreateUser(userId: string): UserXP {
    let user = this.db.prepare(`
      SELECT * FROM user_xp WHERE userId = ?
    `).get(userId) as UserXP | undefined;

    if (!user) {
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO user_xp (userId, totalXP, currentXP, level, lastActivityAt)
        VALUES (?, 0, 0, 0, ?)
      `).run(userId, now);
      
      user = {
        userId,
        totalXP: 0,
        currentXP: 0,
        level: 0,
        lastActivityAt: now,
      };
    }

    return user;
  }

  /**
   * Award XP to user for an activity
   */
  awardXP(
    userId: string, 
    activity: XPActivity, 
    metadata: Record<string, unknown> = {}
  ): { user: UserXP; xpAwarded: number; leveledUp: boolean; newLevel?: number } {
    const xpAmount = XP_REWARDS[activity];
    const now = new Date().toISOString();
    
    // Get current user state
    const user = this.getOrCreateUser(userId);
    const oldLevel = user.level;
    
    // Update XP totals
    const newTotalXP = user.totalXP + xpAmount;
    const newCurrentXP = user.currentXP + xpAmount;
    const newLevel = XPService.calculateLevel(newTotalXP);
    
    // Update user record
    this.db.prepare(`
      UPDATE user_xp 
      SET totalXP = ?, currentXP = ?, level = ?, lastActivityAt = ?
      WHERE userId = ?
    `).run(newTotalXP, newCurrentXP, newLevel, now, userId);
    
    // Record transaction
    this.db.prepare(`
      INSERT INTO xp_transactions (userId, amount, activity, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, xpAmount, activity, JSON.stringify(metadata), now);
    
    const updatedUser: UserXP = {
      ...user,
      totalXP: newTotalXP,
      currentXP: newCurrentXP,
      level: newLevel,
      lastActivityAt: now,
    };
    
    const leveledUp = newLevel > oldLevel;
    
    return {
      user: updatedUser,
      xpAwarded: xpAmount,
      leveledUp,
      ...(leveledUp && { newLevel }),
    };
  }

  /**
   * Get user's XP status including progress to next level
   */
  getStatus(userId: string): XPStatus {
    const user = this.getOrCreateUser(userId);
    
    const currentLevelXP = XPService.xpForLevel(user.level);
    const nextLevelXP = XPService.xpForLevel(user.level + 1);
    const xpInCurrentLevel = user.totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    
    const progressToNextLevel = xpNeededForNextLevel > 0 
      ? Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100)
      : 100;
    
    return {
      userId: user.userId,
      totalXP: user.totalXP,
      currentXP: user.currentXP,
      level: user.level,
      nextLevelXP,
      progressToNextLevel,
      redemptionBoost: XPService.getRedemptionBoost(user.level),
    };
  }

  /**
   * Redeem XP for NUDGE tokens
   * Returns redemption record (txHash will be null until blockchain tx is confirmed)
   */
  redeemXP(userId: string, xpAmount: number): XPRedemption | { error: string } {
    const user = this.getOrCreateUser(userId);
    
    if (xpAmount > user.currentXP) {
      return { error: `Insufficient XP. Have ${user.currentXP}, need ${xpAmount}` };
    }
    
    if (xpAmount < 100) {
      return { error: 'Minimum redemption is 100 XP' };
    }
    
    const nudgeAmount = XPService.calculateNudgeForXP(xpAmount, user.level);
    const now = new Date().toISOString();
    
    // Deduct XP
    this.db.prepare(`
      UPDATE user_xp 
      SET currentXP = currentXP - ?
      WHERE userId = ?
    `).run(xpAmount, userId);
    
    // Record redemption
    const result = this.db.prepare(`
      INSERT INTO xp_redemptions (userId, xpSpent, nudgeReceived, txHash, createdAt)
      VALUES (?, ?, ?, NULL, ?)
    `).run(userId, xpAmount, nudgeAmount, now);
    
    return {
      id: result.lastInsertRowid as number,
      userId,
      xpSpent: xpAmount,
      nudgeReceived: nudgeAmount,
      txHash: null,
      createdAt: now,
    };
  }

  /**
   * Update redemption with transaction hash after blockchain confirmation
   */
  updateRedemptionTxHash(redemptionId: number, txHash: string): void {
    this.db.prepare(`
      UPDATE xp_redemptions SET txHash = ? WHERE id = ?
    `).run(txHash, redemptionId);
  }

  /**
   * Get XP transaction history for user
   */
  getHistory(userId: string, limit: number = 50, offset: number = 0): XPTransaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM xp_transactions 
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Array<{
      id: number;
      userId: string;
      amount: number;
      activity: string;
      metadata: string;
      createdAt: string;
    }>;
    
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      activity: row.activity as XPActivity,
      metadata: JSON.parse(row.metadata),
      createdAt: row.createdAt,
    }));
  }

  /**
   * Get redemption history for user
   */
  getRedemptionHistory(userId: string, limit: number = 50): XPRedemption[] {
    return this.db.prepare(`
      SELECT * FROM xp_redemptions 
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(userId, limit) as XPRedemption[];
  }

  /**
   * Get leaderboard (opt-in users only)
   * Note: Would need a user preferences table to track opt-in status
   * For now, returns all users
   */
  getLeaderboard(limit: number = 10): LeaderboardEntry[] {
    const rows = this.db.prepare(`
      SELECT userId, totalXP, level,
        ROW_NUMBER() OVER (ORDER BY totalXP DESC) as rank
      FROM user_xp
      ORDER BY totalXP DESC
      LIMIT ?
    `).all(limit) as LeaderboardEntry[];
    
    return rows;
  }

  /**
   * Check if user has checked in today (for daily check-in XP)
   */
  hasCheckedInToday(userId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    const result = this.db.prepare(`
      SELECT id FROM xp_transactions 
      WHERE userId = ? 
      AND activity = ? 
      AND DATE(createdAt) = ?
      LIMIT 1
    `).get(userId, XPActivity.DAILY_CHECKIN, today);
    
    return !!result;
  }

  /**
   * Get user's current streak (consecutive days with check-ins)
   */
  getCurrentStreak(userId: string): number {
    const rows = this.db.prepare(`
      SELECT DISTINCT DATE(createdAt) as date
      FROM xp_transactions
      WHERE userId = ? AND activity = ?
      ORDER BY date DESC
    `).all(userId, XPActivity.DAILY_CHECKIN) as Array<{ date: string }>;
    
    if (rows.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < rows.length; i++) {
      const checkDate = new Date(rows[i].date);
      checkDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (checkDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && checkDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow for yesterday if no check-in today yet
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
}

export default XPService;
