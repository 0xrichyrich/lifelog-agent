import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { Activity, CheckIn, MediaRecord, Config } from '../types/index.js';

export class MarkdownLogger {
  private logsDir: string;

  constructor(config: Config) {
    this.logsDir = config.logsDir;
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogPath(date: Date = new Date()): string {
    const filename = format(date, 'yyyy-MM-dd') + '.md';
    return path.join(this.logsDir, filename);
  }

  private ensureHeader(logPath: string, date: Date): void {
    if (!fs.existsSync(logPath)) {
      const header = `# LifeLog - ${format(date, 'EEEE, MMMM d, yyyy')}\n\n`;
      fs.writeFileSync(logPath, header);
    }
  }

  private appendLine(logPath: string, line: string): void {
    fs.appendFileSync(logPath, line + '\n');
  }

  logActivity(activity: Activity): void {
    const date = new Date(activity.timestamp);
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const time = format(date, 'HH:mm:ss');
    const metadata = JSON.parse(activity.metadata_json);
    
    let line = `- **${time}** [${activity.type}]`;
    if (activity.duration) {
      line += ` (${Math.round(activity.duration / 1000)}s)`;
    }
    if (metadata.sessionName) {
      line += ` - Session: ${metadata.sessionName}`;
    }
    if (metadata.file) {
      line += ` → \`${path.basename(metadata.file)}\``;
    }

    this.appendLine(logPath, line);
  }

  logCheckIn(checkIn: CheckIn): void {
    const date = new Date(checkIn.timestamp);
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const time = format(date, 'HH:mm:ss');
    const line = `- **${time}** 📝 ${checkIn.message}`;

    this.appendLine(logPath, line);
  }

  logMedia(media: MediaRecord): void {
    const date = new Date(media.timestamp);
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const time = format(date, 'HH:mm:ss');
    const emoji = media.type === 'screen' ? '🖥️' : media.type === 'camera' ? '📷' : '🎤';
    const line = `- **${time}** ${emoji} Captured: \`${path.basename(media.file_path)}\``;

    this.appendLine(logPath, line);
  }

  logSessionStart(sessionName: string): void {
    const date = new Date();
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const time = format(date, 'HH:mm:ss');
    const line = `\n## 🚀 Session Started: ${sessionName} (${time})\n`;

    this.appendLine(logPath, line);
  }

  logSessionStop(sessionName: string, duration: number): void {
    const date = new Date();
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const time = format(date, 'HH:mm:ss');
    const durationMin = Math.round(duration / 60000);
    const line = `\n## 🛑 Session Ended: ${sessionName} (${time}) - Duration: ${durationMin} min\n`;

    this.appendLine(logPath, line);
  }

  addSummary(summary: string): void {
    const date = new Date();
    const logPath = this.getLogPath(date);
    this.ensureHeader(logPath, date);

    const line = `\n---\n\n### Summary\n\n${summary}\n`;
    this.appendLine(logPath, line);
  }
}
