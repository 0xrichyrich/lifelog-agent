#!/usr/bin/env node
/**
 * LifeLog Distribution Agent - Automator
 * 
 * Forks repos, commits integration code, and opens PRs.
 * Rate-limited and quality-focused.
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedIntegration } from './generator.js';

interface PRResult {
  repo: string;
  status: 'success' | 'failed' | 'skipped';
  prUrl?: string;
  error?: string;
  timestamp: string;
}

interface PRTracker {
  lastRun: string;
  dailyCount: number;
  prsOpened: PRResult[];
}

const MAX_DAILY_PRS = 10;
const PR_DELAY_MS = 5000; // 5 seconds between PRs

function loadTracker(trackerPath: string): PRTracker {
  if (fs.existsSync(trackerPath)) {
    const data = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
    
    // Reset daily count if it's a new day
    const today = new Date().toISOString().split('T')[0];
    const lastRunDay = data.lastRun?.split('T')[0];
    
    if (lastRunDay !== today) {
      data.dailyCount = 0;
    }
    
    return data;
  }
  
  return {
    lastRun: new Date().toISOString(),
    dailyCount: 0,
    prsOpened: [],
  };
}

function saveTracker(trackerPath: string, tracker: PRTracker): void {
  tracker.lastRun = new Date().toISOString();
  fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));
}

function checkPrerequisites(): boolean {
  try {
    // Check gh CLI is authenticated
    execSync('gh auth status', { encoding: 'utf-8' });
    return true;
  } catch (error) {
    console.error('❌ GitHub CLI not authenticated. Run: gh auth login');
    return false;
  }
}

function forkRepo(owner: string, name: string): boolean {
  try {
    console.log(`  🍴 Forking ${owner}/${name}...`);
    
    // Check if fork already exists
    const forkCheck = execSync(
      `gh repo view 0xrichyrich/${name} --json name 2>/dev/null || echo "not_found"`,
      { encoding: 'utf-8' }
    );
    
    if (!forkCheck.includes('not_found')) {
      console.log(`  ⏭️ Fork already exists`);
      return true;
    }
    
    // Fork the repo
    execSync(`gh repo fork ${owner}/${name} --clone=false`, {
      encoding: 'utf-8',
      timeout: 60000,
    });
    
    // Wait for fork to be ready
    console.log(`  ⏳ Waiting for fork to be ready...`);
    execSync('sleep 5');
    
    return true;
  } catch (error) {
    console.error(`  ❌ Fork failed:`, error);
    return false;
  }
}

function cloneAndBranch(name: string, workDir: string): boolean {
  try {
    const repoPath = path.join(workDir, name);
    
    // Remove if exists
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true });
    }
    
    console.log(`  📥 Cloning fork...`);
    execSync(`gh repo clone 0xrichyrich/${name} ${repoPath}`, {
      encoding: 'utf-8',
      timeout: 120000,
    });
    
    // Create branch
    console.log(`  🌿 Creating branch feat/lifelog-integration...`);
    execSync(`git checkout -b feat/lifelog-integration`, {
      cwd: repoPath,
      encoding: 'utf-8',
    });
    
    return true;
  } catch (error) {
    console.error(`  ❌ Clone/branch failed:`, error);
    return false;
  }
}

function addFiles(name: string, workDir: string, files: { path: string; content: string }[]): boolean {
  try {
    const repoPath = path.join(workDir, name);
    
    for (const file of files) {
      const filePath = path.join(repoPath, file.path);
      fs.writeFileSync(filePath, file.content);
      console.log(`  📝 Added ${file.path}`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to add files:`, error);
    return false;
  }
}

function commitAndPush(name: string, workDir: string): boolean {
  try {
    const repoPath = path.join(workDir, name);
    
    console.log(`  💾 Committing changes...`);
    execSync(`git add .`, { cwd: repoPath, encoding: 'utf-8' });
    execSync(`git commit -m "feat: add LifeLog wellness integration"`, {
      cwd: repoPath,
      encoding: 'utf-8',
    });
    
    console.log(`  🚀 Pushing to fork...`);
    execSync(`git push origin feat/lifelog-integration`, {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 60000,
    });
    
    return true;
  } catch (error) {
    console.error(`  ❌ Commit/push failed:`, error);
    return false;
  }
}

function openPR(owner: string, name: string, title: string, body: string): string | null {
  try {
    console.log(`  📬 Opening pull request...`);
    
    // Create PR using gh CLI
    const result = execSync(
      `gh pr create --repo ${owner}/${name} --head 0xrichyrich:feat/lifelog-integration --title "${title}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { encoding: 'utf-8', timeout: 60000 }
    );
    
    // Extract PR URL
    const prUrl = result.trim();
    console.log(`  ✅ PR opened: ${prUrl}`);
    
    return prUrl;
  } catch (error) {
    console.error(`  ❌ PR creation failed:`, error);
    return null;
  }
}

async function processIntegration(
  integration: GeneratedIntegration,
  workDir: string,
  tracker: PRTracker
): Promise<PRResult> {
  const { candidate, prTitle, prBody, files } = integration;
  const { owner, name, repo } = candidate;
  
  console.log(`\n📦 Processing ${repo}...`);
  
  // Check if we already opened a PR for this repo
  const existingPR = tracker.prsOpened.find(pr => pr.repo === repo);
  if (existingPR) {
    console.log(`  ⏭️ Already processed (${existingPR.status})`);
    return {
      repo,
      status: 'skipped',
      error: 'Already processed',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Step 1: Fork
  if (!forkRepo(owner, name)) {
    return {
      repo,
      status: 'failed',
      error: 'Fork failed',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Step 2: Clone and branch
  if (!cloneAndBranch(name, workDir)) {
    return {
      repo,
      status: 'failed',
      error: 'Clone/branch failed',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Step 3: Add files
  if (!addFiles(name, workDir, files)) {
    return {
      repo,
      status: 'failed',
      error: 'Add files failed',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Step 4: Commit and push
  if (!commitAndPush(name, workDir)) {
    return {
      repo,
      status: 'failed',
      error: 'Commit/push failed',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Step 5: Open PR
  const prUrl = openPR(owner, name, prTitle, prBody);
  
  if (prUrl) {
    return {
      repo,
      status: 'success',
      prUrl,
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      repo,
      status: 'failed',
      error: 'PR creation failed',
      timestamp: new Date().toISOString(),
    };
  }
}

async function runAutomator(
  integrationsPath: string,
  maxPRs: number = 3,
  dryRun: boolean = false
): Promise<void> {
  console.log('🤖 LifeLog Distribution Agent - Automator\n');
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    return;
  }
  
  // Load integrations
  if (!fs.existsSync(integrationsPath)) {
    console.error('❌ No integrations.json found. Run generator first.');
    return;
  }
  
  const integrations: GeneratedIntegration[] = JSON.parse(
    fs.readFileSync(integrationsPath, 'utf-8')
  );
  
  console.log(`📋 Found ${integrations.length} integrations to process`);
  
  // Load tracker
  const trackerPath = path.join(path.dirname(integrationsPath), 'pr-tracker.json');
  const tracker = loadTracker(trackerPath);
  
  console.log(`📊 Daily PR count: ${tracker.dailyCount}/${MAX_DAILY_PRS}`);
  
  // Check daily limit
  if (tracker.dailyCount >= MAX_DAILY_PRS) {
    console.log('⚠️ Daily PR limit reached. Try again tomorrow.');
    return;
  }
  
  // Create work directory
  const workDir = path.join(path.dirname(integrationsPath), 'repos');
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }
  
  // Sort by fit score and take top candidates
  const sorted = [...integrations].sort((a, b) => 
    b.candidate.fitScore - a.candidate.fitScore
  );
  
  const toProcess = sorted.slice(0, Math.min(maxPRs, MAX_DAILY_PRS - tracker.dailyCount));
  
  console.log(`\n🎯 Will process top ${toProcess.length} candidates\n`);
  
  if (dryRun) {
    console.log('🏃 DRY RUN - No actual PRs will be opened\n');
    for (const integration of toProcess) {
      console.log(`Would process: ${integration.candidate.repo}`);
      console.log(`  Score: ${integration.candidate.fitScore}/10`);
      console.log(`  Category: ${integration.candidate.category}`);
      console.log(`  PR Title: ${integration.prTitle}`);
      console.log('');
    }
    return;
  }
  
  // Process each integration
  for (const integration of toProcess) {
    const result = await processIntegration(integration, workDir, tracker);
    tracker.prsOpened.push(result);
    
    if (result.status === 'success') {
      tracker.dailyCount++;
      console.log(`✅ Success! PR: ${result.prUrl}`);
    }
    
    // Save tracker after each PR
    saveTracker(trackerPath, tracker);
    
    // Rate limiting delay
    if (toProcess.indexOf(integration) < toProcess.length - 1) {
      console.log(`\n⏳ Waiting ${PR_DELAY_MS / 1000}s before next PR...`);
      await new Promise(r => setTimeout(r, PR_DELAY_MS));
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`  Total processed: ${toProcess.length}`);
  console.log(`  Successful: ${tracker.prsOpened.filter(p => p.status === 'success').length}`);
  console.log(`  Failed: ${tracker.prsOpened.filter(p => p.status === 'failed').length}`);
  console.log(`  Skipped: ${tracker.prsOpened.filter(p => p.status === 'skipped').length}`);
  
  // Clean up work directory
  console.log('\n🧹 Cleaning up temporary repos...');
  fs.rmSync(workDir, { recursive: true, force: true });
  
  console.log('\n✨ Done!');
}

// CLI interface
if (process.argv[1]?.includes('automator')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxPRs = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '3');
  
  const integrationsPath = new URL('./integrations.json', import.meta.url).pathname;
  runAutomator(integrationsPath, maxPRs, dryRun).catch(console.error);
}

export { runAutomator, PRResult, PRTracker };
