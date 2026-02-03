import { NextRequest, NextResponse } from 'next/server';
import { getSummaryByDate } from '@/lib/db-mock';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  try {
    const summary = getSummaryByDate(date);
    
    return NextResponse.json({
      date,
      summary: summary || null,
      source: 'database',
    });
  } catch (error) {
    console.error('Failed to fetch summary:', error);
    return NextResponse.json({
      date,
      summary: null,
      error: 'Database unavailable',
    });
  }
}
