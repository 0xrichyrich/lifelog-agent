import { NextRequest, NextResponse } from 'next/server';

interface Transaction {
  id: string;
  type: 'claim' | 'reward' | 'transfer';
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
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

  return NextResponse.json({ transactions: mockTransactions });
}
