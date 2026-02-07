'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Shield, Smartphone, Database, Eye, Lock, Mail, Award, Github } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-card-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/mascot.png" alt="Nudge mascot" width={40} height={40} className="rounded-xl" />
            <span className="text-xl font-bold">Nudge</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/#features" className="text-text-muted hover:text-accent transition">Features</a>
            <a href="/#agents" className="text-text-muted hover:text-accent transition">Agents</a>
            <a href="/#token" className="text-text-muted hover:text-accent transition">Token</a>
            <Link href="/docs" className="text-text-muted hover:text-accent transition">Docs</Link>
            <Link href="/add-agent" className="btn btn-primary flex items-center gap-2">
              Add Agent
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {/* Mobile CTA */}
          <Link href="/add-agent" className="md:hidden btn btn-primary text-sm px-4 py-2 flex items-center gap-1">
            Get Started
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm mb-6">
            <Shield className="w-4 h-4" />
            Your Privacy Matters
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-text-muted">
            Last updated: February 4, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            {/* Introduction */}
            <div className="mb-10">
              <p className="text-text-muted leading-relaxed">
                Nudge (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your information when you use 
                our iOS app and web dashboard.
              </p>
            </div>

            {/* Section 1 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-2xl font-bold">Information We Collect</h2>
              </div>
              <div className="space-y-4 text-text-muted leading-relaxed pl-13">
                <div>
                  <h3 className="font-semibold text-text mb-2">Health Data (via HealthKit)</h3>
                  <p>
                    With your explicit permission, we access HealthKit data including step counts, 
                    distance walked, and other activity metrics. This data is used solely to provide 
                    personalized wellness insights and calculate reward eligibility.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-text mb-2">Check-in & XP Data</h3>
                  <p>
                    When you complete daily check-ins, we collect your mood ratings, sleep quality ratings, 
                    energy levels, and optional notes you provide. We also track your XP balance, level progression,
                    and redemption history for the gamification system.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-text mb-2">Wallet Addresses</h3>
                  <p>
                    We store your blockchain wallet address to facilitate $NUDGE token transactions. 
                    We do not have access to your private keys or the ability to control your funds.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-text mb-2">Usage Data</h3>
                  <p>
                    Basic analytics about app usage to improve our services, including features used 
                    and session duration.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-2xl font-bold">On-Device Storage</h2>
              </div>
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                <p className="text-text-muted leading-relaxed">
                  <strong className="text-accent">Your health and check-in data is stored locally on your device.</strong>{' '}
                  We prioritize on-device processing and storage to minimize data transmission. 
                  Your personal wellness data never leaves your device unless you explicitly choose 
                  to sync it with our servers for cross-device access.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold">What We DON&apos;T Do</h2>
              </div>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>We <strong className="text-text">never sell your personal data</strong> to third parties</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>We <strong className="text-text">do not display third-party advertisements</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>We <strong className="text-text">do not share your health data</strong> with insurance companies, employers, or data brokers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>We <strong className="text-text">do not use your data for targeted advertising</strong></span>
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold">Blockchain & Token Data</h2>
              </div>
              <div className="text-text-muted leading-relaxed space-y-4">
                <p>
                  Nudge operates on the <strong className="text-text">Monad blockchain</strong>. 
                  Please be aware that blockchain transactions are inherently public and transparent.
                </p>
                <p>
                  This means your wallet address, token balances, XP redemptions, and transaction history on 
                  Monad are publicly visible. However, this data is not linked to your 
                  personal identity unless you choose to make that connection public.
                </p>
                <div className="space-y-2">
                  <h3 className="font-semibold text-text">Token-related transactions include:</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500">•</span>
                      XP redemptions for $NUDGE tokens
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500">•</span>
                      Agent message payments via FeeSplitter contract
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-500">•</span>
                      Buyback distributions from NudgeBuyback contract
                    </li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm">
                    <strong className="text-purple-600">Note:</strong> $NUDGE tokens are live on Monad via{' '}
                    <a href="https://nad.fun/tokens/0x99cDfA46B933ea28Edf4BB620428E24C8EB63367" 
                       target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                      nad.fun
                    </a>. Token value may fluctuate.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">Contact Us</h2>
              </div>
              <p className="text-text-muted leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, 
                please contact us at:
              </p>
              <div className="mt-4 p-4 bg-surface-light rounded-xl">
                <p className="font-mono text-sm">privacy@littlenudge.app</p>
              </div>
            </div>

            {/* Data Rights */}
            <div className="border-t border-card-border pt-8">
              <h2 className="text-xl font-bold mb-4">Your Rights</h2>
              <p className="text-text-muted leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="space-y-2 text-text-muted">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Access the personal data we hold about you
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Request deletion of your data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Withdraw consent for HealthKit access at any time
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  Export your data in a portable format
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-card-border bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/mascot.png" alt="Nudge mascot" width={36} height={36} className="rounded-lg" />
              <div>
                <span className="font-bold">Nudge</span>
                <p className="text-sm text-text-muted">Sometimes you need a little nudge.</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-sm">
                Built for <span className="font-bold text-purple-600">Moltiverse Hackathon</span>
              </span>
            </div>
            <a 
              href="https://github.com/0xrichyrich/lifelog-agent" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition p-2 hover:bg-surface-light rounded-lg"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
          <div className="mt-8 pt-6 border-t border-card-border flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <Link href="/docs" className="hover:text-accent transition">Docs</Link>
            <Link href="/faq" className="hover:text-accent transition">FAQ</Link>
            <Link href="/privacy" className="hover:text-accent transition">Privacy</Link>
            <Link href="/terms" className="hover:text-accent transition">Terms</Link>
          </div>
          <div className="mt-6 pt-6 border-t border-card-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
            <p>© 2026 Nudge. Built with ❤️ for better wellness.</p>
            <div className="flex items-center gap-4">
              <span>Powered by</span>
              <span className="font-medium text-text">Monad</span>
              <span>•</span>
              <span className="font-medium text-text">Privy</span>
              <span>•</span>
              <span className="font-medium text-text">x402</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
