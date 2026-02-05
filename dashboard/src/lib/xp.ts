import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
const XP_PER_NUDGE = 10;

export interface UserXP {
  id?: number;
  userId: string;
  totalXP: number;
  currentXP: number;
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
  progressToNextLevel: number;
  redemptionBoost: number;
  streak: number;
}

export interface LeaderboardEntry {
  userId: string;
  totalXP: number;
  level: number;
  rank: number;
}

// Database setup
const DB_PATH = path.join(process.cwd(), '..', 'data', 'lifelog.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    if (!fs.existsSync(DB_PATH)) {
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }
    _db = new Database(DB_PATH);
    initXPTables(_db);
  }
  return _db;
}

function initXPTables(db: Database.Database) {
  db.exec(`
    -- User XP tracking
    CREATE TABLE IF NOT EXISTS user_xp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL UNIQUE,
      totalXP INTEGER NOT NULL DEFAULT 0,
      currentXP INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      lastActivityAt TEXT NOT NULL
    );

    -- XP transaction history
    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      activity TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL
    );

    -- XP redemption records
    CREATE TABLE IF NOT EXISTS xp_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      xpSpent INTEGER NOT NULL,
      nudgeReceived INTEGER NOT NULL,
      txHash TEXT,
      createdAt TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_user_xp_userId ON user_xp(userId);
    CREATE INDEX IF NOT EXISTS idx_user_xp_totalXP ON user_xp(totalXP DESC);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_userId ON xp_transactions(userId);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_createdAt ON xp_transactions(createdAt);
    CREATE INDEX IF NOT EXISTS idx_xp_redemptions_userId ON xp_redemptions(userId);
  `);
}

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(totalXP / 100))
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 100) return 0;
  return Math.floor(Math.sqrt(totalXP / 100));
}

/**
 * Calculate XP required for a specific level
 */
export function xpForLevel(level: number): number {
  return level * level * 100;
}

/**
 * Get redemption boost percentage based on level
 */
export function getRedemptionBoost(level: number): number {
  if (level >= 20) return 50;
  if (level >= 10) return 25;
  if (level >= 5) return 10;
  return 0;
}

/**
 * Calculate NUDGE tokens for XP redemption
 */
export function calculateNudgeForXP(xpAmount: number, level: number): number {
  const boost = getRedemptionBoost(level);
  const baseNudge = xpAmount / XP_PER_NUDGE;
  return Math.floor(baseNudge * (1 + boost / 100));
}

/**
 * Get or create user XP record
 */
export function getOrCreateUser(userId: string): UserXP {
  const db = getDb();
  let user = db.prepare(`SELECT * FROM user_xp WHERE userId = ?`).get(userId) as UserXP | undefined;

  if (!user) {
    const now = new Date().toISOString();
    db.prepare(`
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
 * Award XP to user
 */
export function awardXP(
  userId: string,
  activity: XPActivity,
  metadata: Record<string, unknown> = {}
): { user: UserXP; xpAwarded: number; leveledUp: boolean; newLevel?: number } {
  const db = getDb();
  const xpAmount = XP_REWARDS[activity];
  const now = new Date().toISOString();
  
  const user = getOrCreateUser(userId);
  const oldLevel = user.level;
  
  const newTotalXP = user.totalXP + xpAmount;
  const newCurrentXP = user.currentXP + xpAmount;
  const newLevel = calculateLevel(newTotalXP);
  
  db.prepare(`
    UPDATE user_xp 
    SET totalXP = ?, currentXP = ?, level = ?, lastActivityAt = ?
    WHERE userId = ?
  `).run(newTotalXP, newCurrentXP, newLevel, now, userId);
  
  db.prepare(`
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
 * Get user's current streak
 */
export function getCurrentStreak(userId: string): number {
  const db = getDb();
  const rows = db.prepare(`
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
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Get user's XP status
 */
export function getStatus(userId: string): XPStatus {
  const user = getOrCreateUser(userId);
  
  const currentLevelXP = xpForLevel(user.level);
  const nextLevelXP = xpForLevel(user.level + 1);
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
    redemptionBoost: getRedemptionBoost(user.level),
    streak: getCurrentStreak(userId),
  };
}

/**
 * Redeem XP for NUDGE tokens
 */
export function redeemXP(userId: string, xpAmount: number): XPRedemption | { error: string } {
  const db = getDb();
  const user = getOrCreateUser(userId);
  
  if (xpAmount > user.currentXP) {
    return { error: `Insufficient XP. Have ${user.currentXP}, need ${xpAmount}` };
  }
  
  if (xpAmount < 100) {
    return { error: 'Minimum redemption is 100 XP' };
  }
  
  const nudgeAmount = calculateNudgeForXP(xpAmount, user.level);
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE user_xp SET currentXP = currentXP - ? WHERE userId = ?
  `).run(xpAmount, userId);
  
  const result = db.prepare(`
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
 * Get XP transaction history
 */
export function getHistory(userId: string, limit: number = 50, offset: number = 0): XPTransaction[] {
  const db = getDb();
  const rows = db.prepare(`
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
 * Get leaderboard
 */
export function getLeaderboard(limit: number = 10): LeaderboardEntry[] {
  const db = getDb();
  return db.prepare(`
    SELECT userId, totalXP, level,
      ROW_NUMBER() OVER (ORDER BY totalXP DESC) as rank
    FROM user_xp
    ORDER BY totalXP DESC
    LIMIT ?
  `).all(limit) as LeaderboardEntry[];
}

/**
 * Check if user has checked in today
 */
export function hasCheckedInToday(userId: string): boolean {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    SELECT id FROM xp_transactions 
    WHERE userId = ? AND activity = ? AND DATE(createdAt) = ?
    LIMIT 1
  `).get(userId, XPActivity.DAILY_CHECKIN, today);
  
  return !!result;
}
