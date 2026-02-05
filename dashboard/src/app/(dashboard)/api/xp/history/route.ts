import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/history
 * Get XP transaction history for a user
 * 
 * Query params:
 *   userId: string (required)
 *   limit?: number (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }
  
  try {
    const { history, total } = await getHistory(userId, limit);
    
    // Enrich with activity descriptions
    const enrichedHistory = history.map(tx => ({
      ...tx,
      activityDescription: getActivityDescription(tx.activity),
    }));
    
    const response = NextResponse.json({
      success: true,
      data: {
        history: enrichedHistory,
        total,
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get XP history:', error);
    return NextResponse.json(
      { error: 'Failed to get XP history' },
      { status: 500 }
    );
  }
}

function getActivityDescription(activity: string): string {
  const descriptions: Record<string, string> = {
    DAILY_CHECKIN: 'Daily check-in completed',
    MOOD_LOG: 'Mood logged',
    GOAL_COMPLETE: 'Goal achieved! 🎯',
    STREAK_7DAY: '7-day streak bonus 🔥',
    STREAK_30DAY: '30-day streak bonus 🏆',
    BADGE_EARNED: 'Badge earned 🏅',
    AGENT_INTERACTION: 'Agent interaction',
  };
  return descriptions[activity] || activity;
}
