/**
 * Nudge Agent SDK - Core Types
 * 
 * Defines the protocol for multi-agent interactions with x402 micropayments.
 */

// =============================================================================
// Data Source Types
// =============================================================================

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'memory';
  config: Record<string, unknown>;
  description?: string;
}

export interface APIDataSource extends DataSource {
  type: 'api';
  config: {
    baseUrl: string;
    authType?: 'apiKey' | 'oauth' | 'bearer' | 'none';
    headers?: Record<string, string>;
    rateLimit?: {
      requests: number;
      windowMs: number;
    };
  };
}

export interface MemoryDataSource extends DataSource {
  type: 'memory';
  config: {
    namespace: string;
    ttlMs?: number;
    maxItems?: number;
  };
}

// =============================================================================
// Agent Tool Types
// =============================================================================

export interface AgentToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: AgentToolParameter[];
  returns: {
    type: string;
    description: string;
  };
  handler?: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

// =============================================================================
// Pricing Types
// =============================================================================

export interface AgentPricing {
  /** Cost per message in USDC (6 decimals, so 10000 = $0.01) */
  perMessage: number;
  /** Optional session rate in USDC */
  perSession?: number;
  /** Free tier message allowance per day */
  freeTierDaily?: number;
  /** Whether this agent is completely free */
  isFree: boolean;
}

// =============================================================================
// Agent Definition
// =============================================================================

export interface AgentDefinition {
  /** Unique identifier for the agent */
  id: string;
  /** Display name */
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  /** Short personality description for UI */
  personality: string;
  /** Full system prompt for the AI model */
  systemPrompt: string;
  /** Intents/triggers this agent handles */
  triggers: string[];
  /** Data sources the agent can access */
  dataSources: DataSource[];
  /** Tools/actions the agent can take */
  tools: AgentTool[];
  /** Pricing configuration */
  pricing: AgentPricing;
  /** Wallet address for receiving payments */
  walletAddress: string;
  /** Agent version */
  version: string;
  /** Optional metadata */
  metadata?: {
    author?: string;
    category?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

// =============================================================================
// Message Types
// =============================================================================

export interface UserMessage {
  id: string;
  content: string;
  timestamp: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  toolCalls?: ToolCallResult[];
  metadata?: Record<string, unknown>;
}

export interface ToolCallResult {
  toolId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  messages: (UserMessage | AgentMessage)[];
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
}

// =============================================================================
// Context Types
// =============================================================================

export interface UserContext {
  userId: string;
  preferences?: Record<string, unknown>;
  history?: {
    recentAgents: string[];
    favoriteAgents: string[];
    totalInteractions: number;
  };
  wallet?: {
    address: string;
    balance: number;
  };
}

export interface AgentContext {
  agent: AgentDefinition;
  user: UserContext;
  conversation: Conversation;
  dataSources: Map<string, DataSource>;
  tools: Map<string, AgentTool>;
}

// =============================================================================
// Payment Types (x402)
// =============================================================================

export interface PaymentRequest {
  agentId: string;
  amount: number; // USDC with 6 decimals
  currency: 'USDC';
  recipient: string; // wallet address
  description: string;
  expiresAt: string;
  nonce: string;
}

export interface PaymentProof {
  signature: string;
  paymentId: string;
  timestamp: string;
  chain: string;
  txHash?: string;
}

export interface X402Response {
  status: 402;
  headers: {
    'X-Payment-Required': string;
    'X-Payment-Address': string;
    'X-Payment-Amount': string;
    'X-Payment-Currency': string;
    'X-Payment-Network': string;
    'X-Payment-Expires': string;
  };
  body: PaymentRequest;
}

// =============================================================================
// Router Types
// =============================================================================

export interface RouterDecision {
  agentId: string;
  confidence: number;
  reasoning: string;
  alternativeAgents?: Array<{
    agentId: string;
    confidence: number;
  }>;
}

export interface RouterConfig {
  defaultAgentId: string;
  confidenceThreshold: number;
  enableMultiAgent?: boolean;
}

// =============================================================================
// API Types
// =============================================================================

export interface AgentListResponse {
  agents: Array<{
    id: string;
    name: string;
    icon: string;
    personality: string;
    pricing: AgentPricing;
    triggers: string[];
  }>;
}

export interface SendMessageRequest {
  message: string;
  conversationId?: string;
  paymentProof?: PaymentProof;
}

export interface SendMessageResponse {
  conversationId: string;
  response: AgentMessage;
  paymentRequired?: PaymentRequest;
}

export interface AgentPricingResponse {
  agentId: string;
  pricing: AgentPricing;
  walletAddress: string;
  acceptedCurrencies: string[];
  supportedNetworks: string[];
}

export interface StartSessionRequest {
  durationMinutes?: number;
  paymentProof?: PaymentProof;
}

export interface StartSessionResponse {
  sessionId: string;
  expiresAt: string;
  messagesIncluded?: number;
}
