// XP System using Turso Database for Vercel Edge/Serverless
import { createClient, Client } from '@libsql/client';

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

// Initialize XP tables
let initialized = false;
export async function initializeXPTables(): Promise<void> {
  if (initialized) return;
  
  const client = getClient();
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_xp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL UNIQUE,
      totalXP INTEGER NOT NULL DEFAULT 0,
      currentXP INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      lastActivityAt TEXT NOT NULL
    )
  `);
  
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
  
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_xp_userId ON user_xp(userId)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_xp_transactions_userId ON xp_transactions(userId)`);
  
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
  
  // Calculate streak (simplified - count consecutive days with activity)
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

// Calculate user's current streak
async function calculateStreak(userId: string): Promise<number> {
  const client = getClient();
  
  const result = await client.execute({
    sql: `SELECT DATE(createdAt) as day FROM xp_transactions 
          WHERE userId = ? 
          GROUP BY DATE(createdAt) 
          ORDER BY day DESC 
          LIMIT 30`,
    args: [userId],
  });
  
  if (result.rows.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < result.rows.length; i++) {
    const activityDate = new Date(String(result.rows[i].day));
    activityDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (activityDate.getTime() === expectedDate.getTime()) {
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
  
  const [historyResult, countResult] = await Promise.all([
    client.execute({
      sql: 'SELECT * FROM xp_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
      args: [userId, limit],
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
  
  const result = await client.execute({
    sql: 'SELECT userId, totalXP, level FROM user_xp ORDER BY totalXP DESC LIMIT ?',
    args: [limit],
  });
  
  return result.rows.map((row, index) => ({
    userId: String(row.userId),
    totalXP: Number(row.totalXP),
    level: Number(row.level),
    rank: index + 1,
  }));
}
