// XP System using Turso Database for Vercel Edge/Serverless
import { createClient, Client } from '@libsql/client';

// Production logging - never log sensitive data
function logSecurely(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
}

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

// Level thresholds
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];

export interface UserXP {
  userId: string;
  username?: string;
  totalXP: number;
  currentXP: number;
  level: number;
  lastActivityAt: string;
}

export interface XPTransaction {
  id: number;
  userId: string;
  amount: number;
  activity: string;
  metadata: Record<string, unknown>;
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
  username?: string;
  totalXP: number;
  level: number;
  rank: number;
}

// Create client lazily (singleton)
let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not set');
    }
    
    _client = createClient({
      url,
      authToken,
    });
  }
  return _client;
}

// ============================================
// REDEMPTION CONSTANTS
// ============================================

// Tiered XP-per-NUDGE rates based on level
const XP_PER_NUDGE_BY_LEVEL = {
  LOW: 10,    // Levels 1-5: 10 XP = 1 NUDGE
  MID: 8,     // Levels 6-10: 8 XP = 1 NUDGE
  HIGH: 5,    // Levels 11+: 5 XP = 1 NUDGE
};

// Streak multipliers
const STREAK_MULTIPLIERS = {
  BASE: 1.0,
  WEEK: 1.5,   // 7+ day streak
  MONTH: 2.0,  // 30+ day streak
};

// Daily cap
const DAILY_NUDGE_CAP = 250;

// Weekly pool
const WEEKLY_POOL_AMOUNT = 50000;

// 24 hours in milliseconds (for rolling window)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// 36-hour window for streak detection (timezone tolerance)
const STREAK_WINDOW_HOURS = 36;

