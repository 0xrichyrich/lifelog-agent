import type { Metadata } from 'next';
import PrivyProvider from '@/components/PrivyProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nudge - Sometimes You Need a Little Nudge',
  description: 'Your gentle AI life coach. Track your habits, get insights, earn $NUDGE tokens.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text min-h-screen antialiased">
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
