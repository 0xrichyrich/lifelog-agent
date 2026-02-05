'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, FileText, AlertTriangle, User, Bot, Copyright, Scale, Award, Github } from 'lucide-react';

export default function TermsPage() {
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
            <FileText className="w-4 h-4" />
            Legal Agreement
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Terms of Service</h1>
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
                Welcome to Nudge! By using our iOS app or web dashboard, you agree to these Terms of Service. 
                Please read them carefully before using our services.
              </p>
            </div>

            {/* Section 1 - Testnet Disclaimer */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <h2 className="text-2xl font-bold">Testnet Disclaimer</h2>
              </div>
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-6 mb-4">
                <p className="text-text leading-relaxed font-medium">
                  ⚠️ Nudge currently operates on the Monad Testnet. This is a testing environment.
                </p>
              </div>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-warning font-bold">•</span>
                  <span><strong className="text-text">$NUDGE tokens have no real monetary value</strong> — they are for testing purposes only</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warning font-bold">•</span>
                  <span><strong className="text-text">XP and token rewards</strong> are part of the gamification system and have no monetary value</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warning font-bold">•</span>
                  <span>Testnet tokens cannot be exchanged for real cryptocurrency or fiat currency</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warning font-bold">•</span>
                  <span>Token balances, XP, and levels may be reset at any time during the testing period</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warning font-bold">•</span>
                  <span>Features and functionality may change without notice as we iterate</span>
                </li>
              </ul>
            </div>

            {/* Section 2 - User Responsibilities */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-2xl font-bold">User Responsibilities</h2>
              </div>
              <p className="text-text-muted leading-relaxed mb-4">
                By using Nudge, you agree to:
              </p>
              <ul className="space-y-3 text-text-muted">
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <span>Provide accurate information during check-ins and registration</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <span>Keep your wallet credentials and private keys secure</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <span>Use the service for personal wellness purposes only</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <span>Not attempt to manipulate, exploit, or abuse the reward system</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent">✓</span>
                  <span>Comply with all applicable laws and regulations</span>
                </li>
              </ul>
            </div>

            {/* Section 3 - AI Agent Disclaimer */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold">AI Agent Disclaimer</h2>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-4">
                <p className="text-text leading-relaxed font-medium">
                  🤖 AI agents in Nudge are for informational and motivational purposes only.
                </p>
              </div>
              <div className="space-y-4 text-text-muted leading-relaxed">
                <p>
                  <strong className="text-text">Not Medical Advice:</strong> AI agents do not provide 
                  medical, psychological, or professional health advice. Always consult qualified 
                  healthcare professionals for medical decisions.
                </p>
                <p>
                  <strong className="text-text">No Guarantees:</strong> We do not guarantee that 
                  following AI suggestions will result in any specific health outcomes. Results vary 
                  by individual.
                </p>
                <p>
                  <strong className="text-text">Third-Party Agents:</strong> Some agents in our 
                  marketplace are created by third parties. We do not endorse or verify the accuracy 
                  of their advice.
                </p>
                <p>
                  <strong className="text-text">Emergency Situations:</strong> If you are experiencing 
                  a medical or mental health emergency, please contact emergency services immediately. 
                  Nudge is not a substitute for professional emergency care.
                </p>
              </div>
            </div>

            {/* Section 4 - Intellectual Property */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Copyright className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">Intellectual Property</h2>
              </div>
              <div className="space-y-4 text-text-muted leading-relaxed">
                <p>
                  <strong className="text-text">Our Content:</strong> The Nudge app, website, branding, 
                  mascot, and original content are protected by copyright and other intellectual property 
                  laws. You may not copy, modify, or distribute our materials without permission.
                </p>
                <p>
                  <strong className="text-text">Your Content:</strong> You retain ownership of any 
                  content you create (such as check-in notes). By using Nudge, you grant us a license 
                  to store and process your content to provide our services.
                </p>
                <p>
                  <strong className="text-text">Open Source:</strong> Portions of Nudge are open source 
                  and available under their respective licenses on GitHub.
                </p>
              </div>
            </div>

            {/* Section 5 - Limitation of Liability */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold">Limitation of Liability</h2>
              </div>
              <div className="bg-surface-light rounded-xl p-6 text-text-muted leading-relaxed space-y-4">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, NUDGE AND ITS CREATORS SHALL NOT BE LIABLE 
                  FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                </p>
                <p>
                  This includes, but is not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Loss of tokens or digital assets</li>
                  <li>Health outcomes from following AI suggestions</li>
                  <li>Service interruptions or data loss</li>
                  <li>Actions of third-party agents in the marketplace</li>
                  <li>Smart contract bugs or blockchain issues</li>
                </ul>
                <p>
                  You use Nudge at your own risk. The service is provided &quot;as is&quot; without 
                  warranties of any kind.
                </p>
              </div>
            </div>

            {/* Changes to Terms */}
            <div className="border-t border-card-border pt-8">
              <h2 className="text-xl font-bold mb-4">Changes to These Terms</h2>
              <p className="text-text-muted leading-relaxed mb-4">
                We may update these Terms of Service from time to time. We will notify users of 
                significant changes through the app or by email. Continued use of Nudge after 
                changes constitutes acceptance of the new terms.
              </p>
              <p className="text-text-muted leading-relaxed">
                If you have questions about these terms, contact us at{' '}
                <span className="font-mono text-sm bg-surface-light px-2 py-1 rounded">legal@littlenudge.app</span>
              </p>
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
