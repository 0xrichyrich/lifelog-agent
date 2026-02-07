import { NextRequest, NextResponse } from 'next/server';
import { awardXP, XPActivity, XP_REWARDS } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { requireInternalAuth, validateUserId, validateContentType } from '@/lib/auth';

/**
 * POST /api/xp/award
 * Award XP to user for an activity (internal use only)
 * 
 * Authentication: Requires X-API-Key header matching INTERNAL_API_KEY
 * 
 * Body:
 *   userId: string (required) - wallet address or device UUID
 *   activity: XPActivity (required)
 *   metadata?: object (optional)
 */
export async function POST(request: NextRequest) {
  // Authentication required
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.write);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { userId, activity, metadata = {} } = body;
    
    // Validate userId format (wallet address or device UUID)
    const userIdResult = validateUserId(userId);
    if (!userIdResult.valid) {
      return NextResponse.json(
        { error: userIdResult.error },
        { status: 400 }
      );
    }
    
    if (!activity || !Object.values(XPActivity).includes(activity)) {
      return NextResponse.json(
        { 
          error: 'Valid activity is required',
          validActivities: Object.keys(XP_REWARDS),
        },
        { status: 400 }
      );
    }
    
    const result = await awardXP(userIdResult.value!, activity as XPActivity, metadata);
    
    const response = NextResponse.json({
      success: true,
      data: {
        xpAwarded: result.xpAwarded,
        leveledUp: result.leveledUp,
        ...(result.leveledUp && { newLevel: result.newLevel }),
        user: {
          totalXP: result.user.totalXP,
          currentXP: result.user.currentXP,
          level: result.user.level,
        },
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.write, request);
  } catch (error) {
    console.error('Failed to award XP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
