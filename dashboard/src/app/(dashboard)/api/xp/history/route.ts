import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { validateUserId } from '@/lib/auth';

/**
 * GET /api/xp/history
 * Get XP transaction history for a user
 * 
 * PUBLIC - No authentication required (read-only)
 * 
 * Query params:
 *   userId: string (required) - wallet address or device UUID
 *   limit?: number (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limitParam = searchParams.get('limit') || '50';
  
  // Validate userId format
  const userIdResult = validateUserId(userId);
  if (!userIdResult.valid) {
    return NextResponse.json(
      { error: userIdResult.error },
      { status: 400 }
    );
  }
  
  // Parse limit with radix 10 and validate
  const parsedLimit = parseInt(limitParam, 10);
  const limit = isNaN(parsedLimit) ? 50 : Math.min(Math.max(1, parsedLimit), 100);
  
  try {
    const { history, total } = await getHistory(userIdResult.value!, limit);
    
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
      { error: 'Internal server error' },
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
