'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={sectionVariants}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function PhoneMockup({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`iphone-frame relative ${className}`}>
      <div className="iphone-notch" />
      <div className="iphone-screen">
        <Image
          src={src}
          alt={alt}
          width={280}
          height={600}
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-400 to-emerald-400 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">LifeLog</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition">Features</a>
            <a href="#screenshots" className="text-gray-400 hover:text-white transition">Screenshots</a>
            <a href="#token" className="text-gray-400 hover:text-white transition">$LIFE Token</a>
            <a href="https://github.com/0xrichyrich/lifelog-agent" target="_blank" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold hover:opacity-90 transition">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="hero-glow -top-20 -left-40" />
        <div className="hero-glow-2 top-40 -right-40" />
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-gray-300">Moltiverse Hackathon Winner</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Your Life,
              <br />
              <span className="gradient-text">Quantified & Rewarded</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-8 max-w-lg">
              Log your daily moments with AI-powered insights. Earn $LIFE tokens for building healthy habits. 
              Your personal journal that pays you back.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a href="https://github.com/0xrichyrich/lifelog-agent" target="_blank" 
                className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold text-lg hover:scale-105 transition-transform flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                View on GitHub
              </a>
              <a href="#features" className="px-8 py-4 rounded-full glass text-white font-semibold text-lg hover:bg-white/10 transition flex items-center gap-2">
                Learn More
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
            
            {/* Stats */}
            <div className="flex gap-12 mt-12">
              <div>
                <div className="text-3xl font-bold gradient-text">$200K</div>
                <div className="text-gray-500 text-sm">Hackathon Prize</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text">2 Chains</div>
                <div className="text-gray-500 text-sm">Monad + Solana</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text">∞</div>
                <div className="text-gray-500 text-sm">Life Moments</div>
              </div>
            </div>
          </motion.div>
          
          {/* Right - Phone Mockups */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="relative">
              <PhoneMockup 
                src="/screenshots/01-checkin.png" 
                alt="LifeLog Check-in Screen"
                className="phone-float w-[260px] z-20"
              />
              <PhoneMockup 
                src="/screenshots/02-timeline.png" 
                alt="LifeLog Timeline Screen"
                className="phone-float-delayed w-[260px] absolute -right-32 top-20 z-10 opacity-80"
              />
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </section>

      {/* Features Section */}
      <Section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why <span className="gradient-text">LifeLog</span>?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              More than a journal — it&apos;s your personal AI companion that understands, analyzes, and rewards your journey.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="gradient-border p-8 feature-card"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-400/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Quick Logging</h3>
              <p className="text-gray-400">
                Capture life moments in seconds. Voice, text, or quick-tap — your way, your pace. No friction, just flow.
              </p>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="gradient-border p-8 feature-card"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-400/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI Insights</h3>
              <p className="text-gray-400">
                Powered by advanced AI to spot patterns, suggest improvements, and provide personalized wellness recommendations.
              </p>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div
              whileHover={{ y: -8 }}
              className="gradient-border p-8 feature-card"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-400/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Token Rewards</h3>
              <p className="text-gray-400">
                Earn $LIFE tokens for consistent journaling. Real value for real habits. Your data stays yours.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* How It Works */}
      <Section className="py-32 relative overflow-hidden">
        <div className="hero-glow -bottom-40 -left-40 opacity-50" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl text-gray-400">Three simple steps to a more mindful life</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 opacity-30" />
            
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-500/5 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center">1</span>
                <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Download & Connect</h3>
              <p className="text-gray-400">Get the iOS app and connect your crypto wallet to start your journey.</p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 text-white font-bold flex items-center justify-center">2</span>
                <svg className="w-12 h-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Log Your Life</h3>
              <p className="text-gray-400">Check in daily with moods, activities, goals, and reflections. AI helps you understand patterns.</p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">3</span>
                <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Earn $LIFE</h3>
              <p className="text-gray-400">Build streaks, hit goals, and earn tokens. Redeem for rewards or trade on DEXs.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Screenshots Gallery */}
      <Section id="screenshots" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Beautiful <span className="gradient-text">Experience</span>
            </h2>
            <p className="text-xl text-gray-400">Designed for iOS with native SwiftUI</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring" }}>
              <PhoneMockup src="/screenshots/01-checkin.png" alt="Check-in" className="w-[220px]" />
              <p className="text-center mt-4 text-gray-400">Quick Check-in</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring" }}>
              <PhoneMockup src="/screenshots/02-timeline.png" alt="Timeline" className="w-[220px]" />
              <p className="text-center mt-4 text-gray-400">Life Timeline</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring" }}>
              <PhoneMockup src="/screenshots/03-goals.png" alt="Goals" className="w-[220px]" />
              <p className="text-center mt-4 text-gray-400">Goal Tracking</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring" }}>
              <PhoneMockup src="/screenshots/04-wellness.png" alt="Wellness" className="w-[220px]" />
              <p className="text-center mt-4 text-gray-400">Wellness & Balance</p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* $LIFE Token Section */}
      <Section id="token" className="py-32 relative overflow-hidden">
        <div className="hero-glow top-0 right-0 opacity-40" />
        <div className="hero-glow-2 bottom-0 left-0 opacity-40" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Token Visual */}
            <div className="flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <div className="w-64 h-64 rounded-full token-glow bg-gradient-to-br from-purple-500 via-cyan-400 to-emerald-400 p-1">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold gradient-text">$LIFE</div>
                      <div className="text-gray-400 mt-2">Token</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Token Info */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                The <span className="gradient-text">$LIFE</span> Token
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Your daily check-ins aren&apos;t just data — they&apos;re earning you real value. 
                The more consistent you are, the more you earn.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 gradient-border p-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📝</span>
                  </div>
                  <div>
                    <div className="font-semibold">Daily Check-in</div>
                    <div className="text-gray-400 text-sm">10 $LIFE per check-in</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 gradient-border p-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <div className="font-semibold">7-Day Streak</div>
                    <div className="text-gray-400 text-sm">2x multiplier bonus</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 gradient-border p-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎯</span>
                  </div>
                  <div>
                    <div className="font-semibold">Goal Completion</div>
                    <div className="text-gray-400 text-sm">50 $LIFE per goal achieved</div>
                  </div>
                </div>
              </div>
              
              {/* Chain Badges */}
              <div className="flex flex-wrap gap-4">
                <div className="px-4 py-2 rounded-full glass flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500" />
                  <span className="font-semibold">Monad</span>
                </div>
                <div className="px-4 py-2 rounded-full glass flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" />
                  <span className="font-semibold">Solana</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Social Proof / Hackathon Section */}
      <Section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="gradient-border p-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-400/20 mb-6">
              <span className="text-xl">🏆</span>
              <span className="font-semibold">Hackathon Project</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for <span className="gradient-text">Moltiverse</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              LifeLog Agent is our submission for the Moltiverse Hackathon, 
              competing for the $200K prize pool. A fusion of AI, Web3, and personal wellness.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              <div className="px-6 py-3 rounded-full glass">
                <span className="text-gray-400">Built with</span>
                <span className="font-bold ml-2">SwiftUI + Web3</span>
              </div>
              <div className="px-6 py-3 rounded-full glass">
                <span className="text-gray-400">AI powered by</span>
                <span className="font-bold ml-2">OpenAI</span>
              </div>
              <div className="px-6 py-3 rounded-full glass">
                <span className="text-gray-400">Chains</span>
                <span className="font-bold ml-2">Monad + Solana</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="py-32 relative overflow-hidden">
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to <span className="gradient-text">Start Your Journey</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join the revolution of mindful living with blockchain rewards.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://github.com/0xrichyrich/lifelog-agent" target="_blank"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold text-lg hover:scale-105 transition-transform flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              View Source Code
            </a>
            <a href="https://twitter.com/SkynetSays" target="_blank"
              className="px-8 py-4 rounded-full glass text-white font-semibold text-lg hover:bg-white/10 transition flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow @SkynetSays
            </a>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-400 to-emerald-400 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text">LifeLog Agent</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="https://github.com/0xrichyrich/lifelog-agent" target="_blank" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
              <a href="https://twitter.com/SkynetSays" target="_blank" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
            
            <div className="text-gray-500 text-sm">
              © 2025 LifeLog Agent. Built for Moltiverse Hackathon.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
