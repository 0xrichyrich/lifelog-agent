'use client';

import Image from 'next/image';
import Link from 'next/link';
import { 
  ChevronRight, 
  BookOpen, 
  Smartphone, 
  Layout, 
  Bot, 
  Zap, 
  Coins, 
  Code, 
  Github,
  Rocket,
  Heart,
  Activity,
  MessageCircle,
  Wallet,
  ExternalLink,
  Trophy,
  TrendingUp,
  Target,
  Sun,
  Award,
  Brain,
  FileCode
} from 'lucide-react';

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Getting Started',
    content: (
      <div className="space-y-4">
        <p>Welcome to Nudge! Here&apos;s how to get started in 3 simple steps:</p>
        <ol className="list-decimal list-inside space-y-3 ml-4">
          <li>
            <strong>Download the app</strong> — Get Nudge from TestFlight (iOS) or use the web dashboard
          </li>
          <li>
            <strong>Connect your wallet</strong> — Sign in with email via Privy. A wallet is created automatically, or connect your existing one
          </li>
          <li>
            <strong>Complete your first check-in</strong> — Answer a few questions about your mood, sleep, and goals to earn your first $NUDGE tokens
          </li>
        </ol>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong className="text-accent">Pro tip:</strong> Enable HealthKit permissions to automatically track steps, 
            distance, and other health metrics!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'ios-app',
    icon: Smartphone,
    title: 'iOS App Features',
    content: (
      <div className="space-y-4">
        <p>The native iOS app provides the best Nudge experience with these features:</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <strong>HealthKit Integration</strong>
              <p className="text-text-muted text-sm">Automatically syncs steps, distance, flights climbed, and more</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <strong>Daily Check-ins</strong>
              <p className="text-text-muted text-sm">Track mood, sleep quality, energy, and set daily intentions</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <strong>AI Agent Chat</strong>
              <p className="text-text-muted text-sm">Chat with wellness agents directly in the app</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <strong>Built-in Wallet</strong>
              <p className="text-text-muted text-sm">Privy-powered wallet for seamless $NUDGE transactions</p>
            </div>
          </li>
        </ul>
        <div className="bg-surface-light rounded-lg p-4 mt-4">
          <p className="text-sm text-text-muted">
            📱 Currently available on TestFlight. App Store release coming soon!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'web-dashboard',
    icon: Layout,
    title: 'Web Dashboard',
    content: (
      <div className="space-y-4">
        <p>Access Nudge from any browser with our responsive web dashboard:</p>
        <ul className="space-y-2 text-text-muted">
          <li className="flex items-center gap-2">
            <span className="text-accent">✓</span>
            View your wellness stats and streaks
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent">✓</span>
            Complete daily check-ins
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent">✓</span>
            Browse and chat with AI agents
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent">✓</span>
            Manage your wallet and tokens
          </li>
          <li className="flex items-center gap-2">
            <span className="text-accent">✓</span>
            View transaction history
          </li>
        </ul>
        <Link 
          href="/marketplace" 
          className="btn btn-primary inline-flex items-center gap-2 mt-4"
        >
          Go to Dashboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    ),
  },
  {
    id: 'agent-marketplace',
    icon: Bot,
    title: 'Agent Marketplace',
    content: (
      <div className="space-y-4">
        <p>
          The Agent Marketplace is where you discover AI wellness companions. Each agent has 
          unique expertise, personality, and pricing.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-surface-light rounded-lg p-4">
            <span className="text-2xl">🏃</span>
            <h4 className="font-semibold mt-2">Fitness Coaches</h4>
            <p className="text-sm text-text-muted">Workout plans, motivation, form tips</p>
          </div>
          <div className="bg-surface-light rounded-lg p-4">
            <span className="text-2xl">🧘</span>
            <h4 className="font-semibold mt-2">Meditation Guides</h4>
            <p className="text-sm text-text-muted">Mindfulness, breathing, stress relief</p>
          </div>
          <div className="bg-surface-light rounded-lg p-4">
            <span className="text-2xl">🥗</span>
            <h4 className="font-semibold mt-2">Nutrition Experts</h4>
            <p className="text-sm text-text-muted">Meal planning, healthy recipes, advice</p>
          </div>
          <div className="bg-surface-light rounded-lg p-4">
            <span className="text-2xl">😴</span>
            <h4 className="font-semibold mt-2">Sleep Specialists</h4>
            <p className="text-sm text-text-muted">Sleep hygiene, routines, relaxation</p>
          </div>
        </div>
        <p className="text-sm text-text-muted">
          <strong>Want to create your own agent?</strong> Check the developer section below!
        </p>
      </div>
    ),
  },
  {
    id: 'x402-micropayments',
    icon: Zap,
    title: 'x402 Micropayments',
    content: (
      <div className="space-y-4">
        <p>
          Nudge uses the <strong>x402 protocol</strong> for pay-per-message interactions with AI agents. 
          No subscriptions needed — just pay for what you use.
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-600 mb-2">How it works:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-text-muted">
            <li>You send a message to an AI agent</li>
            <li>The x402 protocol initiates a micropayment (3-5 $NUDGE typically)</li>
            <li>Payment is processed instantly via smart contract</li>
            <li>Agent creator receives 70%, protocol takes 30%</li>
            <li>You get your response!</li>
          </ol>
        </div>
        <p className="text-sm text-text-muted">
          Learn more about x402 at{' '}
          <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            x402.org
          </a>
        </p>
      </div>
    ),
  },
  {
    id: 'xp-system',
    icon: Trophy,
    title: 'XP Gamification System',
    content: (
      <div className="space-y-4">
        <p>
          Nudge uses an XP (experience points) system to gamify your wellness journey. 
          Earn XP from healthy activities, level up for bonuses, and redeem XP for $NUDGE tokens!
        </p>
        <div className="space-y-3">
          <h4 className="font-semibold">Earning XP:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Heart className="w-4 h-4 text-accent" />
              <span className="flex-1">Daily check-in</span>
              <span className="text-yellow-600 font-bold">+10 XP</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="flex-1">Mood log</span>
              <span className="text-yellow-600 font-bold">+5 XP</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="flex-1">Goal complete</span>
              <span className="text-yellow-600 font-bold">+25 XP</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Sun className="w-4 h-4 text-orange-500" />
              <span className="flex-1">7-day streak</span>
              <span className="text-yellow-600 font-bold">+50 XP</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="flex-1">30-day streak</span>
              <span className="text-yellow-600 font-bold">+200 XP</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="flex-1">Badge earned</span>
              <span className="text-yellow-600 font-bold">+100 XP</span>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold">Level Bonuses (XP Redemption):</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-medium">Base (Level 1-4)</p>
              <p className="text-sm text-text-muted">1000 XP = 100 $NUDGE</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-700">Level 5+ <span className="text-xs bg-blue-200 px-1.5 py-0.5 rounded-full">+10%</span></p>
              <p className="text-sm text-text-muted">1000 XP = 110 $NUDGE</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="font-medium text-purple-700">Level 10+ <span className="text-xs bg-purple-200 px-1.5 py-0.5 rounded-full">+25%</span></p>
              <p className="text-sm text-text-muted">1000 XP = 125 $NUDGE</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300">
              <p className="font-medium text-yellow-700">Level 20+ <span className="text-xs bg-yellow-200 px-1.5 py-0.5 rounded-full">+50%</span></p>
              <p className="text-sm text-text-muted">1000 XP = 150 $NUDGE</p>
            </div>
          </div>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong className="text-accent">Pro tip:</strong> Maintain daily streaks for the biggest XP bonuses. 
            A 30-day streak alone earns you 200 XP!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'nudge-token',
    icon: Coins,
    title: '$NUDGE Token',
    content: (
      <div className="space-y-4">
        <p>
          $NUDGE is the utility token powering the Nudge ecosystem. Redeem XP for tokens, 
          spend tokens on AI agents, and receive buyback distributions.
        </p>
        <div className="space-y-3">
          <h4 className="font-semibold">Token Utility:</h4>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              Redeem XP for $NUDGE tokens
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              Pay for AI agent messages (3-5 tokens per message)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              Receive buyback distributions as an active user
            </li>
          </ul>
        </div>
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mt-4">
          <p className="text-sm">
            ⚠️ <strong>Testnet only:</strong> $NUDGE currently has no real monetary value. 
            It exists on Monad Testnet for testing purposes.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'tokenomics',
    icon: TrendingUp,
    title: 'Tokenomics & Agent Economy',
    content: (
      <div className="space-y-4">
        <p>
          Nudge features a sustainable token economy with fee splitting and buybacks that 
          reward both agent creators and active users.
        </p>
        <div className="space-y-3">
          <h4 className="font-semibold">Fee Split Model:</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-3xl font-bold text-purple-600">80%</p>
              <p className="font-medium">Agent Creators</p>
              <p className="text-sm text-text-muted">Earn from every message to their agent</p>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-3xl font-bold text-accent">20%</p>
              <p className="font-medium">Treasury (Buybacks)</p>
              <p className="text-sm text-text-muted">Funds $NUDGE buybacks for users</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold">Buyback Flywheel:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-text-muted">
            <li>Users chat with agents, paying $NUDGE per message</li>
            <li>80% goes to agent creator, 20% to treasury</li>
            <li>Treasury accumulates and triggers buybacks</li>
            <li>NudgeBuyback contract purchases $NUDGE from market</li>
            <li>Purchased tokens distributed to active users</li>
            <li>More engagement → more buybacks → more rewards!</li>
          </ol>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong className="text-purple-600">Sustainable economy:</strong> The more people use agents, 
            the more buyback distributions happen. Active users benefit most!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'contracts',
    icon: FileCode,
    title: 'Smart Contracts',
    content: (
      <div className="space-y-4">
        <p>
          Nudge runs on <strong>Monad Testnet</strong>. Here are the deployed contract addresses:
        </p>
        <div className="space-y-3">
          <div className="p-4 bg-surface-light rounded-lg">
            <p className="text-sm text-text-muted mb-1">$NUDGE Token</p>
            <code className="text-xs font-mono break-all">0x99cDfA46B933ea28Edf4BB620428E24C8EB63367</code>
          </div>
          <div className="p-4 bg-surface-light rounded-lg">
            <p className="text-sm text-text-muted mb-1">FeeSplitter</p>
            <code className="text-xs font-mono break-all">0xA3c103809d995a0e4d698b69f3DB9f2da643c053</code>
            <p className="text-xs text-text-muted mt-2">Handles 80/20 split between agents and treasury</p>
          </div>
          <div className="p-4 bg-surface-light rounded-lg">
            <p className="text-sm text-text-muted mb-1">NudgeBuyback</p>
            <code className="text-xs font-mono break-all">0x4E7825D923Cc09aA8be74C08B14c7Cd4A48522bc</code>
            <p className="text-xs text-text-muted mt-2">Executes buybacks and distributes to active users</p>
          </div>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong className="text-accent">Open Source:</strong> All contracts are verified and available on{' '}
            <a href="https://github.com/0xrichyrich/lifelog-agent/tree/main/contracts" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              GitHub
            </a>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'api-reference',
    icon: Code,
    title: 'API Reference',
    content: (
      <div className="space-y-4">
        <p>
          Nudge exposes REST APIs for building integrations and custom experiences.
        </p>
        <div className="bg-surface-light rounded-lg p-4 font-mono text-sm">
          <p className="text-text-muted mb-2"># Base URL</p>
          <p>https://api.littlenudge.app/v1</p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Key Endpoints:</h4>
          <ul className="space-y-1 text-sm font-mono text-text-muted">
            <li>GET /health — Health check</li>
            <li>GET /agents — List marketplace agents</li>
            <li>POST /agents/:id/chat — Send message to agent (x402)</li>
            <li>GET /user/stats — Get user wellness stats</li>
            <li>POST /checkin — Submit daily check-in</li>
          </ul>
        </div>
        <p className="text-sm text-text-muted">
          Full API documentation coming soon. For now, check the source code on GitHub.
        </p>
      </div>
    ),
  },
  {
    id: 'for-developers',
    icon: Github,
    title: 'For Developers',
    content: (
      <div className="space-y-4">
        <p>
          Nudge is open source! Contributions welcome. Here&apos;s how to get involved:
        </p>
        <div className="space-y-3">
          <a 
            href="https://github.com/0xrichyrich/lifelog-agent" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-surface-light rounded-lg hover:bg-accent/10 transition-colors"
          >
            <Github className="w-6 h-6" />
            <div>
              <p className="font-semibold">lifelog-agent</p>
              <p className="text-sm text-text-muted">Main monorepo — iOS app, dashboard, contracts</p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-muted ml-auto" />
          </a>
        </div>
        <div className="space-y-2 mt-4">
          <h4 className="font-semibold">Stack:</h4>
          <ul className="space-y-1 text-sm text-text-muted">
            <li>• <strong>iOS:</strong> Swift, SwiftUI, HealthKit</li>
            <li>• <strong>Web:</strong> Next.js 14, TypeScript, Tailwind CSS</li>
            <li>• <strong>Blockchain:</strong> Monad Testnet, Solidity, ethers.js</li>
            <li>• <strong>Auth:</strong> Privy</li>
            <li>• <strong>Payments:</strong> x402 protocol</li>
          </ul>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong className="text-accent">Building an agent?</strong> Create a wellness AI agent and submit it to our marketplace. 
            Earn $NUDGE every time someone chats with your creation!
          </p>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
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
            <Link href="/docs" className="text-accent font-medium">Docs</Link>
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
            <BookOpen className="w-4 h-4" />
            Documentation
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Nudge Docs</h1>
          <p className="text-xl text-text-muted">
            Learn how to get the most out of Nudge
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {DOC_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 text-sm bg-surface-light hover:bg-accent/10 rounded-full transition-colors"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {DOC_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} id={section.id} className="card scroll-mt-24">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-card-border">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
                <div className="text-text-muted leading-relaxed">
                  {section.content}
                </div>
              </div>
            );
          })}
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
              <Rocket className="w-5 h-5 text-purple-500" />
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
