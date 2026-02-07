#!/usr/bin/env npx ts-node
/**
 * nad.fun Token Launch Script for $NUDGE
 *
 * Creates the NUDGE token on nad.fun (Monad) with an initial 2% buy.
 *
 * Usage:
 *   npx ts-node scripts/nadfun-launch.ts           # DRY RUN (default)
 *   npx ts-node scripts/nadfun-launch.ts --execute # LIVE EXECUTION
 *
 * Environment:
 *   MONAD_TREASURY_PRIVATE_KEY - Private key for the treasury wallet
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Token details
  token: {
    name: 'Nudge',
    symbol: 'NUDGE',
    tokenURI: 'https://www.littlenudge.app/nudge-logo.png',
  },

  // Monad mainnet
  network: {
    chainId: 143,
    rpcUrls: ['https://monad.drpc.org', 'https://mainnet-rpc.monad.xyz'],
    name: 'Monad Mainnet',
  },

  // nad.fun contract addresses (Monad Mainnet)
  contracts: {
    BONDING_CURVE_ROUTER: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
    BONDING_CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
    DEX_ROUTER: '0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137',
    DEX_FACTORY: '0x6B5F564339DbAD6b780249827f2198a841FEB7F3',
    WMON: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  },

  // Bonding curve parameters
  bondingCurve: {
    deployFee: ethers.parseEther('10'),           // 10 MON
    virtualMonReserve: ethers.parseEther('180000'), // 180,000 MON
    virtualTokenReserve: ethers.parseUnits('1073000191', 18), // 1,073,000,191 tokens
    targetTokenAmount: ethers.parseUnits('279900191', 18),     // 279,900,191 tokens
    totalSupply: ethers.parseUnits('1000000000', 18),          // 1B tokens
    tradingFeePercent: 1, // 1%
  },

  // Initial buy parameters
  initialBuy: {
    targetPercent: 2, // 2% of supply
    targetTokens: ethers.parseUnits('20000000', 18), // 20M tokens
  },

  // Wallet
  treasuryAddress: '0x2390C495896C78668416859d9dE84212fCB10801',
};

// ============================================
// ABIs (loaded from files)
// ============================================

const abiDir = path.join(__dirname, 'abi');
const BONDING_CURVE_ROUTER_ABI = JSON.parse(fs.readFileSync(path.join(abiDir, 'IBondingCurveRouter.json'), 'utf-8'));
const LENS_ABI = JSON.parse(fs.readFileSync(path.join(abiDir, 'ILens.json'), 'utf-8'));
const BONDING_CURVE_ABI = JSON.parse(fs.readFileSync(path.join(abiDir, 'IBondingCurve.json'), 'utf-8'));

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate MON needed for a given amount of tokens using constant product formula
 * k = virtualMON * virtualToken
 * After buying: newTokenReserve = virtualTokenReserve - amountOut
 * newMONReserve = k / newTokenReserve
 * MON needed = newMONReserve - virtualMONReserve
 */
function calculateMonNeededForTokens(
  amountOut: bigint,
  virtualMonReserve: bigint,
  virtualTokenReserve: bigint
): bigint {
  const k = virtualMonReserve * virtualTokenReserve;
  const newTokenReserve = virtualTokenReserve - amountOut;
  const newMonReserve = k / newTokenReserve;
  return newMonReserve - virtualMonReserve;
}

/**
 * Calculate total cost including fee
 */
function calculateTotalCost(
  monNeeded: bigint,
  feePercent: number
): bigint {
  // Fee is on top of the amount
  const feeMultiplier = 100n + BigInt(feePercent);
  return (monNeeded * feeMultiplier) / 100n;
}

/**
 * Generate a random salt for token creation
 */
function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format MON amount for display
 */
function formatMon(wei: bigint): string {
  return `${ethers.formatEther(wei)} MON`;
}

/**
 * Format token amount for display
 */
