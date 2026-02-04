/**
 * x402 Payment Integration
 * 
 * Implements the x402 protocol for micropayments in the multi-agent platform.
 * Reference: https://www.x402.org/
 */

import type { 
  AgentDefinition,
  PaymentRequest, 
  PaymentProof, 
  X402Response,
  AgentPricing,
} from '../types/index.js';
import { randomBytes } from 'crypto';

// Supported networks for payments
export const SUPPORTED_NETWORKS = ['base', 'ethereum', 'polygon', 'arbitrum'] as const;
export type SupportedNetwork = typeof SUPPORTED_NETWORKS[number];

// USDC contract addresses by network
export const USDC_ADDRESSES: Record<SupportedNetwork, string> = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

// Default network (Base is cheapest for micropayments)
export const DEFAULT_NETWORK: SupportedNetwork = 'base';

interface PaymentConfig {
  network: SupportedNetwork;
  expirationMinutes: number;
  minPaymentUsd: number;
}

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  network: DEFAULT_NETWORK,
  expirationMinutes: 30,
  minPaymentUsd: 0.001, // Minimum $0.001
};

/**
 * Payment Manager - Handles x402 payment flows
 */
export class PaymentManager {
  private config: PaymentConfig;
  private pendingPayments: Map<string, PaymentRequest>;
  private userBalances: Map<string, Map<string, number>>; // userId -> agentId -> balance

  constructor(config: Partial<PaymentConfig> = {}) {
    this.config = { ...DEFAULT_PAYMENT_CONFIG, ...config };
    this.pendingPayments = new Map();
    this.userBalances = new Map();
  }

  /**
   * Check if payment is required for an agent interaction
   */
  isPaymentRequired(
    agent: AgentDefinition, 
    userId: string
  ): { required: boolean; reason?: string } {
    // Free agents never require payment
    if (agent.pricing.isFree) {
      return { required: false };
    }

    // Check free tier allowance
    const dailyUsage = this.getDailyUsage(userId, agent.id);
    const freeTier = agent.pricing.freeTierDaily || 0;
    
    if (freeTier > 0 && dailyUsage < freeTier) {
      return { 
        required: false,
        reason: `Free tier: ${freeTier - dailyUsage} messages remaining today`
      };
    }

    // Check if user has prepaid balance
    const balance = this.getUserBalance(userId, agent.id);
    if (balance >= agent.pricing.perMessage) {
      return {
        required: false,
        reason: `Using prepaid balance: ${this.formatUsdc(balance)} remaining`
      };
    }

    return { 
      required: true,
      reason: `Payment required: ${this.formatUsdc(agent.pricing.perMessage)} per message`
    };
  }

  /**
   * Create a payment request (x402 response)
   */
  createPaymentRequest(
    agent: AgentDefinition,
    userId: string,
    description?: string
  ): PaymentRequest {
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.config.expirationMinutes * 60 * 1000
    ).toISOString();

    const request: PaymentRequest = {
      agentId: agent.id,
      amount: agent.pricing.perMessage,
      currency: 'USDC',
      recipient: agent.walletAddress,
      description: description || `Message to ${agent.name}`,
      expiresAt,
      nonce,
    };

    // Store pending payment
    this.pendingPayments.set(nonce, request);

