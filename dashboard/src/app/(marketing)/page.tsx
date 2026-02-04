'use client';

import { useState, useEffect } from 'react';
import { 
  Brain, 
  ClipboardCheck, 
  Lightbulb, 
  Coins, 
  Heart, 
  Mic, 
  Clock, 
  Shield, 
  Sparkles,
  ChevronRight,
  Play,
  Github,
  Twitter,
  Mail,
  Zap,
  Target,
  TrendingUp,
  Smartphone,
  Bot,
  Award,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

// Animated brain icon component
function AnimatedBrain() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-30 animate-pulse" />
      <div className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-8 rounded-3xl">
        <Brain className="w-20 h-20 text-white animate-pulse" />
      </div>
    </div>
  );
}

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  emoji,
  title, 
  description,
  items
}: { 
  icon?: React.ElementType;
  emoji?: string;
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div className="card hover:border-accent/50 transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-4">
        {emoji && <span className="text-3xl">{emoji}</span>}
        {Icon && <Icon className="w-8 h-8 text-accent" />}
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <p className="text-text-muted mb-4">{description}</p>
      {items && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
              <ChevronRight className="w-4 h-4 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Step component for How It Works
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
    <div className="relative">
      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg font-bold">
        {number}
      </div>
      <div className="card pt-8">
        <Icon className="w-12 h-12 text-accent mb-4" />
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-text-muted">{description}</p>
      </div>
    </div>
  );
}

