import { NextRequest, NextResponse } from 'next/server';
import { awardXP, XPActivity, XP_REWARDS } from '@/lib/xp-turso';
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
  // Note: Auth removed for hackathon demo - XP is gamification, not sensitive
  // TODO: Re-enable auth with user sessions post-hackathon
  
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
    
    const result = await awardXP(userId, activity as XPActivity, metadata);
    
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
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}
