'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ChevronDown, HelpCircle, Sparkles, Coins, Lock, Bot, Zap, Users, Award, Github, Trophy, TrendingUp, Target } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ElementType;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is Nudge?',
    answer: 'Nudge is your AI-powered wellness companion. It combines health tracking (via HealthKit on iOS), daily check-ins, and a marketplace of specialized AI agents to help you build healthier habits. Earn XP for every healthy action, level up for bonuses, and redeem XP for $NUDGE tokens to chat with AI wellness agents.',
    icon: Sparkles,
  },
  {
    question: 'How do I earn XP?',
    answer: 'You earn XP by engaging with wellness activities! Daily check-in: +10 XP. Mood log: +5 XP. Goal complete: +25 XP. 7-day streak: +50 XP. 30-day streak: +200 XP. Badge earned: +100 XP. The more consistent you are with your wellness habits, the more XP you accumulate!',
    icon: Trophy,
  },
  {
    question: 'How do I redeem XP for tokens?',
    answer: 'Go to the Wallet section in the app and tap "Redeem XP." The base rate is 1000 XP = 100 $NUDGE tokens. Your level determines bonus rates — the higher your level, the more tokens you get per XP! Tokens are sent directly to your Privy wallet.',
    icon: Coins,
  },
  {
    question: 'What are the level bonuses?',
    answer: 'Higher levels give you better XP-to-token redemption rates! Base (Level 1-4): 1000 XP = 100 $NUDGE. Level 5+: 10% bonus (1000 XP = 110 $NUDGE). Level 10+: 25% bonus (1000 XP = 125 $NUDGE). Level 20+: 50% bonus (1000 XP = 150 $NUDGE). Keep earning XP to level up!',
    icon: TrendingUp,
  },
  {
    question: 'How does the agent economy work?',
    answer: 'When you chat with an AI agent, you pay $NUDGE tokens per message. Agent creators earn 80% of these fees — incentivizing high-quality wellness agents. The remaining 20% goes to the treasury for token buybacks, creating a sustainable economy.',
    icon: Bot,
  },
  {
    question: 'Where do buyback tokens come from?',
    answer: 'The 20% treasury fee from all agent messages funds token buybacks. The NudgeBuyback contract purchases $NUDGE from the market and distributes it to active users. This creates a flywheel: more agent usage → more buybacks → more rewards for active users → more engagement.',
    icon: Target,
  },
  {
    question: 'Is $NUDGE real cryptocurrency?',
    answer: '$NUDGE tokens are live on Monad via nad.fun! You earn them through consistent wellness habits and can trade them on nad.fun. As with any cryptocurrency, value may fluctuate. The tokens power the Nudge ecosystem — use them to chat with AI agents, and agent creators earn $NUDGE when users engage with their agents.',
    icon: Coins,
  },
  {
    question: 'How do micropayments work?',
    answer: 'Nudge uses the x402 protocol for pay-per-message AI interactions. Instead of monthly subscriptions, you pay a small amount of $NUDGE tokens (typically 3-5 tokens) for each message you send to an AI agent. This means you only pay for what you use, and agent creators earn tokens when users chat with their agents.',
    icon: Zap,
  },
  {
    question: 'Can I create my own agent?',
    answer: 'Yes! The Nudge marketplace is open to agent creators — including other AI agents! You can design a wellness agent with a specific personality, expertise, and pricing. When users chat with your agent, you earn 80% of the $NUDGE tokens they spend. Documentation for creating agents is available in our Docs.',
    icon: Bot,
  },
  {
    question: 'Is my data private?',
    answer: 'Privacy is a core principle of Nudge. Your health data, XP balance, and check-ins are stored locally on your device by default. We don\'t sell your data to third parties or use it for advertising. Your wallet address and blockchain transactions are public (that\'s how blockchains work), but they\'re not linked to your personal identity unless you choose to make that connection.',
    icon: Lock,
  },
  {
    question: 'What is x402?',
    answer: 'x402 is an open protocol for HTTP-native micropayments. It lets you pay for API calls and services with cryptocurrency in a seamless way — no subscriptions, no accounts, just pay-per-use. In Nudge, x402 enables the pay-per-message model with AI agents. Learn more at x402.org.',
    icon: Zap,
  },
  {
    question: 'Do I need a crypto wallet?',
    answer: 'Yes, but we make it easy! Nudge uses Privy for wallet management. You can sign in with just your email, and Privy automatically creates an embedded wallet for you. No need to install MetaMask or manage seed phrases — though you can connect an existing wallet if you prefer.',
    icon: Users,
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const Icon = item.icon;
  return (
    <div className="border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-surface-light transition-colors"
      >
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <span className="flex-1 font-semibold text-lg">{item.question}</span>
        <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="pl-14 text-text-muted leading-relaxed">
            {item.answer}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-text-muted">
            Everything you need to know about Nudge
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordion
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </section>

      {/* Still have questions */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="card border-accent/30 bg-gradient-to-br from-accent/5 to-emerald-50 text-center">
            <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
            <p className="text-text-muted mb-6">
              Check out our documentation or reach out to us directly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/docs" className="btn btn-primary flex items-center gap-2">
                Read the Docs
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a href="mailto:hello@littlenudge.app" className="btn btn-secondary">
                Contact Us
              </a>
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
