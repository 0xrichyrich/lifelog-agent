import { NextRequest, NextResponse } from 'next/server';

/**
 * API Key Authentication Middleware
 * 
 * Validates requests against LIFELOG_API_KEY environment variable.
 * Returns null if authenticated, or NextResponse with error if not.
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.LIFELOG_API_KEY;
  
  // If no API key is configured, allow in development only
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ LIFELOG_API_KEY not configured - allowing request in dev mode');
      return null;
    }
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  const headerKey = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  // Also check X-API-Key header as fallback
  const xApiKey = request.headers.get('x-api-key');
  
  const providedKey = headerKey || xApiKey;
  
  if (!providedKey) {
    return NextResponse.json(
      { error: 'Authentication required. Provide API key via Authorization header.' },
      { status: 401 }
    );
  }
  
  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(providedKey, apiKey)) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  return null; // Authenticated
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Wrapper to protect API route handlers
 */
export function withAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const authError = validateApiKey(request);
    if (authError) {
      return authError;
    }
    return handler(request, ...args);
  }) as T;
}
