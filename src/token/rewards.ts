/**
 * Token Rewards Module
 * Bridges Nudge goal completion to on-chain $NUDGE token rewards
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from "ethers";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Contract ABI (minimal interface for rewards)
const NUDGE_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function rewardGoalCompletion(address to, uint256 goalId, uint256 goalType) external",
  "function rewardGoalsBatch(address to, uint256[] goalIds, uint256[] goalTypes) external",
  "function getUserStats(address) view returns (uint256 balance, uint256 earned, uint256 completed)",
  "function isGoalClaimed(address user, uint256 goalId) view returns (bool)",
  "function rewardRates(uint256) view returns (uint256)",
  "function unlockFeature(string feature) external",
  "function featureCosts(string) view returns (uint256)",
  "event GoalCompleted(address indexed user, uint256 goalId, uint256 reward)",
  "event FeatureUnlocked(address indexed user, string feature, uint256 cost)",
];

// Goal type mapping
export enum GoalType {
  DAILY = 0,
  WEEKLY = 1,
  STREAK = 2,
}

export interface UserStats {
  balance: string;
  earned: string;
  goalsCompleted: number;
}

export interface ClaimableGoal {
  id: number;
  name: string;
  type: GoalType;
  reward: string;
  claimed: boolean;
}

export interface RewardConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey?: string; // For minting (backend only)
}

export class TokenRewards {
  private provider: JsonRpcProvider;
  private contract: Contract;
  private wallet?: Wallet;
  private contractAddress: string;

  constructor(config: RewardConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.contractAddress = config.contractAddress;
    
    if (config.privateKey) {
      this.wallet = new Wallet(config.privateKey, this.provider);
      this.contract = new Contract(config.contractAddress, NUDGE_TOKEN_ABI, this.wallet);
    } else {
      this.contract = new Contract(config.contractAddress, NUDGE_TOKEN_ABI, this.provider);
    }
  }

  /**
   * Get user's token balance and stats
   */
  async getUserStats(address: string): Promise<UserStats> {
    const [balance, earned, completed] = await this.contract.getUserStats(address);
    return {
      balance: ethers.formatEther(balance),
      earned: ethers.formatEther(earned),
      goalsCompleted: Number(completed),
    };
  }

  /**
   * Get token balance only
   */
  async getBalance(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  /**
   * Check if a goal has been claimed
   */
  async isGoalClaimed(userAddress: string, goalId: number): Promise<boolean> {
    return this.contract.isGoalClaimed(userAddress, goalId);
  }

  /**
   * Get current reward rates
   */
  async getRewardRates(): Promise<{ daily: string; weekly: string; streak: string }> {
    const [daily, weekly, streak] = await Promise.all([
      this.contract.rewardRates(0),
      this.contract.rewardRates(1),
      this.contract.rewardRates(2),
    ]);
    return {
      daily: ethers.formatEther(daily),
      weekly: ethers.formatEther(weekly),
      streak: ethers.formatEther(streak),
    };
  }

  /**
   * Get feature unlock cost
   */
  async getFeatureCost(feature: string): Promise<string> {
    const cost = await this.contract.featureCosts(feature);
    return ethers.formatEther(cost);
  }

  /**
   * Award tokens for completing a goal (requires minter role)
   */
  async rewardGoal(
    userAddress: string,
    goalId: number,
    goalType: GoalType
  ): Promise<{ txHash: string; reward: string }> {
    if (!this.wallet) {
      throw new Error("Wallet not configured - cannot mint tokens");
    }

    // Check if already claimed
    const claimed = await this.isGoalClaimed(userAddress, goalId);
    if (claimed) {
      throw new Error(`Goal ${goalId} already claimed by ${userAddress}`);
    }

    // Get reward amount
    const rewardRate = await this.contract.rewardRates(goalType);
    
    // Execute reward transaction
    const tx = await this.contract.rewardGoalCompletion(userAddress, goalId, goalType);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      reward: ethers.formatEther(rewardRate),
    };
  }

  /**
   * Batch reward multiple goals at once
   */
  async rewardGoalsBatch(
    userAddress: string,
    goals: Array<{ id: number; type: GoalType }>
  ): Promise<{ txHash: string; totalReward: string }> {
    if (!this.wallet) {
      throw new Error("Wallet not configured - cannot mint tokens");
    }

    const goalIds = goals.map((g) => g.id);
    const goalTypes = goals.map((g) => g.type);

    // Calculate total reward
    const rates = await this.getRewardRates();
    let totalReward = 0;
    for (const goal of goals) {
      const claimed = await this.isGoalClaimed(userAddress, goal.id);
      if (!claimed) {
        switch (goal.type) {
          case GoalType.DAILY:
            totalReward += parseFloat(rates.daily);
            break;
          case GoalType.WEEKLY:
            totalReward += parseFloat(rates.weekly);
            break;
          case GoalType.STREAK:
            totalReward += parseFloat(rates.streak);
            break;
        }
      }
    }

    const tx = await this.contract.rewardGoalsBatch(userAddress, goalIds, goalTypes);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      totalReward: totalReward.toString(),
    };
  }

  /**
   * Unlock a premium feature by burning tokens
   */
  async unlockFeature(feature: string): Promise<{ txHash: string; cost: string }> {
    if (!this.wallet) {
      throw new Error("Wallet not configured");
    }

    const cost = await this.getFeatureCost(feature);
    if (parseFloat(cost) === 0) {
      throw new Error(`Unknown feature: ${feature}`);
    }

    const tx = await this.contract.unlockFeature(feature);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      cost,
    };
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}

// Default configuration loader
export function loadConfig(): RewardConfig {
  // Try to load from environment
  const rpcUrl = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
  const contractAddress = process.env.NUDGE_TOKEN_ADDRESS || "";
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!contractAddress) {
    throw new Error("NUDGE_TOKEN_ADDRESS not set");
  }

  return { rpcUrl, contractAddress, privateKey };
}

// Helper to check goals and determine claimable rewards
export async function getClaimableGoals(
  rewards: TokenRewards,
  userAddress: string,
  goalsFile: string = "./goals.json"
): Promise<ClaimableGoal[]> {
  if (!existsSync(goalsFile)) {
    return [];
  }

  const goalsData = JSON.parse(readFileSync(goalsFile, "utf-8"));
  const rates = await rewards.getRewardRates();
  const claimable: ClaimableGoal[] = [];

  for (const goal of goalsData.goals || []) {
    if (goal.completed) {
      const goalType =
        goal.type === "daily"
          ? GoalType.DAILY
          : goal.type === "weekly"
          ? GoalType.WEEKLY
          : GoalType.STREAK;

      const reward =
        goalType === GoalType.DAILY
          ? rates.daily
          : goalType === GoalType.WEEKLY
          ? rates.weekly
          : rates.streak;

      const claimed = await rewards.isGoalClaimed(userAddress, goal.id);

      claimable.push({
        id: goal.id,
        name: goal.name,
        type: goalType,
        reward,
        claimed,
      });
    }
  }

  return claimable;
}
