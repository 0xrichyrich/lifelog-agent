import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from './auth-turso';

/**
 * API Key & Session Token Authentication Middleware
 * 
 * Supports two authentication methods:
 * 
 * 1. Session Token (iOS app): Authorization: Bearer <session_token>
 *    - 64 hex character tokens from POST /api/auth/token
 *    - Validated against Turso session_tokens table
 *    - Returns wallet address on success
 * 
 * 2. API Key (backend-to-backend): X-API-Key: <key>
 *    - Static key from INTERNAL_API_KEY env var
 *    - Used for cron jobs, internal services
 * 
 * Session tokens are tried FIRST, then fall back to API key.
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
 * 
 * SECURITY: Fails CLOSED — if key is not configured, ALL requests are rejected.
 * For local dev, set INTERNAL_API_KEY in .env.local
 */
export function validateInternalApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  // Fail CLOSED: If no API key is configured, reject ALL requests
  if (!apiKey) {
    console.error('INTERNAL_API_KEY not configured — rejecting request');
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
 * 
 * SECURITY: Fails CLOSED — if key is not configured, ALL requests are rejected.
 * For local dev, set NUDGE_API_KEY in .env.local
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.NUDGE_API_KEY;
  
  // Fail CLOSED: If no API key is configured, reject ALL requests
  if (!apiKey) {
    console.error('NUDGE_API_KEY not configured — rejecting request');
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
 * Result from session token authentication
 */
export interface SessionAuthResult {
  authenticated: boolean;
  walletAddress?: string;
  error?: NextResponse;
}

/**
 * Try to authenticate via session token (Bearer token in Authorization header)
 * Returns the wallet address if valid, null if no token or invalid
 * 
 * This is async because it validates against Turso database.
 */
export async function trySessionTokenAuth(request: NextRequest): Promise<SessionAuthResult> {
  const authHeader = request.headers.get('authorization');
  
  // No Authorization header
  if (!authHeader) {
    return { authenticated: false };
  }
  
  // Must be Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return { authenticated: false };
  }
  
  const token = authHeader.slice(7);
  
  // Session tokens are exactly 64 hex characters
  // API keys are typically different length, so this filters them out
  if (token.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(token)) {
    return { authenticated: false };
  }
  
  try {
    const result = await validateSessionToken(token);
    
    if (result.valid && result.walletAddress) {
      return {
        authenticated: true,
        walletAddress: result.walletAddress,
      };
    }
    
    // Token was the right format but invalid/expired
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: result.error || 'Invalid session token' },
        { status: 401 }
      ),
    };
  } catch (error) {
    console.error('Session token validation error:', error);
    return { authenticated: false };
  }
}

/**
 * Require internal API auth - returns error response or null
 * Usage: const authError = requireInternalAuth(request); if (authError) return authError;
 * 
 * SYNC version - only checks X-API-Key, does NOT check session tokens.
 * Use requireInternalAuthAsync for full authentication including session tokens.
 */
export function requireInternalAuth(request: NextRequest): NextResponse | null {
  return validateInternalApiKey(request);
}

/**
 * Require internal API auth (async version) - checks session tokens first, then API key
 * 
 * Priority:
 * 1. Session token (Bearer token with 64 hex chars) - for iOS app
 * 2. X-API-Key header - for backend-to-backend calls
 * 
 * Usage:
 *   const authResult = await requireInternalAuthAsync(request);
 *   if (authResult.error) return authResult.error;
 *   const userId = authResult.walletAddress || extractUserIdFromRequest(request);
 */
export async function requireInternalAuthAsync(request: NextRequest): Promise<{
  authenticated: boolean;
  walletAddress?: string;
  error?: NextResponse;
}> {
  // Try session token first (for iOS app)
  const sessionResult = await trySessionTokenAuth(request);
  
  if (sessionResult.authenticated) {
    return {
      authenticated: true,
      walletAddress: sessionResult.walletAddress,
    };
  }
  
  // If session token was provided but invalid, return that specific error
  if (sessionResult.error) {
    return {
      authenticated: false,
      error: sessionResult.error,
    };
  }
  
  // Fall back to API key (for backend-to-backend)
  const apiKeyError = validateInternalApiKey(request);
  if (apiKeyError) {
    return {
      authenticated: false,
      error: apiKeyError,
    };
  }
  
  // Authenticated via API key (no wallet address in this case)
  return { authenticated: true };
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
  
  // Device UUID format: 8-4-4-4-12 (case-insensitive hex with dashes)
  const uuidRegex = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  
  if (walletRegex.test(userId) || uuidRegex.test(userId)) {
    return { valid: true, value: userId };
  }
  
  return { valid: false, error: 'Invalid userId format. Must be wallet address (0x...) or device UUID' };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * Uses Node's built-in crypto.timingSafeEqual when available.
 * For mismatched lengths, pads the shorter buffer to avoid length leakage.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  
  // Determine the max length and pad both buffers to that length
  const maxLength = Math.max(aBuffer.length, bBuffer.length);
  
  // Create padded buffers of equal length
  const aPadded = Buffer.alloc(maxLength);
  const bPadded = Buffer.alloc(maxLength);
  aBuffer.copy(aPadded);
  bBuffer.copy(bPadded);
  
  // Use Node's built-in timing-safe comparison on equal-length buffers
  // Note: We must ALSO check original lengths match, but do so after the comparison
  // to ensure consistent timing regardless of where the mismatch occurs
  try {
    // Try Node's built-in (not available in all Edge runtimes)
    const crypto = require('crypto');
    const buffersMatch = crypto.timingSafeEqual(aPadded, bPadded);
    const lengthsMatch = aBuffer.length === bBuffer.length;
    return buffersMatch && lengthsMatch;
  } catch {
    // Fallback for Edge runtime: manual constant-time comparison
    let result = aBuffer.length ^ bBuffer.length; // XOR of lengths (0 if equal)
    for (let i = 0; i < maxLength; i++) {
      result |= aPadded[i] ^ bPadded[i];
    }
    return result === 0;
  }
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
