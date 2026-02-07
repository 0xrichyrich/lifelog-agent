'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { ReactNode } from 'react';

// Monad Mainnet chain config
const monadMainnet = {
  id: 143,
  name: 'Monad',
  network: 'monad',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://monad.drpc.org'] },
    public: { http: ['https://monad.drpc.org'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monadexplorer.com' },
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
          theme: 'light',
          accentColor: '#10B981',
          logo: '/nudge-logo.png',
        },
        loginMethods: ['email', 'wallet', 'google', 'apple'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: monadMainnet,
        supportedChains: [monadMainnet],
      }}
    >
      {children}
    </Privy>
  );
}
