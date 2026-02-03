import { NextResponse } from 'next/server';

// Mock ACP data (in production, use ACPClient)
const WELLNESS_AGENTS = [
  {
    id: "fitbot-pro",
    name: "FitBot Pro",
    description: "AI personal trainer that creates personalized workout plans",
    category: "fitness",
    priceUsd: 0.50,
    rating: 4.8,
    completedJobs: 1247,
    capabilities: ["workout_planning", "form_analysis", "progress_tracking"],
  },
  {
    id: "nutriai",
    name: "NutriAI",
    description: "Nutrition analyzer and meal planner",
    category: "nutrition",
    priceUsd: 0.30,
    rating: 4.6,
    completedJobs: 892,
    capabilities: ["meal_planning", "calorie_tracking", "macro_optimization"],
  },
  {
    id: "zenmaster",
    name: "ZenMaster",
    description: "Meditation guide and stress management coach",
    category: "meditation",
    priceUsd: 0.25,
    rating: 4.9,
    completedJobs: 2103,
    capabilities: ["guided_meditation", "breathing_exercises", "sleep_improvement"],
  },
  {
    id: "sleepwise",
    name: "SleepWise",
    description: "Sleep optimization agent",
    category: "sleep",
    priceUsd: 0.35,
    rating: 4.7,
    completedJobs: 654,
    capabilities: ["sleep_analysis", "routine_optimization", "environment_tips"],
  },
  {
    id: "habit-forge",
    name: "HabitForge",
    description: "Habit formation specialist using behavioral science",
    category: "productivity",
    priceUsd: 0.40,
    rating: 4.5,
    completedJobs: 431,
    capabilities: ["habit_tracking", "streak_analysis", "behavior_design"],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');

  if (action === 'browse') {
    let agents = [...WELLNESS_AGENTS];
    if (query) {
      const lowerQuery = query.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.category.toLowerCase().includes(lowerQuery)
      );
    }
    return NextResponse.json({ agents });
  }

  if (action === 'balance') {
    return NextResponse.json({
      usdc: '50.00',
      address: process.env.AGENT_WALLET_ADDRESS || '0xD95CA95467E0EfeDd027c7119E55C6BD5Ba2F6EA',
    });
  }

  if (action === 'jobs') {
    // Return empty for now (would need persistent storage)
    return NextResponse.json({ jobs: [] });
  }

  return NextResponse.json({ agents: WELLNESS_AGENTS });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, agentId, taskDescription } = body;

  if (action === 'hire') {
    const agent = WELLNESS_AGENTS.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Mock job creation
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      status: 'pending',
      taskDescription,
      createdAt: new Date().toISOString(),
      cost: agent.priceUsd,
    };

    return NextResponse.json({ success: true, job });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
