import { NextRequest, NextResponse } from 'next/server';
import { redeemXP, getRedemptionBoost, getOrCreateUser } from '@/lib/xp';
import { validateApiKey } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/xp/redeem
 * Redeem XP for $NUDGE tokens
 * 
 * Base rate: 1000 XP = 100 NUDGE (10 XP per NUDGE)
 * Level boosts:
 *   - Level 5+: 10% boost
 *   - Level 10+: 25% boost
 *   - Level 20+: 50% boost
 * 
 * Body:
 *   userId: string (required)
 *   xpAmount: number (required, minimum 100)
 */
export async function POST(request: NextRequest) {
  // Authentication required for redemption
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.write);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { userId, xpAmount } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    if (!xpAmount || typeof xpAmount !== 'number' || xpAmount < 100) {
      return NextResponse.json(
        { error: 'xpAmount must be at least 100' },
        { status: 400 }
      );
    }
    
    const result = redeemXP(userId, xpAmount);
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Get updated user state
    const user = getOrCreateUser(userId);
    
    const response = NextResponse.json({
      success: true,
      data: {
        redemptionId: result.id,
        xpSpent: result.xpSpent,
        nudgeReceived: result.nudgeReceived,
        remainingXP: user.currentXP,
        levelBoostApplied: getRedemptionBoost(user.level),
        // Note: txHash will be updated after blockchain confirmation
        message: 'Redemption queued. $NUDGE tokens will be distributed shortly.',
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.write, request);
  } catch (error) {
    console.error('Failed to redeem XP:', error);
    return NextResponse.json(
      { error: 'Failed to redeem XP' },
      { status: 500 }
    );
  }
}
