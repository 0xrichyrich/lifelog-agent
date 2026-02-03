#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Config } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';
import { SessionManager } from '../services/session-manager.js';
import { Exporter } from '../services/exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
function loadConfig(): Config {
  const configPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(__dirname, '..', '..', 'config.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    }
  }

  throw new Error('config.json not found');
}

const config = loadConfig();

// Ensure directories exist
[config.dataDir, config.logsDir, config.recordings.screenDir, config.recordings.snapshotDir, config.recordings.audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize components
const db = new LifeLogDatabase(config);
const logger = new MarkdownLogger(config);
const sessionManager = new SessionManager(config, db, logger);
const exporter = new Exporter(config, db);

// CLI Program
const program = new Command();

program
  .name('lifelog')
  .description('LifeLog Agent - Multimodal AI life coach data collection')
  .version('0.1.0');

program
  .command('start [session-name]')
  .description('Start a recording session')
  .action(async (sessionName?: string) => {
    const name = sessionName || `session-${Date.now()}`;
    const started = await sessionManager.start(name);
    
    if (started) {
      console.log(`\n📊 Recording screen every ${config.intervals.screenRecordIntervalMs / 60000} min`);
      console.log(`📷 Capturing camera every ${config.intervals.cameraSnapshotIntervalMs / 60000} min`);
      console.log('\nPress Ctrl+C or run "lifelog stop" to end session\n');
      
      // Keep process running
      process.on('SIGINT', async () => {
        console.log('\n\nReceived SIGINT, stopping session...');
        await sessionManager.stop();
        process.exit(0);
      });

      // Keep alive
      setInterval(() => {}, 1000);
    }
  });

program
  .command('stop')
  .description('Stop the current recording session')
  .action(async () => {
    const result = await sessionManager.stop();
    if (result) {
      console.log(`\n✅ Session "${result.sessionName}" completed`);
      console.log(`   Duration: ${Math.round(result.duration / 60000)} minutes`);
      
      // Show stats
      const stats = db.getStats();
      console.log(`\n📊 Total records:`);
      console.log(`   Activities: ${stats.activities}`);
      console.log(`   Check-ins: ${stats.checkIns}`);
      console.log(`   Media: ${stats.media}`);
    }
    process.exit(0);
  });

program
  .command('checkin <message>')
  .description('Add a manual check-in entry')
  .action(async (message: string) => {
    await sessionManager.checkIn(message);
    process.exit(0);
  });

program
  .command('status')
  .description('Show current session status')
  .action(() => {
    const status = sessionManager.getStatus();
    const stats = db.getStats();

    console.log('\n📊 LifeLog Status\n');
    
    if (status.active) {
      console.log(`🟢 Session Active: ${status.sessionName}`);
      console.log(`   Started: ${status.startTime}`);
      console.log(`   Duration: ${status.durationMin} minutes`);
    } else {
      console.log('⚪ No active session');
    }

    console.log(`\n📁 Database Stats:`);
    console.log(`   Activities: ${stats.activities}`);
    console.log(`   Check-ins: ${stats.checkIns}`);
    console.log(`   Media: ${stats.media}`);
    console.log(`   Summaries: ${stats.summaries}`);
    
    process.exit(0);
  });

program
  .command('export <date>')
  .description('Export a day\'s data as JSON (format: YYYY-MM-DD)')
  .option('-o, --output <path>', 'Output file path')
  .action((date: string, options: { output?: string }) => {
    try {
      const outputPath = exporter.exportToFile(date, options.output);
      
      const stats = exporter.getSummaryStats(date);
      console.log(`\n📊 Export Summary for ${date}:`);
      console.log(`   Sessions: ${stats.sessions}`);
      console.log(`   Activities: ${stats.activities}`);
      console.log(`   Check-ins: ${stats.checkIns}`);
      console.log(`   Media: ${stats.media}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
    process.exit(0);
  });

program.parse();
