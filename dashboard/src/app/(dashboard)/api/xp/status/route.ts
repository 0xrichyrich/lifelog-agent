import { NextRequest, NextResponse } from 'next/server';
import { getStatus } from '@/lib/xp';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/status
 * Get user's XP, level, and progress to next level
 * 
 * Query params:
 *   userId: string (required)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }
  
  try {
    const status = getStatus(userId);
    const response = NextResponse.json({
      success: true,
      data: status,
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get XP status:', error);
    return NextResponse.json(
      { error: 'Failed to get XP status' },
      { status: 500 }
    );
  }
}
