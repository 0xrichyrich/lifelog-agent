import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nudge - Sometimes You Need a Little Nudge',
  description: 'Your gentle AI life coach. Get personalized insights, build healthy habits, and earn $NUDGE tokens.',
  keywords: ['nudge', 'AI coach', 'life coach', 'habit tracking', 'wellness', 'productivity', 'crypto rewards'],
  openGraph: {
    title: 'Nudge - Sometimes You Need a Little Nudge',
    description: 'Your gentle AI life coach. Get personalized insights and earn $NUDGE tokens.',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nudge - Sometimes You Need a Little Nudge',
    description: 'Your gentle AI life coach that helps you build better habits.',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
