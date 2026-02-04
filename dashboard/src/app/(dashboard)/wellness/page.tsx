'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: number;
  rating: number;
  completedJobs: number;
  capabilities: string[];
}

interface Job {
  id: string;
  agentId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  taskDescription: string;
  result?: string;
  createdAt: string;
  cost: number;
}

// Mock wellness agents (same as in ACP client)
const WELLNESS_AGENTS: Agent[] = [
  {
    id: "fitbot-pro",
    name: "FitBot Pro",
    description: "AI personal trainer that creates personalized workout plans based on your goals and fitness level",
    category: "fitness",
    priceUsd: 0.50,
    rating: 4.8,
    completedJobs: 1247,
    capabilities: ["workout_planning", "form_analysis", "progress_tracking"],
  },
  {
    id: "nutriai",
    name: "NutriAI",
    description: "Nutrition analyzer and meal planner. Analyzes your diet and suggests improvements",
    category: "nutrition",
    priceUsd: 0.30,
    rating: 4.6,
    completedJobs: 892,
    capabilities: ["meal_planning", "calorie_tracking", "macro_optimization"],
  },
  {
    id: "zenmaster",
    name: "ZenMaster",
    description: "Meditation guide and stress management coach. Personalized mindfulness sessions",
    category: "meditation",
    priceUsd: 0.25,
    rating: 4.9,
    completedJobs: 2103,
    capabilities: ["guided_meditation", "breathing_exercises", "sleep_improvement"],
  },
  {
    id: "sleepwise",
    name: "SleepWise",
    description: "Sleep optimization agent. Analyzes your sleep patterns and provides actionable advice",
    category: "sleep",
    priceUsd: 0.35,
    rating: 4.7,
    completedJobs: 654,
    capabilities: ["sleep_analysis", "routine_optimization", "environment_tips"],
  },
  {
    id: "habit-forge",
    name: "HabitForge",
    description: "Habit formation specialist. Uses behavioral science to help you build lasting habits",
    category: "productivity",
    priceUsd: 0.40,
    rating: 4.5,
    completedJobs: 431,
    capabilities: ["habit_tracking", "streak_analysis", "behavior_design"],
  },
];

const CATEGORIES = ['all', 'fitness', 'nutrition', 'meditation', 'sleep', 'productivity'];