// Screenshot carousel component
function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);
  const screenshots = [
    { src: '/screenshots/01-checkin.png', title: 'Quick Check-ins' },
    { src: '/screenshots/02-timeline.png', title: 'Activity Timeline' },
    { src: '/screenshots/03-goals.png', title: 'Goal Tracking' },
    { src: '/screenshots/04-settings.png', title: 'Smart Settings' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [screenshots.length]);

  return (
    <div className="relative">
      {/* iPhone frame */}
      <div className="relative mx-auto w-[280px] h-[580px] bg-black rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
        {/* Screen */}
        <div className="relative w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10" />
          
          {/* Screenshot */}
          <div className="relative w-full h-full">
            {screenshots.map((shot, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  i === current ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={shot.src}
                  alt={shot.title}
                  fill
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-accent w-8' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
      
      <p className="text-center text-text-muted mt-4">{screenshots[current].title}</p>
    </div>
  );
}

// Token reward item
function RewardItem({ 
  amount, 
  label, 
  description 
}: { 
  amount: number;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-light rounded-xl">
      <div className="flex items-center gap-1">
        <Coins className="w-6 h-6 text-yellow-500" />
        <span className="text-2xl font-bold text-yellow-500">{amount}</span>
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-surface-light">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mascot.png" alt="Nudge mascot" width={36} height={36} className="rounded-lg" />
            <span className="text-xl font-bold">Nudge</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-text-muted hover:text-text transition">Features</a>
            <a href="#token" className="text-text-muted hover:text-text transition">Token</a>
            <a href="#demo" className="text-text-muted hover:text-text transition">Demo</a>
            <a 
              href="#early-access" 
              className="btn btn-primary"
            >
              Get Early Access
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full text-accent text-sm">
                <Sparkles className="w-4 h-4" />
                Now with $NUDGE Token Rewards
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Your Gentle AI Coach That{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
                  Pays You
                </span>{' '}
                to Improve
              </h1>
              
              <p className="text-xl text-text-muted">
                Track your activities, get personalized AI insights, and earn crypto rewards 
                for building better habits. Your life data, your tokens, your control.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a href="#early-access" className="btn btn-primary text-lg px-8 py-4 flex items-center gap-2">
                  Get Early Access
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a href="#demo" className="btn btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </a>
              </div>
              
              <div className="flex items-center gap-8 text-sm text-text-muted">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Privacy-First
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-accent" />
                  iOS App
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Earn $NUDGE
                </div>
              </div>
            </div>
            
            {/* Right: Phone mockup */}
            <div className="flex justify-center">
              <ScreenshotCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase - 3 Columns */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Thrive</h2>
            <p className="text-xl text-text-muted">Simple logging, smart insights, real rewards</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              emoji="📝"
              title="Quick Logging"
              description="Track your life in seconds, not minutes."
              items={[
                '2-tap check-ins',
                'Voice notes with transcription',
                'Beautiful timeline view',
                'Activity auto-detection'
              ]}
            />
            <FeatureCard
              emoji="🧠"
              title="AI Insights"
              description="Your personal AI coach that learns you."
              items={[
                'Pattern detection',
                'Personalized coaching',
                'Smart nudges & reminders',
                'Weekly summaries'
              ]}
            />
            <FeatureCard
              emoji="💰"
              title="Token Rewards"
              description="Get paid for building better habits."
              items={[
                'Earn $NUDGE for goals',
                'Daily & weekly bonuses',
                'Streak multipliers',
                'On-chain rewards'
              ]}
            />
          </div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="py-20 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <Heart className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Apple Health Sync</h3>
              <p className="text-sm text-text-muted">Automatic sync with steps, sleep, workouts, and more</p>
            </div>
            <div className="card text-center">
              <Mic className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Siri Shortcuts</h3>
              <p className="text-sm text-text-muted">&quot;Hey Siri, log my workout&quot; — hands-free tracking</p>
            </div>
            <div className="card text-center">
              <Bot className="w-10 h-10 text-cyan-500 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Interactive Widgets</h3>
              <p className="text-sm text-text-muted">Quick actions right from your home screen</p>
            </div>
            <div className="card text-center">
              <Shield className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Privacy First</h3>
              <p className="text-sm text-text-muted">Your data stays on your device. Always.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-text-muted">Three simple steps to a better you</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              icon={ClipboardCheck}
              title="Log Your Activities"
              description="Quick check-ins, voice notes, or automatic tracking via Apple Health. Just 10 seconds to log."
            />
            <StepCard
              number={2}
              icon={Lightbulb}
              title="AI Analyzes Patterns"
              description="Our AI learns your rhythms, identifies trends, and spots opportunities for improvement."
            />
            <StepCard
              number={3}
              icon={Award}
              title="Earn Rewards"
              description="Hit your goals, build streaks, and earn $NUDGE tokens. Real crypto for real progress."
            />
          </div>
        </div>
      </section>

      {/* Token Section */}
      <section id="token" className="py-20 px-6 bg-gradient-to-b from-surface/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full text-yellow-500 text-sm mb-6">
                <Coins className="w-4 h-4" />
                $NUDGE Token
              </div>
              
              <h2 className="text-4xl font-bold mb-6">
                Earn Crypto for{' '}
                <span className="text-yellow-500">Living Better</span>
              </h2>
              
              <p className="text-xl text-text-muted mb-8">
                The first life-tracking app that puts your wellness on-chain. 
                Earn $NUDGE tokens for hitting goals, maintaining streaks, and building healthy habits.
              </p>
              
              <div className="space-y-4">
                <RewardItem
                  amount={100}
                  label="Daily Goal"
                  description="Complete all daily check-ins"
                />
                <RewardItem
                  amount={500}
                  label="Weekly Milestone"
                  description="Hit your weekly targets"
                />
                <RewardItem
                  amount={50}
                  label="Streak Bonus"
                  description="Per day of consecutive logging"
                />
              </div>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <a 
                  href="https://nad.fun" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  nad.fun (Monad)
                </a>
                <span className="flex items-center gap-2 text-text-muted px-4 py-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  Coming to Solana
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
              <div className="relative card border-yellow-500/30">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                    <Coins className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">$NUDGE Token</h3>
                  <p className="text-text-muted">Your wellness, on-chain</p>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center p-3 bg-surface-light rounded-lg">
                    <span className="text-text-muted">Network</span>
                    <span className="font-medium">Monad + Solana</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-light rounded-lg">
                    <span className="text-text-muted">Type</span>
                    <span className="font-medium">Utility Token</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-light rounded-lg">
                    <span className="text-text-muted">Use Case</span>
                    <span className="font-medium">Wellness Rewards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">See It In Action</h2>
            <p className="text-xl text-text-muted">Watch how Nudge transforms your daily routine</p>
          </div>
          
          {/* Video placeholder */}
          <div className="relative aspect-video bg-surface rounded-2xl overflow-hidden mb-12 border border-surface-light">
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center hover:bg-accent transition group">
                <Play className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition" />
              </button>
            </div>
            <div className="absolute bottom-4 left-4 text-sm text-text-muted">
              Demo video coming soon
            </div>
          </div>
          
          {/* Screenshot grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['01-checkin.png', '02-timeline.png', '03-goals.png', '04-settings.png'].map((img, i) => (
              <div key={i} className="relative aspect-[9/19] rounded-xl overflow-hidden border border-surface-light">
                <Image
                  src={`/screenshots/${img}`}
                  alt={`Screenshot ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section id="early-access" className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card border-accent/30 bg-gradient-to-b from-accent/10 to-transparent">
            <TrendingUp className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Life?</h2>
            <p className="text-text-muted mb-8">
              Join the waitlist for early access. Be among the first to earn $NUDGE tokens.
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-surface border border-surface-light rounded-lg focus:outline-none focus:border-accent"
              />
              <button type="submit" className="btn btn-primary px-8 py-3">
                Join Waitlist
              </button>
            </form>
            
            <p className="text-xs text-text-muted mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-light">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/mascot.png" alt="Nudge mascot" width={36} height={36} className="rounded-lg" />
                <span className="text-xl font-bold">Nudge</span>
              </div>
              <p className="text-text-muted mb-4">
                Sometimes you need a little nudge. Your gentle AI life coach.
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="https://github.com/0xrichyrich/lifelog-agent" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition"
                >
                  <Github className="w-6 h-6" />
                </a>
                <a 
                  href="https://twitter.com/lifelogapp" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-text transition"
                >
                  <Twitter className="w-6 h-6" />
                </a>
                <a 
                  href="mailto:hello@lifelog.app"
                  className="text-text-muted hover:text-text transition"
                >
                  <Mail className="w-6 h-6" />
                </a>
              </div>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-text-muted">
                <li><a href="#features" className="hover:text-text transition">Features</a></li>
                <li><a href="#token" className="hover:text-text transition">$NUDGE Token</a></li>
                <li><a href="#demo" className="hover:text-text transition">Demo</a></li>
                <li><a href="/dashboard" className="hover:text-text transition">Dashboard</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-text-muted">
                <li><a href="https://github.com/0xrichyrich/lifelog-agent" target="_blank" rel="noopener noreferrer" className="hover:text-text transition">GitHub</a></li>
                <li><a href="#" className="hover:text-text transition">Documentation</a></li>
                <li><a href="#" className="hover:text-text transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-text transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-surface-light flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-muted text-sm">
              © 2025 Nudge. All rights reserved.
            </p>
            
            {/* Hackathon badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-surface-light">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-sm">
                Built for <span className="font-bold text-purple-400">Moltiverse Hackathon</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
