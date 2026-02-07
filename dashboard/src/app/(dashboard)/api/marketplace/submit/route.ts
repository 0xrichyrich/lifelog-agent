import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentOnChain, isValidTxHash, TOKENS, isPaymentHashUsed, markPaymentHashUsed } from '@/lib/payment-verification';
import { validateContentType, requireInternalAuth } from '@/lib/auth';
import { getPlatformWallet, LISTING_FEE_USDC } from '@/lib/constants';

/**
 * Agent Marketplace Submission Endpoint
 * 
 * POST /api/marketplace/submit
 * 
 * x402 Protocol Implementation:
 * - First call without paymentProof returns 402 Payment Required
 * - Second call with paymentProof processes the submission
 * 
 * Request Body:
 * {
 *   name: string,
 *   icon: string,
 *   description: string,
 *   category: 'wellness' | 'productivity' | 'lifestyle' | 'entertainment',
 *   systemPrompt: string,
 *   pricing: { perMessage: number, isFree: boolean },
 *   creatorWallet: string,
 *   capabilities: string[],
 *   paymentProof?: string
 * }
 */

// Platform configuration now imported from @/lib/constants

// In-memory storage for community agents (will be replaced with database later)
// Note: This persists across warm function invocations but resets on cold starts
// Payment hash replay protection now uses persistent Turso storage via payment-verification.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForAgents = globalThis as typeof globalThis & { 
  communityAgents?: SubmittedAgent[];
};
if (!globalForAgents.communityAgents) {
  globalForAgents.communityAgents = [];
}

interface SubmittedAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'wellness' | 'productivity' | 'lifestyle' | 'entertainment';
  systemPrompt: string;
  pricing: {
    perMessage: number;
    isFree: boolean;
  };
  creatorWallet: string;
  capabilities: string[];
  // Computed/metadata fields
  price: number;
  isFree: boolean;
  rating: number;
  totalRatings: number;
  usageCount: number;
  featured: boolean;
  triggers: string[];
  // Submission metadata
  createdAt: string;
  status: 'pending' | 'approved' | 'live';
  paymentTx: string;
  isCommunity: boolean;
}

// Public agent data (strips sensitive fields like systemPrompt)
interface PublicAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  pricing: {
    perMessage: number;
    isFree: boolean;
  };
  creatorWallet: string;
  capabilities: string[];
  price: number;
  isFree: boolean;
  rating: number;
  totalRatings: number;
  usageCount: number;
  featured: boolean;
  triggers: string[];
  createdAt: string;
  status: string;
  isCommunity: boolean;
}

interface SubmissionRequest {
  name: string;
  icon: string;
  description: string;
  category: 'wellness' | 'productivity' | 'lifestyle' | 'entertainment';
  systemPrompt: string;
  pricing: {
    perMessage: number;
    isFree: boolean;
  };
  creatorWallet: string;
  capabilities: string[];
  paymentProof?: string;
}

// Load community agents from memory
function loadCommunityAgents(): SubmittedAgent[] {
  return globalForAgents.communityAgents || [];
}

// Save community agents to memory
function saveCommunityAgents(agents: SubmittedAgent[]): void {
  globalForAgents.communityAgents = agents;
}

// Strip systemPrompt from agent data for public API responses
function stripSensitiveData(agent: SubmittedAgent): PublicAgent {
  const { systemPrompt: _systemPrompt, paymentTx: _paymentTx, ...publicData } = agent;
  return publicData;
}

