import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/xp';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/leaderboard
 * Get top users by XP (opt-in only in future)
 * 
 * Query params:
 *   limit?: number (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  
  try {
    const leaderboard = getLeaderboard(limit);
    
    // Mask userIds for privacy (show only first/last chars)
    const maskedLeaderboard = leaderboard.map(entry => ({
      ...entry,
      userId: maskUserId(entry.userId),
    }));
    
    const response = NextResponse.json({
      success: true,
      data: {
        leaderboard: maskedLeaderboard,
        updatedAt: new Date().toISOString(),
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}

function maskUserId(userId: string): string {
  if (userId.length <= 4) return '****';
  return `${userId.slice(0, 2)}...${userId.slice(-2)}`;
}
