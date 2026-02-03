import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

// Initialize database on first request
initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, timestamp } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    const ts = timestamp || new Date().toISOString();
    
    const stmt = db.prepare(
      'INSERT INTO check_ins (timestamp, message, source) VALUES (?, ?, ?)'
    );
    const result = stmt.run(ts, message, 'api');
    
    return NextResponse.json({
      id: result.lastInsertRowid,
      message,
      timestamp: ts,
      source: 'api',
    });
  } catch (error) {
    console.error('Failed to create check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const date = searchParams.get('date');
    
    let query = 'SELECT * FROM check_ins';
    const params: (string | number)[] = [];
    
    if (date) {
      query += ' WHERE DATE(timestamp) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    const checkins = stmt.all(...params);
    
    return NextResponse.json({
      checkins,
      count: checkins.length,
    });
  } catch (error) {
    console.error('Failed to fetch check-ins:', error);
    return NextResponse.json({
      checkins: [],
      error: 'Database unavailable',
    });
  }
}
