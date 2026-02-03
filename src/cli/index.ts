#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format, subDays } from 'date-fns';
import { Config, ActivityCategory } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';
import { SessionManager } from '../services/session-manager.js';
import { Exporter } from '../services/exporter.js';
import { Analyzer, Summarizer, PatternDetector } from '../analysis/index.js';
import { GoalManager, GoalType } from '../goals/index.js';
import { Coach, Scheduler, Nudger } from '../coaching/index.js';

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
      const config = JSON.parse(configData);
      // Add defaults for new fields
      config.summariesDir = config.summariesDir || './summaries';
      config.analysis = config.analysis || { model: 'claude-sonnet-4-20250514' };
      return config;
    }
  }

  throw new Error('config.json not found');
}

const config = loadConfig();

// Ensure directories exist
const dirs = [
  config.dataDir, 
  config.logsDir, 
  config.summariesDir,
  config.recordings.screenDir, 
  config.recordings.snapshotDir, 
  config.recordings.audioDir
];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize components
const db = new LifeLogDatabase(config);
const logger = new MarkdownLogger(config);
const sessionManager = new SessionManager(config, db, logger);
const exporter = new Exporter(config, db);
const analyzer = new Analyzer(config, db);
const summarizer = new Summarizer(config, db);
const patterns = new PatternDetector(config, db);
const goalManager = new GoalManager(config, db);
const coach = new Coach(config, db);
const scheduler = new Scheduler(config);
const nudger = new Nudger(config, db);

// CLI Program
const program = new Command();

program
  .name('lifelog')
  .description('LifeLog Agent - Multimodal AI life coach data collection & analysis')
  .version('0.2.0');

// ===== DATA COLLECTION COMMANDS =====

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

// ===== ANALYSIS COMMANDS =====

program
  .command('analyze [date]')
  .description('Run AI analysis on a day\'s data (default: today)')
  .option('-f, --force', 'Re-analyze even if analysis exists')
  .action(async (date?: string, options?: { force?: boolean }) => {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    
    console.log(`\n🔬 Running AI analysis for ${targetDate}...\n`);
    
    try {
      const results = await analyzer.analyzeDate(targetDate);
      
      console.log(`\n📊 Analysis Results:`);
      console.log(`   Screen analyses: ${results.screenAnalyses.length}`);
      console.log(`   Camera analyses: ${results.cameraAnalyses.length}`);
      console.log(`   Audio analyses: ${results.audioAnalyses.length}`);
      
      // Show category breakdown from screen analyses
      if (results.screenAnalyses.length > 0) {
        const categories: Record<string, number> = {};
        for (const { analysis } of results.screenAnalyses) {
          categories[analysis.category] = (categories[analysis.category] || 0) + 1;
        }
        
        console.log(`\n   Activity Categories Detected:`);
        for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
          console.log(`   - ${cat}: ${count}`);
        }
      }
      
      console.log(`\n✅ Analysis complete. Run 'lifelog summary ${targetDate}' to generate a report.`);
    } catch (error: any) {
      console.error(`\n❌ Analysis failed:`, error?.message || error);
    }
    
    process.exit(0);
  });

program
  .command('summary [date]')
  .description('Generate or view daily summary (default: today)')
  .option('-g, --generate', 'Force regenerate summary')
  .action(async (date?: string, options?: { generate?: boolean }) => {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Check if summary exists
      let summary = summarizer.getSummary(targetDate);
      
      if (!summary || options?.generate) {
        console.log(`\n📝 Generating summary for ${targetDate}...`);
        summary = await summarizer.generateSummary(targetDate);
      }
      
      // Display the summary
      console.log(summarizer.formatSummaryForCLI(summary));
      
      // Mention where the markdown file is
      console.log(`📄 Full summary: summaries/${targetDate}.md\n`);
    } catch (error: any) {
      console.error(`\n❌ Summary generation failed:`, error?.message || error);
    }
    
    process.exit(0);
  });

program
  .command('patterns [days]')
  .description('Show productivity patterns over N days (default: 7)')
  .action(async (daysStr?: string) => {
    const days = daysStr ? parseInt(daysStr) : 7;
    
    if (isNaN(days) || days < 1 || days > 90) {
      console.error('❌ Days must be a number between 1 and 90');
      process.exit(1);
    }
    
    try {
      const report = await patterns.getPatternReport(days);
      console.log(report);
    } catch (error: any) {
      console.error(`\n❌ Pattern detection failed:`, error?.message || error);
    }
    
    process.exit(0);
  });

// ===== UTILITY COMMANDS =====

program
  .command('list [date]')
  .description('List all media and check-ins for a date')
  .action((date?: string) => {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    
    console.log(`\n📅 Data for ${targetDate}\n`);
    
    const media = db.getMediaByDate(targetDate);
    const checkIns = db.getCheckInsByDate(targetDate);
    const activities = db.getActivitiesByDate(targetDate);
    
    if (activities.length > 0) {
      console.log('🎬 Sessions:');
      for (const act of activities.filter(a => a.type === 'session_start' || a.type === 'session_stop')) {
        const time = format(new Date(act.timestamp), 'HH:mm');
        const meta = JSON.parse(act.metadata_json);
        console.log(`   ${time} - ${act.type}: ${meta.sessionName}`);
      }
      console.log('');
    }
    
    if (media.length > 0) {
      console.log('📸 Media:');
      for (const m of media) {
        const time = format(new Date(m.timestamp), 'HH:mm');
        const analyzed = m.analysis_json ? '✓' : '○';
        console.log(`   ${time} [${m.type}] ${analyzed} ${path.basename(m.file_path)}`);
      }
      console.log('');
    }
    
    if (checkIns.length > 0) {
      console.log('📝 Check-ins:');
      for (const ci of checkIns) {
        const time = format(new Date(ci.timestamp), 'HH:mm');
        console.log(`   ${time} - ${ci.message}`);
      }
      console.log('');
    }
    
    if (media.length === 0 && checkIns.length === 0 && activities.length === 0) {
      console.log('   No data found for this date.\n');
    }
    
    process.exit(0);
  });

