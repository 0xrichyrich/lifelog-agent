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
        <span className="text-gray-400 ml-1">{rating.toFixed(1)}</span>
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
        <h1 className="text-3xl font-bold text-white mb-2">🤖 Wellness Agent Marketplace</h1>
        <p className="text-gray-400">
          Hire specialized AI agents to help you achieve your wellness goals.
          Powered by Virtuals Protocol ACP.
        </p>
      </div>

      {/* Wallet Balance */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <span className="text-gray-400 text-sm">ACP Wallet Balance</span>
          <p className="text-2xl font-bold text-green-400">${walletBalance} USDC</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
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
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition capitalize ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            {filteredAgents.length} Agent{filteredAgents.length !== 1 ? 's' : ''} Available
          </h2>
          
          {filteredAgents.map(agent => (
            <div
              key={agent.id}
              className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-purple-500 transition cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {getCategoryEmoji(agent.category)} {agent.name}
                  </h3>
                  <span className="text-sm text-gray-500 capitalize">{agent.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-400">${agent.priceUsd.toFixed(2)}</span>
                  <span className="text-gray-500 text-sm block">per task</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-3">{agent.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {renderStars(agent.rating)}
                  <span className="text-gray-500 text-sm">{agent.completedJobs} jobs</span>
                </div>
                <div className="flex gap-2">
                  {agent.capabilities.slice(0, 2).map(cap => (
                    <span key={cap} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
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
            <div className="bg-gray-800 rounded-lg p-5 border-2 border-purple-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">
                  Hire {selectedAgent.name}
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">{selectedAgent.description}</p>
              
              <textarea
                placeholder="Describe what you need help with..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 h-32 resize-none mb-4"
              />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Cost:</span>
                <span className="text-xl font-bold text-green-400">
                  ${selectedAgent.priceUsd.toFixed(2)} USDC
                </span>
              </div>
              
              <button
                onClick={() => handleHire(selectedAgent)}
                disabled={isHiring || !taskDescription.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
              >
                {isHiring ? '🔄 Creating Job...' : '🚀 Hire Agent'}
              </button>
            </div>
          )}

          {/* Job History */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-bold text-white mb-4">📋 Your Jobs</h3>
            
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No jobs yet. Hire an agent to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {WELLNESS_AGENTS.find(a => a.id === job.agentId)?.name || job.agentId}
                      </span>
                      <span className={`${getStatusColor(job.status)} text-white text-xs px-2 py-1 rounded`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">{job.taskDescription}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500 text-xs">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-green-400 text-sm">${job.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg p-5 border border-purple-600">
            <h3 className="text-lg font-bold text-white mb-2">💡 AI Recommendation</h3>
            <p className="text-purple-200 text-sm mb-3">
              Based on your patterns, you should consider hiring:
            </p>
            <div className="bg-black/30 rounded-lg p-3">
              <span className="font-bold text-white">💪 FitBot Pro</span>
              <p className="text-purple-200 text-sm mt-1">
                Your exercise consistency is at 40%. A personalized workout plan could help!
              </p>
            </div>
            <button
              onClick={() => setSelectedAgent(WELLNESS_AGENTS[0])}
              className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm transition"
            >
              View Recommendation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
