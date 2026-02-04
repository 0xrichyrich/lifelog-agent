import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Monad Testnet configuration
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz/'] },
    public: { http: ['https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monad.xyz' },
  },
};

// $NUDGE Token contract
const NUDGE_TOKEN = '0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F' as const;

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

    // Default claim amount (in NUDGE tokens)
    // In production, this would come from the user's earned rewards in database
    const claimAmount = requestedAmount || '100'; // Default 100 NUDGE for demo
    
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
      const amountInWei = parseUnits(claimAmount, 18);

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

      console.log(`Token transfer sent: ${txHash} - ${claimAmount} NUDGE to ${address}`);

      // Wait for transaction confirmation (optional, can be done async)
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 30_000, // 30 second timeout
        });
        
        return NextResponse.json({
          success: true,
          amount: claimAmount,
          txHash,
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber.toString(),
          message: `Successfully transferred ${claimAmount} NUDGE tokens!`,
        });
      } catch (receiptError) {
        // Transaction sent but receipt not yet available
        return NextResponse.json({
          success: true,
          amount: claimAmount,
          txHash,
          status: 'pending',
          message: `Transfer submitted. ${claimAmount} NUDGE tokens on the way!`,
        });
      }

    } catch (txError: any) {
      console.error('Transaction error:', txError);
      
      // Check for common errors
      if (txError.message?.includes('insufficient funds')) {
        return NextResponse.json(
          { success: false, error: 'Platform wallet has insufficient gas' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Transaction failed: ' + (txError.shortMessage || txError.message) },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process claim' },
      { status: 500 }
    );
  }
}
