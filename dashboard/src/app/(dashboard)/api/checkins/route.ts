import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db-mock';
import { validateApiKey } from '@/lib/auth';
import { validateMessage, validateTimestamp, validateDate, validatePositiveInt } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

// Initialize database on first request
initializeDatabase();

export async function POST(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.checkins);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { message, timestamp } = body;
    
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
    
    const stmt = db.prepare(
      'INSERT INTO check_ins (timestamp, message, source) VALUES (?, ?, ?)'
    );
    const result = stmt.run(timestampResult.value, messageResult.value, 'api');
    
    const response = NextResponse.json({
      id: result.lastInsertRowid,
      message: messageResult.value,
      timestamp: timestampResult.value,
      source: 'api',
    });
    
    return addRateLimitHeaders(response, RATE_LIMITS.checkins, request);
  } catch (error) {
    console.error('Failed to create check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
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
    let dateValue: string | null = null;
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
    
    let query = 'SELECT * FROM check_ins';
    const params: (string | number)[] = [];
    
    if (dateValue) {
      // Use DATE() function for proper date comparison (prevents SQL injection via LIKE)
      query += ' WHERE DATE(timestamp) = ?';
      params.push(dateValue);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limitResult.value!);
    
    const stmt = db.prepare(query);
    const checkins = stmt.all(...params);
    
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
    });
  }
}
