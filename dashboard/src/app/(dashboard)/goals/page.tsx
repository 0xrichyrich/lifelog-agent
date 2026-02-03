'use client';

import { useState } from 'react';
import { Target, Trophy, Flame, Plus } from 'lucide-react';
import GoalCard from '@/components/GoalCard';
import { mockGoals } from '@/lib/mock-data';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'all';

export default function GoalsPage() {
  const [filter, setFilter] = useState<TimeFilter>('all');
  
  const filteredGoals = filter === 'all' 
    ? mockGoals 
    : mockGoals.filter(g => g.type === filter);
  
  // Calculate stats
  const totalGoals = mockGoals.length;
  const completedToday = mockGoals.filter(g => (g.current / g.target) >= 1).length;
  const longestStreak = Math.max(...mockGoals.map(g => g.streak));
  const totalStreak = mockGoals.reduce((sum, g) => sum + g.streak, 0);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Goals</h1>
          <p className="text-text-muted">Track your progress and build streaks</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <Target className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold">{totalGoals}</p>
          <p className="text-sm text-text-muted">Active Goals</p>
        </div>
        <div className="card text-center">
          <Trophy className="w-8 h-8 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold">{completedToday}</p>
          <p className="text-sm text-text-muted">Completed Today</p>
        </div>
        <div className="card text-center">
          <Flame className="w-8 h-8 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold">{longestStreak}</p>
          <p className="text-sm text-text-muted">Longest Streak</p>
        </div>
        <div className="card text-center">
          <Flame className="w-8 h-8 text-danger mx-auto mb-2" />
          <p className="text-2xl font-bold">{totalStreak}</p>
          <p className="text-sm text-text-muted">Total Streak Days</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'daily', 'weekly', 'monthly'] as TimeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-surface text-text-muted hover:bg-surface-light'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Goal cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>

      {filteredGoals.length === 0 && (
        <div className="card text-center py-12">
          <Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No {filter} goals found</p>
        </div>
      )}
    </div>
  );
}
