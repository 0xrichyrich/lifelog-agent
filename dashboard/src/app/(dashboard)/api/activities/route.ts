import { NextRequest, NextResponse } from 'next/server';
import { getActivitiesByDate } from '@/lib/db-mock';
import { mockActivities } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  try {
    // Try to get from database
    const activities = getActivitiesByDate(date);
    
    // If no data, return mock data
    if (activities.length === 0) {
      return NextResponse.json({
        date,
        activities: mockActivities,
        source: 'mock',
      });
    }
    
    return NextResponse.json({
      date,
      activities,
      source: 'database',
    });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json({
      date,
      activities: mockActivities,
      source: 'mock',
      error: 'Database unavailable',
    });
  }
}
