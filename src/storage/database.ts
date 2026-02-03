import Database from 'better-sqlite3';
import { Activity, CheckIn, MediaRecord, Summary, Config } from '../types/index.js';
import fs from 'fs';
import path from 'path';

export class LifeLogDatabase {
  private db: Database.Database;

  constructor(config: Config) {
    // Ensure data directory exists
    const dbDir = path.dirname(config.database);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.database);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run migrations
    this.runMigration('001_initial_schema', `
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        duration INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'cli'
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
        date TEXT NOT NULL UNIQUE,
        content_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON check_ins(timestamp);
      CREATE INDEX IF NOT EXISTS idx_media_timestamp ON media(timestamp);
      CREATE INDEX IF NOT EXISTS idx_summaries_date ON summaries(date);
    `);
  }

  private runMigration(name: string, sql: string): void {
    const existing = this.db.prepare('SELECT id FROM migrations WHERE name = ?').get(name);
    if (!existing) {
      this.db.exec(sql);
      this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
      console.log(`✓ Migration applied: ${name}`);
    }
  }

  // Activities
  insertActivity(activity: Activity): number {
    const stmt = this.db.prepare(`
      INSERT INTO activities (timestamp, type, duration, metadata_json)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      activity.timestamp,
      activity.type,
      activity.duration || null,
      activity.metadata_json
    );
    return result.lastInsertRowid as number;
  }

  getActivitiesByDate(date: string): Activity[] {
    // Validate date format to prevent SQL injection
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    return this.db.prepare(`
      SELECT * FROM activities 
      WHERE DATE(timestamp) = ? 
      ORDER BY timestamp ASC
    `).all(date) as Activity[];
  }

  // Check-ins
  insertCheckIn(checkIn: CheckIn): number {
    const stmt = this.db.prepare(`
      INSERT INTO check_ins (timestamp, message, source)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(checkIn.timestamp, checkIn.message, checkIn.source);
    return result.lastInsertRowid as number;
  }

  getCheckInsByDate(date: string): CheckIn[] {
    // Validate date format to prevent SQL injection
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    return this.db.prepare(`
      SELECT * FROM check_ins 
      WHERE DATE(timestamp) = ? 
      ORDER BY timestamp ASC
    `).all(date) as CheckIn[];
  }

  // Media
  insertMedia(media: MediaRecord): number {
    const stmt = this.db.prepare(`
      INSERT INTO media (timestamp, type, file_path, analysis_json)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      media.timestamp,
      media.type,
      media.file_path,
      media.analysis_json || null
    );
    return result.lastInsertRowid as number;
  }

  getMediaByDate(date: string): MediaRecord[] {
    // Validate date format to prevent SQL injection
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    return this.db.prepare(`
      SELECT * FROM media 
      WHERE DATE(timestamp) = ? 
      ORDER BY timestamp ASC
    `).all(date) as MediaRecord[];
  }

  updateMediaAnalysis(id: number, analysis: string): void {
    this.db.prepare(`UPDATE media SET analysis_json = ? WHERE id = ?`).run(analysis, id);
  }

  // Summaries
  upsertSummary(summary: Summary): void {
    const stmt = this.db.prepare(`
      INSERT INTO summaries (date, content_json)
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET content_json = excluded.content_json
    `);
    stmt.run(summary.date, summary.content_json);
  }

  getSummary(date: string): Summary | undefined {
    return this.db.prepare('SELECT * FROM summaries WHERE date = ?').get(date) as Summary | undefined;
  }

  // Utility
  close(): void {
    this.db.close();
  }

  getStats(): { activities: number; checkIns: number; media: number; summaries: number } {
    const activities = (this.db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number }).count;
    const checkIns = (this.db.prepare('SELECT COUNT(*) as count FROM check_ins').get() as { count: number }).count;
    const media = (this.db.prepare('SELECT COUNT(*) as count FROM media').get() as { count: number }).count;
    const summaries = (this.db.prepare('SELECT COUNT(*) as count FROM summaries').get() as { count: number }).count;
    return { activities, checkIns, media, summaries };
  }
}
