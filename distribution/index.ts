/**
 * LifeLog Distribution Agent
 * 
 * Finds hackathon projects, generates integrations, and opens quality PRs.
 * Goal: Win through distribution + network effects, not spam.
 */

export { scanForCandidates, type Candidate, type ScanResult } from './scanner.js';
export { generateIntegration, generateAllIntegrations, type GeneratedIntegration } from './generator.js';
export { runAutomator, type PRResult, type PRTracker } from './automator.js';

// Main CLI entry point
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'scan':
      const { scanForCandidates } = await import('./scanner.js');
      await scanForCandidates();
      break;
      
    case 'generate':
      const { generateAllIntegrations } = await import('./generator.js');
      const candidatesPath = new URL('./candidates.json', import.meta.url).pathname;
      generateAllIntegrations(candidatesPath);
      break;
      
    case 'automate':
      const { runAutomator } = await import('./automator.js');
      const integrationsPath = new URL('./integrations.json', import.meta.url).pathname;
      const dryRun = process.argv.includes('--dry-run');
      const maxArg = process.argv.find(a => a.startsWith('--max='));
      const maxPRs = maxArg ? parseInt(maxArg.split('=')[1]) : 3;
      await runAutomator(integrationsPath, maxPRs, dryRun);
      break;
      
    case 'full':
      console.log('🚀 Running full distribution pipeline...\n');
      
      // Step 1: Scan
      console.log('Step 1: Scanning for candidates...\n');
      const scanner = await import('./scanner.js');
      await scanner.scanForCandidates();
      
      // Step 2: Generate
      console.log('\nStep 2: Generating integrations...\n');
      const generator = await import('./generator.js');
      const candPath = new URL('./candidates.json', import.meta.url).pathname;
      generator.generateAllIntegrations(candPath);
      
      // Step 3: Automate (dry run by default)
      console.log('\nStep 3: Automating PRs (dry run)...\n');
      const automator = await import('./automator.js');
      const intPath = new URL('./integrations.json', import.meta.url).pathname;
      await automator.runAutomator(intPath, 3, true);
      
      console.log('\n✅ Pipeline complete! Review above and run with --no-dry to open real PRs.');
      break;
      
    default:
      console.log(`
LifeLog Distribution Agent
===========================

Commands:
  scan      - Find hackathon repos that could benefit from LifeLog
  generate  - Create integration code for each candidate
  automate  - Fork repos and open PRs (add --dry-run for testing)
  full      - Run entire pipeline (scan → generate → automate dry run)

Options:
  --dry-run   Don't actually open PRs
  --max=N     Maximum PRs to open (default: 3)

Examples:
  npx tsx distribution/index.ts scan
  npx tsx distribution/index.ts generate
  npx tsx distribution/index.ts automate --dry-run
  npx tsx distribution/index.ts automate --max=5
  npx tsx distribution/index.ts full
`);
  }
}

// Run if executed directly
if (process.argv[1]?.includes('index')) {
  main().catch(console.error);
}
