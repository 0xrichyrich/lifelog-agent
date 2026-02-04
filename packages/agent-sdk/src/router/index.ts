/**
 * Message Router
 * 
 * Routes incoming messages to the appropriate agent based on intent detection.
 * Uses keyword matching and can be extended with ML-based intent classification.
 */

import type { 
  AgentDefinition, 
  RouterConfig, 
  RouterDecision,
  UserMessage,
} from '../types/index.js';
import { getAllAgents, getAgent } from '../agents/index.js';

// Default router configuration
const DEFAULT_CONFIG: RouterConfig = {
  defaultAgentId: 'nudge-coach',
  confidenceThreshold: 0.3,
  enableMultiAgent: false,
};

/**
 * Message Router - Routes messages to appropriate agents
 */
export class MessageRouter {
  private config: RouterConfig;
  private agents: Map<string, AgentDefinition>;
  private triggerIndex: Map<string, Set<string>>; // trigger -> agentIds

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agents = new Map();
    this.triggerIndex = new Map();
    this.loadAgents();
  }

  /**
   * Load all agents and build trigger index
   */
  private loadAgents(): void {
    const allAgents = getAllAgents();
    
    for (const agent of allAgents) {
      this.agents.set(agent.id, agent);
      
      // Index triggers for fast lookup
      for (const trigger of agent.triggers) {
        const normalizedTrigger = trigger.toLowerCase();
        if (!this.triggerIndex.has(normalizedTrigger)) {
          this.triggerIndex.set(normalizedTrigger, new Set());
        }
        this.triggerIndex.get(normalizedTrigger)!.add(agent.id);
      }
    }
  }

  /**
   * Route a message to the appropriate agent
   */
  route(message: UserMessage): RouterDecision {
    const content = message.content.toLowerCase();
    const scores = new Map<string, number>();
    
    // Initialize all agents with 0 score
    for (const agentId of this.agents.keys()) {
      scores.set(agentId, 0);
    }

    // Score based on trigger matches
    for (const [trigger, agentIds] of this.triggerIndex.entries()) {
      if (content.includes(trigger)) {
        const triggerWeight = this.calculateTriggerWeight(trigger, content);
        for (const agentId of agentIds) {
          const currentScore = scores.get(agentId) || 0;
          scores.set(agentId, currentScore + triggerWeight);
        }
      }
    }

    // Normalize scores
    const maxScore = Math.max(...scores.values(), 1);
    for (const [agentId, score] of scores.entries()) {
      scores.set(agentId, score / maxScore);
    }

    // Find best match
    let bestAgentId = this.config.defaultAgentId;
    let bestScore = 0;
    const alternatives: Array<{ agentId: string; confidence: number }> = [];

    for (const [agentId, score] of scores.entries()) {
      if (score > bestScore) {
        if (bestScore > 0) {
          alternatives.push({ agentId: bestAgentId, confidence: bestScore });
        }
        bestAgentId = agentId;
        bestScore = score;
      } else if (score > this.config.confidenceThreshold) {
        alternatives.push({ agentId, confidence: score });
      }
    }

    // If no good match found, use default
    if (bestScore < this.config.confidenceThreshold) {
      bestAgentId = this.config.defaultAgentId;
      bestScore = 0.5; // Moderate confidence for default
    }

    return {
      agentId: bestAgentId,
      confidence: bestScore,
      reasoning: this.generateReasoning(bestAgentId, bestScore, content),
      alternativeAgents: alternatives
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3),
    };
  }

  /**
   * Calculate weight for a trigger match
   */
  private calculateTriggerWeight(trigger: string, content: string): number {
    // Exact phrase match gets higher weight
    const exactMatch = content.includes(trigger);
    if (!exactMatch) return 0;

    // Word boundary bonus (trigger is a complete word/phrase)
    const regex = new RegExp(`\\b${trigger}\\b`, 'i');
    const wordBoundary = regex.test(content);
    
    // Longer triggers are more specific, so they get higher weight
    const lengthBonus = Math.min(trigger.split(' ').length * 0.2, 1);
    
    let weight = 1;
    if (wordBoundary) weight += 0.5;
    weight += lengthBonus;
    
    return weight;
  }

  /**
   * Generate human-readable reasoning for the routing decision
   */
  private generateReasoning(agentId: string, confidence: number, content: string): string {
    const agent = this.agents.get(agentId);
    if (!agent) return 'Unknown agent selected';

    const matchedTriggers = agent.triggers.filter(t => 
      content.includes(t.toLowerCase())
    );

    if (matchedTriggers.length === 0) {
      return `Defaulting to ${agent.name} as no specific triggers matched`;
    }

    const triggers = matchedTriggers.slice(0, 3).join(', ');
    return `Matched ${agent.name} based on keywords: ${triggers} (confidence: ${(confidence * 100).toFixed(0)}%)`;
  }

  /**
   * Force route to a specific agent
   */
  forceRoute(agentId: string): RouterDecision {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent "${agentId}" not found`);
    }
    
    return {
      agentId,
      confidence: 1.0,
      reasoning: `Manually routed to ${agentId}`,
    };
  }

  /**
   * Get the agent for a routing decision
   */
  getAgent(decision: RouterDecision): AgentDefinition | undefined {
    return this.agents.get(decision.agentId);
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Refresh agents from registry
   */
  refresh(): void {
    this.agents.clear();
    this.triggerIndex.clear();
    this.loadAgents();
  }

  /**
   * Get routing suggestions for a partial message (autocomplete)
   */
  getSuggestions(partialMessage: string, limit = 3): Array<{
    agentId: string;
    agentName: string;
    icon: string;
    matchedTrigger: string;
  }> {
    const content = partialMessage.toLowerCase();
    const suggestions: Array<{
      agentId: string;
      agentName: string;
      icon: string;
      matchedTrigger: string;
      score: number;
    }> = [];

    for (const [trigger, agentIds] of this.triggerIndex.entries()) {
      if (trigger.startsWith(content) || content.includes(trigger)) {
        for (const agentId of agentIds) {
          const agent = this.agents.get(agentId);
          if (agent) {
            suggestions.push({
              agentId,
              agentName: agent.name,
              icon: agent.icon,
              matchedTrigger: trigger,
              score: trigger.startsWith(content) ? 2 : 1,
            });
          }
        }
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ agentId, agentName, icon, matchedTrigger }) => ({
        agentId,
        agentName,
        icon,
        matchedTrigger,
      }));
  }
}

// Export singleton instance
export const router = new MessageRouter();

// Helper function for quick routing
export function routeMessage(message: string | UserMessage): RouterDecision {
  const userMessage: UserMessage = typeof message === 'string' 
    ? {
        id: `msg_${Date.now()}`,
        content: message,
        timestamp: new Date().toISOString(),
        userId: 'anonymous',
      }
    : message;
  
  return router.route(userMessage);
}

export default router;
