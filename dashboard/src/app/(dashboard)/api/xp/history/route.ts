import { NextRequest, NextResponse } from 'next/server';
import { getHistory, XP_REWARDS } from '@/lib/xp';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/history
 * Get XP transaction history for a user
 * 
 * Query params:
 *   userId: string (required)
 *   limit?: number (default 50, max 100)
 *   offset?: number (default 0)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }
  
  try {
    const transactions = getHistory(userId, limit, offset);
    
    // Enrich with activity descriptions
    const enrichedTransactions = transactions.map(tx => ({
      ...tx,
      activityDescription: getActivityDescription(tx.activity),
    }));
    
    const response = NextResponse.json({
      success: true,
      data: {
        transactions: enrichedTransactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit,
        },
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
