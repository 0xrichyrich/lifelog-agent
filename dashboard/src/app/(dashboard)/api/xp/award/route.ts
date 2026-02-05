import { NextRequest, NextResponse } from 'next/server';
import { awardXP, XPActivity, XP_REWARDS } from '@/lib/xp';
import { validateApiKey } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/xp/award
 * Award XP to user for an activity (internal use)
 * 
 * Body:
 *   userId: string (required)
 *   activity: XPActivity (required)
 *   metadata?: object (optional)
 */
export async function POST(request: NextRequest) {
  // Authentication - internal endpoint requires API key
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.write);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { userId, activity, metadata = {} } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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
    
    const result = awardXP(userId, activity as XPActivity, metadata);
    
    const response = NextResponse.json({
      success: true,
      data: {
        xpAwarded: result.xpAwarded,
        totalXP: result.user.totalXP,
        currentXP: result.user.currentXP,
        level: result.user.level,
        leveledUp: result.leveledUp,
        ...(result.leveledUp && { newLevel: result.newLevel }),
      },
    });
    return addRateLimitHeaders(response, RATE_LIMITS.write, request);
  } catch (error) {
    console.error('Failed to award XP:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}
