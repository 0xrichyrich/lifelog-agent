'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';
import { 
  ProductivityChart, 
  CategoryPieChart, 
  WeeklyTrendChart, 
  HeatmapChart 
} from '@/components/Charts';
import { mockInsightData } from '@/lib/mock-data';

type TimeRange = '7d' | '30d' | '90d';

export default function InsightsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  
  // Calculate summary stats
  const avgFocusTime = Math.round(
    mockInsightData.dailyProductivity.reduce((sum, d) => sum + d.focusMinutes, 0) / 
    mockInsightData.dailyProductivity.length
  );
  
  const avgDistraction = Math.round(
    mockInsightData.dailyProductivity.reduce((sum, d) => sum + d.distractionMinutes, 0) / 
    mockInsightData.dailyProductivity.length
  );
  
  const productivityScore = Math.round(
    mockInsightData.weeklyTrends.reduce((sum, w) => sum + w.productivity, 0) / 
    mockInsightData.weeklyTrends.length
  );
  
  // Find best hour
  const bestHour = mockInsightData.hourlyHeatmap.reduce((best, curr) => 
    curr.value > best.value ? curr : best
  );

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Insights</h1>
          <p className="text-text-muted">Patterns and analytics from your life data</p>
        </div>
        
        {/* Time range selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-muted hover:bg-surface-light'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-success" />
            <span className="text-sm text-text-muted">Avg Focus/Day</span>
          </div>
          <p className="text-2xl font-bold">{Math.round(avgFocusTime / 60)}h {avgFocusTime % 60}m</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-danger" />
            <span className="text-sm text-text-muted">Avg Distractions</span>
          </div>
          <p className="text-2xl font-bold">{avgDistraction}m</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="text-sm text-text-muted">Productivity Score</span>
          </div>
          <p className="text-2xl font-bold">{productivityScore}%</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-warning" />
            <span className="text-sm text-text-muted">Peak Hour</span>
          </div>
          <p className="text-2xl font-bold">{bestHour.hour}:00</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ProductivityChart data={mockInsightData.dailyProductivity} />
        <CategoryPieChart data={mockInsightData.categoryBreakdown} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyTrendChart data={mockInsightData.weeklyTrends} />
        <HeatmapChart data={mockInsightData.hourlyHeatmap} />
      </div>
    </div>
  );
}
