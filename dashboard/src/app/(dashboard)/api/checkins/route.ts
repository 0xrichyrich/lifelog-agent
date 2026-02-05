import { NextRequest, NextResponse } from 'next/server';
import { createCheckIn, getCheckIns, initializeDatabase, isDatabaseConfigured } from '@/lib/db-turso';
import { validateMessage, validateTimestamp, validateDate, validatePositiveInt } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

// Initialize database tables on cold start
let initialized = false;
let initError: Error | null = null;

async function ensureInitialized(): Promise<{ ready: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ready: false, error: 'TURSO_DATABASE_URL environment variable is not set' };
  }
  
  if (initError) {
    return { ready: false, error: initError.message };
  }
  
  if (!initialized) {
    try {
      console.log('Initializing database tables...');
      await initializeDatabase();
      initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      initError = error instanceof Error ? error : new Error('Unknown initialization error');
      console.error('Failed to initialize database:', initError);
      return { ready: false, error: initError.message };
    }
  }
  return { ready: true };
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.checkins);
  if (rateLimitError) return rateLimitError;
  
  try {
    const initResult = await ensureInitialized();
    if (!initResult.ready) {
      return NextResponse.json({
        error: 'Database not ready',
        message: initResult.error || 'Database initialization failed',
        setup: 'Visit /api/setup to initialize the database, or check that TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in Vercel env vars',
        docs: 'https://turso.tech/app - create database, then add env vars',
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
    console.error('Failed to create check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    const initResult = await ensureInitialized();
    if (!initResult.ready) {
      return NextResponse.json({
        checkins: [],
        count: 0,
        error: 'Database not ready',
        message: initResult.error || 'Database initialization failed',
        setup: '/api/setup to initialize',
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
    console.error('Failed to fetch check-ins:', error);
    return NextResponse.json({
      checkins: [],
      error: 'Service temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
