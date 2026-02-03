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
import { TokenRewards, loadConfig as loadTokenConfig, GoalType as TokenGoalType, getClaimableGoals } from '../token/index.js';
import { ACPClient, getACPClient } from '../acp/index.js';

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

// ===== TOKEN COMMANDS =====

const tokenCommand = program
  .command('token')
  .description('$NUDGE token management');

tokenCommand
  .command('balance [address]')
  .description('Show $NUDGE token balance and stats')
  .action(async (address?: string) => {
    try {
      const tokenConfig = loadTokenConfig();
      const rewards = new TokenRewards(tokenConfig);
      const userAddress = address || process.env.USER_WALLET_ADDRESS;
      
      if (!userAddress) {
        console.error('❌ No address provided. Set USER_WALLET_ADDRESS or pass as argument.');
        process.exit(1);
      }
      
      const stats = await rewards.getUserStats(userAddress);
      const rates = await rewards.getRewardRates();
      
      console.log('\n💰 $NUDGE Token Stats\n');
      console.log(`   Address: ${userAddress}`);
      console.log(`   Balance: ${stats.balance} $NUDGE`);
      console.log(`   Total Earned: ${stats.earned} $NUDGE`);
      console.log(`   Goals Completed: ${stats.goalsCompleted}`);
      console.log('\n📊 Reward Rates:');
      console.log(`   Daily Goal: ${rates.daily} $NUDGE`);
      console.log(`   Weekly Goal: ${rates.weekly} $NUDGE`);
      console.log(`   Streak Bonus: ${rates.streak} $NUDGE`);
      console.log(`\n🔗 Contract: ${rewards.getContractAddress()}\n`);
    } catch (error: any) {
      console.error('❌ Error fetching balance:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

tokenCommand
  .command('claimable [address]')
  .description('Show unclaimed goal rewards')
  .action(async (address?: string) => {
    try {
      const tokenConfig = loadTokenConfig();
      const rewards = new TokenRewards(tokenConfig);
      const userAddress = address || process.env.USER_WALLET_ADDRESS;
      
      if (!userAddress) {
        console.error('❌ No address provided. Set USER_WALLET_ADDRESS or pass as argument.');
        process.exit(1);
      }
      
      const claimable = await getClaimableGoals(rewards, userAddress);
      
      console.log('\n🎯 Claimable Rewards\n');
      
      const unclaimed = claimable.filter(g => !g.claimed);
      const claimed = claimable.filter(g => g.claimed);
      
      if (unclaimed.length === 0) {
        console.log('   No unclaimed rewards.\n');
      } else {
        let totalReward = 0;
        for (const goal of unclaimed) {
          console.log(`   ○ ${goal.name}: ${goal.reward} $NUDGE`);
          totalReward += parseFloat(goal.reward);
        }
        console.log(`\n   Total Claimable: ${totalReward} $NUDGE\n`);
        console.log('   Run "lifelog token claim" to claim all rewards.\n');
      }
      
      if (claimed.length > 0) {
        console.log(`   ✓ ${claimed.length} goals already claimed\n`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

tokenCommand
  .command('claim [address]')
  .description('Claim all pending goal rewards')
  .action(async (address?: string) => {
    try {
      const tokenConfig = loadTokenConfig();
      const rewards = new TokenRewards(tokenConfig);
      const userAddress = address || process.env.USER_WALLET_ADDRESS;
      
      if (!userAddress) {
        console.error('❌ No address provided. Set USER_WALLET_ADDRESS or pass as argument.');
        process.exit(1);
      }
      
      if (!tokenConfig.privateKey) {
        console.error('❌ WALLET_PRIVATE_KEY not set. Cannot mint tokens.');
        process.exit(1);
      }
      
      const claimable = await getClaimableGoals(rewards, userAddress);
      const unclaimed = claimable.filter(g => !g.claimed);
      
      if (unclaimed.length === 0) {
        console.log('\n✅ No rewards to claim.\n');
        process.exit(0);
      }
      
      console.log(`\n🚀 Claiming ${unclaimed.length} goal rewards...\n`);
      
      const goals = unclaimed.map(g => ({
        id: g.id,
        type: g.type as TokenGoalType,
      }));
      
      const result = await rewards.rewardGoalsBatch(userAddress, goals);
      
      console.log('✅ Rewards claimed!');
      console.log(`   Amount: ${result.totalReward} $NUDGE`);
      console.log(`   Transaction: ${result.txHash}\n`);
    } catch (error: any) {
      console.error('❌ Claim failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

tokenCommand
  .command('features')
  .description('Show premium features you can unlock with $NUDGE')
  .action(async () => {
    try {
      const tokenConfig = loadTokenConfig();
      const rewards = new TokenRewards(tokenConfig);
      
      const features = [
        'premium_insights',
        'ai_coach_call',
        'custom_goals',
        'export_reports',
        'agent_discount',
      ];
      
      console.log('\n🔓 Premium Features\n');
      
      for (const feature of features) {
        const cost = await rewards.getFeatureCost(feature);
        const displayName = feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`   ${displayName}: ${cost} $NUDGE`);
      }
      
      console.log('\n   Burn tokens with: lifelog token unlock <feature>\n');
    } catch (error: any) {
      console.error('❌ Error:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

tokenCommand
  .command('unlock <feature>')
  .description('Unlock a premium feature by burning $NUDGE tokens')
  .action(async (feature: string) => {
    try {
      const tokenConfig = loadTokenConfig();
      const rewards = new TokenRewards(tokenConfig);
      
      console.log(`\n🔥 Unlocking ${feature}...`);
      
      const result = await rewards.unlockFeature(feature);
      
      console.log('✅ Feature unlocked!');
      console.log(`   Cost: ${result.cost} $NUDGE (burned)`);
      console.log(`   Transaction: ${result.txHash}\n`);
    } catch (error: any) {
      console.error('❌ Unlock failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

// ===== ACP (AGENT COMMERCE PROTOCOL) COMMANDS =====

const acpCommand = program
  .command('acp')
  .description('Agent marketplace (Virtuals ACP)');

acpCommand
  .command('browse [query]')
  .description('Browse wellness agents on the marketplace')
  .action(async (query?: string) => {
    try {
      const acp = getACPClient();
      const agents = await acp.browseWellnessAgents(query);
      
      console.log('\n🤖 Wellness Agents Marketplace\n');
      
      if (query) {
        console.log(`   Searching for: "${query}"\n`);
      }
      
      if (agents.length === 0) {
        console.log('   No agents found.\n');
        process.exit(0);
      }
      
      for (const agent of agents) {
        const stars = '⭐'.repeat(Math.round(agent.rating));
        console.log(`   📦 ${agent.name} (${agent.id})`);
        console.log(`      ${agent.description}`);
        console.log(`      💰 $${agent.priceUsd.toFixed(2)} USDC | ${stars} ${agent.rating} | ${agent.completedJobs} jobs`);
        console.log(`      🏷️  ${agent.category} | ${agent.capabilities.join(', ')}`);
        console.log('');
      }
      
      console.log('   Hire with: lifelog acp hire <agent-id> "<task description>"\n');
    } catch (error: any) {
      console.error('❌ Browse failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

acpCommand
  .command('hire <agent-id> <task>')
  .description('Hire an agent to perform a task')
  .action(async (agentId: string, task: string) => {
    try {
      const acp = getACPClient();
      
      console.log('\n🤝 Creating ACP Job...\n');
      
      const job = await acp.hireAgent(agentId, task);
      
      console.log('\n✅ Job Created!');
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Agent: ${job.agentId}`);
      console.log(`   Task: ${job.taskDescription}`);
      console.log(`   Cost: $${job.cost.toFixed(2)} USDC`);
      console.log(`   Status: ${job.status}`);
      console.log('\n   Check status: lifelog acp jobs\n');
    } catch (error: any) {
      console.error('❌ Hire failed:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

acpCommand
  .command('jobs')
  .description('List your ACP jobs')
  .action(async () => {
    try {
      const acp = getACPClient();
      const jobs = await acp.listJobs();
      
      console.log('\n📋 Your ACP Jobs\n');
      
      if (jobs.length === 0) {
        console.log('   No jobs found. Hire an agent with: lifelog acp hire <agent-id> "<task>"\n');
        process.exit(0);
      }
      
      for (const job of jobs) {
        const statusEmoji = job.status === 'completed' ? '✅' : job.status === 'in_progress' ? '🔄' : '⏳';
        console.log(`   ${statusEmoji} ${job.id}`);
        console.log(`      Agent: ${job.agentId}`);
        console.log(`      Task: ${job.taskDescription}`);
        console.log(`      Status: ${job.status}`);
        console.log(`      Cost: $${job.cost.toFixed(2)} USDC`);
        if (job.result) {
          console.log(`      Result: ${job.result.substring(0, 100)}...`);
        }
        console.log('');
      }
    } catch (error: any) {
      console.error('❌ Error:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

acpCommand
  .command('balance')
  .description('Check ACP wallet balance (USDC)')
  .action(async () => {
    try {
      const acp = getACPClient();
      const balance = await acp.getWalletBalance();
      
      console.log('\n💰 ACP Wallet\n');
      console.log(`   Address: ${balance.address}`);
      console.log(`   USDC Balance: $${balance.usdc}\n`);
    } catch (error: any) {
      console.error('❌ Error:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

acpCommand
  .command('recommend')
  .description('Get AI-powered agent recommendation based on your patterns')
  .action(async () => {
    try {
      const acp = getACPClient();
      
      console.log('\n🧠 Analyzing your patterns...\n');
      
      // Get patterns from LifeLog data
      const patternReport = await patterns.getPatternReport(7);
      
      // Mock pattern data for demo (in production, parse from patternReport)
      const mockPatterns = {
        exerciseConsistency: 0.4,
        sleepQuality: 0.7,
        stressLevel: 0.5,
        goalStreak: 2,
      };
      
      const recommendation = await acp.getRecommendation(mockPatterns);
      
      if (!recommendation) {
        console.log('   ✅ No recommendations right now. You\'re doing great!\n');
        process.exit(0);
      }
      
      console.log('   💡 Recommendation:\n');
      console.log(`   📦 ${recommendation.agent.name}`);
      console.log(`      ${recommendation.agent.description}`);
      console.log(`\n   Why: ${recommendation.reason}`);
      console.log(`\n   Suggested task: "${recommendation.suggestedTask}"`);
      console.log(`   Cost: $${recommendation.agent.priceUsd.toFixed(2)} USDC`);
      console.log(`\n   Hire now: lifelog acp hire ${recommendation.agent.id} "${recommendation.suggestedTask}"\n`);
    } catch (error: any) {
      console.error('❌ Error:', error?.message || error);
      process.exit(1);
    }
    process.exit(0);
  });

program.parse();
