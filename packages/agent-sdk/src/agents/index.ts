/**
 * Agent Registry
 * 
 * Central registry for all available agents in the Nudge platform.
 */

import type { AgentDefinition } from '../types/index.js';
import { nudgeCoachAgent } from './nudge-coach.js';
import { coffeeScoutAgent } from './coffee-scout.js';
import { bookBuddyAgent } from './book-buddy.js';

// Registry of all available agents
const agentRegistry = new Map<string, AgentDefinition>();

// Register default agents
agentRegistry.set(nudgeCoachAgent.id, nudgeCoachAgent);
agentRegistry.set(coffeeScoutAgent.id, coffeeScoutAgent);
agentRegistry.set(bookBuddyAgent.id, bookBuddyAgent);

/**
 * Get an agent by ID
 */
export function getAgent(agentId: string): AgentDefinition | undefined {
  return agentRegistry.get(agentId);
}

/**
 * Get all registered agents
 */
export function getAllAgents(): AgentDefinition[] {
  return Array.from(agentRegistry.values());
}

/**
 * Get only free agents
 */
export function getFreeAgents(): AgentDefinition[] {
  return getAllAgents().filter(agent => agent.pricing.isFree);
}

/**
 * Get only paid agents
 */
export function getPaidAgents(): AgentDefinition[] {
  return getAllAgents().filter(agent => !agent.pricing.isFree);
}

/**
 * Register a new agent
 */
export function registerAgent(agent: AgentDefinition): void {
  if (agentRegistry.has(agent.id)) {
    throw new Error(`Agent with ID "${agent.id}" is already registered`);
  }
  agentRegistry.set(agent.id, agent);
}

/**
 * Unregister an agent
 */
export function unregisterAgent(agentId: string): boolean {
  return agentRegistry.delete(agentId);
}

/**
 * Check if an agent exists
 */
export function hasAgent(agentId: string): boolean {
  return agentRegistry.has(agentId);
}

/**
 * Get agents by category
 */
export function getAgentsByCategory(category: string): AgentDefinition[] {
  return getAllAgents().filter(
    agent => agent.metadata?.category === category
  );
}

/**
 * Get agents by tag
 */
export function getAgentsByTag(tag: string): AgentDefinition[] {
  return getAllAgents().filter(
    agent => agent.metadata?.tags?.includes(tag)
  );
}

/**
 * Get agent summary for API responses
 */
export function getAgentSummary(agent: AgentDefinition) {
  return {
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
    personality: agent.personality,
    pricing: agent.pricing,
    triggers: agent.triggers,
    category: agent.metadata?.category,
    tags: agent.metadata?.tags,
  };
}

/**
 * Get all agent summaries
 */
export function getAllAgentSummaries() {
  return getAllAgents().map(getAgentSummary);
}

// Export individual agents for direct import
export { nudgeCoachAgent } from './nudge-coach.js';
export { coffeeScoutAgent } from './coffee-scout.js';
export { bookBuddyAgent } from './book-buddy.js';

// Export registry functions
export const AgentRegistry = {
  get: getAgent,
  getAll: getAllAgents,
  getFree: getFreeAgents,
  getPaid: getPaidAgents,
  register: registerAgent,
  unregister: unregisterAgent,
  has: hasAgent,
  byCategory: getAgentsByCategory,
  byTag: getAgentsByTag,
  summary: getAgentSummary,
  allSummaries: getAllAgentSummaries,
};

export default AgentRegistry;
