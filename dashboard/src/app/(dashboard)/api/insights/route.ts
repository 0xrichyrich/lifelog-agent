import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities } from '@/lib/db-mock';
import { mockInsightData, categorizeActivity } from '@/lib/mock-data';
import { Activity, InsightData } from '@/lib/types';

function generateInsights(activities: Activity[]): InsightData {
  // Group activities by date
  const byDate: Record<string, Activity[]> = {};
  activities.forEach(a => {
    const date = a.timestamp.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(a);
  });
  
  // Calculate daily productivity
  const dailyProductivity = Object.entries(byDate).map(([date, acts]) => {
    const focusMinutes = acts
      .filter(a => categorizeActivity(a) === 'focus')
      .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
    const distractionMinutes = acts
      .filter(a => categorizeActivity(a) === 'distraction')
      .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      focusMinutes: Math.round(focusMinutes),
      distractionMinutes: Math.round(distractionMinutes),
    };
  });
  
  // Calculate category breakdown
  const categories: Record<string, number> = {
    'Deep Work': 0,
    'Meetings': 0,
    'Email': 0,
    'Breaks': 0,
    'Distractions': 0,
  };
  
  activities.forEach(a => {
    const duration = (a.duration || 0) / 60;
    switch (a.type) {
      case 'focus':
      case 'coding':
        categories['Deep Work'] += duration;
        break;
      case 'meeting':
        categories['Meetings'] += duration;
        break;
      case 'email':
        categories['Email'] += duration;
        break;
      case 'break':
        categories['Breaks'] += duration;
        break;
      case 'social_media':
        categories['Distractions'] += duration;
        break;
    }
  });
  
  const categoryBreakdown = [
    { name: 'Deep Work', value: Math.round(categories['Deep Work']), color: '#10b981' },
    { name: 'Meetings', value: Math.round(categories['Meetings']), color: '#f59e0b' },
    { name: 'Email', value: Math.round(categories['Email']), color: '#3b82f6' },
    { name: 'Breaks', value: Math.round(categories['Breaks']), color: '#6b7280' },
    { name: 'Distractions', value: Math.round(categories['Distractions']), color: '#ef4444' },
  ].filter(c => c.value > 0);
  
  // Generate hourly heatmap
  const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
    const hourActivities = activities.filter(a => new Date(a.timestamp).getHours() === hour);
    const value = hourActivities.reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
    return { hour, day: 'Today', value: Math.round(value) };
  });
  
  // Weekly trends (simplified)
  const weeklyTrends = [
    { week: 'W1', productivity: 75 },
    { week: 'W2', productivity: 82 },
    { week: 'W3', productivity: 78 },
    { week: 'W4', productivity: 88 },
  ];
  
  return {
    dailyProductivity,
    categoryBreakdown,
    hourlyHeatmap,
    weeklyTrends,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '7', 10);
  
  try {
    const activities = getRecentActivities(days);
    
    if (activities.length === 0) {
      return NextResponse.json({
        days,
        insights: mockInsightData,
        source: 'mock',
      });
    }
    
    const insights = generateInsights(activities);
    
    return NextResponse.json({
      days,
      insights,
      source: 'database',
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return NextResponse.json({
      days,
      insights: mockInsightData,
      source: 'mock',
      error: 'Database unavailable',
    });
  }
}
