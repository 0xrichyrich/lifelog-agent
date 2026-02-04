'use client';

import { useState } from 'react';
import { 
  Bot, 
  Coins, 
  Smartphone, 
  Link2, 
  Activity, 
  Wallet,
  ChevronRight,
  Github,
  ExternalLink,
  Copy,
  Check,
  Download,
  MessageCircle,
  Award,
  Sparkles,
  Heart,
  Sun,
  Brain
} from 'lucide-react';
import Image from 'next/image';

// Contract address
const CONTRACT_ADDRESS = '0xaEb52D53...a2F6EA';
const FULL_CONTRACT = '0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F';

// Featured agents for marketplace preview
const FEATURED_AGENTS = [
  {
    id: 1,
    name: 'Coach Wellness',
    description: 'Daily motivation & habit coaching',
    icon: '🏃',
    price: 5,
    category: 'Fitness'
  },
  {
    id: 2,
    name: 'Mindful Mentor',
    description: 'Meditation & mental wellness',
    icon: '🧘',
    price: 3,
    category: 'Mental Health'
  },
  {
    id: 3,
    name: 'Nutrition Pal',
    description: 'Healthy eating tips & recipes',
    icon: '🥗',
    price: 4,
    category: 'Nutrition'
  },
  {
    id: 4,
    name: 'Sleep Scholar',
    description: 'Better sleep habits & routines',
    icon: '😴',
    price: 3,
    category: 'Sleep'
  }
];

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button 
      onClick={handleCopy}
      className="p-2 hover:bg-surface-light rounded-lg transition-colors"
      title="Copy address"
    >
      {copied ? (
        <Check className="w-4 h-4 text-accent" />
      ) : (
        <Copy className="w-4 h-4 text-text-muted" />
      )}
    </button>
  );
}

