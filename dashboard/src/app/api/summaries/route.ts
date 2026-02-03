import { NextRequest, NextResponse } from 'next/server';
import { getSummaryByDate } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  try {
    const summary = getSummaryByDate(date);
    
    if (!summary) {
      return NextResponse.json({
        date,
        summary: null,
        source: 'database',
        message: 'No summary found for this date',
      });
    }
    
    return NextResponse.json({
      date,
      summary: {
        ...summary,
        content: JSON.parse(summary.content_json),
      },
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
