/**
 * Cron Integration for Coaching System
 * Sets up scheduled coaching messages via OpenClaw cron
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Config } from '../types/index.js';

interface SchedulerConfig {
  cronJobs: {
    morningBriefing?: string; // cron job ID
    eveningReview?: string;
    weeklyInsights?: string;
  };
}

export class Scheduler {
  private config: Config;
  private schedulerConfigPath: string;
  private schedulerConfig: SchedulerConfig;

  constructor(config: Config) {
    this.config = config;
    this.schedulerConfigPath = path.join(process.cwd(), 'scheduler-config.json');
    this.schedulerConfig = this.loadSchedulerConfig();
  }

  /**
   * Load scheduler config from file
   */
  private loadSchedulerConfig(): SchedulerConfig {
    try {
      if (fs.existsSync(this.schedulerConfigPath)) {
        const data = fs.readFileSync(this.schedulerConfigPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading scheduler config:', error);
    }
    return { cronJobs: {} };
  }

  /**
   * Save scheduler config to file
   */
  private saveSchedulerConfig(): void {
    fs.writeFileSync(this.schedulerConfigPath, JSON.stringify(this.schedulerConfig, null, 2));
  }

  /**
   * Setup all cron jobs
   */
  async setupCronJobs(): Promise<void> {
    console.log('🕐 Setting up coaching cron jobs...\n');

    // Morning briefing: 8:00 AM CST every day
    // Cron: 0 8 * * *
    await this.setupCronJob(
      'morningBriefing',
      '0 8 * * *',
      'lifelog coach briefing',
      'LifeLog Morning Briefing'
    );

    // Evening review: 8:00 PM CST every day
    // Cron: 0 20 * * *
    await this.setupCronJob(
      'eveningReview',
      '0 20 * * *',
      'lifelog coach review',
      'LifeLog Evening Review'
    );

    // Weekly insights: 6:00 PM CST every Sunday
    // Cron: 0 18 * * 0
    await this.setupCronJob(
      'weeklyInsights',
      '0 18 * * 0',
      'lifelog coach weekly',
      'LifeLog Weekly Insights'
    );

    this.saveSchedulerConfig();
    console.log('\n✅ All cron jobs setup complete!');
    console.log('\nSchedule:');
    console.log('  📅 Morning Briefing: 8:00 AM CST daily');
    console.log('  🌙 Evening Review: 8:00 PM CST daily');
    console.log('  📊 Weekly Insights: 6:00 PM CST every Sunday');
  }

  /**
   * Setup a single cron job via OpenClaw
   */
  private async setupCronJob(
    name: keyof SchedulerConfig['cronJobs'],
    schedule: string,
    command: string,
    description: string
  ): Promise<void> {
    try {
      // Check if job already exists
      if (this.schedulerConfig.cronJobs[name]) {
        console.log(`⏭️  ${description} already scheduled (${this.schedulerConfig.cronJobs[name]})`);
        return;
      }

      // Add cron job via OpenClaw
      // Format: openclaw cron add --schedule "CRON" --action systemEvent --text "command"
      const cmd = `openclaw cron add --schedule "${schedule}" --action systemEvent --text "${command}" --label "${name}"`;
      
      console.log(`📝 Adding: ${description}`);
      console.log(`   Schedule: ${schedule}`);
      console.log(`   Command: ${command}`);

      const result = execSync(cmd, { encoding: 'utf-8' });
      
      // Extract job ID from result (assuming it returns something like "Created job: <id>")
      const idMatch = result.match(/[a-f0-9-]{36}|job[_-]?\d+/i);
      const jobId = idMatch ? idMatch[0] : `${name}-${Date.now()}`;
      
      this.schedulerConfig.cronJobs[name] = jobId;
      console.log(`   ✅ Created with ID: ${jobId}\n`);
    } catch (error: any) {
      console.error(`   ❌ Failed to create ${description}:`, error?.message || error);
      
      // Provide manual instructions
      console.log(`\n   Manual setup: Run this command to add the cron job:`);
      console.log(`   openclaw cron add --schedule "${schedule}" --action systemEvent --text "${command}"\n`);
    }
  }

  /**
   * Remove all cron jobs
   */
  async teardownCronJobs(): Promise<void> {
    console.log('🗑️  Removing coaching cron jobs...\n');

    for (const [name, jobId] of Object.entries(this.schedulerConfig.cronJobs)) {
      if (!jobId) continue;

      try {
        const cmd = `openclaw cron remove ${jobId}`;
        console.log(`Removing: ${name} (${jobId})`);
        execSync(cmd, { encoding: 'utf-8' });
        delete this.schedulerConfig.cronJobs[name as keyof SchedulerConfig['cronJobs']];
        console.log(`   ✅ Removed\n`);
      } catch (error: any) {
        console.error(`   ❌ Failed to remove ${name}:`, error?.message || error);
        console.log(`   Manual removal: openclaw cron remove ${jobId}\n`);
      }
    }

    this.saveSchedulerConfig();
    console.log('✅ Cron jobs teardown complete!');
  }

  /**
   * List current cron jobs
   */
  listCronJobs(): void {
    console.log('\n📋 Configured Coaching Cron Jobs:\n');

    const jobs = this.schedulerConfig.cronJobs;
    
    if (Object.keys(jobs).filter(k => jobs[k as keyof typeof jobs]).length === 0) {
      console.log('  No cron jobs configured.');
      console.log('  Run "lifelog coach setup-cron" to set them up.\n');
      return;
    }

    if (jobs.morningBriefing) {
      console.log(`  📅 Morning Briefing: ${jobs.morningBriefing}`);
      console.log('     Schedule: 8:00 AM CST daily');
    }
    
    if (jobs.eveningReview) {
      console.log(`  🌙 Evening Review: ${jobs.eveningReview}`);
      console.log('     Schedule: 8:00 PM CST daily');
    }
    
    if (jobs.weeklyInsights) {
      console.log(`  📊 Weekly Insights: ${jobs.weeklyInsights}`);
      console.log('     Schedule: 6:00 PM CST Sundays');
    }

    console.log('\n  To view all cron jobs: openclaw cron list');
    console.log('  To remove: lifelog coach teardown-cron\n');
  }

  /**
   * Get scheduler status
   */
  getStatus(): { active: boolean; jobs: string[] } {
    const jobs = Object.entries(this.schedulerConfig.cronJobs)
      .filter(([_, id]) => id)
      .map(([name, _]) => name);

    return {
      active: jobs.length > 0,
      jobs,
    };
  }
}
