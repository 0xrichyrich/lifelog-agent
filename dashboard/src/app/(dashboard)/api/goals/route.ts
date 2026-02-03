import { NextRequest, NextResponse } from 'next/server';
import { mockGoals } from '@/lib/mock-data';
import { validateApiKey } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    // Use absolute path from environment or construct safely
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
    const goalsPath = path.resolve(dataDir, 'goals.json');
    
    // Security: Ensure the resolved path is within expected directory
    const expectedPrefix = path.resolve(dataDir);
    if (!goalsPath.startsWith(expectedPrefix)) {
      console.error('Path traversal attempt detected');
      return NextResponse.json({
        goals: mockGoals,
        source: 'mock',
      });
    }
    
    if (fs.existsSync(goalsPath)) {
      const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
      const response = NextResponse.json({
        goals: goalsData,
        source: 'file',
      });
      return addRateLimitHeaders(response, RATE_LIMITS.read, request);
    }
    
    // Return mock data if no goals file exists
    const response = NextResponse.json({
      goals: mockGoals,
      source: 'mock',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({
      goals: mockGoals,
      source: 'mock',
      error: 'Service temporarily unavailable',
    });
  }
}
