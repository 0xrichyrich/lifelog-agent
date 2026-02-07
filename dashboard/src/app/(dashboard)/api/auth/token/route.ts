import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth-turso';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/auth/token
 * 
 * Exchange a wallet address for a session token.
 * Used by the iOS app after Privy authentication.
 * 
 * Request body:
 *   - walletAddress: string (required) - Ethereum wallet address (0x + 40 hex chars)
 *   - deviceId: string (optional) - Device identifier for tracking
 * 
 * Response:
 *   - token: string - Session token for Authorization: Bearer header
 *   - expiresIn: number - Token lifetime in seconds (86400 = 24 hours)
 * 
 * Rate limit: 10 requests per minute per IP
 */

// Wallet address validation: 0x + 40 hex characters
const WALLET_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateWalletAddress(address: unknown): { valid: boolean; value?: string; error?: string } {
  if (!address) {
    return { valid: false, error: 'walletAddress is required' };
  }
  
  if (typeof address !== 'string') {
    return { valid: false, error: 'walletAddress must be a string' };
  }
  
  if (!WALLET_ADDRESS_REGEX.test(address)) {
    return { valid: false, error: 'Invalid wallet address format. Must be 0x followed by 40 hex characters' };
  }
  
  return { valid: true, value: address.toLowerCase() };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 10 requests per minute per IP
  const rateLimitResult = await checkRateLimit(request, {
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'auth-token',
  });
  
  if (rateLimitResult) {
    return rateLimitResult;
  }
  
  // Validate Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }
  
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
  
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Request body must be an object' },
      { status: 400 }
    );
  }
  
  const { walletAddress, deviceId } = body as Record<string, unknown>;
  
  // Validate wallet address
  const walletValidation = validateWalletAddress(walletAddress);
  if (!walletValidation.valid) {
    return NextResponse.json(
      { error: walletValidation.error },
      { status: 400 }
    );
  }
  
  // Validate deviceId if provided (optional, but must be string if present)
  let validDeviceId: string | undefined;
  if (deviceId !== undefined && deviceId !== null) {
    if (typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'deviceId must be a string' },
        { status: 400 }
      );
    }
    // Limit deviceId length to prevent abuse
    if (deviceId.length > 128) {
      return NextResponse.json(
        { error: 'deviceId too long (max 128 characters)' },
        { status: 400 }
      );
    }
    validDeviceId = deviceId;
  }
  
  try {
    // Create session token
    const result = await createSessionToken(walletValidation.value!, validDeviceId);
    
    return NextResponse.json({
      token: result.token,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error('Failed to create session token:', error);
    return NextResponse.json(
      { error: 'Failed to create session token' },
      { status: 500 }
    );
  }
}
