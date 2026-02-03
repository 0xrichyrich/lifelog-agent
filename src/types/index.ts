// Core types for LifeLog Agent

export interface Config {
  dataDir: string;
  logsDir: string;
  database: string;
  summariesDir: string;
  recordings: {
    screenDir: string;
    snapshotDir: string;
    audioDir: string;
  };
  intervals: {
    screenRecordDurationMs: number;
    screenRecordIntervalMs: number;
    cameraSnapshotIntervalMs: number;
  };
  whisper: {
    model: string;
  };
  analysis: {
    anthropicApiKey?: string;
    model: string;
  };
}

// Activity categories for classification
export type ActivityCategory = 
  | 'coding' 
  | 'meetings' 
  | 'browsing' 
  | 'social' 
  | 'email' 
  | 'breaks' 
  | 'other';

// Analysis result for a single media item
export interface MediaAnalysis {
  category: ActivityCategory;
  confidence: number;
  description: string;
  applications?: string[];
  focusScore?: number; // 0-100, how focused the activity appears
  context?: string;
}

// Camera/workspace analysis
export interface WorkspaceAnalysis {
  postureScore?: number; // 0-100
  workspaceQuality?: number; // 0-100
  lighting?: 'good' | 'moderate' | 'poor';
  distractions?: string[];
  environment?: string;
}

// Audio/meeting analysis
export interface AudioAnalysis {
  transcript?: string;
  summary?: string;
  keyDecisions?: string[];
  actionItems?: string[];
  participants?: number;
  duration?: number;
}

// Time block for pattern detection
export interface TimeBlock {
  startTime: string;
  endTime: string;
  category: ActivityCategory;
  durationMinutes: number;
  focusScore?: number;
  isDeepWork: boolean;
}

// Daily patterns
export interface DailyPatterns {
  date: string;
  timeBlocks: TimeBlock[];
  categoryBreakdown: Record<ActivityCategory, number>; // minutes per category
  peakProductivityHours: string[]; // e.g., ["09:00-11:00", "14:00-16:00"]
  deepWorkSessions: number;
  deepWorkMinutes: number;
  contextSwitches: number;
  focusScore: number; // average across day
}

// Weekly/monthly trends
export interface TrendData {
  period: string;
  avgDailyFocusScore: number;
  avgDeepWorkMinutes: number;
  categoryTrends: Record<ActivityCategory, number>;
  productivityByDayOfWeek: Record<string, number>;
  productivityByHour: Record<number, number>;
  improvements: string[];
  concerns: string[];
}

// Daily summary content
export interface DailySummaryContent {
  date: string;
  generatedAt: string;
  
  // Time breakdown
  totalTrackedMinutes: number;
  categoryBreakdown: Record<ActivityCategory, number>;
  
  // Productivity metrics
  focusScore: number;
  deepWorkSessions: number;
  deepWorkMinutes: number;
  contextSwitches: number;
  
  // Insights
  peakProductivityHours: string[];
  insights: string[];
  recommendations: string[];
  
  // Comparison to previous day
  comparison?: {
    focusScoreChange: number;
    deepWorkChange: number;
    productivityChange: string;
  };
  
  // Check-ins
  checkIns: string[];
  
  // Goals (if any)
  goalsProgress?: Record<string, { target: number; actual: number; met: boolean }>;
}

export interface Activity {
  id?: number;
  timestamp: string;
  type: 'screen_record' | 'camera_snap' | 'audio_record' | 'session_start' | 'session_stop';
  duration?: number;
  metadata_json: string;
}

export interface CheckIn {
  id?: number;
  timestamp: string;
  message: string;
  source: 'cli' | 'api' | 'auto';
}

export interface MediaRecord {
  id?: number;
  timestamp: string;
  type: 'screen' | 'camera' | 'audio';
  file_path: string;
  analysis_json?: string;
}

export interface Summary {
  id?: number;
  date: string;
  content_json: string;
}

export interface SessionState {
  active: boolean;
  sessionName: string | null;
  startTime: string | null;
  screenRecordInterval?: NodeJS.Timeout;
  cameraSnapInterval?: NodeJS.Timeout;
}

export interface ExportData {
  date: string;
  activities: Activity[];
  checkIns: CheckIn[];
  media: MediaRecord[];
  summaries: Summary[];
}
