import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth';
import { validateAddress, validateAction, validatePositiveInt } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

// Mock token data (in production, read from blockchain)
export async function GET(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get('address');

  // Validate address
  const addressResult = validateAddress(addressParam);
  if (!addressResult.valid) {
    return NextResponse.json(
      { error: addressResult.error },
      { status: 400 }
    );
  }

  // Mock data - in production, call TokenRewards.getUserStats()
  const mockStats = {
    address: addressResult.value,
    balance: '1250.00',
    earned: '1750.00',
    goalsCompleted: 35,
    rewardRates: {
      daily: '100',
      weekly: '500',
      streak: '50',
    },
    // Don't expose contract address directly in API
    // contractAddress: process.env.LIFE_TOKEN_ADDRESS || '0x...',
  };

  const response = NextResponse.json(mockStats);
  return addRateLimitHeaders(response, RATE_LIMITS.token, request);
}

export async function POST(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { action, address, goalIds, feature } = body;

    // Validate action
    const actionResult = validateAction(action, ['claim', 'unlock'] as const);
    if (!actionResult.valid) {
      return NextResponse.json(
        { error: actionResult.error },
        { status: 400 }
      );
    }

    // Validate address
    const addressResult = validateAddress(address);
    if (!addressResult.valid) {
      return NextResponse.json(
        { error: addressResult.error },
        { status: 400 }
      );
    }

    if (action === 'claim') {
      // Validate goalIds
      if (!Array.isArray(goalIds) || goalIds.length === 0) {
        return NextResponse.json(
          { error: 'goalIds must be a non-empty array' },
          { status: 400 }
        );
      }
      
      // Validate each goal ID
      for (const id of goalIds) {
        const idResult = validatePositiveInt(id, { min: 1, max: 1000000 });
        if (!idResult.valid) {
          return NextResponse.json(
            { error: `Invalid goal ID: ${idResult.error}` },
            { status: 400 }
          );
        }
      }

      // Mock claim - in production, call TokenRewards.rewardGoalsBatch()
      const response = NextResponse.json({
        success: true,
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        amount: '500',
      });
      return addRateLimitHeaders(response, RATE_LIMITS.token, request);
    }

    if (action === 'unlock') {
      // Validate feature
      if (!feature || typeof feature !== 'string' || feature.length > 50) {
        return NextResponse.json(
          { error: 'Valid feature name required' },
          { status: 400 }
        );
      }

      // Mock unlock - in production, call TokenRewards.unlockFeature()
      const response = NextResponse.json({
        success: true,
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        feature,
        cost: '1000',
      });
      return addRateLimitHeaders(response, RATE_LIMITS.token, request);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Token operation failed:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
