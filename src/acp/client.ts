/**
 * ACP (Agent Commerce Protocol) Client
 * Wrapper around Virtuals Protocol ACP for hiring wellness agents
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: number;
  rating: number;
  completedJobs: number;
  capabilities: string[];
}

export interface ACPJob {
  id: string;
  agentId: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  taskDescription: string;
  result?: string;
  createdAt: string;
  completedAt?: string;
  cost: number;
}

export interface WalletBalance {
  usdc: string;
  usdcRaw: string;
  address: string;
}

export interface ACPConfig {
  agentWalletAddress?: string;
  sessionEntityKeyId?: number;
  walletPrivateKey?: string;
}

/**
 * ACP Client for LifeLog
 * Uses OpenClaw's ACP skill tools for agent marketplace interactions
 */
export class ACPClient {
  private config: ACPConfig;
  private openclawCmd: string;

  constructor(config: ACPConfig = {}) {
    this.config = {
      agentWalletAddress: config.agentWalletAddress || process.env.AGENT_WALLET_ADDRESS,
      sessionEntityKeyId: config.sessionEntityKeyId || parseInt(process.env.SESSION_ENTITY_KEY_ID || "1"),
      walletPrivateKey: config.walletPrivateKey || process.env.WALLET_PRIVATE_KEY,
    };
    this.openclawCmd = "openclaw";
  }

  /**
   * Browse available wellness agents
   */
  async browseWellnessAgents(query?: string): Promise<Agent[]> {
    // In production, this would call the ACP skill's browse_agents tool
    // For now, return mock wellness agents to demo the interface
    const agents: Agent[] = [
      {
        id: "fitbot-pro",
        name: "FitBot Pro",
        description: "AI personal trainer that creates personalized workout plans based on your goals and fitness level",
        category: "fitness",
        priceUsd: 0.50,
        rating: 4.8,
        completedJobs: 1247,
        capabilities: ["workout_planning", "form_analysis", "progress_tracking"],
      },
      {
        id: "nutriai",
        name: "NutriAI",
        description: "Nutrition analyzer and meal planner. Analyzes your diet and suggests improvements",
        category: "nutrition",
        priceUsd: 0.30,
        rating: 4.6,
        completedJobs: 892,
        capabilities: ["meal_planning", "calorie_tracking", "macro_optimization"],
      },
      {
        id: "zenmaster",
        name: "ZenMaster",
        description: "Meditation guide and stress management coach. Personalized mindfulness sessions",
        category: "meditation",
        priceUsd: 0.25,
        rating: 4.9,
        completedJobs: 2103,
        capabilities: ["guided_meditation", "breathing_exercises", "sleep_improvement"],
      },
      {
        id: "sleepwise",
        name: "SleepWise",
        description: "Sleep optimization agent. Analyzes your sleep patterns and provides actionable advice",
        category: "sleep",
        priceUsd: 0.35,
        rating: 4.7,
        completedJobs: 654,
        capabilities: ["sleep_analysis", "routine_optimization", "environment_tips"],
      },
      {
        id: "habit-forge",
        name: "HabitForge",
        description: "Habit formation specialist. Uses behavioral science to help you build lasting habits",
        category: "productivity",
        priceUsd: 0.40,
        rating: 4.5,
        completedJobs: 431,
        capabilities: ["habit_tracking", "streak_analysis", "behavior_design"],
      },
    ];

    if (query) {
      const lowerQuery = query.toLowerCase();
      return agents.filter(
        (a) =>
          a.name.toLowerCase().includes(lowerQuery) ||
          a.description.toLowerCase().includes(lowerQuery) ||
          a.category.toLowerCase().includes(lowerQuery) ||
          a.capabilities.some((c) => c.includes(lowerQuery))
      );
    }

    return agents;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    const agents = await this.browseWellnessAgents();
    return agents.find((a) => a.id === agentId) || null;
  }

  /**
   * Hire an agent to perform a task
   */
  async hireAgent(agentId: string, taskDescription: string): Promise<ACPJob> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // In production, this would call execute_acp_job through OpenClaw
    // For demo, create a simulated job
    const job: ACPJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      status: "pending",
      taskDescription,
      createdAt: new Date().toISOString(),
      cost: agent.priceUsd,
    };

    console.log(`\n🤖 Hiring ${agent.name}...`);
    console.log(`   Task: ${taskDescription}`);
    console.log(`   Cost: $${agent.priceUsd} USDC`);
    console.log(`   Job ID: ${job.id}`);

    // Simulate job acceptance after a moment
    // In real implementation, this would use x402 micropayments for escrow
    return job;
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<ACPJob | null> {
    // In production, query job status from ACP
    // For demo, return null (would need persistent storage)
    return null;
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<ACPJob[]> {
    // In production, fetch from ACP
    return [];
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<WalletBalance> {
    // In production, call get_wallet_balance tool
    return {
      usdc: "0.00",
      usdcRaw: "0",
      address: this.config.agentWalletAddress || "0x0000000000000000000000000000000000000000",
    };
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // In production, cancel through ACP
    return false;
  }

  /**
   * Generate wellness recommendation based on LifeLog data
   * Returns suggested agent and task
   */
  async getRecommendation(patterns: any): Promise<{
    agent: Agent;
    suggestedTask: string;
    reason: string;
  } | null> {
    const agents = await this.browseWellnessAgents();

    // Analyze patterns and suggest appropriate agent
    if (patterns.exerciseConsistency && patterns.exerciseConsistency < 0.5) {
      const agent = agents.find((a) => a.id === "fitbot-pro")!;
      return {
        agent,
        suggestedTask: "Analyze my workout history and create a sustainable 4-week fitness plan",
        reason: "Your exercise consistency is below 50%. A personalized plan could help.",
      };
    }

    if (patterns.sleepQuality && patterns.sleepQuality < 0.6) {
      const agent = agents.find((a) => a.id === "sleepwise")!;
      return {
        agent,
        suggestedTask: "Review my sleep patterns and provide optimization recommendations",
        reason: "Your sleep quality scores indicate room for improvement.",
      };
    }

    if (patterns.stressLevel && patterns.stressLevel > 0.7) {
      const agent = agents.find((a) => a.id === "zenmaster")!;
      return {
        agent,
        suggestedTask: "Create a personalized 10-minute daily meditation routine for stress reduction",
        reason: "Your stress indicators are elevated. Mindfulness could help.",
      };
    }

    if (patterns.goalStreak && patterns.goalStreak < 3) {
      const agent = agents.find((a) => a.id === "habit-forge")!;
      return {
        agent,
        suggestedTask: "Analyze my goal completion patterns and design a habit stacking system",
        reason: "Your goal streaks keep breaking. Let's build better habits.",
      };
    }

    return null;
  }
}

// Singleton instance
let _acpClient: ACPClient | null = null;

export function getACPClient(config?: ACPConfig): ACPClient {
  if (!_acpClient || config) {
    _acpClient = new ACPClient(config);
  }
  return _acpClient;
}

// Category helpers
export const WELLNESS_CATEGORIES = [
  "fitness",
  "nutrition",
  "meditation",
  "sleep",
  "productivity",
  "mental_health",
] as const;

export type WellnessCategory = (typeof WELLNESS_CATEGORIES)[number];
