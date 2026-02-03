import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LifeLog Agent - Your Life, Quantified & Rewarded",
  description: "Log your daily moments with AI-powered insights. Earn $LIFE tokens for building healthy habits. Your personal journal that pays you back.",
  keywords: ["lifelog", "journal", "AI", "crypto", "wellness", "tokens", "web3", "monad", "solana"],
  openGraph: {
    title: "LifeLog Agent - Your Life, Quantified & Rewarded",
    description: "Log your daily moments with AI-powered insights. Earn $LIFE tokens for building healthy habits.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeLog Agent",
    description: "Your Life, Quantified & Rewarded. Earn $LIFE tokens for journaling.",
    creator: "@SkynetSays",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