function formatTokens(wei: bigint): string {
  const num = Number(ethers.formatEther(wei));
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Try multiple RPC URLs until one works
 */
async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpcUrl of CONFIG.network.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      if (Number(network.chainId) === CONFIG.network.chainId) {
        console.log(`✓ Connected to ${CONFIG.network.name} via ${rpcUrl}`);
        return provider;
      }
    } catch (e) {
      console.log(`✗ Failed to connect to ${rpcUrl}`);
    }
  }
  throw new Error('Failed to connect to any Monad RPC');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('nad.fun $NUDGE Token Launch Script');
  console.log('='.repeat(60));

  // Check for --execute flag
  const isExecute = process.argv.includes('--execute');
  console.log(`\nMode: ${isExecute ? '🔴 LIVE EXECUTION' : '🟢 DRY RUN (use --execute for live)'}`);

  // Check for private key (try multiple env var names)
  const privateKey = process.env.MONAD_TREASURY_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n❌ ERROR: No private key found in environment');
    console.error('Set one of: MONAD_TREASURY_PRIVATE_KEY or WALLET_PRIVATE_KEY');
    process.exit(1);
  }
  const keySource = process.env.MONAD_TREASURY_PRIVATE_KEY ? 'MONAD_TREASURY_PRIVATE_KEY' : 'WALLET_PRIVATE_KEY';
  console.log(`Using key from: ${keySource}`);

  // Connect to Monad
  console.log('\n--- Network Connection ---');
  const provider = await getProvider();

  // Set up wallet
  const wallet = new ethers.Wallet(privateKey, provider);
  const walletAddress = await wallet.getAddress();
  console.log(`Wallet: ${walletAddress}`);

  // Verify it matches expected treasury
  if (walletAddress.toLowerCase() !== CONFIG.treasuryAddress.toLowerCase()) {
    console.warn(`⚠️ WARNING: Wallet address doesn't match expected treasury`);
    console.warn(`  Expected: ${CONFIG.treasuryAddress}`);
    console.warn(`  Got: ${walletAddress}`);
  }

  // Check balance
  const balance = await provider.getBalance(walletAddress);
  console.log(`Balance: ${formatMon(balance)}`);

  // Connect to contracts
  console.log('\n--- Contract Connection ---');
  const bondingCurve = new ethers.Contract(
    CONFIG.contracts.BONDING_CURVE,
    BONDING_CURVE_ABI,
    provider
  );
  const lens = new ethers.Contract(
    CONFIG.contracts.LENS,
    LENS_ABI,
    provider
  );
  const router = new ethers.Contract(
    CONFIG.contracts.BONDING_CURVE_ROUTER,
    BONDING_CURVE_ROUTER_ABI,
    wallet
  );

  // Fetch live config from contracts
  console.log('Fetching live bonding curve config...');
  const [virtualMonReserve, virtualTokenReserve, targetTokenAmount] = await bondingCurve.config();
  const [deployFeeAmount, , protocolFee] = await bondingCurve.feeConfig();

  console.log(`  Virtual MON Reserve: ${formatMon(virtualMonReserve)}`);
  console.log(`  Virtual Token Reserve: ${formatTokens(virtualTokenReserve)}`);
  console.log(`  Target Token Amount: ${formatTokens(targetTokenAmount)}`);
  console.log(`  Deploy Fee: ${formatMon(deployFeeAmount)}`);
  console.log(`  Protocol Fee: ${Number(protocolFee) / 10000}%`);

  // Calculate costs using Lens (authoritative, includes fees)
  console.log('\n--- Cost Calculation (Lens-based) ---');

  // Strategy: Use Lens.getInitialBuyAmountOut to find how many tokens we get
  // for a given MON amount. The contract handles fees internally.
  // We send: deployFee + monForBuy as msg.value
  // The contract takes the 1% fee from monForBuy internally.

  // Start with our target: ~2% of supply (20M tokens)
  // Use binary search with Lens to find the right MON input
  const targetTokens = CONFIG.initialBuy.targetTokens;
  console.log(`Target tokens: ${formatTokens(targetTokens)} (${CONFIG.initialBuy.targetPercent}% of supply)`);

  // First, check what the manual calculation says
  const monNeededRaw = calculateMonNeededForTokens(
    targetTokens,
    virtualMonReserve,
    virtualTokenReserve
  );
  console.log(`MON needed (raw constant-product): ${formatMon(monNeededRaw)}`);

  // Use Lens to verify - try different MON amounts
  console.log('\n--- Lens Verification ---');
  let monForBuy = monNeededRaw; // Start with raw estimate
  let lensTokensOut: bigint = 0n;
  try {
    // The Lens getInitialBuyAmountOut includes fees in the calculation
    // It takes the MON you'd send for the buy portion and returns tokens
    lensTokensOut = await lens.getInitialBuyAmountOut(monForBuy);
    console.log(`Lens: ${formatMon(monForBuy)} → ${formatTokens(lensTokensOut)} tokens`);

    // If Lens gives fewer tokens than target, we need to send more MON
    // Binary search for the right amount
    if (lensTokensOut < targetTokens) {
      console.log('Lens returns less than target — adjusting...');
      let lo = monForBuy;
      let hi = monForBuy * 2n;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2n;
        const midOut = await lens.getInitialBuyAmountOut(mid);
        if (midOut >= targetTokens) {
          hi = mid;
          monForBuy = mid;
          lensTokensOut = midOut;
        } else {
          lo = mid;
        }
      }
      console.log(`Adjusted: ${formatMon(monForBuy)} → ${formatTokens(lensTokensOut)} tokens`);
    }

    // Use what Lens says we'll get as amountOut (with 1% slippage tolerance)
    const amountOutFromLens = lensTokensOut;
    const amountOutMin = (amountOutFromLens * 99n) / 100n; // 1% slippage
    console.log(`Using amountOut: ${formatTokens(amountOutFromLens)} (Lens estimate)`);
    console.log(`Min acceptable (1% slippage): ${formatTokens(amountOutMin)}`);

  } catch (e) {
    console.log(`Lens call failed: ${e}`);
    console.log('Falling back to manual calculation');
    lensTokensOut = targetTokens;
  }

  // Total value = deploy fee + MON for buy
  const totalCost = deployFeeAmount + monForBuy;
  console.log(`\nDeploy fee: ${formatMon(deployFeeAmount)}`);
  console.log(`MON for buy: ${formatMon(monForBuy)}`);
  console.log(`Total value to send: ${formatMon(totalCost)}`);

  // Check if we have enough balance
  console.log('\n--- Balance Check ---');
  const hasEnough = balance >= totalCost;
  console.log(`Required: ${formatMon(totalCost)}`);
  console.log(`Available: ${formatMon(balance)}`);
  console.log(`Status: ${hasEnough ? '✅ Sufficient funds' : '❌ Insufficient funds'}`);

  if (!hasEnough) {
    const deficit = totalCost - balance;
    console.log(`Deficit: ${formatMon(deficit)}`);
    console.log('\n❌ Cannot proceed - insufficient funds');
    process.exit(1);
  }

  // Add 5% buffer for gas
  const gasBuffer = totalCost / 20n;
  const totalWithBuffer = totalCost + gasBuffer;
  console.log(`\nWith 5% gas buffer: ${formatMon(totalWithBuffer)}`);

  // Token creation parameters
  // Use Lens-verified amountOut (what we actually expect to receive)
  console.log('\n--- Token Parameters ---');
  const salt = generateSalt();
  const actualAmountOut = lensTokensOut || targetTokens;
  const params = {
    name: CONFIG.token.name,
    symbol: CONFIG.token.symbol,
    tokenURI: CONFIG.token.tokenURI,
    amountOut: actualAmountOut,
    salt: salt,
    actionId: 1, // Mainnet requires actionId=1
  };
  console.log(`Name: ${params.name}`);
  console.log(`Symbol: ${params.symbol}`);
  console.log(`TokenURI: ${params.tokenURI}`);
  console.log(`AmountOut: ${formatTokens(params.amountOut)} tokens (from Lens)`);
  console.log(`Salt: ${salt.substring(0, 18)}...`);

  // DRY RUN - stop here
  if (!isExecute) {
    console.log('\n' + '='.repeat(60));
    console.log('DRY RUN COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTo execute for real, run:');
    console.log('  npx ts-node scripts/nadfun-launch.ts --execute');
    console.log('\nEstimated transaction:');
    console.log(`  Value: ${formatMon(totalCost)}`);
    console.log(`  Gas estimate: ~300,000 - 500,000`);
    return;
  }

  // LIVE EXECUTION
  console.log('\n' + '='.repeat(60));
  console.log('🔴 EXECUTING LIVE TRANSACTION');
  console.log('='.repeat(60));

  try {
    console.log('\nSending transaction...');
    const tx = await router.create(params, {
      value: totalCost,
      gasLimit: 10_000_000n, // nad.fun create uses ~7M gas
    });
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`\n✅ Transaction confirmed!`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Parse the logs to get token and pool addresses
    // Look for the CurveCreate event
    const iface = new ethers.Interface([
      'event CurveCreate(address indexed creator, address indexed token, address indexed pool, string name, string symbol, string tokenURI, uint256 virtualMon, uint256 virtualToken, uint256 targetTokenAmount)',
    ]);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'CurveCreate') {
          console.log('\n🎉 TOKEN CREATED SUCCESSFULLY!');
          console.log('='.repeat(60));
          console.log(`Token Address: ${parsed.args.token}`);
          console.log(`Pool Address: ${parsed.args.pool}`);
          console.log(`Creator: ${parsed.args.creator}`);
          console.log(`Name: ${parsed.args.name}`);
          console.log(`Symbol: ${parsed.args.symbol}`);
        }
      } catch (e) {
        // Not this event, continue
      }
    }

    console.log('\n📋 Summary:');
    console.log(`  TX Hash: ${tx.hash}`);
    console.log(`  Total Cost: ${formatMon(totalCost)}`);
    console.log(`  Tokens Bought: ~${formatTokens(actualAmountOut)}`);

  } catch (error) {
    console.error('\n❌ Transaction failed:');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
