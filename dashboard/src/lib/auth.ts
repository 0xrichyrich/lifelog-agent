import { NextRequest, NextResponse } from 'next/server';

/**
 * API Key Authentication Middleware
 * 
 * Validates requests against INTERNAL_API_KEY environment variable.
 * Returns null if authenticated, or NextResponse with error if not.
 * 
 * Supports both:
 * - Authorization: Bearer <key>
 * - X-API-Key: <key>
 */

// Production logging helper - never log sensitive data in production
function logSecurely(message: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data);
  }
}

/**
 * Validate API key for internal endpoints (iOS app, cron jobs, etc.)
 * Uses INTERNAL_API_KEY for app-to-backend communication
 */
export function validateInternalApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  // If no API key is configured, allow in development only
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      logSecurely('⚠️ INTERNAL_API_KEY not configured - allowing request in dev mode');
      return null;
    }
    console.error('INTERNAL_API_KEY not configured in production');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  // Check X-API-Key header (preferred for internal API)
  const xApiKey = request.headers.get('x-api-key');
  
  // Also check Authorization header as fallback
  const authHeader = request.headers.get('authorization');
  const headerKey = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  const providedKey = xApiKey || headerKey;
  
  if (!providedKey) {
    return NextResponse.json(
      { error: 'Authentication required' },
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
 * Validate API key (legacy - uses NUDGE_API_KEY)
 * Kept for backward compatibility with existing endpoints
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.NUDGE_API_KEY;
  
  // If no API key is configured, allow in development only
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      logSecurely('⚠️ NUDGE_API_KEY not configured - allowing request in dev mode');
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
 * Require internal API auth - returns error response or null
 * Usage: const authError = requireInternalAuth(request); if (authError) return authError;
 */
export function requireInternalAuth(request: NextRequest): NextResponse | null {
  return validateInternalApiKey(request);
}

/**
 * Validate Content-Type header for POST requests
 */
export function validateContentType(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }
  return null;
}

/**
 * Validate userId format
 * Accepts: 
 * - Ethereum wallet address: 0x followed by 40 hex chars
 * - Device UUID: 8-4-4-4-12 hex format (uppercase)
 */
export function validateUserId(userId: unknown): { valid: boolean; value?: string; error?: string } {
  if (!userId) {
    return { valid: false, error: 'userId is required' };
  }
  
  if (typeof userId !== 'string') {
    return { valid: false, error: 'userId must be a string' };
  }
  
  // Max length check (wallet = 42, UUID = 36)
  if (userId.length > 64) {
    return { valid: false, error: 'userId too long' };
  }
  
  // Wallet address format: 0x + 40 hex chars (case-insensitive)
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  
  // Device UUID format: 8-4-4-4-12 (uppercase hex with dashes)
  const uuidRegex = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/;
  
  if (walletRegex.test(userId) || uuidRegex.test(userId)) {
    return { valid: true, value: userId };
  }
  
  return { valid: false, error: 'Invalid userId format. Must be wallet address (0x...) or device UUID' };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Use Buffer for proper constant-time comparison when lengths match
  // For mismatched lengths, we still do the full comparison to avoid leaking length info
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  
  // If lengths differ, compare against a known-length buffer to maintain constant time
  if (aBuffer.length !== bBuffer.length) {
    // Compare a with itself to maintain timing consistency
    let result = 0;
    for (let i = 0; i < aBuffer.length; i++) {
      result |= aBuffer[i] ^ aBuffer[i];
    }
    return false; // Lengths differ
  }
  
  let result = 0;
  for (let i = 0; i < aBuffer.length; i++) {
    result |= aBuffer[i] ^ bBuffer[i];
  }
  
  return result === 0;
}

/**
 * Wrapper to protect API route handlers with internal auth
 */
export function withInternalAuth<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const authError = validateInternalApiKey(request);
    if (authError) {
      return authError;
    }
    return handler(request, ...args);
  }) as T;
}

/**
 * Wrapper to protect API route handlers (legacy)
 */
export function withAuth<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const authError = validateApiKey(request);
    if (authError) {
      return authError;
    }
    return handler(request, ...args);
  }) as T;
}
