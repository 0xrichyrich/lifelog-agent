import { NextRequest, NextResponse } from 'next/server';
import { createClient, Client } from '@libsql/client';

/**
 * Rate Limiter with Turso Database Backend
 * 
 * Uses Turso (libSQL) for persistent rate limiting across serverless instances.
 * Falls back to in-memory rate limiting if Turso is unavailable.
 * 
 * Key format: {keyPrefix}:{ip}:{windowId}
 * Window ID is calculated as: Math.floor(Date.now() / (windowSeconds * 1000))
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Turso client singleton
let _rateLimitClient: Client | null = null;
let _tursoAvailable: boolean | null = null;

function getRateLimitClient(): Client | null {
  if (_tursoAvailable === false) return null;
  
  if (!_rateLimitClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      _tursoAvailable = false;
      return null;
    }
    
    try {
      _rateLimitClient = createClient({ url, authToken });
      _tursoAvailable = true;
    } catch {
      _tursoAvailable = false;
      return null;
    }
  }
  return _rateLimitClient;
}

// Initialize rate limit table (called lazily)
let _tableInitialized = false;
async function ensureRateLimitTable(): Promise<boolean> {
  if (_tableInitialized) return _tursoAvailable === true;
  
  const client = getRateLimitClient();
  if (!client) return false;
  
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT NOT NULL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start TEXT NOT NULL
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`);
    _tableInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize rate_limits table:', error);
    _tursoAvailable = false;
    return false;
  }
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional key prefix for different endpoints */
  keyPrefix?: string;
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

/**
 * Calculate window ID for consistent bucketing
 */
function getWindowId(windowSeconds: number): string {
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  return windowId.toString();
}

/**
 * Check rate limit using Turso database
 */
async function checkRateLimitTurso(
  key: string,
  options: RateLimitOptions
): Promise<{ exceeded: boolean; count: number; resetTime: number } | null> {
  const client = getRateLimitClient();
  if (!client) return null;
  
  const windowId = getWindowId(options.windowSeconds);
  const windowStart = new Date(parseInt(windowId, 10) * options.windowSeconds * 1000).toISOString();
  const resetTime = (parseInt(windowId, 10) + 1) * options.windowSeconds * 1000;
  
  try {
    // Atomic upsert with increment
    const result = await client.execute({
      sql: `
        INSERT INTO rate_limits (key, count, window_start) 
        VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET 
          count = CASE 
            WHEN rate_limits.window_start = excluded.window_start 
            THEN rate_limits.count + 1 
            ELSE 1 
          END,
          window_start = excluded.window_start
        RETURNING count
      `,
      args: [key, windowStart],
    });
    
    const count = Number(result.rows[0]?.count ?? 1);
    return {
      exceeded: count > options.limit,
      count,
      resetTime,
    };
  } catch (error) {
    console.error('Turso rate limit check failed:', error);
    return null;
  }
}

/**
 * Check rate limit using in-memory fallback
 */
function checkRateLimitMemory(
  key: string,
  options: RateLimitOptions
): { exceeded: boolean; count: number; resetTime: number } {
  const { limit, windowSeconds } = options;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    };
    rateLimitStore.set(key, entry);
    return { exceeded: false, count: 1, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return {
    exceeded: entry.count > limit,
    count: entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Check rate limit for a request
 * Returns null if within limit, NextResponse with error if exceeded
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const { limit, keyPrefix = '' } = options;
  
  const ip = getClientIP(request);
  const windowId = getWindowId(options.windowSeconds);
  const key = `${keyPrefix}:${ip}:${windowId}`;
  
  // Try Turso first
  await ensureRateLimitTable();
  let result = await checkRateLimitTurso(key, options);
  
  // Fall back to in-memory if Turso unavailable
  if (!result) {
    result = checkRateLimitMemory(key, options);
  }
  
  if (result.exceeded) {
    const now = Date.now();
    const retryAfter = Math.ceil((result.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.max(0, retryAfter)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
  }
  
  return null;
}

/**
 * Rate limit presets for different endpoint types
 */
export const RATE_LIMITS = {
  // Check-ins: 10 per minute
  checkins: { limit: 10, windowSeconds: 60, keyPrefix: 'checkins' },
  
  // Read operations: 60 per minute
  read: { limit: 60, windowSeconds: 60, keyPrefix: 'read' },
  
  // Write operations: 10 per minute
  write: { limit: 10, windowSeconds: 60, keyPrefix: 'write' },
  
  // Token operations: 5 per minute
  token: { limit: 5, windowSeconds: 60, keyPrefix: 'token' },
  
  // Export: 2 per minute
  export: { limit: 2, windowSeconds: 60, keyPrefix: 'export' },
  
  // ACP operations: 10 per minute
  acp: { limit: 10, windowSeconds: 60, keyPrefix: 'acp' },
} as const;

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  options: RateLimitOptions,
  request: NextRequest
): NextResponse {
  const { limit, windowSeconds, keyPrefix = '' } = options;
  
  const ip = getClientIP(request);
  const windowId = getWindowId(windowSeconds);
  const key = `${keyPrefix}:${ip}:${windowId}`;
  const entry = rateLimitStore.get(key);
  
  if (entry) {
    const remaining = Math.max(0, limit - entry.count);
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));
  }
  
  return response;
}

/**
 * Clean up old rate limit entries from Turso
 * Call periodically via cron or after high traffic
 */
export async function cleanupRateLimits(): Promise<number> {
  const client = getRateLimitClient();
  if (!client) return 0;
  
  try {
    // Delete entries older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = await client.execute({
      sql: 'DELETE FROM rate_limits WHERE window_start < ?',
      args: [oneHourAgo],
    });
    return result.rowsAffected;
  } catch (error) {
    console.error('Rate limit cleanup failed:', error);
    return 0;
  }
}
