// LifeLog Agent - Main Entry Point
export { LifeLogDatabase } from './storage/database.js';
export { MarkdownLogger } from './storage/markdown-logger.js';
export { SessionManager } from './services/session-manager.js';
export { ScreenRecorder } from './services/screen-recorder.js';
export { CameraSnapshot } from './services/camera-snapshot.js';
export { AudioRecorder } from './services/audio-recorder.js';
export { CheckInHandler } from './services/checkin-handler.js';
export { Exporter } from './services/exporter.js';
export { XPService, XPActivity, XP_REWARDS } from './services/xp.js';
export * from './types/index.js';
