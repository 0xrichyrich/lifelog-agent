'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star, Sparkles, ArrowRight, Zap, Heart, Briefcase, Music, Users, Plus } from 'lucide-react';

interface MarketplaceAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'wellness' | 'productivity' | 'lifestyle' | 'entertainment';
  price: number;
  isFree: boolean;
  rating: number;
  totalRatings: number;
  usageCount: number;
  featured: boolean;
  triggers: string[];
  capabilities: string[];
  // Community agent fields
  isCommunity?: boolean;
  creatorWallet?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All Agents', icon: Sparkles },
  { id: 'wellness', label: 'Wellness', icon: Heart },
  { id: 'productivity', label: 'Productivity', icon: Briefcase },
  { id: 'lifestyle', label: 'Lifestyle', icon: Zap },
  { id: 'entertainment', label: 'Entertainment', icon: Music },
];

export default function MarketplacePage() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, [selectedCategory, searchQuery]);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      
      const res = await fetch(`/api/marketplace/agents?${params}`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const featuredAgents = agents.filter(a => a.featured);
  const regularAgents = agents.filter(a => !a.featured);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      wellness: '🧘',
      productivity: '⚡',
      lifestyle: '☕',
      entertainment: '🎮',
    };
    return icons[category] || '🤖';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              star <= Math.round(rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200'
            }`}
          />
        ))}
        <span className="text-xs sm:text-sm text-text-muted ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const formatUsage = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const truncateWallet = (wallet: string) => {
    if (!wallet) return '';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">🏪 Agent Marketplace</h1>
            <p className="text-sm sm:text-base text-text-muted">
              Discover AI agents to enhance your Nudge experience. From wellness coaches to productivity boosters.
            </p>
          </div>
          <Link
            href="/submit-agent"
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark active:bg-accent-dark text-white px-5 py-3 rounded-xl font-medium transition shadow-md whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Submit Agent
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-card-border rounded-xl pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-base text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition shadow-card"
        />
      </div>

      {/* Category Filters - Horizontal scroll on mobile */}
      <div className="mb-6 sm:mb-8 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg transition font-medium whitespace-nowrap flex-shrink-0 min-h-[44px] sm:min-h-0 ${
                  selectedCategory === cat.id
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-white text-text-muted border border-card-border hover:border-accent hover:text-accent active:bg-gray-50 shadow-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm sm:text-base">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 sm:py-20">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <>
          {/* Featured Agents */}
          {featuredAgents.length > 0 && selectedCategory === 'all' && !searchQuery && (
            <div className="mb-8 sm:mb-10">
              <h2 className="text-lg sm:text-xl font-bold text-text mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Featured Agents
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {featuredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-gradient-to-br from-accent/10 to-emerald-50 rounded-xl p-4 sm:p-6 border border-accent/30 hover:border-accent hover:shadow-card-hover transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl">{agent.icon}</span>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-text">{agent.name}</h3>
                          <span className="text-sm text-accent font-medium capitalize">{agent.category}</span>
                        </div>
                      </div>
                      <div className="self-start">
                        {agent.isFree ? (
                          <span className="bg-accent text-white text-sm px-3 py-1 rounded-full font-medium">Free</span>
                        ) : (
                          <span className="text-base sm:text-lg font-bold text-accent">{agent.price.toLocaleString()} NUDGE</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-text-muted mb-4">{agent.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {renderStars(agent.rating)}
                        <span className="text-text-muted text-xs sm:text-sm">{formatUsage(agent.usageCount)} uses</span>
                      </div>
                      <Link
                        href={`/wellness?agent=${agent.id}`}
                        className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark active:bg-accent-dark text-white px-4 py-2.5 rounded-lg transition font-medium min-h-[44px]"
                      >
                        Try Agent <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Agents Grid */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text mb-4">
              {selectedCategory === 'all' ? 'All Agents' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Agents`}
              <span className="text-text-muted font-normal ml-2">({agents.length})</span>
            </h2>
            
            {agents.length === 0 ? (
              <div className="text-center py-16 sm:py-20">
                <p className="text-text-muted text-base sm:text-lg">No agents found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(searchQuery || selectedCategory !== 'all' ? agents : regularAgents).map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-white rounded-xl p-4 sm:p-5 border border-card-border hover:border-accent hover:shadow-card-hover transition group shadow-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl">{agent.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-text truncate">{agent.name}</h3>
                            {agent.isCommunity && (
                              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                <Users className="w-3 h-3" />
                                Community
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted capitalize flex items-center gap-1">
                            {getCategoryIcon(agent.category)} {agent.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-text-muted text-sm mb-4 line-clamp-2">{agent.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <span key={cap} className="bg-accent-light text-accent-dark text-xs px-2 py-1 rounded font-medium">
                          {cap}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {renderStars(agent.rating)}
                        <span className="text-xs text-text-muted block mt-1">{formatUsage(agent.usageCount)} uses</span>
                      </div>
                      <div className="text-right">
                        {agent.isFree ? (
                          <span className="text-accent font-semibold">Free</span>
                        ) : (
                          <span className="text-accent font-semibold text-sm sm:text-base">{agent.price.toLocaleString()} NUDGE</span>
                        )}
                      </div>
                    </div>

                    {/* Show creator wallet for community agents */}
                    {agent.isCommunity && agent.creatorWallet && (
                      <div className="mt-3 pt-3 border-t border-card-border">
                        <span className="text-xs text-text-muted">
                          Created by <code className="bg-surface-light px-1.5 py-0.5 rounded text-xs">{truncateWallet(agent.creatorWallet)}</code>
                        </span>
                      </div>
                    )}
                    
                    {/* Always visible on mobile, hover on desktop */}
                    <Link
                      href={`/wellness?agent=${agent.id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-surface-light hover:bg-accent hover:text-white active:bg-accent active:text-white text-text py-2.5 rounded-lg transition font-medium sm:opacity-0 sm:group-hover:opacity-100 min-h-[44px]"
                    >
                      Try Agent <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Agent CTA */}
          <div className="mt-10 sm:mt-12 bg-gradient-to-r from-accent to-emerald-500 rounded-xl p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:gap-6 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">🛠️ Build Your Own Agent</h3>
                <p className="text-emerald-100 text-sm sm:text-base">
                  Have an idea for an AI agent? Submit your agent to the marketplace and earn NUDGE tokens when others use it.
                </p>
              </div>
              <Link
                href="/submit-agent"
                className="flex items-center justify-center gap-2 bg-white text-accent font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition whitespace-nowrap shadow-md min-h-[48px] w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                Submit Your Agent
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