// Initialize XP tables
let initialized = false;
export async function initializeXPTables(): Promise<void> {
  if (initialized) return;
  
  const client = getClient();
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_xp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL UNIQUE,
      username TEXT,
      totalXP INTEGER NOT NULL DEFAULT 0,
      currentXP INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      lastActivityAt TEXT NOT NULL,
      CHECK (currentXP >= 0)
    )
  `);
  
  // Add username column if it doesn't exist (migration for existing tables)
  try {
    await client.execute(`ALTER TABLE user_xp ADD COLUMN username TEXT`);
  } catch {
    // Column already exists, ignore error
  }
  
  // Create unique index for usernames (allowing NULL)
  try {
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_xp_username ON user_xp(username) WHERE username IS NOT NULL`);
  } catch {
    // Index already exists or partial index not supported, try simpler approach
    // SQLite doesn't support partial unique indexes in all versions
  }
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      activity TEXT NOT NULL,
      metadata TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  
  // Redemption tracking table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS nudge_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      xpSpent INTEGER NOT NULL,
      nudgeAwarded REAL NOT NULL,
      streakMultiplier REAL NOT NULL DEFAULT 1.0,
      level INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
  
  // Weekly pool table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS weekly_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekStart TEXT NOT NULL,
      weekEnd TEXT NOT NULL,
      totalPool REAL NOT NULL DEFAULT 50000,
      distributed INTEGER NOT NULL DEFAULT 0,
      distributedAt TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  
  // Weekly pool claims
  await client.execute(`
    CREATE TABLE IF NOT EXISTS weekly_pool_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poolId INTEGER NOT NULL,
      userId TEXT NOT NULL,
      weeklyXP INTEGER NOT NULL,
      sharePercent REAL NOT NULL,
      nudgeAwarded REAL NOT NULL,
      claimedAt TEXT NOT NULL,
      FOREIGN KEY (poolId) REFERENCES weekly_pool(id)
    )
  `);
  
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_xp_userId ON user_xp(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_xp_transactions_userId ON xp_transactions(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_xp_transactions_createdAt ON xp_transactions(createdAt)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_nudge_redemptions_userId ON nudge_redemptions(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_nudge_redemptions_createdAt ON nudge_redemptions(createdAt)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_weekly_pool_claims_poolId ON weekly_pool_claims(poolId)`);
  
  initialized = true;
}

// Calculate level from XP
function calculateLevel(totalXP: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Get or create user XP record
async function getOrCreateUser(userId: string): Promise<UserXP> {
  const client = getClient();
  
  const result = await client.execute({
    sql: 'SELECT * FROM user_xp WHERE userId = ?',
    args: [userId],
  });
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      userId: String(row.userId),
      username: row.username ? String(row.username) : undefined,
      totalXP: Number(row.totalXP),
      currentXP: Number(row.currentXP),
      level: Number(row.level),
      lastActivityAt: String(row.lastActivityAt),
    };
  }
  
  // Create new user
  const now = new Date().toISOString();
  await client.execute({
    sql: 'INSERT INTO user_xp (userId, totalXP, currentXP, level, lastActivityAt) VALUES (?, 0, 0, 1, ?)',
    args: [userId, now],
  });
  
  return {
    userId,
    username: undefined,
    totalXP: 0,
    currentXP: 0,
    level: 1,
    lastActivityAt: now,
  };
}

// Award XP to user
export async function awardXP(
  userId: string,
  activity: XPActivity,
  metadata: Record<string, unknown> = {}
): Promise<{
  xpAwarded: number;
  user: UserXP;
  leveledUp: boolean;
  newLevel?: number;
}> {
  await initializeXPTables();
  const client = getClient();
  
  const user = await getOrCreateUser(userId);
  const xpAmount = XP_REWARDS[activity] || 0;
  const now = new Date().toISOString();
  
  const newTotalXP = user.totalXP + xpAmount;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > user.level;
  
  // Calculate currentXP (XP within current level)
  const currentLevelThreshold = LEVEL_THRESHOLDS[newLevel - 1] || 0;
  const newCurrentXP = newTotalXP - currentLevelThreshold;
  
  // Update user XP
  await client.execute({
    sql: 'UPDATE user_xp SET totalXP = ?, currentXP = ?, level = ?, lastActivityAt = ? WHERE userId = ?',
    args: [newTotalXP, newCurrentXP, newLevel, now, userId],
  });
  
  // Record transaction
  await client.execute({
    sql: 'INSERT INTO xp_transactions (userId, amount, activity, metadata, createdAt) VALUES (?, ?, ?, ?, ?)',
    args: [userId, xpAmount, activity, JSON.stringify(metadata), now],
  });
  
  const updatedUser: UserXP = {
    userId,
    totalXP: newTotalXP,
    currentXP: newCurrentXP,
    level: newLevel,
    lastActivityAt: now,
  };
  
  return {
    xpAwarded: xpAmount,
    user: updatedUser,
    leveledUp,
    ...(leveledUp && { newLevel }),
  };
}

// Get user XP status
export async function getStatus(userId: string): Promise<XPStatus> {
  await initializeXPTables();
  
  const user = await getOrCreateUser(userId);
  
  const nextLevelThreshold = LEVEL_THRESHOLDS[user.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentLevelThreshold = LEVEL_THRESHOLDS[user.level - 1] || 0;
  const xpForNextLevel = nextLevelThreshold - currentLevelThreshold;
  const progressToNextLevel = xpForNextLevel > 0 ? (user.currentXP / xpForNextLevel) * 100 : 100;
  
  // Calculate streak (using UTC with 36-hour window)
  const streak = await calculateStreak(userId);
  
  // Redemption boost based on level
  const redemptionBoost = Math.min((user.level - 1) * 5, 50); // 5% per level, max 50%
  
  return {
    userId: user.userId,
    totalXP: user.totalXP,
    currentXP: user.currentXP,
    level: user.level,
    nextLevelXP: nextLevelThreshold,
    progressToNextLevel: Math.min(progressToNextLevel, 100),
    redemptionBoost,
    streak,
  };
}

/**
 * Calculate user's current streak
 * Uses UTC consistently with a 36-hour window for "consecutive days"
 * to handle timezone edge cases
 */
async function calculateStreak(userId: string): Promise<number> {
  const client = getClient();
  
  // Get activity dates in UTC
  const result = await client.execute({
    sql: `SELECT DATE(createdAt) as day FROM xp_transactions 
          WHERE userId = ? 
          GROUP BY DATE(createdAt) 
          ORDER BY day DESC 
          LIMIT 60`,
    args: [userId],
  });
  
  if (result.rows.length === 0) return 0;
  
  let streak = 0;
  
  // Use UTC for consistent date handling
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  for (let i = 0; i < result.rows.length; i++) {
    const activityDateStr = String(result.rows[i].day);
    const activityDate = new Date(activityDateStr + 'T00:00:00Z');
    
    // Expected date for this position in streak
    const expectedDate = new Date(todayUTC);
    expectedDate.setUTCDate(expectedDate.getUTCDate() - i);
    
    // Calculate hours between dates (for 36-hour tolerance)
    const hoursDiff = Math.abs(expectedDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
    
    // Allow 36-hour window for consecutive day detection (timezone tolerance)
    if (hoursDiff <= STREAK_WINDOW_HOURS) {
      streak++;
    } else if (i === 0 && hoursDiff <= 48) {
      // First entry: if activity was yesterday (within 48h), still start counting
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Get XP history
export async function getHistory(userId: string, limit: number = 20): Promise<{
  history: XPTransaction[];
  total: number;
}> {
  await initializeXPTables();
  const client = getClient();
  
  // Clamp limit to safe range
  const safeLimit = Math.min(Math.max(1, limit), 100);
  
  const [historyResult, countResult] = await Promise.all([
    client.execute({
      sql: 'SELECT * FROM xp_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
      args: [userId, safeLimit],
    }),
    client.execute({
      sql: 'SELECT COUNT(*) as total FROM xp_transactions WHERE userId = ?',
      args: [userId],
    }),
  ]);
  
  const history = historyResult.rows.map(row => ({
    id: Number(row.id),
    userId: String(row.userId),
    amount: Number(row.amount),
    activity: String(row.activity),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
    createdAt: String(row.createdAt),
  }));
  
  return {
    history,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

// Get leaderboard
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  await initializeXPTables();
  const client = getClient();
  
  // Clamp limit to safe range
  const safeLimit = Math.min(Math.max(1, limit), 100);
  
  const result = await client.execute({
    sql: 'SELECT userId, username, totalXP, level FROM user_xp ORDER BY totalXP DESC LIMIT ?',
    args: [safeLimit],
  });
  
  return result.rows.map((row, index) => ({
    userId: String(row.userId),
    username: row.username ? String(row.username) : undefined,
    totalXP: Number(row.totalXP),
    level: Number(row.level),
    rank: index + 1,
  }));
}

// ============================================
// NUDGE REDEMPTION FUNCTIONS
// ============================================

export interface RedemptionResult {
  success: boolean;
  nudgeAwarded: number;
  xpSpent: number;
  rate: number;
  streakMultiplier: number;
  dailyRemaining: number;
  level: number;
  error?: string;
}

export interface RedemptionStatus {
  dailyRedeemed: number;
  dailyCap: number;
  dailyRemaining: number;
  rate: number;
  streakMultiplier: number;
  level: number;
  weeklyPool: {
    totalPool: number;
    userWeeklyXP: number;
    estimatedShare: number;
    endsAt: string;
  };
}

export interface RedemptionHistoryEntry {
  id: number;
  xpSpent: number;
  nudgeAwarded: number;
  streakMultiplier: number;
  level: number;
  createdAt: string;
}

export interface WeeklyPoolStatus {
  pool: {
    id: number;
    weekStart: string;
    weekEnd: string;
    totalPool: number;
    distributed: boolean;
  };
  userShare: {
    weeklyXP: number;
    estimatedShare: number;
    estimatedNudge: number;
  };
  leaderboard: Array<{
    userId: string;
    weeklyXP: number;
    estimatedShare: number;
    rank: number;
  }>;
}

/**
 * Get XP-per-NUDGE rate based on user level
 */
export function getRedemptionRate(level: number): number {
  if (level <= 5) return XP_PER_NUDGE_BY_LEVEL.LOW;
  if (level <= 10) return XP_PER_NUDGE_BY_LEVEL.MID;
  return XP_PER_NUDGE_BY_LEVEL.HIGH;
}

/**
 * Get streak multiplier based on streak days
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return STREAK_MULTIPLIERS.MONTH;
  if (streak >= 7) return STREAK_MULTIPLIERS.WEEK;
  return STREAK_MULTIPLIERS.BASE;
}

/**
 * Get how much $NUDGE the user has redeemed in the last 24 hours (rolling window)
 * Uses rolling 24-hour window instead of calendar day to prevent midnight exploitation
 */
export async function getDailyRedemptionTotal(userId: string): Promise<number> {
  await initializeXPTables();
  const client = getClient();
  
  // Rolling 24-hour window in UTC
  const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
  
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(nudgeAwarded), 0) as total 
          FROM nudge_redemptions 
          WHERE userId = ? AND createdAt > ?`,
    args: [userId, twentyFourHoursAgo],
  });
  
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Get start and end of current week (Sunday to Saturday) in UTC
 */
function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday (UTC)
  
  // Start of week (Sunday) in UTC
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - dayOfWeek,
    0, 0, 0, 0
  ));
  
  // End of week (Saturday 23:59:59) in UTC
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  
  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  };
}

