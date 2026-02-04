/**
 * Nudge Agent SDK
 * 
 * Multi-agent platform SDK with x402 micropayments.
 * 
 * @example
 * ```typescript
 * import { 
 *   AgentRegistry, 
 *   MessageRouter, 
 *   PaymentManager,
 *   createAgentRouter 
 * } from '@nudge/agent-sdk';
 * 
 * // List all agents
 * const agents = AgentRegistry.getAll();
 * 
 * // Route a message
 * const router = new MessageRouter();
 * const decision = router.route({ content: "I need coffee", ... });
 * 
 * // Check payment
 * const payments = new PaymentManager();
 * if (payments.isPaymentRequired(agent, userId).required) {
 *   // Return 402 response
 * }
 * ```
 */

// Types
export * from './types/index.js';

// Agents
export {
  AgentRegistry,
  getAgent,
  getAllAgents,
  getFreeAgents,
  getPaidAgents,
  registerAgent,
  unregisterAgent,
  hasAgent,
  getAgentsByCategory,
  getAgentsByTag,
  getAgentSummary,
  getAllAgentSummaries,
  nudgeCoachAgent,
  coffeeScoutAgent,
  bookBuddyAgent,
} from './agents/index.js';

// Router
export {
  MessageRouter,
  router,
  routeMessage,
} from './router/index.js';

// Payments
export {
  PaymentManager,
  paymentManager,
  isPaymentRequired,
  createPaymentRequest,
  generateX402Response,
  SUPPORTED_NETWORKS,
  USDC_ADDRESSES,
  DEFAULT_NETWORK,
} from './payments/index.js';

// API
export {
  createAgentRouter,
  handleListAgents,
  handleSendMessage,
  handleGetPricing,
  handleStartSession,
  handleRouteMessage,
  handleGetConversation,
  handleAddBalance,
  handleGetBalance,
} from './api/index.js';

// Version
export const VERSION = '1.0.0';

// Quick start helper
export async function createNudgeAgentPlatform(config?: {
  defaultAgent?: string;
  paymentNetwork?: string;
}) {
  const { MessageRouter: Router } = await import('./router/index.js');
  const { PaymentManager: Payments } = await import('./payments/index.js');
  const { AgentRegistry: Agents } = await import('./agents/index.js');
  
  const router = new Router({
    defaultAgentId: config?.defaultAgent || 'nudge-coach',
  });
  
  const payments = new Payments({
    network: (config?.paymentNetwork as any) || 'base',
  });

  return {
    router,
    payments,
    agents: Agents,
  };
}
