'use client';

import { Goal } from '@/lib/types';
import { Trophy, Flame, Target } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  const isComplete = progress >= 100;
  
  return (
    <div className="card hover:border-accent/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            <Target className="w-5 h-5" style={{ color: goal.color }} />
          </div>
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            <p className="text-sm text-text-muted">{goal.description}</p>
          </div>
        </div>
        
        {isComplete && (
          <div className="flex items-center gap-1 text-success bg-success/20 px-2 py-1 rounded-full">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-medium">Done!</span>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-muted">
            {goal.current} / {goal.target} {goal.unit}
          </span>
          <span className="font-medium" style={{ color: goal.color }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-warning">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-medium">{goal.streak} day streak</span>
        </div>
        <span className="text-xs text-text-muted capitalize px-2 py-1 bg-surface-light rounded">
          {goal.type}
        </span>
      </div>
    </div>
  );
}
