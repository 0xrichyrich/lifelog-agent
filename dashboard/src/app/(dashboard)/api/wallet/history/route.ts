import { NextRequest, NextResponse } from 'next/server';
import { requireInternalAuth } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

interface Transaction {
  id: string;
  type: 'claim' | 'reward' | 'transfer';
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

/**
 * GET /api/wallet/history?address=xxx
 * Get wallet transaction history
 * 
 * Authentication: Requires X-API-Key header matching INTERNAL_API_KEY
 */
export async function GET(request: NextRequest) {
  // Authentication required (privacy - reveals transaction history)
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

  // TODO: Integrate with actual database/blockchain
  // For now, return mock data
  
  // In production, this would:
  // 1. Query the database for claim history
  // 2. Query the blockchain for token transfer events
  // 3. Combine and sort by timestamp
  
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'reward',
      amount: '10',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'completed',
    },
    {
      id: '2',
      type: 'claim',
      amount: '50',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'completed',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
      id: '3',
      type: 'reward',
      amount: '10',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      status: 'completed',
    },
    {
      id: '4',
      type: 'reward',
      amount: '25',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      status: 'completed',
    },
    {
      id: '5',
      type: 'claim',
      amount: '35',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      status: 'completed',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
  ];

  const response = NextResponse.json({ transactions: mockTransactions });
  return addRateLimitHeaders(response, RATE_LIMITS.read, request);
}
