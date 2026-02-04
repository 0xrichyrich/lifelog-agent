/**
 * API Endpoints
 * 
 * Express-compatible API handlers for the multi-agent platform.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { 
  AgentListResponse,
  SendMessageRequest,
  SendMessageResponse,
  AgentPricingResponse,
  StartSessionRequest,
  StartSessionResponse,
  UserMessage,
  AgentMessage,
  PaymentProof,
  Conversation,
  AgentContext,
  UserContext,
} from '../types/index.js';
import { AgentRegistry, getAgent, getAllAgentSummaries } from '../agents/index.js';
import { MessageRouter, routeMessage } from '../router/index.js';
import { 
  PaymentManager, 
  isPaymentRequired, 
  generateX402Response,
  SUPPORTED_NETWORKS,
} from '../payments/index.js';

// In-memory stores (replace with database in production)
const conversations = new Map<string, Conversation>();
const sessions = new Map<string, { userId: string; agentId: string; expiresAt: string; messagesRemaining: number }>();

// Initialize services
const router = new MessageRouter();
const payments = new PaymentManager();

/**
 * Generate unique IDs
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * GET /api/agents - List all available agents
 */
export const listAgents: RequestHandler = async (req, res) => {
  try {
    const agents = getAllAgentSummaries();
    
    const response: AgentListResponse = {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        personality: agent.personality,
        pricing: agent.pricing,
        triggers: agent.triggers,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Error listing agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/agents/:id/message - Send message to an agent
 */
export const sendMessage: RequestHandler = async (req, res) => {
  try {
    const agentId = req.params.id as string;
    const { message, conversationId, paymentProof } = req.body as SendMessageRequest;
    const userId = ((req as any).userId || 'anonymous') as string; // From auth middleware

    // Get agent
    const agent = getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent "${agentId}" not found` });
    }

    // Check payment requirement
    const paymentCheck = payments.isPaymentRequired(agent, userId);
    
    if (paymentCheck.required) {
      // Verify payment proof if provided
      if (paymentProof) {
        const verification = await payments.verifyPaymentProof(paymentProof);
        if (!verification.valid) {
          return res.status(402).json({
            error: 'Invalid payment',
            details: verification.error,
            ...generateX402Response(agent, userId),
          });
        }
        
        // Process the payment
        payments.processPayment(userId, agentId, agent.pricing.perMessage, paymentProof);
      } else {
        // Return 402 Payment Required
        const x402Response = generateX402Response(agent, userId);
        return res.status(402).json(x402Response.body);
      }
    }

    // Get or create conversation
    let conversation: Conversation;
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId)!;
    } else {
      conversation = {
        id: generateId('conv'),
        userId,
        agentId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      conversations.set(conversation.id, conversation);
    }

    // Create user message
    const userMessage: UserMessage = {
      id: generateId('msg'),
      content: message,
      timestamp: new Date().toISOString(),
      userId,
    };
    conversation.messages.push(userMessage);

    // Process with agent (mock response for now)
    // In production, this would call the AI model with the agent's system prompt
    const agentResponse = await processAgentMessage(agent, userMessage, conversation, userId);
    conversation.messages.push(agentResponse);
    conversation.updatedAt = new Date().toISOString();

    // If user had balance, deduct it
    if (!paymentCheck.required && !agent.pricing.isFree) {
      payments.deductBalance(userId, agentId, agent.pricing.perMessage);
    }

    const response: SendMessageResponse = {
      conversationId: conversation.id,
      response: agentResponse,
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/agents/:id/pricing - Get agent pricing info
 */
export const getAgentPricing: RequestHandler = async (req, res) => {
  try {
    const agentId = req.params.id as string;

    const agent = getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent "${agentId}" not found` });
    }

    const pricingInfo = payments.getPricingInfo(agent);

    const response: AgentPricingResponse = {
      agentId: agent.id,
      pricing: agent.pricing,
      walletAddress: agent.walletAddress,
      acceptedCurrencies: ['USDC'],
      supportedNetworks: [...SUPPORTED_NETWORKS],
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Error getting pricing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/agents/:id/session - Start a paid session
 */
export const startSession: RequestHandler = async (req, res) => {
  try {
    const agentId = req.params.id as string;
    const { durationMinutes = 60, paymentProof } = req.body as StartSessionRequest;
    const userId = ((req as any).userId || 'anonymous') as string;

    const agent = getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent "${agentId}" not found` });
    }

    // Sessions only make sense for paid agents
    if (agent.pricing.isFree) {
      return res.status(400).json({ 
        error: 'Sessions not available for free agents',
        hint: 'Just send messages directly!'
      });
    }

    // Calculate session price (10 messages worth)
    const messagesIncluded = 10;
    const sessionPrice = agent.pricing.perMessage * messagesIncluded;

    // Check payment
    if (!paymentProof) {
      const paymentRequest = payments.createPaymentRequest(
        {
          ...agent,
          pricing: { ...agent.pricing, perMessage: sessionPrice },
        },
        userId,
        `Session with ${agent.name} (${messagesIncluded} messages)`
      );
      
      return res.status(402).json({
        ...paymentRequest,
        messagesIncluded,
        hint: 'Pay this amount to start a session with included messages',
      });
    }

    // Verify payment
    const verification = await payments.verifyPaymentProof(paymentProof);
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Invalid payment',
        details: verification.error,
      });
    }

    // Create session
    const sessionId = generateId('sess');
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    
    sessions.set(sessionId, {
      userId,
      agentId,
      expiresAt,
      messagesRemaining: messagesIncluded,
    });

    const response: StartSessionResponse = {
      sessionId,
      expiresAt,
      messagesIncluded,
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/route - Route a message to the appropriate agent
 */
export const routeMessageEndpoint: RequestHandler = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const decision = routeMessage(message);
    const agent = getAgent(decision.agentId);

    res.json({
      ...decision,
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        personality: agent.personality,
        pricing: payments.getPricingInfo(agent),
      } : null,
    });
  } catch (error) {
    console.error('[API] Error routing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/conversations/:id - Get conversation history
 */
export const getConversation: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id as string;
    const conversation = conversations.get(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('[API] Error getting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/balance/add - Add credit to user balance
 */
export const addBalance: RequestHandler = async (req, res) => {
  try {
    const { agentId, amount, paymentProof } = req.body;
    const userId = ((req as any).userId || 'anonymous') as string;

    if (!agentId || !amount || !paymentProof) {
      return res.status(400).json({ error: 'agentId, amount, and paymentProof are required' });
    }

    // Verify payment
    const verification = await payments.verifyPaymentProof(paymentProof);
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Invalid payment',
        details: verification.error,
      });
    }

    // Add credit
    const newBalance = payments.addCredit(userId, agentId, amount);

    res.json({
      success: true,
      balance: newBalance,
      balanceFormatted: payments.formatUsdc(newBalance),
    });
  } catch (error) {
    console.error('[API] Error adding balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/balance/:agentId - Get user balance for an agent
 */
export const getBalance: RequestHandler = async (req, res) => {
  try {
    const agentId = req.params.agentId as string;
    const userId = ((req as any).userId || 'anonymous') as string;

    const balance = payments.getUserBalance(userId, agentId);

    res.json({
      agentId,
      balance,
      balanceFormatted: payments.formatUsdc(balance),
    });
  } catch (error) {
    console.error('[API] Error getting balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Process message with agent (mock implementation)
 * In production, this would call the AI model
 */
async function processAgentMessage(
  agent: any,
  userMessage: UserMessage,
  conversation: Conversation,
  userId: string
): Promise<AgentMessage> {
  // Build context
  const userContext: UserContext = {
    userId,
    preferences: {},
    history: {
      recentAgents: [agent.id],
      favoriteAgents: [],
      totalInteractions: conversation.messages.length,
    },
  };

  // Mock response based on agent type
  let responseContent: string;
  
  switch (agent.id) {
    case 'nudge-coach':
      responseContent = `Hey there! 🌱 Thanks for checking in. ${
        userMessage.content.toLowerCase().includes('tired') 
          ? "I hear you - being tired can be tough. Have you been getting enough rest lately? Sometimes even a 10-minute break can help recharge. What sounds good to you right now?"
          : "How are you feeling today? I'm here to listen and help you stay balanced."
      }`;
      break;
      
    case 'coffee-scout':
      responseContent = `☕ Great question! ${
        userMessage.content.toLowerCase().includes('work') 
          ? "For a work session, I'd recommend somewhere with good wifi and a quieter atmosphere. Do you want me to search for spots near you with those features?"
          : "I'd love to help you find the perfect coffee spot. What's most important to you - ambiance, coffee quality, or location?"
      }`;
      break;
      
    case 'book-buddy':
      responseContent = `📚 Ooh, I love talking books! ${
        userMessage.content.toLowerCase().includes('recommend')
          ? "I can definitely help with recommendations! What kind of mood are you in? Looking for something light and fun, or maybe something more thought-provoking?"
          : "What are you currently reading, or what was the last book that really stuck with you? That'll help me give you better recommendations."
      }`;
      break;
      
    default:
      responseContent = `Thanks for your message! I'm ${agent.name} and I'm here to help.`;
  }

  return {
    id: generateId('resp'),
    agentId: agent.id,
    content: responseContent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create Express router with all endpoints
 */
export function createAgentRouter(express: any) {
  const apiRouter = express.Router();
  
  // Agent endpoints
  apiRouter.get('/agents', listAgents);
  apiRouter.post('/agents/:id/message', sendMessage);
  apiRouter.get('/agents/:id/pricing', getAgentPricing);
  apiRouter.post('/agents/:id/session', startSession);
  
  // Routing endpoint
  apiRouter.post('/route', routeMessageEndpoint);
  
  // Conversation endpoint
  apiRouter.get('/conversations/:id', getConversation);
  
  // Balance endpoints
  apiRouter.post('/balance/add', addBalance);
  apiRouter.get('/balance/:agentId', getBalance);
  
  return apiRouter;
}

// Export all handlers
export {
  listAgents as handleListAgents,
  sendMessage as handleSendMessage,
  getAgentPricing as handleGetPricing,
  startSession as handleStartSession,
  routeMessageEndpoint as handleRouteMessage,
  getConversation as handleGetConversation,
  addBalance as handleAddBalance,
  getBalance as handleGetBalance,
};

export default createAgentRouter;
