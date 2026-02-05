import { NextRequest, NextResponse } from 'next/server';
import { getSummaryByDate, initializeDatabase } from '@/lib/db-turso';
import { validateApiKey } from '@/lib/auth';
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

export async function GET(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
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
    
    const summary = await getSummaryByDate(dateResult.value!);
    
    const response = NextResponse.json({
      date: dateResult.value,
      summary: summary || null,
      source: 'database',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to fetch summary:', error);
    return NextResponse.json({
      date: dateResult.value,
      summary: null,
      error: 'Service temporarily unavailable',
    });
  }
}
