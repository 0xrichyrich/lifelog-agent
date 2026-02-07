/**
 * Centralized Constants
 * 
 * Single source of truth for platform-wide configuration.
 * All wallet addresses and token addresses should be referenced from here.
 */

// Platform wallet for receiving payments
// SECURITY: Logs warning if not configured (cannot throw at import time due to build process)
// The getter approach ensures this is evaluated at runtime, not build time
let _platformWalletWarned = false;
export function getPlatformWallet(): string {
  const wallet = process.env.PLATFORM_WALLET_ADDRESS;
  if (!wallet) {
    if (!_platformWalletWarned) {
      _platformWalletWarned = true;
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: PLATFORM_WALLET_ADDRESS not configured in production — using fallback');
      } else {
        console.warn('WARNING: PLATFORM_WALLET_ADDRESS not set — using development fallback');
      }
    }
    // Fallback address - logged as error/warning above
    return '0x2390C495896C78668416859d9dE84212fCB10801';
  }
  return wallet;
}

// For backward compatibility - but prefer using getPlatformWallet() for lazy evaluation
export const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || '0x2390C495896C78668416859d9dE84212fCB10801';

/**
 * Validate that critical environment variables are set
 * Call this at runtime, not import time, to avoid build failures
 */
export function validatePlatformConfig(): void {
  if (!process.env.PLATFORM_WALLET_ADDRESS) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: PLATFORM_WALLET_ADDRESS environment variable is required in production');
    } else {
      console.warn('WARNING: PLATFORM_WALLET_ADDRESS not set in environment');
    }
  }
}

// $NUDGE Token contract address on Monad Testnet
export const NUDGE_TOKEN = (process.env.NUDGE_TOKEN_ADDRESS || '0x99cDfA46B933ea28Edf4BB620428E24C8EB63367') as `0x${string}`;

// Monad Testnet RPC
export const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz/';

// Monad Testnet chain configuration
export const MONAD_TESTNET_CHAIN = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_TESTNET_RPC] },
    public: { http: [MONAD_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monad.xyz' },
  },
} as const;

// Token decimals
export const NUDGE_DECIMALS = 18;
export const USDC_DECIMALS = 6;

// Pricing (in smallest unit - USDC has 6 decimals)
export const LISTING_FEE_USDC = 100000; // $0.10 USDC

// Token claim limits
export const MAX_CLAIM_AMOUNT = 1000;

// Rate limit windows (in milliseconds)
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
