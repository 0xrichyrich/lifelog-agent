import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Activity, CheckIn, MediaRecord, Summary } from './types';

// Path to the SQLite database (relative to dashboard folder)
const DB_PATH = path.join(process.cwd(), '..', 'data', 'lifelog.db');

let _db: Database.Database | null = null;
let initialized = false;

function getDb(readonly = true): Database.Database {
  if (!_db) {
    if (!fs.existsSync(DB_PATH)) {
      // Create database if it doesn't exist
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      _db = new Database(DB_PATH);
    } else {
      _db = new Database(DB_PATH, { readonly });
    }
  }
  return _db;
}

// Export db for direct access
export const db = {
  prepare: (sql: string) => {
    initializeDatabase();
    const database = getDb(false);
    return database.prepare(sql);
  }
};

// Initialize database tables
export function initializeDatabase() {
  if (initialized) return;
  
  const database = getDb(false);
  initialized = true;  // Set first to prevent recursion
  
  // Create check_ins table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT DEFAULT 'api'
    );
    
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER,
      metadata_json TEXT
    );
    
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      analysis_json TEXT
    );
    
    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL
    );
  `);
}

export function getActivitiesByDate(date: string): Activity[] {
  try {
    const database = getDb();
    return database.prepare(`
      SELECT * FROM activities 
      WHERE timestamp LIKE ? 
      ORDER BY timestamp ASC
    `).all(`${date}%`) as Activity[];
  } catch {
    console.error('Database not available, using mock data');
    return [];
  }
}

export function getCheckInsByDate(date: string): CheckIn[] {
  try {
    const database = getDb();
    return database.prepare(`
      SELECT * FROM check_ins 
      WHERE timestamp LIKE ? 
      ORDER BY timestamp ASC
    `).all(`${date}%`) as CheckIn[];
  } catch {
    return [];
  }
}

export function getMediaByDate(date: string): MediaRecord[] {
  try {
    const database = getDb();
    return database.prepare(`
      SELECT * FROM media 
      WHERE timestamp LIKE ? 
      ORDER BY timestamp ASC
    `).all(`${date}%`) as MediaRecord[];
  } catch {
    return [];
  }
}

export function getSummaryByDate(date: string): Summary | undefined {
  try {
    const database = getDb();
    return database.prepare('SELECT * FROM summaries WHERE date = ?').get(date) as Summary | undefined;
  } catch {
    return undefined;
  }
}

export function getRecentActivities(days: number = 7): Activity[] {
  try {
    const database = getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];
    
    return database.prepare(`
      SELECT * FROM activities 
      WHERE timestamp >= ? 
      ORDER BY timestamp ASC
    `).all(dateStr) as Activity[];
  } catch {
    return [];
  }
}

export function getStats() {
  try {
    const database = getDb();
    const activities = (database.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number }).count;
    const checkIns = (database.prepare('SELECT COUNT(*) as count FROM check_ins').get() as { count: number }).count;
    const media = (database.prepare('SELECT COUNT(*) as count FROM media').get() as { count: number }).count;
    const summaries = (database.prepare('SELECT COUNT(*) as count FROM summaries').get() as { count: number }).count;
    return { activities, checkIns, media, summaries };
  } catch {
    return { activities: 0, checkIns: 0, media: 0, summaries: 0 };
  }
}

export function exportAllData() {
  try {
    const database = getDb();
    const activities = database.prepare('SELECT * FROM activities ORDER BY timestamp ASC').all();
    const checkIns = database.prepare('SELECT * FROM check_ins ORDER BY timestamp ASC').all();
    const media = database.prepare('SELECT * FROM media ORDER BY timestamp ASC').all();
    const summaries = database.prepare('SELECT * FROM summaries ORDER BY date ASC').all();
    
    return {
      exportedAt: new Date().toISOString(),
      activities,
      checkIns,
      media,
      summaries,
    };
  } catch {
    return {
      exportedAt: new Date().toISOString(),
      activities: [],
      checkIns: [],
      media: [],
      summaries: [],
      error: 'Database not available',
    };
  }
}