// ===== GOALS COMMANDS =====

const goalsCommand = program
  .command('goals')
  .description('Manage your goals');

goalsCommand
  .command('list')
  .description('List all goals with progress')
  .option('-p, --progress', 'Show detailed progress for today')
  .action(async (options: { progress?: boolean }) => {
    if (options.progress) {
      const output = await goalManager.formatProgressForCLI();
      console.log(output);
    } else {
      console.log(goalManager.formatGoalsForCLI());
    }
    process.exit(0);
  });

goalsCommand
  .command('add <name>')
  .description('Add a new goal')
  .option('-t, --type <type>', 'Goal type: daily, weekly, or streak', 'daily')
  .option('--target <number>', 'Target value (minutes for time, count for frequency)', '240')
  .option('-c, --category <category>', 'Activity category to track (coding, meetings, etc.)')
  .action((name: string, options: { type: string; target: string; category?: string }) => {
    const validTypes: GoalType[] = ['daily', 'weekly', 'streak'];
    const goalType = options.type as GoalType;
    
    if (!validTypes.includes(goalType)) {
      console.error('❌ Invalid goal type. Must be: daily, weekly, or streak');
      process.exit(1);
    }

    const target = parseInt(options.target);
    if (isNaN(target) || target <= 0) {
      console.error('❌ Target must be a positive number');
      process.exit(1);
    }

    const validCategories: ActivityCategory[] = ['coding', 'meetings', 'browsing', 'social', 'email', 'breaks', 'other'];
    if (options.category && !validCategories.includes(options.category as ActivityCategory)) {
      console.error(`❌ Invalid category. Must be one of: ${validCategories.join(', ')}`);
      process.exit(1);
    }

    const goal = goalManager.createGoal(
      name, 
      goalType, 
      target, 
      options.category as ActivityCategory | undefined
    );
    
    console.log(`\n✅ Goal created!`);
    console.log(`   ID: ${goal.id}`);
    console.log(`   Name: ${goal.name}`);
    console.log(`   Type: ${goal.type}`);
    console.log(`   Target: ${goal.target}${goal.category ? ` (${goal.category})` : ''}\n`);
    
    process.exit(0);
  });

goalsCommand
  .command('remove <id>')
  .description('Remove a goal by ID')
  .action((id: string) => {
    const success = goalManager.deleteGoal(id);
    
    if (success) {
      console.log(`\n✅ Goal removed: ${id}\n`);
    } else {
      console.error(`\n❌ Goal not found: ${id}\n`);
      process.exit(1);
    }
    
    process.exit(0);
  });

goalsCommand
  .command('progress [date]')
  .description('Show goal progress for a specific date')
  .action(async (date?: string) => {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const output = await goalManager.formatProgressForCLI(targetDate);
    console.log(output);
    process.exit(0);
  });

// ===== COACHING COMMANDS =====

const coachCommand = program
  .command('coach')
  .description('AI coaching system');

coachCommand
  .command('briefing')
  .description('Generate morning briefing')
  .action(async () => {
    try {
      console.log('\n🌅 Generating morning briefing...\n');
      const message = await coach.generateMorningBriefing();
      console.log(message);
      console.log('');
    } catch (error: any) {
      console.error('❌ Failed to generate briefing:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

coachCommand
  .command('review')
  .description('Generate evening review')
  .action(async () => {
    try {
      console.log('\n🌙 Generating evening review...\n');
      const message = await coach.generateEveningReview();
      console.log(message);
      console.log('');
    } catch (error: any) {
      console.error('❌ Failed to generate review:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

coachCommand
  .command('weekly')
  .description('Generate weekly insights')
  .action(async () => {
    try {
      console.log('\n📊 Generating weekly insights...\n');
      const message = await coach.generateWeeklyInsights();
      console.log(message);
      console.log('');
    } catch (error: any) {
      console.error('❌ Failed to generate weekly insights:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

coachCommand
  .command('nudge')
  .description('Check for and generate nudges (used by heartbeat)')
  .action(async () => {
    try {
      const result = await nudger.checkForNudge();
      
      if (result.shouldNudge && result.message) {
        // Output the nudge message - OpenClaw will route to Telegram
        console.log(result.message);
      } else {
        // No nudge needed
        console.log('HEARTBEAT_OK');
      }
    } catch (error: any) {
      console.error('❌ Nudge check failed:', error?.message || error);
      console.log('HEARTBEAT_OK'); // Don't break heartbeat on error
    }
    process.exit(0);
  });

coachCommand
  .command('setup-cron')
  .description('Setup scheduled coaching cron jobs')
  .action(async () => {
    try {
      await scheduler.setupCronJobs();
    } catch (error: any) {
      console.error('❌ Cron setup failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

coachCommand
  .command('teardown-cron')
  .description('Remove all coaching cron jobs')
  .action(async () => {
    try {
      await scheduler.teardownCronJobs();
    } catch (error: any) {
      console.error('❌ Cron teardown failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

coachCommand
  .command('cron-status')
  .description('Show status of coaching cron jobs')
  .action(() => {
    scheduler.listCronJobs();
    process.exit(0);
  });

coachCommand
  .command('heartbeat-config')
  .description('Generate HEARTBEAT.md config for nudge integration')
  .action(() => {
    const config = nudger.generateHeartbeatConfig();
    console.log(config);
    process.exit(0);
  });

program.parse();
