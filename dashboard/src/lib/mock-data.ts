import { Activity, Goal, InsightData, Settings, ParsedActivity, TimeBlock } from './types';

// Helper to generate realistic timestamps for today
function todayAt(hour: number, minute: number = 0): string {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return now.toISOString();
}

// Mock activities for a realistic day
export const mockActivities: Activity[] = [
  // Morning coding session (deep work)
  { id: 1, timestamp: todayAt(8, 0), type: 'focus', duration: 7200, metadata_json: JSON.stringify({ app: 'VS Code', project: 'lifelog-agent', tags: ['coding', 'typescript'] }) },
  { id: 2, timestamp: todayAt(10, 0), type: 'break', duration: 900, metadata_json: JSON.stringify({ activity: 'coffee break' }) },
  // More coding
  { id: 3, timestamp: todayAt(10, 15), type: 'coding', duration: 5400, metadata_json: JSON.stringify({ app: 'VS Code', project: 'lifelog-agent', tags: ['coding', 'react'] }) },
  // Meeting
  { id: 4, timestamp: todayAt(11, 45), type: 'meeting', duration: 3600, metadata_json: JSON.stringify({ meeting: 'Team standup', participants: 4, platform: 'Zoom' }) },
  // Lunch break
  { id: 5, timestamp: todayAt(12, 45), type: 'break', duration: 2700, metadata_json: JSON.stringify({ activity: 'lunch' }) },
  // Email check (potential distraction)
  { id: 6, timestamp: todayAt(13, 30), type: 'email', duration: 1800, metadata_json: JSON.stringify({ app: 'Gmail', emails_processed: 12 }) },
  // Social media check (distraction)
  { id: 7, timestamp: todayAt(14, 0), type: 'social_media', duration: 900, metadata_json: JSON.stringify({ app: 'Twitter', scrolled: true }) },
  // Afternoon focus
  { id: 8, timestamp: todayAt(14, 15), type: 'focus', duration: 7200, metadata_json: JSON.stringify({ app: 'VS Code', project: 'dashboard', tags: ['coding', 'nextjs'] }) },
  // Another meeting
  { id: 9, timestamp: todayAt(16, 15), type: 'meeting', duration: 2700, metadata_json: JSON.stringify({ meeting: '1:1 with manager', platform: 'Google Meet' }) },
  // End of day coding
  { id: 10, timestamp: todayAt(17, 0), type: 'coding', duration: 3600, metadata_json: JSON.stringify({ app: 'VS Code', project: 'lifelog-agent', tags: ['testing'] }) },
];

// Mock goals
export const mockGoals: Goal[] = [
  {
    id: '1',
    name: '4 Hours Deep Work',
    description: 'Spend at least 4 hours in focused, uninterrupted work',
    type: 'daily',
    target: 240,
    unit: 'minutes',
    current: 180,
    streak: 7,
    category: 'Productivity',
    color: '#10b981',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Exercise Daily',
    description: 'Complete at least 30 minutes of physical activity',
    type: 'daily',
    target: 30,
    unit: 'minutes',
    current: 0,
    streak: 3,
    category: 'Health',
    color: '#3b82f6',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Read 20 Pages',
    description: 'Read at least 20 pages from a book',
    type: 'daily',
    target: 20,
    unit: 'pages',
    current: 20,
    streak: 12,
    category: 'Learning',
    color: '#f59e0b',
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: '4',
    name: 'Ship Weekly',
    description: 'Deploy at least one feature or project per week',
    type: 'weekly',
    target: 1,
    unit: 'features',
    current: 1,
    streak: 4,
    category: 'Productivity',
    color: '#8b5cf6',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Limit Social Media',
    description: 'Keep social media under 30 minutes per day',
    type: 'daily',
    target: 30,
    unit: 'minutes',
    current: 15,
    streak: 5,
    category: 'Focus',
    color: '#ef4444',
    createdAt: '2026-01-20T00:00:00Z',
  },
];

// Mock insight data
export const mockInsightData: InsightData = {
  dailyProductivity: [
    { date: 'Mon', focusMinutes: 240, distractionMinutes: 45 },
    { date: 'Tue', focusMinutes: 300, distractionMinutes: 30 },
    { date: 'Wed', focusMinutes: 180, distractionMinutes: 60 },
    { date: 'Thu', focusMinutes: 270, distractionMinutes: 25 },
    { date: 'Fri', focusMinutes: 210, distractionMinutes: 50 },
    { date: 'Sat', focusMinutes: 120, distractionMinutes: 90 },
    { date: 'Sun', focusMinutes: 60, distractionMinutes: 120 },
  ],
  categoryBreakdown: [
    { name: 'Deep Work', value: 420, color: '#10b981' },
    { name: 'Meetings', value: 105, color: '#f59e0b' },
    { name: 'Email', value: 60, color: '#3b82f6' },
    { name: 'Breaks', value: 90, color: '#6b7280' },
    { name: 'Distractions', value: 30, color: '#ef4444' },
  ],
  hourlyHeatmap: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    day: 'Today',
    value: hour >= 8 && hour <= 18 
      ? Math.floor(Math.random() * 60) + (hour >= 9 && hour <= 11 ? 40 : 20)
      : 0,
  })),
  weeklyTrends: [
    { week: 'W1', productivity: 75 },
    { week: 'W2', productivity: 82 },
    { week: 'W3', productivity: 78 },
    { week: 'W4', productivity: 88 },
  ],
};

// Mock settings
export const mockSettings: Settings = {
  nudgeFrequency: 'medium',
  collectScreenshots: true,
  collectAudio: true,
  collectCamera: false,
  autoSummarize: true,
};

// Helper to categorize activities
export function categorizeActivity(activity: Activity): ParsedActivity['category'] {
  switch (activity.type) {
    case 'focus':
    case 'coding':
      return 'focus';
    case 'meeting':
      return 'collaboration';
    case 'social_media':
      return 'distraction';
    case 'break':
      return 'break';
    case 'email':
      return 'collaboration'; // Can be either, defaulting to collab
    default:
      return 'break';
  }
}

// Parse activities into timeline blocks
export function parseActivitiesToBlocks(activities: Activity[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourActivities = activities.filter(a => {
      const actHour = new Date(a.timestamp).getHours();
      return actHour === hour;
    }).map(a => ({
      ...a,
      metadata: JSON.parse(a.metadata_json),
      category: categorizeActivity(a),
    })) as ParsedActivity[];
    
    const totalMinutes = hourActivities.reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
    
    // Determine dominant category
    let dominantCategory: TimeBlock['dominantCategory'] = 'idle';
    if (hourActivities.length > 0) {
      const categories = hourActivities.map(a => a.category);
      const counts = categories.reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      dominantCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as TimeBlock['dominantCategory'];
    }
    
    blocks.push({
      hour,
      activities: hourActivities,
      dominantCategory,
      totalMinutes: Math.min(totalMinutes, 60),
    });
  }
  
  return blocks;
}

// Get color for category
export function getCategoryColor(category: TimeBlock['dominantCategory']): string {
  switch (category) {
    case 'focus':
      return 'bg-success';
    case 'collaboration':
      return 'bg-warning';
    case 'distraction':
      return 'bg-danger';
    case 'break':
      return 'bg-gray-500';
    case 'idle':
    default:
      return 'bg-gray-700';
  }
}