// Generate unique ID
function generateId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${slug}-${suffix}`;
}

// Extract triggers from description and capabilities
function extractTriggers(description: string, capabilities: string[]): string[] {
  const words = [...description.toLowerCase().split(/\s+/), ...capabilities.map(c => c.toLowerCase())];
  const keywords = words.filter(w => w.length > 3 && w.length < 15);
  return [...new Set(keywords)].slice(0, 5);
}

// Validate wallet address (basic check)
function isValidWallet(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate submission data
function validateSubmission(data: SubmissionRequest): string | null {
  if (!data.name || data.name.length < 2 || data.name.length > 50) {
    return 'Agent name must be between 2 and 50 characters';
  }
  if (!data.icon || data.icon.length === 0) {
    return 'Icon is required';
  }
  if (!data.description || data.description.length < 10 || data.description.length > 500) {
    return 'Description must be between 10 and 500 characters';
  }
  if (!['wellness', 'productivity', 'lifestyle', 'entertainment'].includes(data.category)) {
    return 'Invalid category';
  }
  if (!data.systemPrompt || data.systemPrompt.length < 20) {
    return 'System prompt must be at least 20 characters';
  }
  if (!data.creatorWallet || !isValidWallet(data.creatorWallet)) {
    return 'Valid wallet address (0x...) is required';
  }
  if (!data.capabilities || data.capabilities.length === 0) {
    return 'At least one capability is required';
  }
  if (data.pricing && !data.pricing.isFree && (data.pricing.perMessage < 0 || data.pricing.perMessage > 1000000)) {
    return 'Invalid pricing';
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Authentication required
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  try {
    const body: SubmissionRequest = await request.json();

    // Validate input
    const validationError = validateSubmission(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // x402 Protocol: Check for payment proof
    if (!body.paymentProof) {
      const platformWallet = getPlatformWallet();
      // Return 402 Payment Required with payment details
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: 'A listing fee is required to submit your agent to the marketplace',
          amount: LISTING_FEE_USDC,
          currency: 'USDC',
          recipientWallet: platformWallet,
          network: 'Base',
          x402: {
            version: '1.0',
            accepts: ['usdc'],
            price: LISTING_FEE_USDC,
            payTo: platformWallet,
            memo: `Agent listing fee for: ${body.name}`,
          },
        },
        { 
          status: 402,
          headers: {
            'X-Payment-Required': 'true',
            'X-Payment-Amount': String(LISTING_FEE_USDC),
            'X-Payment-Currency': 'USDC',
            'X-Payment-Address': platformWallet,
          },
        }
      );
    }

    // Payment proof provided - verify on-chain before processing
    
    // Validate tx hash format
    if (!isValidTxHash(body.paymentProof)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // Check for duplicate payment (replay protection via persistent Turso)
    if (await isPaymentHashUsed(body.paymentProof)) {
      return NextResponse.json(
        { error: 'This payment has already been used for a submission' },
        { status: 400 }
      );
    }

    // On-chain verification via Monad Mainnet RPC
    const verification = await verifyPaymentOnChain(
      body.paymentProof,
      LISTING_FEE_USDC, // Expected listing fee amount
      TOKENS.NUDGE // Use $NUDGE token for payment
    );

    if (!verification.valid) {
      return NextResponse.json(
        { 
          error: 'Payment verification failed',
          details: verification.error 
        },
        { status: 400 }
      );
    }
    
    // Mark payment hash as used (persistent replay protection via Turso)
    await markPaymentHashUsed(body.paymentProof, body.creatorWallet, 'marketplace:submit');
    
    // Load existing agents
    const agents = loadCommunityAgents();

    // Check for duplicate names
    const existingNames = agents.map(a => a.name.toLowerCase());
    if (existingNames.includes(body.name.toLowerCase())) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }

    // Create new agent record
    const newAgent: SubmittedAgent = {
      id: generateId(body.name),
      name: body.name,
      icon: body.icon,
      description: body.description,
      category: body.category,
      systemPrompt: body.systemPrompt,
      pricing: body.pricing,
      creatorWallet: body.creatorWallet,
      capabilities: body.capabilities,
      // Computed fields
      price: body.pricing.isFree ? 0 : body.pricing.perMessage,
      isFree: body.pricing.isFree,
      rating: 5.0, // New agents start with 5 stars
      totalRatings: 0,
      usageCount: 0,
      featured: false,
      triggers: extractTriggers(body.description, body.capabilities),
      // Metadata
      createdAt: new Date().toISOString(),
      status: 'live', // For MVP, auto-approve
      paymentTx: body.paymentProof,
      isCommunity: true,
    };

    // Add to agents list
    agents.push(newAgent);
    saveCommunityAgents(agents);

    return NextResponse.json({
      success: true,
      message: 'Agent submitted successfully',
      agent: {
        id: newAgent.id,
        name: newAgent.name,
        status: newAgent.status,
        createdAt: newAgent.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/submit
 * Check submission status or list user's submissions
 * 
 * Query params:
 *   wallet: string - filter by creator wallet
 *   id: string - get specific agent by ID
 * 
 * Security: systemPrompt is STRIPPED from all responses
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const agentId = searchParams.get('id');

  const agents = loadCommunityAgents();

  // Get specific agent by ID (strip sensitive data)
  if (agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    // Return public data only - no systemPrompt
    return NextResponse.json({ agent: stripSensitiveData(agent) });
  }

  // Get all agents by creator wallet (strip sensitive data)
  if (wallet) {
    const userAgents = agents
      .filter(a => a.creatorWallet.toLowerCase() === wallet.toLowerCase())
      .map(stripSensitiveData);
    return NextResponse.json({ agents: userAgents, total: userAgents.length });
  }

  // Return all community agents (strip sensitive data)
  const publicAgents = agents.map(stripSensitiveData);
  return NextResponse.json({ agents: publicAgents, total: publicAgents.length });
}
