// Core types for LifeLog Agent

export interface Config {
  dataDir: string;
  logsDir: string;
  database: string;
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
