import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Agent Marketplace Endpoint
 * Returns all public agents with ratings, usage stats, category filtering, and search
 * Now includes community-submitted agents!
 */

interface MarketplaceAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'wellness' | 'productivity' | 'lifestyle' | 'entertainment';
  price: number;
  isFree: boolean;
  rating: number;
  totalRatings: number;
  usageCount: number;
  featured: boolean;
  triggers: string[];
  capabilities: string[];
  // Community agent fields
  isCommunity?: boolean;
  creatorWallet?: string;
  systemPrompt?: string;
}

// Load community agents from file
async function loadCommunityAgents(): Promise<MarketplaceAgent[]> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'community-agents.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const agents = JSON.parse(data);
    // Only return live agents
    return agents.filter((a: { status: string }) => a.status === 'live');
  } catch {
    // File doesn't exist yet or error reading
    return [];
  }
}

// Marketplace agent catalog
const MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  // WELLNESS
  {
    id: 'nudge-coach',
    name: 'Nudge Coach',
    icon: '🌱',
    description: 'Your wellness companion. Gentle check-ins, emotional support, and positive reinforcement for daily mindfulness.',
    category: 'wellness',
    price: 0,
    isFree: true,
    rating: 4.9,
    totalRatings: 2341,
    usageCount: 15420,
    featured: true,
    triggers: ['check-in', 'mood', 'wellness', 'tired', 'stressed'],
    capabilities: ['daily check-ins', 'mood tracking', 'wellness tips'],
  },
  {
    id: 'zenmaster',
    name: 'ZenMaster',
    icon: '🧘',
    description: 'Meditation guide and stress management coach. Personalized mindfulness sessions tailored to your schedule.',
    category: 'wellness',
    price: 5000,
    isFree: false,
    rating: 4.8,
    totalRatings: 1892,
    usageCount: 12300,
    featured: true,
    triggers: ['meditate', 'stress', 'calm', 'breathe', 'relax'],
    capabilities: ['guided meditation', 'breathing exercises', 'stress relief'],
  },
  {
    id: 'fitbot-pro',
    name: 'FitBot Pro',
    icon: '💪',
    description: 'AI personal trainer that creates personalized workout plans based on your goals, fitness level, and available time.',
    category: 'wellness',
    price: 10000,
    isFree: false,
    rating: 4.7,
    totalRatings: 1247,
    usageCount: 8900,
    featured: false,
    triggers: ['workout', 'exercise', 'fitness', 'gym', 'train'],
    capabilities: ['workout planning', 'form tips', 'progress tracking'],
  },
  {
    id: 'nutriai',
    name: 'NutriAI',
    icon: '🥗',
    description: 'Nutrition analyzer and meal planner. Analyzes your diet and suggests improvements for optimal health.',
    category: 'wellness',
    price: 8000,
    isFree: false,
    rating: 4.6,
    totalRatings: 892,
    usageCount: 6200,
    featured: false,
    triggers: ['meal', 'food', 'diet', 'nutrition', 'eat'],
    capabilities: ['meal planning', 'calorie tracking', 'macro optimization'],
  },
  {
    id: 'sleepwise',
    name: 'SleepWise',
    icon: '😴',
    description: 'Sleep optimization agent. Analyzes your sleep patterns and provides actionable advice for better rest.',
    category: 'wellness',
    price: 6000,
    isFree: false,
    rating: 4.5,
    totalRatings: 654,
    usageCount: 4100,
    featured: false,
    triggers: ['sleep', 'tired', 'insomnia', 'rest', 'bedtime'],
    capabilities: ['sleep analysis', 'routine optimization', 'environment tips'],
  },

  // PRODUCTIVITY
  {
    id: 'habit-forge',
    name: 'HabitForge',
    icon: '⚡',
    description: 'Habit formation specialist. Uses behavioral science to help you build lasting positive habits.',
    category: 'productivity',
    price: 7500,
    isFree: false,
    rating: 4.7,
    totalRatings: 1031,
    usageCount: 7800,
    featured: true,
    triggers: ['habit', 'routine', 'goal', 'discipline', 'track'],
    capabilities: ['habit tracking', 'streak analysis', 'behavior design'],
  },
  {
    id: 'focus-flow',
    name: 'Focus Flow',
    icon: '🎯',
    description: 'Deep work facilitator. Helps you enter flow states with customized focus sessions and distraction blocking.',
    category: 'productivity',
    price: 5000,
    isFree: false,
    rating: 4.6,
    totalRatings: 789,
    usageCount: 5400,
    featured: false,
    triggers: ['focus', 'work', 'concentrate', 'pomodoro', 'deep work'],
    capabilities: ['focus timers', 'work sessions', 'distraction management'],
  },
  {
    id: 'task-ninja',
    name: 'Task Ninja',
    icon: '📋',
    description: 'Smart task management. Prioritizes your todo list, breaks down projects, and keeps you on track.',
    category: 'productivity',
    price: 4000,
    isFree: false,
    rating: 4.4,
    totalRatings: 567,
    usageCount: 3900,
    featured: false,
    triggers: ['task', 'todo', 'project', 'deadline', 'schedule'],
    capabilities: ['task prioritization', 'project breakdown', 'deadline tracking'],
  },

  // LIFESTYLE
  {
    id: 'coffee-scout',
    name: 'Coffee Scout',
    icon: '☕',
    description: 'Local coffee expert. Finds the perfect café based on your vibe, location, and work preferences.',
    category: 'lifestyle',
    price: 3000,
    isFree: false,
    rating: 4.8,
    totalRatings: 1456,
    usageCount: 9200,
    featured: true,
    triggers: ['coffee', 'café', 'work spot', 'study spot', 'latte'],
    capabilities: ['café recommendations', 'vibe matching', 'location-aware'],
  },
  {
    id: 'book-buddy',
    name: 'Book Buddy',
    icon: '📚',
    description: 'Your literary companion. Book recommendations, reading lists, and bookish conversations tailored to your taste.',
    category: 'lifestyle',
    price: 2500,
    isFree: false,
    rating: 4.7,
    totalRatings: 823,
    usageCount: 5800,
    featured: false,
    triggers: ['book', 'read', 'recommend', 'author', 'novel'],
    capabilities: ['book recommendations', 'reading lists', 'genre matching'],
  },
  {
    id: 'chef-ai',
    name: 'Chef AI',
    icon: '👨‍🍳',
    description: 'Your personal recipe curator. Suggests recipes based on what\'s in your fridge and your dietary preferences.',
    category: 'lifestyle',
    price: 4000,
    isFree: false,
    rating: 4.5,
    totalRatings: 612,
    usageCount: 4300,
    featured: false,
    triggers: ['recipe', 'cook', 'dinner', 'ingredients', 'meal'],
    capabilities: ['recipe suggestions', 'ingredient matching', 'dietary filters'],
  },

  // ENTERTAINMENT
  {
    id: 'movie-maven',
    name: 'Movie Maven',
    icon: '🎬',
    description: 'Film curator extraordinaire. Recommends movies and shows based on your mood and viewing history.',
    category: 'entertainment',
    price: 2000,
    isFree: false,
    rating: 4.6,
    totalRatings: 1234,
    usageCount: 8100,
    featured: false,
    triggers: ['movie', 'watch', 'film', 'show', 'netflix'],
    capabilities: ['movie recommendations', 'mood matching', 'streaming finder'],
  },
  {
    id: 'playlist-pro',
    name: 'Playlist Pro',
    icon: '🎵',
    description: 'Music curator for every moment. Creates perfect playlists for work, workout, relaxation, and everything in between.',
    category: 'entertainment',
    price: 2500,
    isFree: false,
    rating: 4.7,
    totalRatings: 987,
    usageCount: 6700,
    featured: false,
    triggers: ['music', 'playlist', 'song', 'spotify', 'vibe'],
    capabilities: ['playlist curation', 'mood music', 'activity matching'],
  },
  {
    id: 'trivia-titan',
    name: 'Trivia Titan',
    icon: '🧠',
    description: 'Quiz master and knowledge companion. Engages you with fun trivia and interesting facts.',
    category: 'entertainment',
    price: 0,
    isFree: true,
    rating: 4.4,
    totalRatings: 456,
    usageCount: 3200,
    featured: false,
    triggers: ['trivia', 'quiz', 'fact', 'game', 'challenge'],
    capabilities: ['trivia games', 'fun facts', 'knowledge challenges'],
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();

  // Load community agents and merge with hardcoded ones
  const communityAgents = await loadCommunityAgents();
  const allAgents: MarketplaceAgent[] = [
    ...MARKETPLACE_AGENTS,
    ...communityAgents.map(agent => ({
      ...agent,
      isCommunity: true,
    })),
  ];

  let filteredAgents = [...allAgents];

  // Filter by category
  if (category && category !== 'all') {
    filteredAgents = filteredAgents.filter(agent => agent.category === category);
  }

  // Filter by search query
  if (search) {
    filteredAgents = filteredAgents.filter(agent => 
      agent.name.toLowerCase().includes(search) ||
      agent.description.toLowerCase().includes(search) ||
      agent.triggers.some(t => t.includes(search)) ||
      agent.capabilities.some(c => c.toLowerCase().includes(search))
    );
  }

  // Sort: featured first, then by usage count
  filteredAgents.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.usageCount - a.usageCount;
  });

  return NextResponse.json({
    agents: filteredAgents,
    total: filteredAgents.length,
    categories: ['wellness', 'productivity', 'lifestyle', 'entertainment'],
  });
}