/**
 * Get or create current week's pool
 */
async function getOrCreateCurrentPool(): Promise<{
  id: number;
  weekStart: string;
  weekEnd: string;
  totalPool: number;
  distributed: boolean;
}> {
  const client = getClient();
  const { weekStart, weekEnd } = getCurrentWeekRange();
  
  // Check if pool exists for this week
  const result = await client.execute({
    sql: `SELECT * FROM weekly_pool WHERE weekStart = ? AND weekEnd = ?`,
    args: [weekStart, weekEnd],
  });
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      id: Number(row.id),
      weekStart: String(row.weekStart),
      weekEnd: String(row.weekEnd),
      totalPool: Number(row.totalPool),
      distributed: Boolean(row.distributed),
    };
  }
  
  // Create new pool
  const now = new Date().toISOString();
  const insertResult = await client.execute({
    sql: `INSERT INTO weekly_pool (weekStart, weekEnd, totalPool, distributed, createdAt)
          VALUES (?, ?, ?, 0, ?)`,
    args: [weekStart, weekEnd, WEEKLY_POOL_AMOUNT, now],
  });
  
  return {
    id: Number(insertResult.lastInsertRowid),
    weekStart,
    weekEnd,
    totalPool: WEEKLY_POOL_AMOUNT,
    distributed: false,
  };
}

