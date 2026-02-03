import { NextRequest, NextResponse } from 'next/server';
import { exportAllData } from '@/lib/db-mock';
import { validateApiKey } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Authentication - export is sensitive, always require auth
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Strict rate limiting for export (heavy operation)
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.export);
  if (rateLimitError) return rateLimitError;
  
  try {
    const data = exportAllData();
    
    // Remove any error fields that might leak info
    if ('error' in data) {
      delete (data as any).error;
    }
    
    const response = NextResponse.json(data);
    return addRateLimitHeaders(response, RATE_LIMITS.export, request);
  } catch (error) {
    console.error('Export failed:', error);
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
