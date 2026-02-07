import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring
 * No authentication required - used by uptime monitors
 * 
 * Security: Does not expose version/build info
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
