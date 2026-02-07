import { NextRequest, NextResponse } from 'next/server';
import { exportAllData, initializeDatabase } from '@/lib/db-turso';
import { validateApiKey } from '@/lib/auth';
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
  // Authentication - export is sensitive, always require auth
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Strict rate limiting for export (heavy operation)
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.export);
  if (rateLimitError) return rateLimitError;
  
  try {
    await ensureInitialized();
    
    const data = await exportAllData();
    
    const response = NextResponse.json(data);
    return addRateLimitHeaders(response, RATE_LIMITS.export, request);
  } catch (error) {
    // Log the actual error server-side
    console.error('Export failed:', error);
    
    // Return generic error to client (don't leak internal details)
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      error: 'Export failed',
      activities: [],
      checkIns: [],
      media: [],
      summaries: [],
    }, { status: 500 });
  }
}