    return request;
  }

  /**
   * Generate x402 HTTP response
   */
  generateX402Response(paymentRequest: PaymentRequest): X402Response {
    return {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Address': paymentRequest.recipient,
        'X-Payment-Amount': paymentRequest.amount.toString(),
        'X-Payment-Currency': paymentRequest.currency,
        'X-Payment-Network': this.config.network,
        'X-Payment-Expires': paymentRequest.expiresAt,
      },
      body: paymentRequest,
    };
  }

  /**
   * Verify a payment proof
   */
  async verifyPaymentProof(
    proof: PaymentProof,
    expectedNonce?: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check if payment exists in pending
    if (expectedNonce) {
      const pending = this.pendingPayments.get(expectedNonce);
      if (!pending) {
        return { valid: false, error: 'Payment request not found or expired' };
      }

      // Check expiration
      if (new Date(pending.expiresAt) < new Date()) {
        this.pendingPayments.delete(expectedNonce);
        return { valid: false, error: 'Payment request expired' };
      }
    }

    // In production, this would:
    // 1. Verify the signature against the payment data
    // 2. Check the transaction on-chain if txHash provided
    // 3. Verify the amount matches
    
    // For now, we do basic validation
    if (!proof.signature || proof.signature.length < 10) {
      return { valid: false, error: 'Invalid payment signature' };
    }

    if (!proof.paymentId) {
      return { valid: false, error: 'Missing payment ID' };
    }

    // TODO: Add real signature verification
    // const isValidSignature = await this.verifySignature(proof);
    
    // Clean up pending payment
    if (expectedNonce) {
      this.pendingPayments.delete(expectedNonce);
    }

    return { valid: true };
  }

  /**
   * Process a successful payment
   */
  processPayment(
    userId: string,
    agentId: string,
    amount: number,
    proof: PaymentProof
  ): void {
    console.log(`[PaymentManager] Processing payment:`, {
      userId,
      agentId,
      amount: this.formatUsdc(amount),
      paymentId: proof.paymentId,
    });

    // Track the payment (in production, persist to database)
    this.recordPayment(userId, agentId, amount, proof);
  }

  /**
   * Add credit to user's balance for an agent
   */
  addCredit(userId: string, agentId: string, amount: number): number {
    if (!this.userBalances.has(userId)) {
      this.userBalances.set(userId, new Map());
    }
    
    const userAgentBalances = this.userBalances.get(userId)!;
    const currentBalance = userAgentBalances.get(agentId) || 0;
    const newBalance = currentBalance + amount;
    
    userAgentBalances.set(agentId, newBalance);
    
    console.log(`[PaymentManager] Added credit:`, {
      userId,
      agentId,
      added: this.formatUsdc(amount),
      newBalance: this.formatUsdc(newBalance),
    });

    return newBalance;
  }

  /**
   * Deduct from user's balance
   */
  deductBalance(userId: string, agentId: string, amount: number): boolean {
    const balance = this.getUserBalance(userId, agentId);
    
    if (balance < amount) {
      return false;
    }

    const userAgentBalances = this.userBalances.get(userId)!;
    userAgentBalances.set(agentId, balance - amount);
    
    return true;
  }

  /**
   * Get user's balance for an agent
   */
  getUserBalance(userId: string, agentId: string): number {
    return this.userBalances.get(userId)?.get(agentId) || 0;
  }

  /**
   * Get daily usage count for free tier tracking
   */
  private getDailyUsage(userId: string, agentId: string): number {
    // In production, this would query the database
    // For now, return 0 (always has free tier available)
    return 0;
  }

  /**
   * Record a payment transaction
   */
  private recordPayment(
    userId: string,
    agentId: string,
    amount: number,
    proof: PaymentProof
  ): void {
    // In production, persist to database
    console.log(`[PaymentManager] Recorded payment:`, {
      userId,
      agentId,
      amount: this.formatUsdc(amount),
      txHash: proof.txHash,
      timestamp: proof.timestamp,
    });
  }

  /**
   * Format USDC amount for display (6 decimals)
   */
  formatUsdc(amount: number): string {
    return `$${(amount / 1_000_000).toFixed(6)} USDC`;
  }

  /**
   * Parse USD amount to USDC with 6 decimals
   */
  parseUsdToUsdc(usdAmount: number): number {
    return Math.round(usdAmount * 1_000_000);
  }

  /**
   * Get pricing info for an agent
   */
  getPricingInfo(agent: AgentDefinition): {
    perMessageUsd: number;
    perSessionUsd?: number;
    freeTierDaily: number;
    isFree: boolean;
    displayPrice: string;
  } {
    const perMessageUsd = agent.pricing.perMessage / 1_000_000;
    const perSessionUsd = agent.pricing.perSession 
      ? agent.pricing.perSession / 1_000_000 
      : undefined;

    return {
      perMessageUsd,
      perSessionUsd,
      freeTierDaily: agent.pricing.freeTierDaily || 0,
      isFree: agent.pricing.isFree,
      displayPrice: agent.pricing.isFree 
        ? 'Free' 
        : `$${perMessageUsd.toFixed(2)}/msg`,
    };
  }

  /**
   * Create session payment (bulk messages)
   */
  createSessionPayment(
    agent: AgentDefinition,
    userId: string,
    durationMinutes: number = 60
  ): PaymentRequest | null {
    if (!agent.pricing.perSession) {
      return null;
    }

    return this.createPaymentRequest(
      {
        ...agent,
        pricing: {
          ...agent.pricing,
          perMessage: agent.pricing.perSession,
        },
      },
      userId,
      `${durationMinutes} minute session with ${agent.name}`
    );
  }
}

// Export singleton instance
export const paymentManager = new PaymentManager();

// Helper functions
export function isPaymentRequired(
  agent: AgentDefinition, 
  userId: string
): boolean {
  return paymentManager.isPaymentRequired(agent, userId).required;
}

export function createPaymentRequest(
  agent: AgentDefinition,
  userId: string
): PaymentRequest {
  return paymentManager.createPaymentRequest(agent, userId);
}

export function generateX402Response(
  agent: AgentDefinition,
  userId: string
): X402Response {
  const request = paymentManager.createPaymentRequest(agent, userId);
  return paymentManager.generateX402Response(request);
}

export default paymentManager;
