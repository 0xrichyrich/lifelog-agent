'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { ReactNode } from 'react';

// Monad Testnet chain config
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
} as const;

export default function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  if (!appId) {
    // Return children without Privy wrapper if no app ID configured
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID not configured. Wallet features disabled.');
    return <>{children}</>;
  }

  return (
    <Privy
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#3b82f6',
          logo: '/nudge-logo.png',
        },
        loginMethods: ['email', 'wallet', 'google', 'apple'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      {children}
    </Privy>
  );
}
