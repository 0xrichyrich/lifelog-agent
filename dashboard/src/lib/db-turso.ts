// Turso Database for Vercel Edge/Serverless
import { createClient, Client } from '@libsql/client';
import { Activity, CheckIn, MediaRecord, Summary } from './types';

// Create client lazily (singleton)
let _client: Client | null = null;
let _clientError: string | null = null;

function getClient(): Client {
  if (_clientError) {
    throw new Error(_clientError);
  }
  
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      _clientError = 'TURSO_DATABASE_URL is not set. See /docs for setup instructions.';
      throw new Error(_clientError);
    }
    
    _client = createClient({
      url,
      authToken,
    });
  }
  return _client;
}

// Check if database is configured
export function isDatabaseConfigured(): boolean {
  return !!process.env.TURSO_DATABASE_URL;
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const client = getClient();
  
  await client.batch([
    `CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT DEFAULT 'api',
      user_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_minutes INTEGER,
      metadata_json TEXT,
      user_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      analysis_json TEXT,
      user_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL,
      user_id TEXT
    )`,
    // Create indexes for common queries
    `CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON check_ins(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)`,
  ], 'write');
}

// Check-ins
export async function createCheckIn(
  timestamp: string, 
  message: string, 
  source: string = 'api',
  userId?: string
): Promise<number> {
  const client = getClient();
  const result = await client.execute({
    sql: 'INSERT INTO check_ins (timestamp, message, source, user_id) VALUES (?, ?, ?, ?)',
    args: [timestamp, message, source, userId ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function getCheckIns(options: {
  date?: string;
  limit?: number;
  userId?: string;
} = {}): Promise<CheckIn[]> {
  const client = getClient();
  const { date, limit = 20, userId } = options;
  
  let sql = 'SELECT id, timestamp, message, source FROM check_ins';
  const args: (string | number)[] = [];
  const conditions: string[] = [];
  
  if (date) {
    conditions.push('DATE(timestamp) = ?');
    args.push(date);
  }
  
  if (userId) {
    conditions.push('user_id = ?');
    args.push(userId);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  args.push(limit);
  
  const result = await client.execute({ sql, args });
  return result.rows.map(row => ({
    id: Number(row.id),
    timestamp: String(row.timestamp),
    message: String(row.message),
    source: String(row.source) as 'cli' | 'api' | 'auto',
  }));
}

export async function getCheckInsByDate(date: string): Promise<CheckIn[]> {
  return getCheckIns({ date, limit: 100 });
}

// Activities
export async function createActivity(
  timestamp: string,
  type: string,
  durationMinutes?: number,
  metadataJson?: string,
  userId?: string
): Promise<number> {
  const client = getClient();
  const result = await client.execute({
    sql: 'INSERT INTO activities (timestamp, type, duration_minutes, metadata_json, user_id) VALUES (?, ?, ?, ?, ?)',
    args: [timestamp, type, durationMinutes ?? null, metadataJson ?? null, userId ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function getActivities(options: {
  date?: string;
  limit?: number;
  userId?: string;
} = {}): Promise<Activity[]> {
  const client = getClient();
  const { date, limit = 50, userId } = options;
  
  let sql = 'SELECT id, timestamp, type, duration_minutes as duration, metadata_json FROM activities';
  const args: (string | number)[] = [];
  const conditions: string[] = [];
  
  if (date) {
    conditions.push('DATE(timestamp) = ?');
    args.push(date);
  }
  
  if (userId) {
    conditions.push('user_id = ?');
    args.push(userId);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  args.push(limit);
  
  const result = await client.execute({ sql, args });
  return result.rows.map(row => ({
    id: Number(row.id),
    timestamp: String(row.timestamp),
    type: String(row.type) as Activity['type'],
    duration: row.duration ? Number(row.duration) : undefined,
    metadata_json: row.metadata_json ? String(row.metadata_json) : '',
  }));
}

export async function getActivitiesByDate(date: string): Promise<Activity[]> {
  // Get native activities
  const activities = await getActivities({ date, limit: 100 });
  
  // Also get check-ins and convert them to activities
  const checkIns = await getCheckInsByDate(date);
  const checkInActivities: Activity[] = checkIns.map(checkIn => ({
    id: checkIn.id,
    timestamp: checkIn.timestamp,
    type: 'break' as const,
    duration: undefined,
    metadata_json: JSON.stringify({
      message: checkIn.message,
      source: checkIn.source,
      isCheckIn: true,
    }),
  }));
  
  // Combine and sort by timestamp (newest first)
  return [...activities, ...checkInActivities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getRecentActivities(days: number = 7): Promise<Activity[]> {
  const client = getClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];
  
  const result = await client.execute({
    sql: 'SELECT id, timestamp, type, duration_minutes as duration, metadata_json FROM activities WHERE timestamp >= ? ORDER BY timestamp DESC',
    args: [dateStr],
  });
  
  return result.rows.map(row => ({
    id: Number(row.id),
    timestamp: String(row.timestamp),
    type: String(row.type) as Activity['type'],
    duration: row.duration ? Number(row.duration) : undefined,
    metadata_json: row.metadata_json ? String(row.metadata_json) : '',
  }));
}

// Media
export async function getMediaByDate(date: string): Promise<MediaRecord[]> {
  const client = getClient();
  const result = await client.execute({
    sql: 'SELECT id, timestamp, type, file_path, analysis_json FROM media WHERE DATE(timestamp) = ? ORDER BY timestamp ASC',
    args: [date],
  });
  
  return result.rows.map(row => ({
    id: Number(row.id),
    timestamp: String(row.timestamp),
    type: String(row.type) as 'screen' | 'camera' | 'audio',
    file_path: String(row.file_path),
    analysis_json: row.analysis_json ? String(row.analysis_json) : undefined,
  }));
}

// Summaries
export async function getSummaryByDate(date: string): Promise<Summary | undefined> {
  const client = getClient();
  const result = await client.execute({
    sql: 'SELECT id, date, content_json FROM summaries WHERE date = ?',
    args: [date],
  });
  
  if (result.rows.length === 0) return undefined;
  
  const row = result.rows[0];
  return {
    id: Number(row.id),
    date: String(row.date),
    content_json: String(row.content_json),
  };
}

// Stats
export async function getStats(): Promise<{
  activities: number;
  checkIns: number;
  media: number;
  summaries: number;
}> {
  const client = getClient();
  
  const [activities, checkIns, media, summaries] = await Promise.all([
    client.execute('SELECT COUNT(*) as count FROM activities'),
    client.execute('SELECT COUNT(*) as count FROM check_ins'),
    client.execute('SELECT COUNT(*) as count FROM media'),
    client.execute('SELECT COUNT(*) as count FROM summaries'),
  ]);
  
  return {
    activities: Number(activities.rows[0]?.count ?? 0),
    checkIns: Number(checkIns.rows[0]?.count ?? 0),
    media: Number(media.rows[0]?.count ?? 0),
    summaries: Number(summaries.rows[0]?.count ?? 0),
  };
}

// Export
export async function exportAllData(): Promise<{
  exportedAt: string;
  activities: Activity[];
  checkIns: CheckIn[];
  media: MediaRecord[];
  summaries: Summary[];
}> {
  const client = getClient();
  
  const [activitiesRes, checkInsRes, mediaRes, summariesRes] = await Promise.all([
    client.execute('SELECT * FROM activities ORDER BY timestamp ASC'),
    client.execute('SELECT * FROM check_ins ORDER BY timestamp ASC'),
    client.execute('SELECT * FROM media ORDER BY timestamp ASC'),
    client.execute('SELECT * FROM summaries ORDER BY date ASC'),
  ]);
  
  return {
    exportedAt: new Date().toISOString(),
    activities: activitiesRes.rows.map(row => ({
      id: Number(row.id),
      timestamp: String(row.timestamp),
      type: String(row.type) as Activity['type'],
      duration: row.duration_minutes ? Number(row.duration_minutes) : undefined,
      metadata_json: row.metadata_json ? String(row.metadata_json) : '',
    })),
    checkIns: checkInsRes.rows.map(row => ({
      id: Number(row.id),
      timestamp: String(row.timestamp),
      message: String(row.message),
      source: String(row.source) as 'cli' | 'api' | 'auto',
    })),
    media: mediaRes.rows.map(row => ({
      id: Number(row.id),
      timestamp: String(row.timestamp),
      type: String(row.type) as 'screen' | 'camera' | 'audio',
      file_path: String(row.file_path),
      analysis_json: row.analysis_json ? String(row.analysis_json) : undefined,
    })),
    summaries: summariesRes.rows.map(row => ({
      id: Number(row.id),
      date: String(row.date),
      content_json: String(row.content_json),
    })),
  };
}

// Compatibility layer for old db.prepare() style
// This allows gradual migration
export const db = {
  prepare: (sql: string) => ({
    run: async (...params: (string | number | null)[]) => {
      const client = getClient();
      const result = await client.execute({ sql, args: params });
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    },
    all: async (...params: (string | number | null)[]) => {
      const client = getClient();
      const result = await client.execute({ sql, args: params });
      return result.rows;
    },
    get: async (...params: (string | number | null)[]) => {
      const client = getClient();
      const result = await client.execute({ sql, args: params });
      return result.rows[0] ?? null;
    },
  }),
};
