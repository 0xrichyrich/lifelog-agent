import type { Metadata } from 'next';
import PrivyProvider from '@/components/PrivyProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nudge - Sometimes You Need a Little Nudge',
  description: 'Your gentle AI life coach. Track your habits, get insights, earn $NUDGE tokens.',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className="bg-background text-text min-h-screen antialiased" style={{ backgroundColor: '#F8FAFB' }}>
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
