'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star, Sparkles, ArrowRight, Zap, Heart, Briefcase, Music } from 'lucide-react';

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
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const formatUsage = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🏪 Agent Marketplace</h1>
        <p className="text-gray-400">
          Discover AI agents to enhance your Nudge experience. From wellness coaches to productivity boosters.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search agents by name, description, or capability..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          {/* Featured Agents */}
          {featuredAgents.length > 0 && selectedCategory === 'all' && !searchQuery && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Featured Agents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-500/30 hover:border-purple-500 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{agent.icon}</span>
                        <div>
                          <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                          <span className="text-sm text-purple-300 capitalize">{agent.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {agent.isFree ? (
                          <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full">Free</span>
                        ) : (
                          <span className="text-lg font-bold text-green-400">{agent.price.toLocaleString()} NUDGE</span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 mb-4">{agent.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {renderStars(agent.rating)}
                        <span className="text-gray-500 text-sm">{formatUsage(agent.usageCount)} uses</span>
                      </div>
                      <Link
                        href={`/wellness?agent=${agent.id}`}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
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
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedCategory === 'all' ? 'All Agents' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Agents`}
              <span className="text-gray-500 font-normal ml-2">({agents.length})</span>
            </h2>
            
            {agents.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No agents found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(searchQuery || selectedCategory !== 'all' ? agents : regularAgents).map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-purple-500 transition group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{agent.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                          <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                            {getCategoryIcon(agent.category)} {agent.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <span key={cap} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {renderStars(agent.rating)}
                        <span className="text-xs text-gray-500 block mt-1">{formatUsage(agent.usageCount)} uses</span>
                      </div>
                      <div className="text-right">
                        {agent.isFree ? (
                          <span className="text-green-400 font-semibold">Free</span>
                        ) : (
                          <span className="text-green-400 font-semibold">{agent.price.toLocaleString()} NUDGE</span>
                        )}
                      </div>
                    </div>
                    
                    <Link
                      href={`/wellness?agent=${agent.id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-purple-600 text-white py-2 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      Try Agent <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Agent CTA */}
          <div className="mt-12 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-8 border border-purple-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">🛠️ Build Your Own Agent</h3>
                <p className="text-purple-200">
                  Have an idea for an AI agent? Submit your agent to the marketplace and earn NUDGE tokens.
                </p>
              </div>
              <Link
                href="https://github.com/0xrichyrich/nudge-agents-sdk"
                target="_blank"
                className="flex items-center gap-2 bg-white text-purple-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
              >
                Submit Your Agent <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
