import { NextRequest, NextResponse } from 'next/server';
import { requireInternalAuth, validateContentType, validateUserId } from '@/lib/auth';
import { setUsername, getUsername, isUsernameAvailable, isValidUsername } from '@/lib/xp-turso';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * Username Management Endpoint
 * 
 * POST /api/xp/username - Set username for a user
 * GET /api/xp/username?userId=... - Get username for a user
 * GET /api/xp/username?check=username - Check if username is available
 * 
 * Authentication: Requires X-API-Key header for POST
 */

interface SetUsernameRequest {
  userId: string;
  username: string;
}

/**
 * POST - Set username for a user
 */
export async function POST(request: NextRequest) {
  // Authentication required
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.write);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body: SetUsernameRequest = await request.json();
    const { userId, username } = body;
    
    // Validate userId
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return NextResponse.json(
        { error: userIdValidation.error },
        { status: 400 }
      );
    }
    
    // Validate username format
    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters, alphanumeric and underscores only' },
        { status: 400 }
      );
    }
    
    // Set username
    const result = await setUsername(userId, username);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    const response = NextResponse.json({
      success: true,
      username: result.username,
    });
    
    return addRateLimitHeaders(response, RATE_LIMITS.write, request);
    
  } catch (error) {
    console.error('Set username error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get username or check availability
 */
export async function GET(request: NextRequest) {
  // Rate limiting (lighter for reads)
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const checkUsername = searchParams.get('check');
    
    // Check username availability
    if (checkUsername) {
      if (!isValidUsername(checkUsername)) {
        return NextResponse.json({
          available: false,
          error: 'Invalid username format',
        });
      }
      
      const available = await isUsernameAvailable(checkUsername);
      const response = NextResponse.json({ available });
      return addRateLimitHeaders(response, RATE_LIMITS.read, request);
    }
    
    // Get username for userId
    if (userId) {
      const userIdValidation = validateUserId(userId);
      if (!userIdValidation.valid) {
        return NextResponse.json(
          { error: userIdValidation.error },
          { status: 400 }
        );
      }
      
      const username = await getUsername(userId);
      const response = NextResponse.json({
        userId,
        username,
      });
      return addRateLimitHeaders(response, RATE_LIMITS.read, request);
    }
    
    return NextResponse.json(
      { error: 'userId or check parameter required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Get username error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
