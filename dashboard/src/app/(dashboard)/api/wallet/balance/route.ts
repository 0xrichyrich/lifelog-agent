import { NextRequest, NextResponse } from 'next/server';
import { requireInternalAuth } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/wallet/balance?address=xxx
 * Get wallet balance and pending rewards
 * 
 * Authentication: Requires X-API-Key header matching INTERNAL_API_KEY
 */
export async function GET(request: NextRequest) {
  // Authentication required (privacy - reveals user balances)
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
  }

  // TODO: Integrate with actual blockchain/database
  // For now, return mock data
  
  // In production, this would:
  // 1. Query the $NUDGE token contract for balance
  // 2. Query the rewards database for pending rewards
  
  const mockBalance = {
    balance: '150.5',
    pendingRewards: '25',
    lastUpdated: new Date().toISOString(),
  };

  const response = NextResponse.json(mockBalance);
  return addRateLimitHeaders(response, RATE_LIMITS.read, request);
}
