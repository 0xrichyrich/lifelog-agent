import { NextRequest, NextResponse } from 'next/server';
import { getActivitiesByDate, initializeDatabase } from '@/lib/db-turso';
import { validateDate } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

// Initialize database tables on cold start
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    try {
      await initializeDatabase();
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}

/**
 * GET /api/activities
 * Get activities for a specific date
 * 
 * PUBLIC - No authentication required (read-only)
 */
export async function GET(request: NextRequest) {
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
    await ensureInitialized();
    
    const activities = await getActivitiesByDate(dateResult.value!);
    
    const response = NextResponse.json({
      date: dateResult.value,
      activities,
      source: activities.length > 0 ? 'database' : 'empty',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    // Log the actual error server-side
    console.error('Failed to fetch activities:', error);
    
    // Return generic error to client (don't leak internal details)
    const response = NextResponse.json({
      date: dateResult.value,
      activities: [],
      source: 'error',
      error: 'Service temporarily unavailable',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  }
}
