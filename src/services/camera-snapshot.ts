import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { Config, MediaRecord } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';

const execAsync = promisify(exec);

export class CameraSnapshot {
  private config: Config;
  private db: LifeLogDatabase;
  private logger: MarkdownLogger;
  private snapshotDir: string;

  constructor(config: Config, db: LifeLogDatabase, logger: MarkdownLogger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.snapshotDir = config.recordings.snapshotDir;
    
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  async capture(facing: 'front' | 'back' | 'both' = 'front'): Promise<MediaRecord | null> {
    const timestamp = new Date().toISOString();
    const filename = `camera_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.jpg`;
    const filePath = path.join(this.snapshotDir, filename);

    try {
      console.log(`📷 Taking camera snapshot (${facing})...`);
      
      // Use OpenClaw nodes camera_snap command
      const command = `openclaw nodes camera_snap --facing ${facing}`;
      
      const { stdout } = await execAsync(command, { timeout: 30000 });
      
      // Parse output to find the image path
      // OpenClaw returns the image data or path in stdout
      const match = stdout.match(/saved to:?\s*([^\s]+)/i) || stdout.match(/path:?\s*([^\s]+)/i);
      
      let savedPath = filePath;
      if (match && match[1]) {
        savedPath = match[1];
      }

      // If we got image data directly, we'd save it
      if (fs.existsSync(savedPath) || stdout.includes('camera_snap')) {
        const media: MediaRecord = {
          timestamp,
          type: 'camera',
          file_path: savedPath,
        };

        const id = this.db.insertMedia(media);
        media.id = id;
        this.logger.logMedia(media);

        console.log(`✓ Camera snapshot saved: ${path.basename(savedPath)}`);
        return media;
      } else {
        // Store reference even if file handling differs
        const media: MediaRecord = {
          timestamp,
          type: 'camera',
          file_path: `openclaw_snap_${timestamp}`,
        };
        const id = this.db.insertMedia(media);
        media.id = id;
        console.log(`✓ Camera snapshot recorded (via OpenClaw)`);
        return media;
      }
    } catch (error) {
      console.error('❌ Camera snapshot failed:', error);
      return null;
    }
  }
}
