// Types matching the Phase 1 SQLite schema

export interface Activity {
  id: number;
  timestamp: string;
  type: 'screen_record' | 'camera_snap' | 'audio_record' | 'session_start' | 'session_stop' | 'coding' | 'meeting' | 'email' | 'social_media' | 'break' | 'focus';
  duration?: number;
  metadata_json: string;
}

export interface ParsedActivity extends Omit<Activity, 'metadata_json'> {
  metadata: Record<string, unknown>;
  category: 'focus' | 'collaboration' | 'distraction' | 'break';
}

export interface CheckIn {
  id: number;
  timestamp: string;
  message: string;
  source: 'cli' | 'api' | 'auto';
}

export interface MediaRecord {
  id: number;
  timestamp: string;
  type: 'screen' | 'camera' | 'audio';
  file_path: string;
  analysis_json?: string;
}

export interface Summary {
  id: number;
  date: string;
  content_json: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  unit: string;
  current: number;
  streak: number;
  category: string;
  color: string;
  createdAt: string;
}

export interface TimeBlock {
  hour: number;
  activities: ParsedActivity[];
  dominantCategory: 'focus' | 'collaboration' | 'distraction' | 'break' | 'idle';
  totalMinutes: number;
}

export interface InsightData {
  dailyProductivity: { date: string; focusMinutes: number; distractionMinutes: number }[];
  categoryBreakdown: { name: string; value: number; color: string }[];
  hourlyHeatmap: { hour: number; day: string; value: number }[];
  weeklyTrends: { week: string; productivity: number }[];
}

export interface Settings {
  nudgeFrequency: 'off' | 'low' | 'medium' | 'high';
  collectScreenshots: boolean;
  collectAudio: boolean;
  collectCamera: boolean;
  autoSummarize: boolean;
}
