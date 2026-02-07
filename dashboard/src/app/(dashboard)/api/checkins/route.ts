import { NextRequest, NextResponse } from 'next/server';
import { createCheckIn, getCheckIns, initializeDatabase, isDatabaseConfigured } from '@/lib/db-turso';
import { validateMessage, validateTimestamp, validateDate, validatePositiveInt } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { validateContentType } from '@/lib/auth';

// Initialize database tables on cold start
let initialized = false;
let initError: Error | null = null;

async function ensureInitialized(): Promise<{ ready: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ready: false, error: 'Database not configured' };
  }
  
  if (initError) {
    return { ready: false, error: 'Database initialization failed' };
  }
  
  if (!initialized) {
    try {
      await initializeDatabase();
      initialized = true;
    } catch (error) {
      initError = error instanceof Error ? error : new Error('Unknown initialization error');
      console.error('Failed to initialize database:', initError);
      return { ready: false, error: 'Database initialization failed' };
    }
  }
  return { ready: true };
}

/**
 * POST /api/checkins
 * Create a new check-in
 * 
 * PUBLIC - No authentication required (for demo purposes)
 */
export async function POST(request: NextRequest) {
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.checkins);
  if (rateLimitError) return rateLimitError;
  
  try {
    const initResult = await ensureInitialized();
    if (!initResult.ready) {
      return NextResponse.json({
        error: 'Service temporarily unavailable',
      }, { status: 503 });
    }
    
    const body = await request.json();
    const { message, timestamp, activityType = 'break' } = body;
    
    // Input validation
    const messageResult = validateMessage(message);
    if (!messageResult.valid) {
      return NextResponse.json(
        { error: messageResult.error },
        { status: 400 }
      );
    }
    
    const timestampResult = validateTimestamp(timestamp);
    if (!timestampResult.valid) {
      return NextResponse.json(
        { error: timestampResult.error },
        { status: 400 }
      );
    }
    
    // Validate activity type
    const validTypes = ['focus', 'meeting', 'break', 'wellness'];
    const normalizedType = validTypes.includes(activityType) ? activityType : 'break';
    
    const id = await createCheckIn(
      timestampResult.value!,
      messageResult.value!,
      'api',
      undefined,
      normalizedType
    );
    
    const response = NextResponse.json({
      id,
      message: messageResult.value,
      timestamp: timestampResult.value,
      source: 'api',
    });
    
    return addRateLimitHeaders(response, RATE_LIMITS.checkins, request);
  } catch (error) {
    // Log the actual error server-side
    console.error('Failed to create check-in:', error);
    
    // Return generic error to client
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkins
 * Get check-ins with optional filters
 * 
 * PUBLIC - No authentication required (read-only)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    const initResult = await ensureInitialized();
    if (!initResult.ready) {
      return NextResponse.json({
        checkins: [],
        count: 0,
        error: 'Service temporarily unavailable',
      });
    }
    
    const searchParams = request.nextUrl.searchParams;
    
    // Validate limit
    const limitResult = validatePositiveInt(searchParams.get('limit'), { 
      min: 1, 
      max: 100, 
      defaultValue: 20 
    });
    if (!limitResult.valid) {
      return NextResponse.json(
        { error: limitResult.error },
        { status: 400 }
      );
    }
    
    // Validate date if provided
    const dateParam = searchParams.get('date');
    let dateValue: string | undefined;
    if (dateParam) {
      const dateResult = validateDate(dateParam);
      if (!dateResult.valid) {
        return NextResponse.json(
          { error: dateResult.error },
          { status: 400 }
        );
      }
      dateValue = dateResult.value!;
    }
    
    const checkins = await getCheckIns({
      date: dateValue,
      limit: limitResult.value!,
    });
    
    const response = NextResponse.json({
      checkins,
      count: checkins.length,
    });
    
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    // Log the actual error server-side
    console.error('Failed to fetch check-ins:', error);
    
    // Return generic error to client
    return NextResponse.json({
      checkins: [],
      error: 'Service temporarily unavailable',
    });
  }
}
