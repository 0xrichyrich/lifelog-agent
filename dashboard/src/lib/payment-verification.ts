import { createPublicClient, http, parseAbi } from 'viem';

/**
 * On-Chain Payment Verification for x402 Protocol
 * 
 * Verifies payments on Monad Testnet by checking:
 * 1. Transaction exists and succeeded
 * 2. Payment was sent to the platform wallet
 * 3. Amount meets or exceeds the expected amount
 * 
 * Supports both native MON transfers and ERC20 token transfers (USDC, $NUDGE)
 */

const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz/';
const PLATFORM_WALLET = '0x2390C495896C78668416859d9dE84212fCB10801';

// Known token addresses on Monad Testnet
export const TOKENS = {
  NUDGE: '0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F',
  // Add USDC when deployed to Monad testnet
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

// Create a reusable client
const getClient = () => createPublicClient({
  transport: http(MONAD_TESTNET_RPC),
});

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
