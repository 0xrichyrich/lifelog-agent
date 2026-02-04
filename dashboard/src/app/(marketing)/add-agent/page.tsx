'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sparkles, 
  Send, 
  Info, 
  AlertCircle, 
  CheckCircle,
  Wallet,
  ChevronRight,
  Loader2,
  Award,
  Github
} from 'lucide-react';

const CATEGORIES = [
  { id: 'wellness', label: 'Wellness', icon: '🧘' },
  { id: 'productivity', label: 'Productivity', icon: '⚡' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '☕' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎮' },
];

const COMMON_CAPABILITIES = [
  'Daily check-ins',
  'Goal tracking',
  'Personalized advice',
  'Data analysis',
  'Reminders',
  'Motivation',
];

const EMOJI_PICKER = ['🤖', '🧠', '💡', '🎯', '🌟', '⚡', '🔥', '💪', '🧘', '📊', '📈', '🎮', '🎵', '📚', '☕', '🌱', '💎', '🚀', '🎨', '🔮'];

interface FormData {
  name: string;
  icon: string;
  description: string;
  category: string;
  systemPrompt: string;
  isFree: boolean;
  perMessage: number;
  capabilities: string[];
}

export default function AddAgentPage() {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'payment-required' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number; recipientWallet: string } | null>(null);
  const [customCapability, setCustomCapability] = useState('');
  
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address || user?.wallet?.address;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    icon: '🤖',
    description: '',
    category: 'productivity',
    systemPrompt: '',
    isFree: true,
    perMessage: 1000,
    capabilities: [],
  });

  const handleChange = (field: keyof FormData, value: string | boolean | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  const addCustomCapability = () => {
    if (customCapability.trim() && !formData.capabilities.includes(customCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, customCapability.trim()],
      }));
      setCustomCapability('');
    }
  };

  const handleSubmit = async (e: React.FormEvent, paymentProof?: string) => {
    e.preventDefault();
    if (!walletAddress) {
      setErrorMessage('Please connect your wallet first');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
        category: formData.category,
        systemPrompt: formData.systemPrompt,
        pricing: {
          perMessage: formData.isFree ? 0 : formData.perMessage,
          isFree: formData.isFree,
        },
        creatorWallet: walletAddress,
        capabilities: formData.capabilities,
        ...(paymentProof && { paymentProof }),
      };

      const res = await fetch('/api/marketplace/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 402) {
        setPaymentInfo({
          amount: data.amount,
          recipientWallet: data.recipientWallet,
        });
        setSubmitStatus('payment-required');
      } else if (res.ok) {
        setSubmitStatus('success');
      } else {
        setErrorMessage(data.error || 'Failed to submit agent');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrorMessage('Network error. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async () => {
    const mockPaymentProof = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent, mockPaymentProof);
  };

  // Navigation component
  const Nav = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-card-border">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/mascot.png" alt="Nudge mascot" width={40} height={40} className="rounded-xl" />
          <span className="text-xl font-bold">Nudge</span>
        </Link>
        {authenticated && walletAddress ? (
          <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        ) : (
          <button onClick={login} className="btn btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );

  // Footer component
  const Footer = () => (
    <footer className="py-12 px-6 border-t border-card-border bg-white mt-12">
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
  );

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="pt-28 pb-20 px-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-card border border-card-border">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Agent Submitted! 🎉</h2>
            <p className="text-text-muted mb-6">
              Your agent &quot;{formData.name}&quot; has been added to the Nudge ecosystem.
            </p>
            <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
              Back to Home
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitStatus === 'payment-required' && paymentInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="pt-28 pb-20 px-6 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-card border border-card-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Payment Required</h2>
              <p className="text-text-muted">
                A small listing fee helps maintain quality in the ecosystem.
              </p>
            </div>
            
            <div className="bg-surface-light rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-text-muted">Listing Fee:</span>
                <span className="font-bold text-text">${(paymentInfo.amount / 1000000).toFixed(2)} USDC</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePaymentSubmit}
                disabled={isSubmitting}
                className="w-full btn btn-primary py-3"
              >
                {isSubmitting ? 'Processing...' : 'Confirm & Submit'}
              </button>
              <button
                onClick={() => setSubmitStatus('idle')}
                className="w-full bg-surface-light text-text py-3 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <main className="pt-28 pb-12 px-4 md:px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Create AI Agent
          </div>
          <h1 className="text-4xl font-bold mb-4">Add Your Agent</h1>
          <p className="text-text-muted text-lg max-w-xl mx-auto">
            Create an AI agent and share it with the Nudge community. Earn $NUDGE tokens when others use your agent.
          </p>
        </div>

        {/* Wallet Connection Required */}
        {!authenticated && (
          <div className="bg-white rounded-2xl p-8 border border-card-border shadow-card text-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-text-muted mb-6">
              Connect your wallet to create an agent and receive revenue share.
            </p>
            <button onClick={login} className="btn btn-primary inline-flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          </div>
        )}

        {/* Form */}
        {authenticated && (
          <>
            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
                <h2 className="text-xl font-bold text-text mb-4">Basic Information</h2>
                
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Agent Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g., MindfulBot"
                      className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Icon *</label>
                    <div className="grid grid-cols-10 gap-2 p-3 bg-surface-light rounded-xl">
                      {EMOJI_PICKER.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleChange('icon', emoji)}
                          className={`text-2xl p-2 rounded-lg transition ${
                            formData.icon === emoji ? 'bg-accent text-white' : 'hover:bg-white'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Description *</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Describe what your agent does..."
                      rows={3}
                      className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
                <h2 className="text-xl font-bold text-text mb-2">Agent Personality</h2>
                <p className="text-text-muted text-sm mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Define how your agent behaves and responds.
                </p>
                <textarea
                  required
                  value={formData.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  placeholder="You are a helpful assistant that..."
                  rows={6}
                  className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none font-mono text-sm"
                />
              </div>

              {/* Capabilities */}
              <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
                <h2 className="text-xl font-bold text-text mb-4">Capabilities</h2>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CAPABILITIES.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => toggleCapability(cap)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        formData.capabilities.includes(cap)
                          ? 'bg-accent text-white'
                          : 'bg-surface-light text-text-muted hover:bg-accent/10'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
                <h2 className="text-xl font-bold text-text mb-4">Pricing</h2>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-surface-light rounded-xl">
                    <input
                      type="radio"
                      checked={formData.isFree}
                      onChange={() => handleChange('isFree', true)}
                      className="w-5 h-5 accent-accent"
                    />
                    <span className="font-medium">Free</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-surface-light rounded-xl">
                    <input
                      type="radio"
                      checked={!formData.isFree}
                      onChange={() => handleChange('isFree', false)}
                      className="w-5 h-5 accent-accent"
                    />
                    <span className="font-medium">Paid per message</span>
                  </label>
                </div>
                
                {!formData.isFree && (
                  <div className="bg-surface-light rounded-xl p-4">
                    <label className="block text-sm font-medium text-text mb-3">
                      Price per message (NUDGE tokens)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="100"
                        max="50000"
                        step="100"
                        value={formData.perMessage}
                        onChange={(e) => handleChange('perMessage', parseInt(e.target.value))}
                        className="flex-1 accent-accent"
                      />
                      <span className="font-bold text-accent min-w-[100px] text-right">
                        {formData.perMessage.toLocaleString()} NUDGE
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-text-muted">
                  Listing fee: $0.10 USDC
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary px-8 py-3 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Agent
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
