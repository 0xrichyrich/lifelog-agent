import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nudge - Sometimes You Need a Little Nudge",
  description: "Your gentle AI life coach. Get personalized insights, build healthy habits, and earn $LIFE tokens. Sometimes you need a little nudge.",
  keywords: ["nudge", "life coach", "AI", "wellness", "habits", "tokens", "web3", "monad", "solana"],
  openGraph: {
    title: "Nudge - Sometimes You Need a Little Nudge",
    description: "Your gentle AI life coach. Get personalized insights and earn $LIFE tokens for building healthy habits.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nudge",
    description: "Sometimes you need a little nudge. Your gentle AI life coach.",
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
