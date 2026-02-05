import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * 
 * ⚠️  WARNING: In-memory rate limiting does NOT work reliably on serverless!
 * Each serverless function instance has its own memory, so rate limits
 * are not shared across instances. A user could bypass limits by hitting
 * different instances.
 * 
 * TODO: For production, use Upstash Redis or Vercel KV:
 * - Upstash Redis: https://upstash.com/docs/redis/sdks/ratelimit-ts
 * - Vercel KV: https://vercel.com/docs/storage/vercel-kv
 * 
 * This implementation is suitable for:
 * - Development/testing
 * - Single-instance deployments
 * - Hackathon demos
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (will reset on server restart)
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

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional key prefix for different endpoints */
  keyPrefix?: string;
}

/**
 * Check rate limit for a request
 * Returns null if within limit, NextResponse with error if exceeded
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const { limit, windowSeconds, keyPrefix = '' } = options;
  
  // Get client identifier (IP or forwarded IP)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    };
    rateLimitStore.set(key, entry);
    return null;
  }
  
  entry.count++;
  
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
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
  
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = `${keyPrefix}:${ip}`;
  const entry = rateLimitStore.get(key);
  
  if (entry) {
    const remaining = Math.max(0, limit - entry.count);
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));
  }
  
  return response;
}
