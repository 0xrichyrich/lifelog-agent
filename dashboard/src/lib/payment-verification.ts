import { createPublicClient, http, parseAbi } from 'viem';
import { createClient, Client } from '@libsql/client';
import { PLATFORM_WALLET, NUDGE_TOKEN, MONAD_TESTNET_RPC } from './constants';

/**
 * On-Chain Payment Verification for x402 Protocol
 * 
 * Verifies payments on Monad Mainnet by checking:
 * 1. Transaction exists and succeeded
 * 2. Payment was sent to the platform wallet
 * 3. Amount meets or exceeds the expected amount
 * 4. Payment hash has not been used before (replay protection via Turso)
 * 
 * Supports both native MON transfers and ERC20 token transfers (USDC, $NUDGE)
 */

// Re-export constants for backward compatibility
export const TOKENS = {
  NUDGE: NUDGE_TOKEN,
} as const;

// ERC20 Transfer event ABI
const erc20Abi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

export interface PaymentVerification {
  valid: boolean;
  error?: string;
  amount?: bigint;
  from?: string;
  to?: string;
  txHash?: string;
}

// Create a reusable viem client
const getClient = () => createPublicClient({
  transport: http(MONAD_TESTNET_RPC),
});

// Turso client for persistent payment hash storage
let _paymentClient: Client | null = null;
let _tursoAvailable: boolean | null = null;

function getPaymentClient(): Client | null {
  if (_tursoAvailable === false) return null;
  
  if (!_paymentClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      _tursoAvailable = false;
      return null;
    }
    
    try {
      _paymentClient = createClient({ url, authToken });
      _tursoAvailable = true;
    } catch {
      _tursoAvailable = false;
      return null;
    }
  }
  return _paymentClient;
}

// Initialize payment hash table
let _paymentTableInitialized = false;
async function ensurePaymentTable(): Promise<boolean> {
  if (_paymentTableInitialized) return _tursoAvailable === true;
  
  const client = getPaymentClient();
  if (!client) return false;
  
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS used_payment_hashes (
        hash TEXT PRIMARY KEY,
        userId TEXT,
        context TEXT,
        createdAt TEXT NOT NULL
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_payment_hashes_created ON used_payment_hashes(createdAt)`);
    _paymentTableInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize used_payment_hashes table:', error);
    _tursoAvailable = false;
    return false;
  }
}

// In-memory fallback for payment replay protection
const usedPaymentHashesMemory = new Set<string>();
const MAX_MEMORY_HASHES = 10000;

/**
 * Check if a payment hash has been used (replay protection)
 * Uses Turso for persistence, falls back to in-memory
 */
export async function isPaymentHashUsed(txHash: string): Promise<boolean> {
  const normalizedHash = txHash.toLowerCase();
  
  // Check Turso first
  await ensurePaymentTable();
  const client = getPaymentClient();
  
  if (client) {
    try {
      const result = await client.execute({
        sql: 'SELECT 1 FROM used_payment_hashes WHERE hash = ? LIMIT 1',
        args: [normalizedHash],
      });
      if (result.rows.length > 0) return true;
    } catch (error) {
      console.error('Turso payment hash check failed:', error);
      // Fall through to memory check
    }
  }
  
  // Check in-memory fallback
  return usedPaymentHashesMemory.has(normalizedHash);
}

/**
 * Mark a payment hash as used
 * Stores in both Turso (persistent) and memory (fast)
 */
export async function markPaymentHashUsed(
  txHash: string, 
  userId?: string,
  context?: string
): Promise<void> {
  const normalizedHash = txHash.toLowerCase();
  const now = new Date().toISOString();
  
  // Always add to memory for fast local checks
  usedPaymentHashesMemory.add(normalizedHash);
  
  // Cleanup memory if too large
  if (usedPaymentHashesMemory.size > MAX_MEMORY_HASHES) {
    const iterator = usedPaymentHashesMemory.values();
    for (let i = 0; i < MAX_MEMORY_HASHES / 2; i++) {
      const next = iterator.next();
      if (next.done) break;
      usedPaymentHashesMemory.delete(next.value);
    }
  }
  
  // Store in Turso for persistence
  await ensurePaymentTable();
  const client = getPaymentClient();
  
  if (client) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO used_payment_hashes (hash, userId, context, createdAt) 
              VALUES (?, ?, ?, ?)`,
        args: [normalizedHash, userId || null, context || null, now],
      });
    } catch (error) {
      console.error('Failed to store payment hash in Turso:', error);
      // Memory fallback already added, so we're still protected
    }
  }
}

