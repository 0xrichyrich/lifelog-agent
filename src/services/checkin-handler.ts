import { Config, CheckIn } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';

export class CheckInHandler {
  private db: LifeLogDatabase;
  private logger: MarkdownLogger;

  constructor(config: Config, db: LifeLogDatabase, logger: MarkdownLogger) {
    this.db = db;
    this.logger = logger;
  }

  async addCheckIn(message: string, source: 'cli' | 'api' | 'auto' = 'cli'): Promise<CheckIn> {
    const timestamp = new Date().toISOString();

    const checkIn: CheckIn = {
      timestamp,
      message,
      source,
    };

    const id = this.db.insertCheckIn(checkIn);
    checkIn.id = id;
    
    this.logger.logCheckIn(checkIn);
    
    console.log(`✓ Check-in recorded: "${message}"`);
    return checkIn;
  }

  getCheckInsForToday(): CheckIn[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.getCheckInsByDate(today);
  }

  getCheckInsForDate(date: string): CheckIn[] {
    return this.db.getCheckInsByDate(date);
  }
}
