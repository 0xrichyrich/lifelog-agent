import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LifeLog - The AI Life Coach That Pays You to Improve',
  description: 'Track your life, get AI insights, earn $LIFE tokens. The first life-tracking app that rewards you for building better habits.',
  keywords: ['life tracking', 'AI coach', 'crypto rewards', 'habit tracking', 'wellness', 'productivity'],
  openGraph: {
    title: 'LifeLog - The AI Life Coach That Pays You to Improve',
    description: 'Track your life, get AI insights, earn $LIFE tokens.',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LifeLog - The AI Life Coach That Pays You',
    description: 'Track your life, get AI insights, earn $LIFE tokens.',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
