import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { Config, MediaRecord } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';

const execAsync = promisify(exec);

export class ScreenRecorder {
  private config: Config;
  private db: LifeLogDatabase;
  private logger: MarkdownLogger;
  private recordingDir: string;

  constructor(config: Config, db: LifeLogDatabase, logger: MarkdownLogger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.recordingDir = config.recordings.screenDir;
    
    if (!fs.existsSync(this.recordingDir)) {
      fs.mkdirSync(this.recordingDir, { recursive: true });
    }
  }

  async record(durationMs?: number): Promise<MediaRecord | null> {
    const timestamp = new Date().toISOString();
    const filename = `screen_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.mov`;
    const filePath = path.join(this.recordingDir, filename);
    const duration = durationMs || this.config.intervals.screenRecordDurationMs;
    const durationSec = Math.ceil(duration / 1000);

    try {
      console.log(`📹 Recording screen for ${durationSec}s...`);
      
      // Use OpenClaw nodes screen_record command
      const command = `openclaw nodes screen_record --durationMs ${duration} --outPath "${filePath}"`;
      
      await execAsync(command, { timeout: duration + 30000 });

      if (fs.existsSync(filePath)) {
        const media: MediaRecord = {
          timestamp,
          type: 'screen',
          file_path: filePath,
        };

        const id = this.db.insertMedia(media);
        media.id = id;
        this.logger.logMedia(media);

        console.log(`✓ Screen recording saved: ${filename}`);
        return media;
      } else {
        console.warn('⚠️ Screen recording file not found after command');
        return null;
      }
    } catch (error) {
      console.error('❌ Screen recording failed:', error);
      return null;
    }
  }
}
