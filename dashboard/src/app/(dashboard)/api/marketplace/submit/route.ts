import { NextRequest, NextResponse } from 'next/server';

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

// Platform configuration
const PLATFORM_WALLET = '0x2390C495896C78668416859d9dE84212fCB10801';
const LISTING_FEE_USDC = 100000; // $0.10 USDC (6 decimals)

// In-memory storage for MVP (will be replaced with database later)
// Note: This persists across warm function invocations but resets on cold starts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForAgents = globalThis as typeof globalThis & { communityAgents?: SubmittedAgent[] };
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
      // Return 402 Payment Required with payment details
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: 'A listing fee is required to submit your agent to the marketplace',
          amount: LISTING_FEE_USDC,
          currency: 'USDC',
          recipientWallet: PLATFORM_WALLET,
          network: 'Base',
          x402: {
            version: '1.0',
            accepts: ['usdc'],
            price: LISTING_FEE_USDC,
            payTo: PLATFORM_WALLET,
            memo: `Agent listing fee for: ${body.name}`,
          },
        },
        { 
          status: 402,
          headers: {
            'X-Payment-Required': 'true',
            'X-Payment-Amount': String(LISTING_FEE_USDC),
            'X-Payment-Currency': 'USDC',
            'X-Payment-Address': PLATFORM_WALLET,
          },
        }
      );
    }

    // Payment proof provided - process submission
    // In production, you would verify the payment on-chain here
    
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

// GET endpoint to check submission status or list user's submissions
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const agentId = searchParams.get('id');

  const agents = loadCommunityAgents();

  // Get specific agent by ID
  if (agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ agent });
  }

  // Get all agents by creator wallet
  if (wallet) {
    const userAgents = agents.filter(
      a => a.creatorWallet.toLowerCase() === wallet.toLowerCase()
    );
    return NextResponse.json({ agents: userAgents, total: userAgents.length });
  }

  // Return all community agents
  return NextResponse.json({ agents, total: agents.length });
}