// Feature card component
function FeatureCard({ 
  emoji,
  title, 
  description
}: { 
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card hover:shadow-card-hover hover:border-accent/30 transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <span className="text-4xl">{emoji}</span>
        <div>
          <h3 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors">{title}</h3>
          <p className="text-text-muted text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Step component
function StepCard({ 
  number, 
  icon: Icon, 
  title, 
  description 
}: { 
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      {/* Step number */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold shadow-lg z-10">
        {number}
      </div>
      <div className="card pt-10 h-full">
        <div className="w-16 h-16 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-accent" />
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-text-muted text-sm">{description}</p>
      </div>
    </div>
  );
}

// Agent card component
function AgentCard({ agent }: { agent: typeof FEATURED_AGENTS[0] }) {
  return (
    <div className="card hover:shadow-card-hover hover:border-accent/30 transition-all duration-300">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-3xl">
          {agent.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-bold">{agent.name}</h4>
          <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {agent.category}
          </span>
        </div>
      </div>
      <p className="text-text-muted text-sm mb-3">{agent.description}</p>
      <div className="flex items-center justify-between pt-3 border-t border-card-border">
        <div className="flex items-center gap-1 text-sm">
          <Coins className="w-4 h-4 text-accent" />
          <span className="font-bold">{agent.price}</span>
          <span className="text-text-muted">$NUDGE/msg</span>
        </div>
        <button className="text-accent text-sm font-medium hover:underline">
          Chat →
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-card-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mascot.png" alt="Nudge mascot" width={40} height={40} className="rounded-xl" />
            <span className="text-xl font-bold">Nudge</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-text-muted hover:text-accent transition">Features</a>
            <a href="#agents" className="text-text-muted hover:text-accent transition">Agents</a>
            <a href="#token" className="text-text-muted hover:text-accent transition">Token</a>
            <a href="/docs" className="text-text-muted hover:text-accent transition">Docs</a>
            <a href="/marketplace" className="btn btn-primary flex items-center gap-2">
              Marketplace
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          {/* Mobile CTA only */}
          <a href="/marketplace" className="md:hidden btn btn-primary text-sm px-4 py-2 flex items-center gap-1">
            Get Started
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Mascot */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl scale-150" />
                <Image 
                  src="/mascot.png" 
                  alt="Nudge mascot" 
                  width={180} 
                  height={180} 
                  className="relative rounded-3xl shadow-2xl"
                  priority
                />
              </div>
            </div>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Wellness with x402 Micropayments
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              Sometimes You Need a{' '}
              <span className="text-accent">Little Nudge</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl lg:text-2xl text-text-muted mb-10 max-w-2xl mx-auto">
              Your AI-powered wellness companion with a marketplace of specialized agents. 
              Pay-per-message with $NUDGE tokens, earn rewards for healthy habits.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a 
                href="#" 
                className="btn bg-black text-white hover:bg-gray-800 text-lg px-8 py-4 flex items-center gap-3 rounded-xl shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download on TestFlight
              </a>
              <a 
                href="/marketplace" 
                className="btn btn-primary text-lg px-8 py-4 flex items-center gap-3 rounded-xl shadow-lg"
              >
                Marketplace
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                HealthKit Integration
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-accent" />
                Earn $NUDGE
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" />
                AI Agents
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Wellness, Reimagined</h2>
            <p className="text-xl text-text-muted">Everything you need for a healthier, happier life</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              emoji="🤖"
              title="AI Agent Marketplace"
              description="Chat with specialized wellness agents — fitness coaches, meditation guides, nutrition experts, and more."
            />
            <FeatureCard
              emoji="💰"
              title="x402 Micropayments"
              description="Pay-per-message with $NUDGE tokens. Only pay for what you use, no subscriptions needed."
            />
            <FeatureCard
              emoji="📱"
              title="iOS App"
              description="Native app with HealthKit integration, daily check-ins, and seamless tracking of your wellness journey."
            />
            <FeatureCard
              emoji="🔗"
              title="Agent Economy"
              description="Anyone can submit agents — even AI agents! Create and monetize your own wellness expertise."
            />
            <FeatureCard
              emoji="🏥"
              title="Wellness Tracking"
              description="Track steps, outdoor time, mood check-ins, sleep, and more. Your data, beautifully visualized."
            />
            <FeatureCard
              emoji="💳"
              title="Privy Wallet"
              description="Embedded crypto wallet with no complexity. Sign in with email, get a wallet automatically."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-text-muted">Three simple steps to wellness</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-20 left-1/4 right-1/4 h-0.5 bg-accent/20" />
            
            <StepCard
              number={1}
              icon={Wallet}
              title="Download & Connect"
              description="Get the iOS app or use the web dashboard. Connect your wallet with Privy — it's just one click."
            />
            <StepCard
              number={2}
              icon={MessageCircle}
              title="Chat with AI Agents"
              description="Browse the marketplace and chat with wellness agents. Pay per message with $NUDGE tokens."
            />
            <StepCard
              number={3}
              icon={Award}
              title="Earn Rewards"
              description="Complete daily check-ins, build streaks, and earn $NUDGE tokens for maintaining healthy habits."
            />
          </div>
        </div>
      </section>

      {/* Agent Marketplace Preview */}
      <section id="agents" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-600 text-sm mb-4">
              <Bot className="w-4 h-4" />
              Agent Marketplace
            </div>
            <h2 className="text-4xl font-bold mb-4">Meet Your Wellness Agents</h2>
            <p className="text-xl text-text-muted">Specialized AI agents ready to help you thrive</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-text-muted mb-4">
              <span className="text-accent font-medium">Anyone can create agents!</span>{' '}
              Build your own wellness agent and earn $NUDGE when users chat.
            </p>
            <a href="/marketplace" className="btn btn-secondary inline-flex items-center gap-2">
              Explore All Agents
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Token Section */}
      <section id="token" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="card border-accent/30 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm mb-4">
                <Coins className="w-4 h-4" />
                $NUDGE Token
              </div>
              <h2 className="text-4xl font-bold mb-4">The Wellness Token</h2>
              <p className="text-xl text-text-muted">
                Earn tokens for check-ins and streaks. Spend them on AI agents.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-white rounded-xl">
                <Heart className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="font-bold">+10 $NUDGE</p>
                <p className="text-sm text-text-muted">Daily check-in</p>
              </div>
              <div className="text-center p-4 bg-white rounded-xl">
                <Sun className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold">+50 $NUDGE</p>
                <p className="text-sm text-text-muted">7-day streak</p>
              </div>
              <div className="text-center p-4 bg-white rounded-xl">
                <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="font-bold">-3-5 $NUDGE</p>
                <p className="text-sm text-text-muted">Per agent message</p>
              </div>
            </div>
            
            {/* Contract address */}
            <div className="bg-white rounded-xl p-4 border border-card-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted mb-1">Contract Address (Monad Testnet)</p>
                  <code className="text-sm font-mono">{CONTRACT_ADDRESS}</code>
                </div>
                <CopyButton text={FULL_CONTRACT} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card border-accent/30 bg-gradient-to-br from-accent/5 to-emerald-50 text-center">
            <Image 
              src="/mascot.png" 
              alt="Nudge mascot" 
              width={100} 
              height={100} 
              className="mx-auto mb-6 rounded-2xl"
            />
            <h2 className="text-3xl font-bold mb-4">Ready to Get Nudged?</h2>
            <p className="text-text-muted mb-8 max-w-xl mx-auto">
              Join the wellness revolution. Download the app, connect your wallet, 
              and start earning $NUDGE for healthy habits.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a 
                href="#" 
                className="btn bg-black text-white hover:bg-gray-800 px-6 py-3 flex items-center gap-2 rounded-xl"
              >
                <Download className="w-5 h-5" />
                TestFlight (Coming Soon)
              </a>
              <a 
                href="/marketplace" 
                className="btn btn-primary px-6 py-3 flex items-center gap-2 rounded-xl"
              >
                <ExternalLink className="w-5 h-5" />
                Try Web Dashboard
              </a>
              <a 
                href="https://github.com/0xrichyrich/lifelog-agent" 
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary px-6 py-3 flex items-center gap-2 rounded-xl"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-card-border bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Image src="/mascot.png" alt="Nudge mascot" width={36} height={36} className="rounded-lg" />
              <div>
                <span className="font-bold">Nudge</span>
                <p className="text-sm text-text-muted">Sometimes you need a little nudge.</p>
              </div>
            </div>
            
            {/* Hackathon badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-sm">
                Built for <span className="font-bold text-purple-600">Moltiverse Hackathon</span>
              </span>
            </div>
            
            {/* Links */}
            <div className="flex items-center gap-4">
              <a 
                href="https://github.com/0xrichyrich/lifelog-agent" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text transition p-2 hover:bg-surface-light rounded-lg"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-card-border flex flex-wrap justify-center gap-6 text-sm text-text-muted">
            <a href="/docs" className="hover:text-accent transition">Docs</a>
            <a href="/faq" className="hover:text-accent transition">FAQ</a>
            <a href="/privacy" className="hover:text-accent transition">Privacy</a>
            <a href="/terms" className="hover:text-accent transition">Terms</a>
          </div>
          
          {/* Bottom */}
          <div className="mt-6 pt-6 border-t border-card-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
            <p>© 2025 Nudge. Built with ❤️ for better wellness.</p>
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
