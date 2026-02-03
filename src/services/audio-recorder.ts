import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import OpenAI from 'openai';
import { Config, MediaRecord } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';
import { MarkdownLogger } from '../storage/markdown-logger.js';

const execAsync = promisify(exec);

export class AudioRecorder {
  private config: Config;
  private db: LifeLogDatabase;
  private logger: MarkdownLogger;
  private audioDir: string;
  private openai: OpenAI | null = null;

  constructor(config: Config, db: LifeLogDatabase, logger: MarkdownLogger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.audioDir = config.recordings.audioDir;
    
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async record(durationMs: number): Promise<MediaRecord | null> {
    const timestamp = new Date().toISOString();
    const filename = `audio_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.m4a`;
    const filePath = path.join(this.audioDir, filename);
    const durationSec = Math.ceil(durationMs / 1000);

    try {
      console.log(`🎤 Recording audio for ${durationSec}s...`);
      
      // Use macOS built-in audio recording via afrecord or sox
      // Using macOS screencapture with audio or afrecord
      const command = `rec -q "${filePath}" trim 0 ${durationSec} 2>/dev/null || afrecord -d ${durationSec} -f 'm4af' "${filePath}" 2>/dev/null`;
      
      await execAsync(command, { timeout: durationMs + 10000 });

      if (fs.existsSync(filePath)) {
        const media: MediaRecord = {
          timestamp,
          type: 'audio',
          file_path: filePath,
        };

        const id = this.db.insertMedia(media);
        media.id = id;
        this.logger.logMedia(media);

        console.log(`✓ Audio recording saved: ${filename}`);
        return media;
      } else {
        console.warn('⚠️ Audio recording file not created');
        return null;
      }
    } catch (error) {
      console.error('❌ Audio recording failed:', error);
      return null;
    }
  }

  async transcribe(mediaId: number, filePath: string): Promise<string | null> {
    if (!this.openai) {
      console.warn('⚠️ OpenAI API key not configured for Whisper transcription');
      return null;
    }

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Audio file not found: ${filePath}`);
      return null;
    }

    try {
      console.log(`🎯 Transcribing audio: ${path.basename(filePath)}...`);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: this.config.whisper.model,
        response_format: 'text',
      });

      // Update media record with transcription
      const analysis = JSON.stringify({ transcription });
      this.db.updateMediaAnalysis(mediaId, analysis);

      console.log(`✓ Transcription complete`);
      return transcription;
    } catch (error) {
      console.error('❌ Whisper transcription failed:', error);
      return null;
    }
  }

  async recordAndTranscribe(durationMs: number): Promise<{ media: MediaRecord | null; transcription: string | null }> {
    const media = await this.record(durationMs);
    
    if (media && media.id) {
      const transcription = await this.transcribe(media.id, media.file_path);
      return { media, transcription };
    }

    return { media: null, transcription: null };
  }
}
