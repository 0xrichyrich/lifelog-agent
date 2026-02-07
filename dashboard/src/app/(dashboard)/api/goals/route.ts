import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import fs from 'fs';
import path from 'path';

// Goals schema validation
interface Goal {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  target?: number;
  completed?: boolean;
}

function isValidGoal(obj: unknown): obj is Goal {
  if (!obj || typeof obj !== 'object') return false;
  const g = obj as Record<string, unknown>;
  return typeof g.id === 'string' && typeof g.title === 'string';
}

function validateGoalsData(data: unknown): Goal[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidGoal);
}

/**
 * GET /api/goals
 * Get user goals
 * 
 * PUBLIC - No authentication required (read-only)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  try {
    // Use absolute path from environment or construct safely
    // Default to current working directory + data folder (NOT parent directory)
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    
    // Resolve and sanitize the path
    const resolvedDataDir = path.resolve(dataDir);
    const goalsPath = path.resolve(resolvedDataDir, 'goals.json');
    
    // Security: Ensure the resolved path is within expected directory
    // Prevent path traversal attacks
    if (!goalsPath.startsWith(resolvedDataDir)) {
      console.error('Path traversal attempt detected');
      return NextResponse.json({
        goals: [],
        source: 'empty',
      });
    }
    
    // Check if file exists before reading
    if (!fs.existsSync(goalsPath)) {
      const response = NextResponse.json({
        goals: [],
        source: 'empty',
      });
      return addRateLimitHeaders(response, RATE_LIMITS.read, request);
    }
    
    // Read and parse with schema validation
    const rawData = fs.readFileSync(goalsPath, 'utf-8');
    let parsedData: unknown;
    
    try {
      parsedData = JSON.parse(rawData);
    } catch {
      console.error('Invalid JSON in goals file');
      return NextResponse.json({
        goals: [],
        source: 'empty',
      });
    }
    
    // Validate and sanitize the data
    const goalsData = validateGoalsData(parsedData);
    
    const response = NextResponse.json({
      goals: goalsData,
      source: 'file',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
    
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({
      goals: [],
      source: 'empty',
    });
  }
}
