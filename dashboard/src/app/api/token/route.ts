import { NextResponse } from 'next/server';

// Mock token data (in production, read from blockchain)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  // Mock data - in production, call TokenRewards.getUserStats()
  const mockStats = {
    address,
    balance: '1250.00',
    earned: '1750.00',
    goalsCompleted: 35,
    rewardRates: {
      daily: '100',
      weekly: '500',
      streak: '50',
    },
    contractAddress: process.env.LIFE_TOKEN_ADDRESS || '0x...',
  };

  return NextResponse.json(mockStats);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, address, goalIds } = body;

  if (action === 'claim') {
    // Mock claim - in production, call TokenRewards.rewardGoalsBatch()
    return NextResponse.json({
      success: true,
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      amount: '500',
    });
  }

  if (action === 'unlock') {
    const { feature } = body;
    // Mock unlock - in production, call TokenRewards.unlockFeature()
    return NextResponse.json({
      success: true,
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      feature,
      cost: '1000',
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
