import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  // TODO: Integrate with actual blockchain/database
  // For now, return mock data
  
  // In production, this would:
  // 1. Query the $LIFE token contract for balance
  // 2. Query the rewards database for pending rewards
  
  const mockBalance = {
    balance: '150.5',
    pendingRewards: '25',
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(mockBalance);
}