export default function WellnessPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isHiring, setIsHiring] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0.00');

  // Filter agents based on search and category
  const filteredAgents = WELLNESS_AGENTS.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.capabilities.some(c => c.includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleHire = async (agent: Agent) => {
    if (!taskDescription.trim()) {
      alert('Please describe the task for the agent');
      return;
    }

    setIsHiring(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newJob: Job = {
      id: `job-${Date.now()}`,
      agentId: agent.id,
      status: 'pending',
      taskDescription,
      createdAt: new Date().toISOString(),
      cost: agent.priceUsd,
    };
    
    setJobs([newJob, ...jobs]);
    setSelectedAgent(null);
    setTaskDescription('');
    setIsHiring(false);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    return (
      <span className="text-yellow-400">
        {'★'.repeat(fullStars)}
        {hasHalf && '☆'}
        <span className="text-text-muted ml-1">{rating.toFixed(1)}</span>
      </span>
    );
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      fitness: '💪',
      nutrition: '🥗',
      meditation: '🧘',
      sleep: '😴',
      productivity: '⚡',
    };
    return emojis[category] || '🤖';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      accepted: 'bg-blue-500',
      in_progress: 'bg-purple-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">🤖 Wellness Agents</h1>
        <p className="text-text-muted">
          Hire specialized AI agents to help you achieve your wellness goals.
        </p>
      </div>

      {/* Wallet Balance */}
      <div className="bg-white rounded-xl p-4 mb-6 flex items-center justify-between border border-card-border shadow-card">
        <div>
          <span className="text-text-muted text-sm">Wallet Balance</span>
          <p className="text-2xl font-bold text-accent">${walletBalance} USDC</p>
        </div>
        <button className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg transition">
          Add Funds
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search agents (e.g., fitness coach, meal planning...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl transition capitalize ${
                selectedCategory === category
                  ? 'bg-accent text-white'
                  : 'bg-white text-text-muted hover:bg-surface-light border border-card-border'
              }`}
            >
              {category === 'all' ? '🌟 All' : `${getCategoryEmoji(category)} ${category}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-text mb-4">
            {filteredAgents.length} Agent{filteredAgents.length !== 1 ? 's' : ''} Available
          </h2>
          
          {filteredAgents.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-xl p-5 border border-card-border hover:border-accent transition cursor-pointer shadow-card"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-text">
                    {getCategoryEmoji(agent.category)} {agent.name}
                  </h3>
                  <span className="text-sm text-text-muted capitalize">{agent.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-accent">${agent.priceUsd.toFixed(2)}</span>
                  <span className="text-text-muted text-sm block">per task</span>
                </div>
              </div>
              
              <p className="text-text-muted mb-3">{agent.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {renderStars(agent.rating)}
                  <span className="text-text-muted text-sm">{agent.completedJobs} jobs</span>
                </div>
                <div className="flex gap-2">
                  {agent.capabilities.slice(0, 2).map(cap => (
                    <span key={cap} className="bg-surface-light text-text-muted px-2 py-1 rounded-lg text-xs">
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar - Job History & Hire Modal */}
        <div className="space-y-6">
          {/* Hire Modal */}
          {selectedAgent && (
            <div className="bg-white rounded-xl p-5 border-2 border-accent shadow-card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-text">
                  Hire {selectedAgent.name}
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-text-muted hover:text-text"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-text-muted text-sm mb-4">{selectedAgent.description}</p>
              
              <textarea
                placeholder="Describe what you need help with..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full bg-surface-light border border-card-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-accent h-32 resize-none mb-4"
              />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-text-muted">Cost:</span>
                <span className="text-xl font-bold text-accent">
                  ${selectedAgent.priceUsd.toFixed(2)} USDC
                </span>
              </div>
              
              <button
                onClick={() => handleHire(selectedAgent)}
                disabled={isHiring || !taskDescription.trim()}
                className="w-full bg-accent hover:bg-accent-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition"
              >
                {isHiring ? '🔄 Creating Job...' : '🚀 Hire Agent'}
              </button>
            </div>
          )}

          {/* Job History */}
          <div className="bg-white rounded-xl p-5 border border-card-border shadow-card">
            <h3 className="text-lg font-bold text-text mb-4">📋 Your Jobs</h3>
            
            {jobs.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No jobs yet. Hire an agent to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="bg-surface-light rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text">
                        {WELLNESS_AGENTS.find(a => a.id === job.agentId)?.name || job.agentId}
                      </span>
                      <span className={`${getStatusColor(job.status)} text-white text-xs px-2 py-1 rounded-lg`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-text-muted text-sm truncate">{job.taskDescription}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-text-muted text-xs">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-accent text-sm">${job.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          <div className="bg-gradient-to-br from-accent-light to-emerald-100 rounded-xl p-5 border border-accent/30">
            <h3 className="text-lg font-bold text-text mb-2">💡 AI Recommendation</h3>
            <p className="text-text-muted text-sm mb-3">
              Based on your patterns, you should consider hiring:
            </p>
            <div className="bg-white/60 rounded-xl p-3">
              <span className="font-bold text-text">💪 FitBot Pro</span>
              <p className="text-text-muted text-sm mt-1">
                Your exercise consistency is at 40%. A personalized workout plan could help!
              </p>
            </div>
            <button
              onClick={() => setSelectedAgent(WELLNESS_AGENTS[0])}
              className="w-full mt-3 bg-accent hover:bg-accent-dark text-white py-2 rounded-xl text-sm transition"
            >
              View Recommendation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
