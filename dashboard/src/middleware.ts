import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware
 * 
 * Handles CORS, security headers, and preflight requests.
 */

// Allowed origins for CORS
// Localhost only allowed in development mode
const ALLOWED_ORIGINS = [
  'https://dashboard-flame-five-76.vercel.app',
  'https://lifelog-dashboard.vercel.app',
  'https://www.littlenudge.app',
  'https://littlenudge.app',
  // Only include localhost in development
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
  ] : []),
];

// If NEXT_PUBLIC_APP_URL is set, add it to allowed origins
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl && !ALLOWED_ORIGINS.includes(appUrl)) {
  ALLOWED_ORIGINS.push(appUrl);
}

/**
 * Security headers for all responses
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.vercel.app https://*.privy.io https://auth.privy.io https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://explorer-api.walletconnect.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handlePreflight(request);
  }
  
  // Get response
  const response = NextResponse.next();
  
  // Add security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    addCorsHeaders(request, response);
  }
  
  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
function handlePreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  
  const response = new NextResponse(null, { status: 204 });
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(request: NextRequest, response: NextResponse): void {
  const origin = request.headers.get('origin');
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Vary header for proper caching
  response.headers.set('Vary', 'Origin');
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match dashboard pages (for security headers)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
