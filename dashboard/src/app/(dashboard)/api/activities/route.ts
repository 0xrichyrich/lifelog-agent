import { NextRequest, NextResponse } from 'next/server';
import { getActivitiesByDate } from '@/lib/db-mock';
import { mockActivities } from '@/lib/mock-data';
import { validateApiKey } from '@/lib/auth';
import { validateDate } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Authentication
  // Auth removed for public access - rate limiting only
  // if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  // Validate date
  const dateResult = validateDate(dateParam);
  if (!dateResult.valid) {
    return NextResponse.json(
      { error: dateResult.error },
      { status: 400 }
    );
  }
  
  try {
    // Try to get from database
    const activities = getActivitiesByDate(dateResult.value!);
    
    // Return actual data (empty array if none)
    const response = NextResponse.json({
      date: dateResult.value,
      activities,
      source: activities.length > 0 ? 'database' : 'empty',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    // Return empty on error instead of mock data
    const response = NextResponse.json({
      date: dateResult.value,
      activities: [],
      source: 'empty',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  }
}
