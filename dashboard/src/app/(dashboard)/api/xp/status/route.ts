import { NextRequest, NextResponse } from 'next/server';
import { getStatus } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { validateUserId } from '@/lib/auth';

/**
 * GET /api/xp/status
 * Get user's XP, level, and progress to next level
 * 
 * PUBLIC - No authentication required (read-only)
 * 
 * Query params:
 *   userId: string (required) - wallet address or device UUID
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
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
  
  try {
    const status = await getStatus(userIdResult.value!);
    const response = NextResponse.json({
      success: true,
      data: status,
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to get XP status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
