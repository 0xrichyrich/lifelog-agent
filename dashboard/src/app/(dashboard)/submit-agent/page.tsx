'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Send, Info, AlertCircle, CheckCircle } from 'lucide-react';

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
  'Tips & recommendations',
  'Progress reports',
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
  creatorWallet: string;
  capabilities: string[];
}

export default function SubmitAgentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'payment-required' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number; recipientWallet: string } | null>(null);
  const [customCapability, setCustomCapability] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    icon: '🤖',
    description: '',
    category: 'productivity',
    systemPrompt: '',
    isFree: true,
    perMessage: 1000,
    creatorWallet: '',
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
        creatorWallet: formData.creatorWallet,
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
        // Payment required
        setPaymentInfo({
          amount: data.amount,
          recipientWallet: data.recipientWallet,
        });
        setSubmitStatus('payment-required');
      } else if (res.ok) {
        setSubmitStatus('success');
        // Redirect after a short delay
        setTimeout(() => router.push('/marketplace'), 2000);
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
    // For MVP, simulate payment proof - in production this would come from wallet
    const mockPaymentProof = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent, mockPaymentProof);
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-card border border-card-border">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Agent Submitted! 🎉</h2>
          <p className="text-text-muted mb-6">
            Your agent &quot;{formData.name}&quot; has been submitted to the marketplace. It will appear once reviewed.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-dark transition"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (submitStatus === 'payment-required' && paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md shadow-card border border-card-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Payment Required</h2>
            <p className="text-text-muted">
              A listing fee is required to submit your agent to the marketplace.
            </p>
          </div>
          
          <div className="bg-surface-light rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-text-muted">Listing Fee:</span>
              <span className="font-bold text-text">${(paymentInfo.amount / 1000000).toFixed(2)} USDC</span>
            </div>
            <div className="text-xs text-text-muted break-all">
              <span className="block mb-1">Send to:</span>
              <code className="bg-white px-2 py-1 rounded">{paymentInfo.recipientWallet}</code>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePaymentSubmit}
              disabled={isSubmitting}
              className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-medium transition disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Payment & Submit'}
            </button>
            <button
              onClick={() => setSubmitStatus('idle')}
              className="w-full bg-surface-light text-text py-3 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Go Back
            </button>
          </div>
          
          <p className="text-xs text-text-muted text-center mt-4">
            Note: For MVP testing, payment is simulated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-text-muted hover:text-accent transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>
        <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-accent" />
          Submit Your Agent
        </h1>
        <p className="text-text-muted">
          Create and share your AI agent with the Nudge community. Earn NUDGE tokens when others use your agent.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
          <h2 className="text-xl font-bold text-text mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., MindfulBot"
                className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Icon *
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-surface-light border border-card-border rounded-xl">
                {EMOJI_PICKER.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleChange('icon', emoji)}
                    className={`text-2xl p-1 rounded-lg transition ${
                      formData.icon === emoji
                        ? 'bg-accent text-white scale-110'
                        : 'hover:bg-white'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Creator Wallet */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Creator Wallet Address *
              </label>
              <input
                type="text"
                required
                value={formData.creatorWallet}
                onChange={(e) => handleChange('creatorWallet', e.target.value)}
                placeholder="0x..."
                className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-mono text-sm"
              />
              <p className="text-xs text-text-muted mt-1">
                You&apos;ll receive revenue share when users interact with your agent
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-text mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what your agent does and how it helps users..."
              rows={3}
              className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
          <h2 className="text-xl font-bold text-text mb-2">Agent Personality</h2>
          <p className="text-text-muted text-sm mb-4 flex items-center gap-2">
            <Info className="w-4 h-4" />
            This is the system prompt that defines your agent&apos;s personality and behavior.
          </p>
          
          <textarea
            required
            value={formData.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            placeholder={`You are a friendly and supportive wellness coach named [Name]. Your role is to help users with [specific goal].

Your personality traits:
- Warm and encouraging
- Knowledgeable about [domain]
- Uses emojis occasionally

When users ask for help, you should...`}
            rows={8}
            className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none font-mono text-sm"
          />
        </div>

        {/* Capabilities */}
        <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
          <h2 className="text-xl font-bold text-text mb-4">Capabilities</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {COMMON_CAPABILITIES.map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => toggleCapability(cap)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  formData.capabilities.includes(cap)
                    ? 'bg-accent text-white'
                    : 'bg-surface-light text-text-muted hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={customCapability}
              onChange={(e) => setCustomCapability(e.target.value)}
              placeholder="Add custom capability..."
              className="flex-1 bg-surface-light border border-card-border rounded-xl px-4 py-2 text-text placeholder-text-muted focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCapability())}
            />
            <button
              type="button"
              onClick={addCustomCapability}
              className="px-4 py-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition font-medium"
            >
              Add
            </button>
          </div>
          
          {formData.capabilities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="bg-accent text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {cap}
                  <button
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl p-6 border border-card-border shadow-card">
          <h2 className="text-xl font-bold text-text mb-4">Pricing</h2>
          
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.isFree}
                onChange={() => handleChange('isFree', true)}
                className="w-4 h-4 text-accent"
              />
              <span className="font-medium text-text">Free</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.isFree}
                onChange={() => handleChange('isFree', false)}
                className="w-4 h-4 text-accent"
              />
              <span className="font-medium text-text">Paid per message</span>
            </label>
          </div>
          
          {!formData.isFree && (
            <div className="bg-surface-light rounded-xl p-4">
              <label className="block text-sm font-medium text-text mb-2">
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
                  className="flex-1"
                />
                <span className="font-bold text-accent min-w-[100px] text-right">
                  {formData.perMessage.toLocaleString()} NUDGE
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                ≈ ${(formData.perMessage / 100000).toFixed(4)} USD per message
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            A small listing fee ($0.10 USDC) is required to publish your agent.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-xl font-medium transition disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
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
    </div>
  );
}