/**
 * Verify a payment transaction on-chain
 * 
 * @param txHash - The transaction hash to verify
 * @param expectedAmount - Expected amount in smallest unit (wei for native, token decimals for ERC20)
 * @param tokenAddress - Optional ERC20 token address. If not provided, verifies native MON transfer
 * @returns PaymentVerification result
 */
export async function verifyPaymentOnChain(
  txHash: string,
  expectedAmount: number | bigint,
  tokenAddress?: string
): Promise<PaymentVerification> {
  // Basic validation of tx hash format
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { valid: false, error: 'Invalid transaction hash format' };
  }

  try {
    const client = getClient();

    // Get transaction receipt to check status
    const receipt = await client.getTransactionReceipt({ 
      hash: txHash as `0x${string}` 
    });
    
    if (!receipt) {
      return { valid: false, error: 'Transaction not found on chain' };
    }

    if (receipt.status !== 'success') {
      return { valid: false, error: 'Transaction failed on chain' };
    }

    const expectedBigInt = BigInt(expectedAmount);

    // For native token (MON) transfers
    if (!tokenAddress) {
      const tx = await client.getTransaction({ 
        hash: txHash as `0x${string}` 
      });
      
      if (!tx.to || tx.to.toLowerCase() !== PLATFORM_WALLET.toLowerCase()) {
        return { 
          valid: false, 
          error: `Payment not sent to platform wallet. Expected: ${PLATFORM_WALLET}, Got: ${tx.to}` 
        };
      }

      if (tx.value < expectedBigInt) {
        return { 
          valid: false, 
          error: `Insufficient payment amount. Expected: ${expectedBigInt.toString()}, Got: ${tx.value.toString()}` 
        };
      }

      // Log verification success without sensitive details in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[Payment] Native transfer verified');
      }

      return { 
        valid: true, 
        amount: tx.value, 
        from: tx.from, 
        to: tx.to,
        txHash 
      };
    }

    // For ERC20 (USDC/NUDGE) transfers - check Transfer event logs
    const transferLogs = receipt.logs.filter(
      log => log.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (transferLogs.length === 0) {
      return { 
        valid: false, 
        error: `No transfer events found for token ${tokenAddress}` 
      };
    }

    for (const log of transferLogs) {
      // Transfer event: topics[0] = event sig, topics[1] = from, topics[2] = to
      // data = amount
      if (!log.topics[1] || !log.topics[2]) continue;
      
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      
      if (to.toLowerCase() === PLATFORM_WALLET.toLowerCase()) {
        const amount = BigInt(log.data);
        
        if (amount >= expectedBigInt) {
          // Log verification success without sensitive details in production
          if (process.env.NODE_ENV === 'development') {
            console.log('[Payment] ERC20 transfer verified');
          }

          return { 
            valid: true, 
            amount, 
            from, 
            to,
            txHash 
          };
        } else {
          return {
            valid: false,
            error: `Insufficient payment amount. Expected: ${expectedBigInt.toString()}, Got: ${amount.toString()}`
          };
        }
      }
    }

    return { 
      valid: false, 
      error: 'No valid payment to platform wallet found in transaction logs' 
    };

  } catch (error) {
    console.error('[Payment] Verification error:', error);
    
    // Handle specific RPC errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return { valid: false, error: 'Transaction not found - may still be pending' };
      }
      if (error.message.includes('timeout')) {
        return { valid: false, error: 'RPC timeout - please try again' };
      }
    }
    
    return { 
      valid: false, 
      error: 'Failed to verify payment on chain - RPC error' 
    };
  }
}

/**
 * Quick validation that a tx hash looks valid (without RPC call)
 * Use this for fast rejection of obviously invalid proofs
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Clean up old payment hashes from Turso (older than 30 days)
 * Call periodically via cron
 */
export async function cleanupOldPaymentHashes(): Promise<number> {
  const client = getPaymentClient();
  if (!client) return 0;
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await client.execute({
      sql: 'DELETE FROM used_payment_hashes WHERE createdAt < ?',
      args: [thirtyDaysAgo],
    });
    return result.rowsAffected;
  } catch (error) {
    console.error('Payment hash cleanup failed:', error);
    return 0;
  }
}
