import fs from 'fs';
import path from 'path';
import { Config, SessionState, Activity } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';
import { ScreenRecorder } from './screen-recorder.js';
import { CameraSnapshot } from './camera-snapshot.js';
import { CheckInHandler } from './checkin-handler.js';

const STATE_FILE = '.lifelog-session.json';

export class SessionManager {
  private config: Config;
  private db: LifeLogDatabase;
  private logger: MarkdownLogger;
  private screenRecorder: ScreenRecorder;
  private cameraSnapshot: CameraSnapshot;
  private checkInHandler: CheckInHandler;
  private state: SessionState;
  private stateFile: string;

  constructor(config: Config, db: LifeLogDatabase, logger: MarkdownLogger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.screenRecorder = new ScreenRecorder(config, db, logger);
    this.cameraSnapshot = new CameraSnapshot(config, db, logger);
    this.checkInHandler = new CheckInHandler(config, db, logger);
    this.stateFile = path.join(config.dataDir, STATE_FILE);
    this.state = this.loadState();
  }

  private loadState(): SessionState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        const saved = JSON.parse(data);
        return {
          active: saved.active || false,
          sessionName: saved.sessionName || null,
          startTime: saved.startTime || null,
        };
      }
    } catch (error) {
      console.warn('Could not load session state, starting fresh');
    }
    return { active: false, sessionName: null, startTime: null };
  }

  private saveState(): void {
    const data = {
      active: this.state.active,
      sessionName: this.state.sessionName,
      startTime: this.state.startTime,
    };
    fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2));
  }

  async start(sessionName: string): Promise<boolean> {
    if (this.state.active) {
      console.log(`⚠️ Session already active: ${this.state.sessionName}`);
      return false;
    }

    const timestamp = new Date().toISOString();
    this.state = {
      active: true,
      sessionName,
      startTime: timestamp,
    };

    // Log session start
    const activity: Activity = {
      timestamp,
      type: 'session_start',
      metadata_json: JSON.stringify({ sessionName }),
    };
    this.db.insertActivity(activity);
    this.logger.logSessionStart(sessionName);

    console.log(`🚀 Session started: ${sessionName}`);

    // Start recording intervals
    await this.startRecordingLoops();

    this.saveState();
    return true;
  }

  private async startRecordingLoops(): Promise<void> {
    // Initial capture
    await this.screenRecorder.record();
    await this.cameraSnapshot.capture('front');

    // Set up intervals
    this.state.screenRecordInterval = setInterval(async () => {
      if (this.state.active) {
        await this.screenRecorder.record();
      }
    }, this.config.intervals.screenRecordIntervalMs);

    this.state.cameraSnapInterval = setInterval(async () => {
      if (this.state.active) {
        await this.cameraSnapshot.capture('front');
      }
    }, this.config.intervals.cameraSnapshotIntervalMs);
  }

  async stop(): Promise<{ sessionName: string; duration: number } | null> {
    if (!this.state.active) {
      console.log('⚠️ No active session');
      return null;
    }

    // Clear intervals
    if (this.state.screenRecordInterval) {
      clearInterval(this.state.screenRecordInterval);
    }
    if (this.state.cameraSnapInterval) {
      clearInterval(this.state.cameraSnapInterval);
    }

    const timestamp = new Date().toISOString();
    const duration = this.state.startTime 
      ? new Date(timestamp).getTime() - new Date(this.state.startTime).getTime()
      : 0;

    const sessionName = this.state.sessionName || 'unnamed';

    // Log session stop
    const activity: Activity = {
      timestamp,
      type: 'session_stop',
      duration,
      metadata_json: JSON.stringify({ sessionName }),
    };
    this.db.insertActivity(activity);
    this.logger.logSessionStop(sessionName, duration);

    console.log(`🛑 Session stopped: ${sessionName} (${Math.round(duration / 60000)} min)`);

    // Reset state
    this.state = { active: false, sessionName: null, startTime: null };
    this.saveState();

    return { sessionName, duration };
  }

  async checkIn(message: string): Promise<void> {
    await this.checkInHandler.addCheckIn(message, 'cli');
  }

  getStatus(): { active: boolean; sessionName: string | null; startTime: string | null; durationMin: number } {
    const durationMin = this.state.startTime
      ? Math.round((Date.now() - new Date(this.state.startTime).getTime()) / 60000)
      : 0;

    return {
      active: this.state.active,
      sessionName: this.state.sessionName,
      startTime: this.state.startTime,
      durationMin,
    };
  }

  getDatabase(): LifeLogDatabase {
    return this.db;
  }
}