/**
 * Get user's weekly XP (earned this week)
 */
async function getUserWeeklyXP(userId: string, weekStart: string, weekEnd: string): Promise<number> {
  const client = getClient();
  
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total 
          FROM xp_transactions 
          WHERE userId = ? AND DATE(createdAt) >= ? AND DATE(createdAt) <= ?`,
    args: [userId, weekStart, weekEnd],
  });
  
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Get total XP earned by all users this week
 */
async function getTotalWeeklyXP(weekStart: string, weekEnd: string): Promise<number> {
  const client = getClient();
  
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total 
          FROM xp_transactions 
          WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ?`,
    args: [weekStart, weekEnd],
  });
  
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Redeem XP for $NUDGE tokens
 * 
 * CRITICAL FIX: Uses atomic SQL UPDATE with WHERE clause to prevent race conditions
 * The UPDATE only succeeds if currentXP >= xpAmount, checked atomically
 */
export async function redeemXPForNudge(
  userId: string,
  xpAmount: number
): Promise<RedemptionResult> {
  await initializeXPTables();
  const client = getClient();
  
  // Validate XP amount (must be positive integer)
  if (!xpAmount || xpAmount <= 0 || !Number.isInteger(xpAmount)) {
    return {
      success: false,
      nudgeAwarded: 0,
      xpSpent: 0,
      rate: 0,
      streakMultiplier: 1,
      dailyRemaining: 0,
      level: 1,
      error: 'xpAmount must be a positive integer',
    };
  }
  
  // Get user data
  const user = await getOrCreateUser(userId);
  const streak = await calculateStreak(userId);
  
  // Calculate rates
  const rate = getRedemptionRate(user.level);
  const streakMultiplier = getStreakMultiplier(streak);
  
  // Check daily cap first (rolling 24-hour window)
  const dailyRedeemed = await getDailyRedemptionTotal(userId);
  const dailyRemaining = DAILY_NUDGE_CAP - dailyRedeemed;
  
  if (dailyRemaining <= 0) {
    return {
      success: false,
      nudgeAwarded: 0,
      xpSpent: 0,
      rate,
      streakMultiplier,
      dailyRemaining: 0,
      level: user.level,
      error: 'Daily redemption cap reached (250 $NUDGE in 24 hours)',
    };
  }
  
  // Calculate base NUDGE (before streak multiplier) using Math.floor for safety
  const baseNudge = Math.floor(xpAmount / rate);
  
  // Apply streak multiplier (floor to never give more than earned)
  const nudgeWithStreak = Math.floor(baseNudge * streakMultiplier * 100) / 100;
  
  // Cap the NUDGE at daily remaining
  const finalNudge = Math.min(nudgeWithStreak, dailyRemaining);
  
  // If capped, recalculate actual XP spent (ceil to ensure we charge enough)
  let actualXpSpent = xpAmount;
  if (finalNudge < nudgeWithStreak) {
    // We're hitting the cap, so only spend what's needed for the capped amount
    actualXpSpent = Math.ceil((finalNudge / streakMultiplier) * rate);
  }
  
  // Ensure actualXpSpent doesn't exceed requested amount
  actualXpSpent = Math.min(actualXpSpent, xpAmount);
  
  const now = new Date().toISOString();
  
  // ATOMIC UPDATE: Only succeeds if user has enough XP
  // This prevents race conditions from concurrent redemption requests
  const updateResult = await client.execute({
    sql: `UPDATE user_xp 
          SET currentXP = currentXP - ?, lastActivityAt = ? 
          WHERE userId = ? AND currentXP >= ?`,
    args: [actualXpSpent, now, userId, actualXpSpent],
  });
  
  // Check if update succeeded (rowsAffected === 0 means insufficient XP or concurrent modification)
  if (updateResult.rowsAffected === 0) {
    // Re-fetch user to get current balance for error message
    const currentUser = await getOrCreateUser(userId);
    return {
      success: false,
      nudgeAwarded: 0,
      xpSpent: 0,
      rate,
      streakMultiplier,
      dailyRemaining: Math.max(0, dailyRemaining),
      level: user.level,
      error: `Insufficient XP. Have ${currentUser.currentXP}, need ${actualXpSpent}`,
    };
  }
  
  // Record redemption (use floor for final amount to never overpay)
  const recordedNudge = Math.floor(finalNudge * 100) / 100;
  await client.execute({
    sql: `INSERT INTO nudge_redemptions (userId, xpSpent, nudgeAwarded, streakMultiplier, level, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [userId, actualXpSpent, recordedNudge, streakMultiplier, user.level, now],
  });
  
  return {
    success: true,
    nudgeAwarded: recordedNudge,
    xpSpent: actualXpSpent,
    rate,
    streakMultiplier,
    dailyRemaining: Math.max(0, dailyRemaining - recordedNudge),
    level: user.level,
  };
}

/**
 * Get user's redemption status (for GET request)
 */
export async function getRedemptionStatus(userId: string): Promise<RedemptionStatus> {
  await initializeXPTables();
  
  const user = await getOrCreateUser(userId);
  const streak = await calculateStreak(userId);
  const dailyRedeemed = await getDailyRedemptionTotal(userId);
  
  const rate = getRedemptionRate(user.level);
  const streakMultiplier = getStreakMultiplier(streak);
  
  // Get weekly pool info
  const pool = await getOrCreateCurrentPool();
  const userWeeklyXP = await getUserWeeklyXP(userId, pool.weekStart, pool.weekEnd);
  const totalWeeklyXP = await getTotalWeeklyXP(pool.weekStart, pool.weekEnd);
  
  const estimatedShare = totalWeeklyXP > 0 
    ? (userWeeklyXP / totalWeeklyXP) * 100 
    : 0;
  
  return {
    dailyRedeemed: Math.floor(dailyRedeemed * 100) / 100,
    dailyCap: DAILY_NUDGE_CAP,
    dailyRemaining: Math.max(0, DAILY_NUDGE_CAP - dailyRedeemed),
    rate,
    streakMultiplier,
    level: user.level,
    weeklyPool: {
      totalPool: pool.totalPool,
      userWeeklyXP,
      estimatedShare: Math.floor(estimatedShare * 100) / 100,
      endsAt: pool.weekEnd + 'T23:59:59Z',
    },
  };
}

/**
 * Get weekly pool status with leaderboard
 */
export async function getWeeklyPoolStatus(userId: string): Promise<WeeklyPoolStatus> {
  await initializeXPTables();
  const client = getClient();
  
  const pool = await getOrCreateCurrentPool();
  const userWeeklyXP = await getUserWeeklyXP(userId, pool.weekStart, pool.weekEnd);
  const totalWeeklyXP = await getTotalWeeklyXP(pool.weekStart, pool.weekEnd);
  
  const estimatedShare = totalWeeklyXP > 0 
    ? (userWeeklyXP / totalWeeklyXP) * 100 
    : 0;
  
  const estimatedNudge = totalWeeklyXP > 0
    ? Math.floor((userWeeklyXP / totalWeeklyXP) * pool.totalPool * 100) / 100
    : 0;
  
  // Get leaderboard (top 10 XP earners this week)
  const leaderboardResult = await client.execute({
    sql: `SELECT userId, SUM(amount) as weeklyXP 
          FROM xp_transactions 
          WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ?
          GROUP BY userId 
          ORDER BY weeklyXP DESC 
          LIMIT 10`,
    args: [pool.weekStart, pool.weekEnd],
  });
  
  const leaderboard = leaderboardResult.rows.map((row, index) => {
    const weeklyXP = Number(row.weeklyXP);
    const share = totalWeeklyXP > 0 ? (weeklyXP / totalWeeklyXP) * 100 : 0;
    return {
      userId: String(row.userId),
      weeklyXP,
      estimatedShare: Math.floor(share * 100) / 100,
      rank: index + 1,
    };
  });
  
  return {
    pool: {
      id: pool.id,
      weekStart: pool.weekStart,
      weekEnd: pool.weekEnd,
      totalPool: pool.totalPool,
      distributed: pool.distributed,
    },
    userShare: {
      weeklyXP: userWeeklyXP,
      estimatedShare: Math.floor(estimatedShare * 100) / 100,
      estimatedNudge,
    },
    leaderboard,
  };
}

/**
 * Distribute weekly pool to all users proportionally
 * Should be called on Sunday evening / Monday morning
 * 
 * Security: Includes time guard to prevent early distribution
 */
export async function distributeWeeklyPool(): Promise<{
  success: boolean;
  poolId: number;
  totalDistributed: number;
  claimsCount: number;
  error?: string;
}> {
  await initializeXPTables();
  const client = getClient();
  
  // Get the most recent undistributed pool
  const poolResult = await client.execute({
    sql: `SELECT * FROM weekly_pool WHERE distributed = 0 ORDER BY weekEnd DESC LIMIT 1`,
    args: [],
  });
  
  if (poolResult.rows.length === 0) {
    return {
      success: false,
      poolId: 0,
      totalDistributed: 0,
      claimsCount: 0,
      error: 'No undistributed pool found',
    };
  }
  
  const pool = poolResult.rows[0];
  const poolId = Number(pool.id);
  const weekStart = String(pool.weekStart);
  const weekEnd = String(pool.weekEnd);
  const totalPool = Number(pool.totalPool);
  
  // TIME GUARD: Only allow distribution after weekEnd (Saturday 23:59:59 UTC)
  const weekEndDate = new Date(weekEnd + 'T23:59:59Z');
  const now = new Date();
  
  if (now < weekEndDate) {
    return {
      success: false,
      poolId,
      totalDistributed: 0,
      claimsCount: 0,
      error: `Pool cannot be distributed before week ends (${weekEnd}T23:59:59Z)`,
    };
  }
  
  // Get all users' weekly XP
  const usersResult = await client.execute({
    sql: `SELECT userId, SUM(amount) as weeklyXP 
          FROM xp_transactions 
          WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ?
          GROUP BY userId`,
    args: [weekStart, weekEnd],
  });
  
  if (usersResult.rows.length === 0) {
    // No activity this week, mark as distributed with no claims
    await client.execute({
      sql: `UPDATE weekly_pool SET distributed = 1, distributedAt = ? WHERE id = ?`,
      args: [now.toISOString(), poolId],
    });
    
    return {
      success: true,
      poolId,
      totalDistributed: 0,
      claimsCount: 0,
    };
  }
  
  const totalWeeklyXP = usersResult.rows.reduce((sum, row) => sum + Number(row.weeklyXP), 0);
  
  let totalDistributed = 0;
  let claimsCount = 0;
  
  // Distribute to each user (using floor to never overpay)
  for (const row of usersResult.rows) {
    const claimUserId = String(row.userId);
    const weeklyXP = Number(row.weeklyXP);
    const sharePercent = (weeklyXP / totalWeeklyXP) * 100;
    const nudgeAwarded = Math.floor((weeklyXP / totalWeeklyXP) * totalPool * 100) / 100;
    
    await client.execute({
      sql: `INSERT INTO weekly_pool_claims (poolId, userId, weeklyXP, sharePercent, nudgeAwarded, claimedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [poolId, claimUserId, weeklyXP, sharePercent, nudgeAwarded, now.toISOString()],
    });
    
    totalDistributed += nudgeAwarded;
    claimsCount++;
  }
  
  // Mark pool as distributed
  await client.execute({
    sql: `UPDATE weekly_pool SET distributed = 1, distributedAt = ? WHERE id = ?`,
    args: [now.toISOString(), poolId],
  });
  
  return {
    success: true,
    poolId,
    totalDistributed: Math.floor(totalDistributed * 100) / 100,
    claimsCount,
  };
}

