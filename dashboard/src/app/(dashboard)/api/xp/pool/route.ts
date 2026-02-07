import { NextRequest, NextResponse } from 'next/server';
import { 
  getWeeklyPoolStatus,
  distributeWeeklyPool 
} from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { requireInternalAuth, validateUserId, validateContentType } from '@/lib/auth';

/**
 * GET /api/xp/pool?userId=xxx
 * Get weekly bonus pool status including user's share and leaderboard
 * 
 * PUBLIC - No authentication required (read-only)
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
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Validate userId format
    const userIdResult = validateUserId(userId);
    if (!userIdResult.valid) {
      return NextResponse.json(
        { error: userIdResult.error },
        { status: 400 }
      );
    }
    
    const status = await getWeeklyPoolStatus(userIdResult.value!);
    
    const response = NextResponse.json({
      success: true,
      data: status,
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get pool status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xp/pool
 * Trigger weekly pool distribution (admin/cron endpoint)
 * 
 * Authentication: Requires X-API-Key header matching INTERNAL_API_KEY
 * Time Guard: Can only be called after weekEnd (Saturday 23:59:59 UTC)
 * 
 * This should be called on Sunday evening or Monday morning
 * to distribute the weekly pool to all active users.
 * 
 * Response:
 * {
 *   poolId: number,
 *   totalDistributed: number,
 *   claimsCount: number
 * }
 */
export async function POST(request: NextRequest) {
  // Authentication required (admin-only operation)
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting - use token limit since this modifies state
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.token);
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
