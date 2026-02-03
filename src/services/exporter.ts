import fs from 'fs';
import path from 'path';
import { Config, ExportData } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';

export class Exporter {
  private config: Config;
  private db: LifeLogDatabase;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
  }

  exportDay(date: string): ExportData {
    const activities = this.db.getActivitiesByDate(date);
    const checkIns = this.db.getCheckInsByDate(date);
    const media = this.db.getMediaByDate(date);
    const summary = this.db.getSummary(date);

    const exportData: ExportData = {
      date,
      activities,
      checkIns,
      media,
      summaries: summary ? [summary] : [],
    };

    return exportData;
  }

  exportToFile(date: string, outputPath?: string): string {
    const data = this.exportDay(date);
    const filename = outputPath || path.join(this.config.dataDir, `export_${date}.json`);
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✓ Exported ${date} to ${filename}`);
    
    return filename;
  }

  getSummaryStats(date: string): { activities: number; checkIns: number; media: number; sessions: number } {
    const data = this.exportDay(date);
    const sessions = data.activities.filter(a => a.type === 'session_start').length;
    
    return {
      activities: data.activities.length,
      checkIns: data.checkIns.length,
      media: data.media.length,
      sessions,
    };
  }
}
