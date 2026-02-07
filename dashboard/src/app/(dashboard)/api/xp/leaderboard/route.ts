import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/xp/leaderboard
 * Get top users by XP (opt-in only in future)
 * 
 * PUBLIC - No authentication required (read-only)
 * 
 * Query params:
 *   limit?: number (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit') || '10';
  
  // Parse with radix 10 and validate
  const parsedLimit = parseInt(limitParam, 10);
  const limit = isNaN(parsedLimit) ? 10 : Math.min(Math.max(1, parsedLimit), 50);
  
  try {
    const leaderboard = await getLeaderboard(limit);
    
    // Mask userIds for privacy (show first 6 and last 4 chars for wallet addresses)
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Mask userId for privacy
 * For wallet addresses (0x...): show first 6 and last 4 chars
 * For UUIDs: show first 4 and last 4 chars
 * For short strings: fully mask
 */
function maskUserId(userId: string): string {
  // Wallet address format: 0x + 40 hex chars = 42 chars
  if (userId.startsWith('0x') && userId.length >= 10) {
    return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
  }
  
  // UUID format or other IDs
  if (userId.length >= 12) {
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
  
  // Short strings: fully mask
  if (userId.length <= 8) {
    return '****';
  }
  
  // Medium strings: show first 2 and last 2
  return `${userId.slice(0, 2)}...${userId.slice(-2)}`;
}
