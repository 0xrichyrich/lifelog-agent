import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeLog - The AI Life Coach That Pays You to Improve',
  description: 'Track your life, get AI insights, earn $LIFE tokens.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
