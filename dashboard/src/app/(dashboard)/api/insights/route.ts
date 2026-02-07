import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities, initializeDatabase } from '@/lib/db-turso';
import { categorizeActivity } from '@/lib/mock-data';
import { Activity, InsightData } from '@/lib/types';
import { validatePositiveInt } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';

// Initialize database tables on cold start
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    try {
      await initializeDatabase();
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}

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
  // Rate limiting
  const rateLimitError = await checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) return rateLimitError;
  
  const searchParams = request.nextUrl.searchParams;
  
  // Validate days parameter
  const daysResult = validatePositiveInt(searchParams.get('days'), {
    min: 1,
    max: 90,
    defaultValue: 7
  });
  if (!daysResult.valid) {
    return NextResponse.json(
      { error: daysResult.error },
      { status: 400 }
    );
  }
  
  try {
    await ensureInitialized();
    
    const activities = await getRecentActivities(daysResult.value!);
    
    const insights = activities.length > 0 
      ? generateInsights(activities)
      : {
          dailyProductivity: [],
          categoryBreakdown: [],
          hourlyHeatmap: [],
          weeklyTrends: [],
        };
    
    const response = NextResponse.json({
      days: daysResult.value,
      insights,
      source: activities.length > 0 ? 'database' : 'empty',
    });
    return addRateLimitHeaders(response, RATE_LIMITS.read, request);
  } catch (error) {
    // Log the actual error server-side
    console.error('Failed to generate insights:', error);
    
    // Return generic error to client (don't leak internal details)
    return NextResponse.json({
      days: daysResult.value,
      insights: {
        dailyProductivity: [],
        categoryBreakdown: [],
        hourlyHeatmap: [],
        weeklyTrends: [],
      },
      source: 'error',
      error: 'Service temporarily unavailable',
    });
  }
}
