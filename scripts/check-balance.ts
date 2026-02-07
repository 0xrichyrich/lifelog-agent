#!/usr/bin/env npx ts-node
/**
 * Check MON Balance for nad.fun Token Launch
 *
 * Shows:
 * - Current MON balance of treasury wallet
 * - Whether there's enough for the NUDGE launch
 * - Estimated tokens for current balance
 *
 * Usage:
 *   npx ts-node scripts/check-balance.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Monad mainnet
  network: {
    chainId: 143,
    rpcUrls: ['https://monad.drpc.org', 'https://mainnet-rpc.monad.xyz'],
    name: 'Monad Mainnet',
  },

  // nad.fun contract addresses (Monad Mainnet)
  contracts: {
    BONDING_CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  },

  // Treasury wallet
  treasuryAddress: '0x2390C495896C78668416859d9dE84212fCB10801',

  // Target for NUDGE launch
  initialBuy: {
    targetPercent: 2,
    targetTokens: ethers.parseUnits('20000000', 18), // 20M tokens
  },
};

// ============================================
// ABIs
// ============================================

const LENS_ABI = [
  {
    type: 'function',
    name: 'getInitialBuyAmountOut',
    inputs: [{ name: '_amountIn', type: 'uint256' }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'view',
  },
];

const BONDING_CURVE_ABI = [
  {
    type: 'function',
    name: 'config',
    inputs: [],
    outputs: [
      { name: 'virtualMonReserve', type: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeConfig',
    inputs: [],
    outputs: [
      { name: 'deployFeeAmount', type: 'uint256' },
      { name: 'graduateFeeAmount', type: 'uint256' },
      { name: 'protocolFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatMon(wei: bigint): string {
  return `${ethers.formatEther(wei)} MON`;
}

function formatTokens(wei: bigint): string {
  const num = Number(ethers.formatEther(wei));
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

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

function calculateTokensForMon(
  amountIn: bigint,
  virtualMonReserve: bigint,
  virtualTokenReserve: bigint,
  protocolFee: bigint
): bigint {
  // Remove fee from input first
  // protocolFee is in basis points where 1,000,000 = 100%
  const amountInAfterFee = amountIn - (amountIn * protocolFee) / 1000000n;
  const k = virtualMonReserve * virtualTokenReserve;
  const newMonReserve = virtualMonReserve + amountInAfterFee;
  const newTokenReserve = k / newMonReserve;
  return virtualTokenReserve - newTokenReserve;
}

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
  console.log('Treasury Balance Check for $NUDGE Launch');
  console.log('='.repeat(60));

  // Connect to Monad
  console.log('\n--- Network Connection ---');
  const provider = await getProvider();

  // Wallet address (can use env or hardcoded)
  // Try multiple env var names for private key
  const privateKey = process.env.MONAD_TREASURY_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  let walletAddress = CONFIG.treasuryAddress;

  if (privateKey) {
    const wallet = new ethers.Wallet(privateKey);
    walletAddress = wallet.address;
    const keySource = process.env.MONAD_TREASURY_PRIVATE_KEY ? 'MONAD_TREASURY_PRIVATE_KEY' : 'WALLET_PRIVATE_KEY';
    console.log(`Using key from: ${keySource}`);
  }

  console.log(`Checking wallet: ${walletAddress}`);

  // Get balance
  const balance = await provider.getBalance(walletAddress);
  console.log(`\n💰 Current Balance: ${formatMon(balance)}`);

  // Connect to contracts
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

  // Fetch live config
  console.log('\n--- Live Bonding Curve Config ---');
  const [virtualMonReserve, virtualTokenReserve, targetTokenAmount] = await bondingCurve.config();
  const [deployFeeAmount, graduateFee, protocolFee] = await bondingCurve.feeConfig();

  console.log(`Virtual MON Reserve: ${formatMon(virtualMonReserve)}`);
  console.log(`Virtual Token Reserve: ${formatTokens(virtualTokenReserve)}`);
  console.log(`Deploy Fee: ${formatMon(deployFeeAmount)}`);
  // protocolFee is in basis points where 1,000,000 = 100%, so 10000 = 1%
  console.log(`Protocol Fee: ${Number(protocolFee) / 10000}%`);

  // Calculate cost for target tokens
  console.log('\n--- Cost for 2% Initial Buy (20M tokens) ---');
  const targetTokens = CONFIG.initialBuy.targetTokens;

  const monNeededRaw = calculateMonNeededForTokens(
    targetTokens,
    virtualMonReserve,
    virtualTokenReserve
  );
  // protocolFee is in basis points where 1,000,000 = 100%, so divide by 1,000,000
  const tradingFee = (monNeededRaw * BigInt(protocolFee)) / 1000000n;
  const monWithFee = monNeededRaw + tradingFee;
  const totalCost = monWithFee + deployFeeAmount;

  console.log(`Raw MON needed: ${formatMon(monNeededRaw)}`);
  console.log(`Trading fee: ${formatMon(tradingFee)}`);
  console.log(`Deploy fee: ${formatMon(deployFeeAmount)}`);
  console.log(`Total required: ${formatMon(totalCost)}`);

  // Balance check
  console.log('\n--- Status ---');
  const hasEnough = balance >= totalCost;
  const gasBuffer = totalCost / 20n; // 5% for gas

  if (hasEnough) {
    console.log('✅ SUFFICIENT FUNDS for NUDGE launch');
    console.log(`  Available: ${formatMon(balance)}`);
    console.log(`  Required: ${formatMon(totalCost)}`);
    console.log(`  Surplus: ${formatMon(balance - totalCost)}`);

    if (balance >= totalCost + gasBuffer) {
      console.log('✅ Gas buffer covered');
    } else {
      console.log('⚠️ Low buffer for gas - consider adding more MON');
    }
  } else {
    const deficit = totalCost - balance;
    console.log('❌ INSUFFICIENT FUNDS for NUDGE launch');
    console.log(`  Available: ${formatMon(balance)}`);
    console.log(`  Required: ${formatMon(totalCost)}`);
    console.log(`  Deficit: ${formatMon(deficit)}`);
    console.log(`  With gas buffer: ${formatMon(deficit + gasBuffer)}`);
  }

  // What can we get with current balance?
  console.log('\n--- What You Can Get ---');

  if (balance > deployFeeAmount) {
    const availableForBuy = balance - deployFeeAmount - gasBuffer;

    if (availableForBuy > 0n) {
      try {
        // Use Lens to get accurate estimate
        const tokensOut = await lens.getInitialBuyAmountOut(availableForBuy);
        const percentOfSupply = Number(tokensOut) / Number(ethers.parseUnits('1000000000', 18)) * 100;

        console.log(`With current balance (minus fees):`);
        console.log(`  Available for buy: ${formatMon(availableForBuy)}`);
        console.log(`  Estimated tokens: ${formatTokens(tokensOut)}`);
        console.log(`  Percentage of supply: ${percentOfSupply.toFixed(2)}%`);
      } catch (e) {
        // Fallback to manual calculation
        const tokensOut = calculateTokensForMon(
          availableForBuy,
          virtualMonReserve,
          virtualTokenReserve,
          BigInt(protocolFee)
        );
        const percentOfSupply = Number(tokensOut) / Number(ethers.parseUnits('1000000000', 18)) * 100;

        console.log(`With current balance (minus fees):`);
        console.log(`  Available for buy: ${formatMon(availableForBuy)}`);
        console.log(`  Estimated tokens: ${formatTokens(tokensOut)}`);
        console.log(`  Percentage of supply: ${percentOfSupply.toFixed(2)}%`);
      }
    } else {
      console.log('Not enough balance for any token purchase after fees');
    }
  } else {
    console.log(`Need at least ${formatMon(deployFeeAmount)} to deploy (deploy fee)`);
  }

  // Quick reference
  console.log('\n--- Quick Reference ---');
  console.log('To launch with 2% initial buy:');
  console.log(`  Total needed: ${formatMon(totalCost + gasBuffer)} (with gas buffer)`);
  console.log('\nCommand to launch (DRY RUN):');
  console.log('  npx ts-node scripts/nadfun-launch.ts');
  console.log('\nCommand to launch (LIVE):');
  console.log('  npx ts-node scripts/nadfun-launch.ts --execute');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
