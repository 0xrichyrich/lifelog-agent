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
  return mockActivities.filter(a => a.timestamp.startsWith(date));
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
