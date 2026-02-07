import { NextRequest, NextResponse } from 'next/server';
import { 
  getWeeklyPoolStatus,
  distributeWeeklyPool 
} from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/pool?userId=xxx
 * Get weekly bonus pool status including user's share and leaderboard
 * 
 * Weekly pool: 50,000 $NUDGE distributed every Sunday
 * Split proportionally by XP earned that week
 * 
 * Response:
 * {
 *   pool: {
 *     id: number,
 *     weekStart: string,
 *     weekEnd: string,
 *     totalPool: 50000,
 *     distributed: boolean
 *   },
 *   userShare: {
 *     weeklyXP: number,
 *     estimatedShare: number (percentage),
 *     estimatedNudge: number
 *   },
 *   leaderboard: [
 *     { userId, weeklyXP, estimatedShare, rank }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const status = await getWeeklyPoolStatus(userId);
    
    const response = NextResponse.json({
      success: true,
      data: status,
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get pool status:', error);
    return NextResponse.json(
      { error: 'Failed to get pool status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xp/pool
 * Trigger weekly pool distribution (admin/cron endpoint)
 * 
 * This should be called on Sunday evening or Monday morning
 * to distribute the weekly pool to all active users.
 * 
 * For hackathon demo, no auth required.
 * 
 * Response:
 * {
 *   poolId: number,
 *   totalDistributed: number,
 *   claimsCount: number
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limiting - use token limit since this modifies state
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  try {
    const result = await distributeWeeklyPool();
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Distribution failed',
        },
        { status: 400 }
      );
    }
    
    const response = NextResponse.json({
      success: true,
      data: {
        poolId: result.poolId,
        totalDistributed: result.totalDistributed,
        claimsCount: result.claimsCount,
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.token, request);
  } catch (error) {
    console.error('Failed to distribute pool:', error);
    return NextResponse.json(
      { error: 'Failed to distribute pool' },
      { status: 500 }
    );
  }
}
