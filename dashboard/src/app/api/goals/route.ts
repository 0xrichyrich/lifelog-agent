import { NextResponse } from 'next/server';
import { mockGoals } from '@/lib/mock-data';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Try to read goals from goals.json (will be created by Phase 3)
    const goalsPath = path.join(process.cwd(), '..', 'data', 'goals.json');
    
    if (fs.existsSync(goalsPath)) {
      const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
      return NextResponse.json({
        goals: goalsData,
        source: 'file',
      });
    }
    
    // Return mock data if no goals file exists
    return NextResponse.json({
      goals: mockGoals,
      source: 'mock',
    });
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({
      goals: mockGoals,
      source: 'mock',
      error: 'Goals file unavailable',
    });
  }
}
