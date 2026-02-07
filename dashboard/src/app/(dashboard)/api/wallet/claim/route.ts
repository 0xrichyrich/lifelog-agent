import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { requireInternalAuth, validateContentType } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { NUDGE_TOKEN, MONAD_TESTNET_CHAIN, MAX_CLAIM_AMOUNT } from '@/lib/constants';

// Monad Testnet configuration (from constants)
const monadTestnet = MONAD_TESTNET_CHAIN;

// ERC20 transfer ABI
const erc20TransferAbi = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export async function POST(request: NextRequest) {
  // Authentication required (prevents unauthorized draining)
  const authError = requireInternalAuth(request);
  if (authError) return authError;
  
  // Validate Content-Type
  const contentTypeError = validateContentType(request);
  if (contentTypeError) return contentTypeError;
  
  // Rate limiting - strict limits for token transfers
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await request.json();
    const { address, amount: requestedAmount } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    // Get platform wallet private key from environment
    const platformPrivateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
    if (!platformPrivateKey) {
      console.error('PLATFORM_WALLET_PRIVATE_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Token distribution not configured' },
        { status: 503 }
      );
    }

    // Validate and cap the claim amount server-side
    let claimAmount: number;
    
    if (requestedAmount !== undefined && requestedAmount !== null) {
      // Parse and validate requested amount
      const parsed = typeof requestedAmount === 'string' 
        ? parseFloat(requestedAmount) 
        : Number(requestedAmount);
      
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount: must be a positive number' },
          { status: 400 }
        );
      }
      
      // Cap at maximum allowed
      claimAmount = Math.min(parsed, MAX_CLAIM_AMOUNT);
    } else {
      // Default claim amount for demo
      claimAmount = 100;
    }
    
    // Use floor to ensure we never transfer more than intended
    claimAmount = Math.floor(claimAmount * 100) / 100;
    
    try {
      // Create account from private key
      const account = privateKeyToAccount(platformPrivateKey as `0x${string}`);
      
      // Create wallet client for signing transactions
      const walletClient = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http(),
      });

      // Create public client for reading chain data
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(),
      });

      // Parse amount with 18 decimals
      const amountInWei = parseUnits(claimAmount.toString(), 18);

      // Encode the transfer function call
      const data = encodeFunctionData({
        abi: erc20TransferAbi,
        functionName: 'transfer',
        args: [address as `0x${string}`, amountInWei],
      });

      // Send the transaction
      const txHash = await walletClient.sendTransaction({
        to: NUDGE_TOKEN,
        data,
        chain: monadTestnet,
      });

      // Log without sensitive details in production
      if (process.env.NODE_ENV === 'development') {
        console.log(`Token transfer sent: ${txHash} - ${claimAmount} NUDGE`);
      }

      // Wait for transaction confirmation (optional, can be done async)
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 30_000, // 30 second timeout
        });
        
        const response = NextResponse.json({
          success: true,
          amount: claimAmount.toString(),
          txHash,
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber.toString(),
          message: `Successfully transferred ${claimAmount} NUDGE tokens!`,
        });
        return addRateLimitHeaders(response, RATE_LIMITS.token, request);
      } catch {
        // Transaction sent but receipt not yet available
        const response = NextResponse.json({
          success: true,
          amount: claimAmount.toString(),
          txHash,
          status: 'pending',
          message: `Transfer submitted. ${claimAmount} NUDGE tokens on the way!`,
        });
        return addRateLimitHeaders(response, RATE_LIMITS.token, request);
      }

    } catch (txError: unknown) {
      console.error('Transaction error:', txError);
      
      // Check for common errors without exposing internal details
      const errorMessage = txError instanceof Error ? txError.message : '';
      if (errorMessage.includes('insufficient funds')) {
        return NextResponse.json(
          { success: false, error: 'Platform wallet has insufficient gas' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Transaction failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process claim' },
      { status: 500 }
    );
  }
}
