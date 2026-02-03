#!/usr/bin/env node
/**
 * LifeLog Distribution Agent - Scanner
 * 
 * Finds hackathon repos that could benefit from LifeLog integration.
 * Scores projects on fit, quality, and value-add potential.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

interface Candidate {
  repo: string;
  owner: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  updatedAt: string;
  hasReadme: boolean;
  topics: string[];
  category: 'productivity' | 'gaming' | 'defi' | 'social' | 'developer' | 'other';
  fitScore: number;
  valueProposition: string;
  integrationIdea: string;
}

interface ScanResult {
  scannedAt: string;
  totalFound: number;
  candidates: Candidate[];
}

// Search queries for finding hackathon projects
const SEARCH_QUERIES = [
  // Agent hackathons
  'solana agent hackathon',
  'ai agent hackathon 2026',
  'solana agent kit',
  
  // Colosseum
  'colosseum hackathon',
  
  // Categories that benefit from wellness tracking
  'solana productivity',
  'solana pomodoro',
  'solana habit tracker',
  'solana todo',
  'solana task manager',
  
  // Gaming - achievements
  'solana game achievement',
  'solana play to earn',
  'solana nft game',
  
  // DeFi - trading journal potential
  'solana trading bot',
  'solana portfolio tracker',
  'solana dex',
  
  // Developer tools
  'solana developer tools',
  'solana cli tool',
];

// Keywords that indicate good fit for LifeLog integration
const HIGH_FIT_KEYWORDS = [
  'productivity', 'pomodoro', 'habit', 'tracking', 'todo', 'task',
  'achievement', 'goal', 'streak', 'daily', 'journal', 'log',
  'wellness', 'health', 'fitness', 'meditation', 'mindfulness',
  'gamification', 'rewards', 'points', 'level',
];

const MEDIUM_FIT_KEYWORDS = [
  'agent', 'bot', 'trading', 'portfolio', 'analytics', 'dashboard',
  'mobile', 'app', 'cli', 'tool', 'utility', 'game', 'social',
];

// Keywords that indicate we should NOT integrate (competitors or irrelevant)
const EXCLUDE_KEYWORDS = [
  'life log', 'lifelog', 'life-log', 'wellness app', 'habit tracker app',
  'diary', 'personal journal',
];

function runGitHubSearch(query: string, limit: number = 15): string[] {
  try {
    const result = execSync(
      `gh search repos "${query}" --sort=updated --limit=${limit} --json fullName,description,stargazersCount,primaryLanguage,updatedAt,repositoryTopics`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (error) {
    console.error(`Search failed for "${query}":`, error);
    return [];
  }
}

function getRepoDetails(fullName: string): { hasReadme: boolean; languages: string[] } {
  try {
    // Check for README
    const readmeCheck = execSync(
      `gh api repos/${fullName}/readme --jq '.name' 2>/dev/null || echo ""`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    
    const hasReadme = readmeCheck.toLowerCase().includes('readme');

    // Get languages
    const languagesJson = execSync(
      `gh api repos/${fullName}/languages --jq 'keys'`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    const languages = JSON.parse(languagesJson);

    return { hasReadme, languages };
  } catch (error) {
    return { hasReadme: false, languages: [] };
  }
}

function categorizeProject(description: string, topics: string[]): Candidate['category'] {
  const text = `${description} ${topics.join(' ')}`.toLowerCase();
  
  if (text.includes('productivity') || text.includes('todo') || text.includes('task') || 
      text.includes('pomodoro') || text.includes('habit')) {
    return 'productivity';
  }
  if (text.includes('game') || text.includes('play') || text.includes('nft') || 
      text.includes('achievement')) {
    return 'gaming';
  }
  if (text.includes('defi') || text.includes('trading') || text.includes('swap') ||
      text.includes('dex') || text.includes('portfolio')) {
    return 'defi';
  }
  if (text.includes('social') || text.includes('chat') || text.includes('community') ||
      text.includes('dao')) {
    return 'social';
  }
  if (text.includes('developer') || text.includes('cli') || text.includes('tool') ||
      text.includes('sdk') || text.includes('kit')) {
    return 'developer';
  }
  return 'other';
}

function calculateFitScore(description: string, topics: string[], language: string): number {
  const text = `${description} ${topics.join(' ')}`.toLowerCase();
  let score = 5; // Base score

  // Check for exclusions first
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (text.includes(keyword)) {
      return 0; // Don't integrate with competitors
    }
  }

  // High fit keywords: +2 each
  for (const keyword of HIGH_FIT_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 2;
    }
  }

  // Medium fit keywords: +1 each
  for (const keyword of MEDIUM_FIT_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 1;
    }
  }

  // Language bonus
  const supportedLanguages = ['typescript', 'javascript', 'python', 'swift', 'rust'];
  if (supportedLanguages.includes(language?.toLowerCase() || '')) {
    score += 1;
  }

  // Cap at 10
  return Math.min(score, 10);
}

function generateValueProposition(category: Candidate['category']): string {
  const propositions: Record<Candidate['category'], string> = {
    productivity: 'Add habit tracking and wellness insights to boost user productivity. Help users track focus time, breaks, and daily goals.',
    gaming: 'Add real-life achievement tracking! Let players earn $LIFE tokens for gaming milestones and healthy gaming habits.',
    defi: 'Add a trading journal feature. Help users track their decision-making patterns and avoid emotional trading.',
    social: 'Add wellness check-ins and group goal tracking. Build a healthier community with shared accountability.',
    developer: 'Add productivity metrics for developers. Track coding sessions, breaks, and help prevent burnout.',
    other: 'Add wellness tracking and goal management to enhance user engagement and retention.',
  };
  return propositions[category];
}

function generateIntegrationIdea(category: Candidate['category'], description: string): string {
  const ideas: Record<Candidate['category'], string> = {
    productivity: 'Log task completions as check-ins, track daily goal progress, add streak bonuses',
    gaming: 'Log achievements, track play sessions, add wellness-to-earn mechanics',
    defi: 'Add trade logging, track strategy adherence goals, journal entries for decisions',
    social: 'Add daily check-ins, group wellness challenges, community goal tracking',
    developer: 'Track coding sessions, log productivity patterns, break reminders',
    other: 'Add activity logging, goal tracking, and $LIFE token rewards',
  };
  return ideas[category];
}

async function scanForCandidates(): Promise<ScanResult> {
  console.log('🔍 Scanning for hackathon projects...\n');
  
  const seenRepos = new Set<string>();
  const candidates: Candidate[] = [];

  for (const query of SEARCH_QUERIES) {
    console.log(`Searching: "${query}"...`);
    const results = runGitHubSearch(query, 15);
    
    for (const repo of results as any[]) {
      const fullName = repo.fullName;
      
      // Skip duplicates
      if (seenRepos.has(fullName)) continue;
      seenRepos.add(fullName);

      const [owner, name] = fullName.split('/');
      const description = repo.description || '';
      const language = repo.primaryLanguage?.name || 'Unknown';
      const topics = (repo.repositoryTopics || []).map((t: any) => t.name);
      
      // Get additional details
      const details = getRepoDetails(fullName);
      
      // Skip if no README (indicates low-quality project)
      if (!details.hasReadme) {
        console.log(`  ⏭️ Skipping ${fullName} (no README)`);
        continue;
      }

      // Calculate fit score
      const fitScore = calculateFitScore(description, topics, language);
      
      // Skip low-fit projects
      if (fitScore < 4) {
        console.log(`  ⏭️ Skipping ${fullName} (low fit score: ${fitScore})`);
        continue;
      }

      const category = categorizeProject(description, topics);
      
      const candidate: Candidate = {
        repo: fullName,
        owner,
        name,
        description,
        stars: repo.stargazersCount || 0,
        language,
        updatedAt: repo.updatedAt,
        hasReadme: details.hasReadme,
        topics,
        category,
        fitScore,
        valueProposition: generateValueProposition(category),
        integrationIdea: generateIntegrationIdea(category, description),
      };

      candidates.push(candidate);
      console.log(`  ✅ Found: ${fullName} (score: ${fitScore}, category: ${category})`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Sort by fit score (descending)
  candidates.sort((a, b) => b.fitScore - a.fitScore);

  const result: ScanResult = {
    scannedAt: new Date().toISOString(),
    totalFound: candidates.length,
    candidates,
  };

  // Save results
  const outputPath = new URL('./candidates.json', import.meta.url).pathname;
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n📊 Found ${candidates.length} candidates. Saved to candidates.json`);

  // Print top 10
  console.log('\n🏆 Top 10 Integration Candidates:\n');
  for (const c of candidates.slice(0, 10)) {
    console.log(`${c.fitScore}/10 | ${c.repo}`);
    console.log(`      ${c.category} | ${c.language}`);
    console.log(`      ${c.description?.substring(0, 80)}...`);
    console.log(`      💡 ${c.integrationIdea}`);
    console.log('');
  }

  return result;
}

// Run if executed directly
if (process.argv[1]?.includes('scanner')) {
  scanForCandidates().catch(console.error);
}

export { scanForCandidates, Candidate, ScanResult };