/**
 * Get user's redemption history
 */
export async function getRedemptionHistory(
  userId: string,
  limit: number = 20
): Promise<RedemptionHistoryEntry[]> {
  await initializeXPTables();
  const client = getClient();
  
  // Clamp limit to safe range
  const safeLimit = Math.min(Math.max(1, limit), 100);
  
  const result = await client.execute({
    sql: `SELECT id, xpSpent, nudgeAwarded, streakMultiplier, level, createdAt 
          FROM nudge_redemptions 
          WHERE userId = ? 
          ORDER BY createdAt DESC 
          LIMIT ?`,
    args: [userId, safeLimit],
  });
  
  return result.rows.map(row => ({
    id: Number(row.id),
    xpSpent: Number(row.xpSpent),
    nudgeAwarded: Number(row.nudgeAwarded),
    streakMultiplier: Number(row.streakMultiplier),
    level: Number(row.level),
    createdAt: String(row.createdAt),
  }));
}

// ============================================
// USERNAME FUNCTIONS
// ============================================

// Username validation: 3-20 chars, alphanumeric + underscore only
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export interface SetUsernameResult {
  success: boolean;
  username?: string;
  error?: string;
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Set username for a user
 * 
 * Requirements:
 * - 3-20 characters
 * - Alphanumeric + underscore only
 * - Must be unique (case-insensitive)
 */
export async function setUsername(userId: string, username: string): Promise<SetUsernameResult> {
  await initializeXPTables();
  const client = getClient();
  
  // Validate format
  if (!username || !isValidUsername(username)) {
    return {
      success: false,
      error: 'Username must be 3-20 characters, alphanumeric and underscores only',
    };
  }
  
  // Ensure user exists
  await getOrCreateUser(userId);
  
  // Check uniqueness (case-insensitive)
  const existingResult = await client.execute({
    sql: 'SELECT userId FROM user_xp WHERE LOWER(username) = LOWER(?) AND userId != ?',
    args: [username, userId],
  });
  
  if (existingResult.rows.length > 0) {
    return {
      success: false,
      error: 'Username already taken',
    };
  }
  
  // Update username
  try {
    await client.execute({
      sql: 'UPDATE user_xp SET username = ? WHERE userId = ?',
      args: [username, userId],
    });
    
    return {
      success: true,
      username,
    };
  } catch (error) {
    console.error('Failed to set username:', error);
    return {
      success: false,
      error: 'Failed to update username',
    };
  }
}

/**
 * Get username for a user
 */
export async function getUsername(userId: string): Promise<string | null> {
  await initializeXPTables();
  const client = getClient();
  
  const result = await client.execute({
    sql: 'SELECT username FROM user_xp WHERE userId = ?',
    args: [userId],
  });
  
  if (result.rows.length === 0 || !result.rows[0].username) {
    return null;
  }
  
  return String(result.rows[0].username);
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!isValidUsername(username)) return false;
  
  await initializeXPTables();
  const client = getClient();
  
  const result = await client.execute({
    sql: 'SELECT 1 FROM user_xp WHERE LOWER(username) = LOWER(?) LIMIT 1',
    args: [username],
  });
  
  return result.rows.length === 0;
}
