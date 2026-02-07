import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Whisper Transcription Proxy Endpoint
 * 
 * This proxies transcription requests to OpenAI so the iOS app
 * doesn't need to include the OpenAI API key in the app binary.
 */

const RATE_LIMIT = { limit: 10, windowSeconds: 60, keyPrefix: 'transcribe' };
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function POST(request: NextRequest) {
  // Authentication
  const authError = validateApiKey(request);
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMIT);
  if (rateLimitError) return rateLimitError;
  
  try {
    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503 }
      );
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 25MB)' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['audio/m4a', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(m4a|mp3|wav|webm|mp4)$/i)) {
      return NextResponse.json(
        { error: 'Invalid audio file type' },
        { status: 400 }
      );
    }
    
    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: whisperFormData,
    });
    
    if (!response.ok) {
      console.error('Whisper API error:', response.status, await response.text());
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 502 }
      );
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      text: result.text,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
