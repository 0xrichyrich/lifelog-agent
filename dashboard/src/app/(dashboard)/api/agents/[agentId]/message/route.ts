import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Agent Message Endpoint
 * Sends a message to an AI agent and returns the response
 * Supports x402 micropayments for paid agents
 */

// Agent pricing configuration (matches /api/agents)
// Amount is in USDC micro-units (6 decimals): 10000 = $0.01
const AGENT_PRICING: Record<string, { perMessage: number; isFree: boolean; freeTierDaily: number | null }> = {
  'nudge-coach': { perMessage: 0, isFree: true, freeTierDaily: null },
  'coffee-scout': { perMessage: 10000, isFree: false, freeTierDaily: 3 },
  'book-buddy': { perMessage: 10000, isFree: false, freeTierDaily: 3 },
};

// Platform wallet address for receiving payments (Base network)
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || '0x4f9e2dc880328facc0ebc8f3a6b0e9b0f0e0e0e0';

// System prompts for each agent - these define their personality
const AGENT_PROMPTS: Record<string, string> = {
  'nudge-coach': `You are Nudge Coach 🌱, an empathetic wellness companion in the Nudge app. Your role is to:

- Provide gentle, supportive check-ins about the user's day, mood, and wellness
- Offer emotional support with warmth and understanding
- Give positive reinforcement and celebrate small wins
- Suggest simple wellness tips without being preachy
- Ask thoughtful follow-up questions to understand how someone is really doing
- Be conversational, friendly, and caring - like a supportive friend

Keep responses concise (2-4 sentences typically) unless the user needs more support. Use occasional emojis naturally but don't overdo it. Never be judgmental. Focus on mental wellness, stress management, and emotional balance.`,

  'coffee-scout': `You are Coffee Scout ☕, a local coffee expert in the Nudge app. Your role is to:

- Help users find the perfect café for their mood, vibe, or work needs
- Share knowledge about coffee drinks, roasts, and brewing methods
- Recommend coffee spots based on preferences (quiet vs buzzy, wifi, outlet availability, etc.)
- Discuss specialty coffee, latte art, and café culture enthusiastically
- Be upbeat, friendly, and passionate about coffee

Keep responses helpful and concise. When recommending places, ask clarifying questions about what they're looking for. You're the friend who always knows the best coffee spots in town.`,

  'book-buddy': `You are Book Buddy 📚, a literary companion in the Nudge app. Your role is to:

- Give personalized book recommendations based on mood, interests, or recent reads
- Discuss books, authors, and genres with genuine enthusiasm
- Help users discover new genres or expand their reading horizons
- Share interesting facts about books and authors
- Create reading lists or suggest what to read next
- Be warm, thoughtful, and genuinely interested in what the user enjoys

Keep responses conversational and engaging. Ask about their reading preferences and history to give better recommendations. You're the well-read friend who always has the perfect book suggestion.`,
};

// Agent display names for payment descriptions
const AGENT_NAMES: Record<string, string> = {
  'nudge-coach': 'Nudge Coach',
  'coffee-scout': 'Coffee Scout',
  'book-buddy': 'Book Buddy',
};

// In-memory conversation storage (for demo purposes)
// In production, use a database
const conversations: Map<string, { role: string; content: string }[]> = new Map();

interface PaymentProof {
  signature: string;
  paymentId: string;
  timestamp: string;
  chain: string;
  txHash?: string;
}

interface MessageRequest {
  message: string;
  conversationId?: string;
  paymentProof?: PaymentProof;
}

interface PaymentRequest {
  agentId: string;
  amount: number;
  currency: string;
  recipient: string;
  description: string;
  expiresAt: string;
  nonce: string;
}

/**
 * Verify payment proof
 * In production, this would verify the signature against the wallet
 * and optionally check on-chain transaction status
 */
function verifyPaymentProof(proof: PaymentProof, agentId: string): boolean {
  // Basic validation
  if (!proof.signature || !proof.paymentId || !proof.timestamp || !proof.chain) {
    console.warn('[Payment] Invalid proof structure:', proof);
    return false;
  }

  // Check timestamp is recent (within 5 minutes)
  const proofTime = new Date(proof.timestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (Math.abs(now - proofTime) > fiveMinutes) {
    console.warn('[Payment] Proof timestamp too old:', proof.timestamp);
    return false;
  }

  // Check chain is Base
  if (proof.chain !== 'base') {
    console.warn('[Payment] Invalid chain:', proof.chain);
    return false;
  }

  // In production: verify signature matches the expected message format
  // For now, accept any well-formed proof
  console.log('[Payment] Proof accepted for agent:', agentId, 'paymentId:', proof.paymentId);
  return true;
}

/**
 * Create x402 payment request response
 */
function createPaymentRequest(agentId: string): PaymentRequest {
  const pricing = AGENT_PRICING[agentId];
  const agentName = AGENT_NAMES[agentId] || agentId;
  
  // Payment expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  return {
    agentId,
    amount: pricing?.perMessage || 10000,
    currency: 'USDC',
    recipient: PLATFORM_WALLET,
    description: `Message to ${agentName}`,
    expiresAt,
    nonce: randomUUID(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json() as MessageRequest;
    const { message, conversationId, paymentProof } = body;
    const userId = request.headers.get('X-User-ID') || 'anonymous';

    // Validate agent exists
    const systemPrompt = AGENT_PROMPTS[agentId];
    if (!systemPrompt) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check pricing and payment for paid agents
    const pricing = AGENT_PRICING[agentId];
    const isPaidAgent = pricing && !pricing.isFree;
    
    if (isPaidAgent) {
      // For paid agents, always require payment unless proof is provided
      // (In production, free tier would use database/KV for state tracking)
      if (!paymentProof) {
        // Return 402 Payment Required
        const paymentRequest = createPaymentRequest(agentId);
        console.log('[x402] Payment required for', agentId, 'user:', userId);
        
        return NextResponse.json(paymentRequest, { status: 402 });
      }
      
      // Verify payment proof
      if (!verifyPaymentProof(paymentProof, agentId)) {
        return NextResponse.json(
          { error: 'Invalid payment proof' },
          { status: 400 }
        );
      }
      
      console.log('[x402] Payment verified for', agentId, 'user:', userId);
    }

    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Get or create conversation
    const convId = conversationId || randomUUID();
    const convKey = `${userId}_${agentId}_${convId}`;
    
    let history = conversations.get(convKey) || [];
    
    // Add user message to history
    history.push({ role: 'user', content: message });
    
    // Keep only last 10 messages for context
    if (history.length > 10) {
      history = history.slice(-10);
    }

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 }
      );
    }

    const result = await response.json();
    const assistantMessage = result.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    // Add assistant message to history
    history.push({ role: 'assistant', content: assistantMessage });
    conversations.set(convKey, history);

    // Build response
    const responseId = randomUUID();
    return NextResponse.json({
      conversationId: convId,
      response: {
        id: responseId,
        agentId,
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      },
      paymentRequired: null,
    });

  } catch (error) {
    console.error('Agent message error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
