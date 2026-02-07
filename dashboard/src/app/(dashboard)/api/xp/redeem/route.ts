import { NextRequest, NextResponse } from 'next/server';
import { 
  redeemXPForNudge, 
  getRedemptionStatus 
} from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { validatePositiveInt } from '@/lib/validation';
import { requireInternalAuth, validateUserId, validateContentType } from '@/lib/auth';

/**
 * GET /api/xp/redeem?userId=xxx
 * Get user's redemption status including daily cap, rates, and weekly pool info
 * 
 * PUBLIC - No authentication required (read-only status check)
 * 
 * Response:
 * {
 *   dailyRedeemed: number,
 *   dailyCap: 250,
 *   dailyRemaining: number,
 *   rate: number (XP per NUDGE),
 *   streakMultiplier: number,
 *   level: number,
 *   weeklyPool: {
 *     totalPool: 50000,
 *     userWeeklyXP: number,
 *     estimatedShare: number (percentage),
 *     endsAt: string (ISO date)
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
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
    
    const status = await getRedemptionStatus(userIdResult.value!);
    
    const response = NextResponse.json({
      success: true,
      data: status,
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get redemption status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xp/redeem
 * Redeem XP for $NUDGE tokens
 * 
 * Authentication: Requires X-API-Key header matching INTERNAL_API_KEY
 * 
 * Tiered rates by level:
 *   - Level 1-5: 10 XP = 1 $NUDGE
 *   - Level 6-10: 8 XP = 1 $NUDGE
 *   - Level 11+: 5 XP = 1 $NUDGE
 * 
 * Streak multipliers:
 *   - 7+ day streak: 1.5x
 *   - 30+ day streak: 2x
 * 
 * Daily cap: 250 $NUDGE (rolling 24-hour window)
 * 
 * Body:
 *   userId: string (required) - wallet address or device UUID
 *   xpAmount: number (required, positive integer)
 * 
 * Response:
 * {
 *   nudgeAwarded: number,
 *   xpSpent: number,
 *   rate: number,
 *   streakMultiplier: number,
 *   dailyRemaining: number,
 *   level: number
 * }
 */
export async function POST(request: NextRequest) {
  // Authentication required for POST (state-changing operation)
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { userId, xpAmount } = body;
    
    // Validate userId format
    const userIdResult = validateUserId(userId);
    if (!userIdResult.valid) {
      return NextResponse.json(
        { error: userIdResult.error },
        { status: 400 }
      );
    }
    
    // Validate xpAmount
    const xpValidation = validatePositiveInt(xpAmount, { min: 1, max: 100000 });
    if (!xpValidation.valid) {
      return NextResponse.json(
        { error: xpValidation.error || 'Invalid xpAmount' },
        { status: 400 }
      );
    }
    
    const result = await redeemXPForNudge(userIdResult.value!, xpValidation.value!);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          data: {
            rate: result.rate,
            streakMultiplier: result.streakMultiplier,
            dailyRemaining: result.dailyRemaining,
            level: result.level,
          }
        },
        { status: 400 }
      );
    }
    
    const response = NextResponse.json({
      success: true,
      data: {
        nudgeAwarded: result.nudgeAwarded,
        xpSpent: result.xpSpent,
        rate: result.rate,
        streakMultiplier: result.streakMultiplier,
        dailyRemaining: result.dailyRemaining,
        level: result.level,
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.token, request);
  } catch (error) {
    console.error('Failed to redeem XP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
