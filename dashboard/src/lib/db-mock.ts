// Mock database for Vercel deployment (serverless-compatible)
// Replace with Turso when ready

import { Activity, CheckIn, Goal } from './types';

// In-memory storage (resets on each serverless function invocation)
let mockCheckIns: CheckIn[] = [];
let mockActivities: Activity[] = [];
let mockGoals: Goal[] = [];

// Initialize with sample data
function initMockData() {
  if (mockCheckIns.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    mockCheckIns = [
      {
        id: 1,
        timestamp: `${today}T08:00:00Z`,
        message: 'Morning coffee and planning',
        source: 'api'
      },
      {
        id: 2,
        timestamp: `${today}T12:30:00Z`,
        message: 'Lunch break - walked outside',
        source: 'api'
      },
    ];
  }
}

export const db = {
  prepare: (sql: string) => ({
    run: (...params: any[]) => {
      initMockData();
      
      if (sql.includes('INSERT INTO check_ins')) {
        const id = mockCheckIns.length + 1;
        const [timestamp, message, source] = params;
        mockCheckIns.push({ id, timestamp, message, source });
        return { lastInsertRowid: id };
      }
      
      return { lastInsertRowid: 0 };
    },
    all: (...params: any[]) => {
      initMockData();
      
      if (sql.includes('FROM check_ins')) {
        return mockCheckIns;
      }
      if (sql.includes('FROM activities')) {
        return mockActivities;
      }
      if (sql.includes('FROM goals')) {
        return mockGoals;
      }
      
      return [];
    },
    get: (...params: any[]) => {
      initMockData();
      return mockCheckIns[0] || null;
    },
  }),
};

export function initializeDatabase() {
  initMockData();
}

export function getActivitiesByDate(date: string): Activity[] {
  initMockData();
  
  // Get native activities for this date
  const nativeActivities = mockActivities.filter(a => a.timestamp.startsWith(date));
  
  // Convert check-ins to activities (they're the primary data source)
  const checkInsForDate = mockCheckIns.filter(c => c.timestamp.startsWith(date));
  const checkInActivities: Activity[] = checkInsForDate.map(checkIn => ({
    id: checkIn.id,
    timestamp: checkIn.timestamp,
    type: 'break' as const, // Check-ins are logged breaks/moments
    duration: undefined,
    metadata_json: JSON.stringify({ 
      message: checkIn.message,
      source: checkIn.source,
      isCheckIn: true 
    }),
  }));
  
  // Combine and sort by timestamp (newest first)
  return [...nativeActivities, ...checkInActivities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCheckInsByDate(date: string): CheckIn[] {
  initMockData();
  return mockCheckIns.filter(c => c.timestamp.startsWith(date));
}

export function getStats() {
  initMockData();
  return {
    activities: mockActivities.length,
    checkIns: mockCheckIns.length,
    media: 0,
    summaries: 0,
  };
}

export function getRecentActivities(days: number = 7): Activity[] {
  initMockData();
  return mockActivities;
}

export function getSummaryByDate(date: string) {
  return undefined;
}

export function getMediaByDate(date: string) {
  return [];
}

export function exportAllData() {
  initMockData();
  return {
    exportedAt: new Date().toISOString(),
    activities: mockActivities,
    checkIns: mockCheckIns,
    media: [],
    summaries: [],
  };
}
