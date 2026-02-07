import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, validateContentType } from '@/lib/auth';
import { validateAction, validateQuery, validateMessage } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

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

export async function GET(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.acp);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');

  if (action === 'browse') {
    // Validate search query
    const queryResult = validateQuery(query);
    if (!queryResult.valid) {
      return NextResponse.json(
        { error: queryResult.error },
        { status: 400 }
      );
    }
    
    let agents = [...WELLNESS_AGENTS];
    if (queryResult.value) {
      const lowerQuery = queryResult.value.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.category.toLowerCase().includes(lowerQuery)
      );
    }
    const response = NextResponse.json({ agents });
    return addRateLimitHeaders(response, RATE_LIMITS.acp, request);
  }

  if (action === 'balance') {
    // Don't expose wallet address - only return balance for authenticated users
    const response = NextResponse.json({
      usdc: '50.00',
      // Removed: address exposure was a security issue
    });
    return addRateLimitHeaders(response, RATE_LIMITS.acp, request);
  }

  if (action === 'jobs') {
    // Return empty for now (would need persistent storage)
    const response = NextResponse.json({ jobs: [] });
    return addRateLimitHeaders(response, RATE_LIMITS.acp, request);
  }

  const response = NextResponse.json({ agents: WELLNESS_AGENTS });
  return addRateLimitHeaders(response, RATE_LIMITS.acp, request);
}

export async function POST(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.acp);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { action, agentId, taskDescription } = body;

    // Validate action
    const actionResult = validateAction(action, ['hire'] as const);
    if (!actionResult.valid) {
      return NextResponse.json(
        { error: actionResult.error },
        { status: 400 }
      );
    }

    if (action === 'hire') {
      // Validate agentId
      if (!agentId || typeof agentId !== 'string' || agentId.length > 50) {
        return NextResponse.json(
          { error: 'Valid agent ID required' },
          { status: 400 }
        );
      }
      
      const agent = WELLNESS_AGENTS.find(a => a.id === agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Validate task description
      const taskResult = validateMessage(taskDescription);
      if (!taskResult.valid) {
        return NextResponse.json(
          { error: taskResult.error },
          { status: 400 }
        );
      }

      // Mock job creation
      const job = {
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        agentId,
        status: 'pending',
        taskDescription: taskResult.value,
        createdAt: new Date().toISOString(),
        cost: agent.priceUsd,
      };

      const response = NextResponse.json({ success: true, job });
      return addRateLimitHeaders(response, RATE_LIMITS.acp, request);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('ACP operation failed:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
