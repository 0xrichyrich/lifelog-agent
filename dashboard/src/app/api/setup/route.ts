import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isDatabaseConfigured, getStats } from '@/lib/db-turso';

export async function GET(request: NextRequest) {
  // Check configuration first
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: false,
      error: 'Database not configured',
      message: 'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables must be set',
      setup: {
        step1: 'Create a Turso account at https://turso.tech/app',
        step2: 'Install CLI: curl -sSfL https://get.tur.so/install.sh | bash',
        step3: 'Create database: turso db create nudge-prod --location ord',
        step4: 'Get URL: turso db show nudge-prod --url',
        step5: 'Get token: turso db tokens create nudge-prod',
        step6: 'Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to Vercel env vars',
      },
    }, { status: 503 });
  }

  try {
    // Initialize database tables
    await initializeDatabase();
    
    // Get current stats to verify
    const stats = await getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      tables: ['check_ins', 'activities', 'media', 'summaries'],
      indexes: ['idx_checkins_timestamp', 'idx_activities_timestamp'],
      stats,
      envCheck: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? '✓ set' : '✗ missing',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? '✓ set' : '✗ missing',
      },
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      envCheck: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? '✓ set (starts with: ' + process.env.TURSO_DATABASE_URL.slice(0, 20) + '...)' : '✗ missing',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? '✓ set (length: ' + process.env.TURSO_AUTH_TOKEN.length + ')' : '✗ missing',
      },
    }, { status: 500 });
  }
}

// Also support POST for explicit setup
export async function POST(request: NextRequest) {
  return GET(request);
}
