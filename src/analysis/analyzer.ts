/**
 * AI Analysis Pipeline
 * Uses Claude API for vision + text analysis of recorded data
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { 
  Config, 
  MediaRecord, 
  MediaAnalysis, 
  WorkspaceAnalysis, 
  AudioAnalysis,
  ActivityCategory 
} from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';

export class Analyzer {
  private config: Config;
  private db: LifeLogDatabase;
  private anthropic: Anthropic;
  private model: string;

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.model = config.analysis?.model || 'claude-sonnet-4-20250514';
    
    // Initialize Anthropic client (uses ANTHROPIC_API_KEY env var by default)
    this.anthropic = new Anthropic({
      apiKey: config.analysis?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analyze all media for a given date
   */
  async analyzeDate(date: string): Promise<{
    screenAnalyses: Array<{ id: number; analysis: MediaAnalysis }>;
    cameraAnalyses: Array<{ id: number; analysis: WorkspaceAnalysis }>;
    audioAnalyses: Array<{ id: number; analysis: AudioAnalysis }>;
  }> {
    console.log(`🔍 Analyzing data for ${date}...`);
    
    const media = this.db.getMediaByDate(date);
    
    const screenMedia = media.filter(m => m.type === 'screen');
    const cameraMedia = media.filter(m => m.type === 'camera');
    const audioMedia = media.filter(m => m.type === 'audio');

    console.log(`   Found: ${screenMedia.length} screens, ${cameraMedia.length} cameras, ${audioMedia.length} audio`);

    const screenAnalyses: Array<{ id: number; analysis: MediaAnalysis }> = [];
    const cameraAnalyses: Array<{ id: number; analysis: WorkspaceAnalysis }> = [];
    const audioAnalyses: Array<{ id: number; analysis: AudioAnalysis }> = [];

    // Analyze screen recordings/screenshots
    for (const m of screenMedia) {
      if (!m.analysis_json) {
        console.log(`   Analyzing screen: ${path.basename(m.file_path)}`);
        try {
          const analysis = await this.analyzeScreen(m);
          this.db.updateMediaAnalysis(m.id!, JSON.stringify(analysis));
          screenAnalyses.push({ id: m.id!, analysis });
        } catch (error) {
          console.error(`   ❌ Failed to analyze screen ${m.id}:`, error);
        }
      } else {
        screenAnalyses.push({ id: m.id!, analysis: JSON.parse(m.analysis_json) });
      }
    }

    // Analyze camera snapshots
    for (const m of cameraMedia) {
      if (!m.analysis_json) {
        console.log(`   Analyzing camera: ${path.basename(m.file_path)}`);
        try {
          const analysis = await this.analyzeCamera(m);
          this.db.updateMediaAnalysis(m.id!, JSON.stringify(analysis));
          cameraAnalyses.push({ id: m.id!, analysis });
        } catch (error) {
          console.error(`   ❌ Failed to analyze camera ${m.id}:`, error);
        }
      } else {
        cameraAnalyses.push({ id: m.id!, analysis: JSON.parse(m.analysis_json) });
      }
    }

    // Analyze audio recordings
    for (const m of audioMedia) {
      if (!m.analysis_json) {
        console.log(`   Analyzing audio: ${path.basename(m.file_path)}`);
        try {
          const analysis = await this.analyzeAudio(m);
          this.db.updateMediaAnalysis(m.id!, JSON.stringify(analysis));
          audioAnalyses.push({ id: m.id!, analysis });
        } catch (error) {
          console.error(`   ❌ Failed to analyze audio ${m.id}:`, error);
        }
      } else {
        audioAnalyses.push({ id: m.id!, analysis: JSON.parse(m.analysis_json) });
      }
    }

    console.log(`✅ Analysis complete for ${date}`);
    return { screenAnalyses, cameraAnalyses, audioAnalyses };
  }

  /**
   * Analyze a screen recording/screenshot for activity classification
   */
  async analyzeScreen(media: MediaRecord): Promise<MediaAnalysis> {
    const filePath = path.resolve(this.config.dataDir, '..', media.file_path);
    
    // Check if file exists and is an image (screenshots)
    if (!fs.existsSync(filePath)) {
      return this.createFallbackAnalysis('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    
    // For video files, we can't directly analyze with Claude vision
    // Return a placeholder analysis (future: extract frames)
    if (['.mp4', '.mov', '.webm'].includes(ext)) {
      return this.createFallbackAnalysis('Video file - frame extraction needed');
    }

    // For images, use Claude vision
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      const imageData = fs.readFileSync(filePath);
      const base64Image = imageData.toString('base64');
      const mediaType = ext === '.png' ? 'image/png' : 
                       ext === '.gif' ? 'image/gif' :
                       ext === '.webp' ? 'image/webp' : 'image/jpeg';

      try {
        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this screenshot and classify the activity. Respond with JSON only:
{
  "category": "coding" | "meetings" | "browsing" | "social" | "email" | "breaks" | "other",
  "confidence": 0.0-1.0,
  "description": "Brief description of what's happening",
  "applications": ["list of visible apps/windows"],
  "focusScore": 0-100 (how focused/productive this activity appears),
  "context": "Any additional context about the work being done"
}

Categories:
- coding: IDEs, terminals, code editors, documentation
- meetings: Video calls, Zoom, Meet, Teams, Slack huddles
- browsing: Web browsers with non-work content, research, reading
- social: Twitter, Discord, social media, messaging apps
- email: Email clients, Gmail, Outlook
- breaks: No activity, away, entertainment, games
- other: Anything else

Be concise. JSON only, no markdown.`
              }
            ],
          }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          try {
            // Clean up the response - remove any markdown formatting
            let jsonText = content.text.trim();
            if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }
            return JSON.parse(jsonText) as MediaAnalysis;
          } catch (parseError) {
            console.warn('Failed to parse Claude response:', content.text);
            return this.createFallbackAnalysis('Parse error');
          }
        }
      } catch (error: any) {
        console.error('Claude API error:', error?.message || error);
        return this.createFallbackAnalysis(`API error: ${error?.message}`);
      }
    }

    return this.createFallbackAnalysis('Unsupported file type');
  }

  /**
   * Analyze camera snapshot for workspace/posture analysis
   */
  async analyzeCamera(media: MediaRecord): Promise<WorkspaceAnalysis> {
    const filePath = path.resolve(this.config.dataDir, '..', media.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { environment: 'File not found' };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      return { environment: 'Unsupported file type' };
    }

    const imageData = fs.readFileSync(filePath);
    const base64Image = imageData.toString('base64');
    const mediaType = ext === '.png' ? 'image/png' : 
                     ext === '.gif' ? 'image/gif' :
                     ext === '.webp' ? 'image/webp' : 'image/jpeg';

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this camera image of a workspace/person. Respond with JSON only:
{
  "postureScore": 0-100 (if person visible, otherwise null),
  "workspaceQuality": 0-100 (organization, setup quality),
  "lighting": "good" | "moderate" | "poor",
  "distractions": ["list any visible distractions"],
  "environment": "Brief description of the workspace"
}

Focus on practical observations. JSON only, no markdown.`
            }
          ],
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          let jsonText = content.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          }
          return JSON.parse(jsonText) as WorkspaceAnalysis;
        } catch {
          return { environment: 'Parse error' };
        }
      }
    } catch (error: any) {
      return { environment: `API error: ${error?.message}` };
    }

    return { environment: 'Unknown' };
  }

  /**
   * Analyze audio recording (transcript + summary)
   * Note: Requires pre-transcribed text or Whisper integration
   */
  async analyzeAudio(media: MediaRecord): Promise<AudioAnalysis> {
    // For now, return a placeholder - audio analysis requires transcription first
    // Future: integrate with Whisper API for transcription
    return {
      summary: 'Audio analysis requires transcription integration',
      transcript: undefined,
      keyDecisions: [],
      actionItems: [],
    };
  }

  /**
   * Create a fallback analysis when actual analysis isn't possible
   */
  private createFallbackAnalysis(reason: string): MediaAnalysis {
    return {
      category: 'other',
      confidence: 0,
      description: reason,
      focusScore: 50,
    };
  }

  /**
   * Classify activity from text description (for check-ins, etc.)
   */
  async classifyText(text: string): Promise<ActivityCategory> {
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based classification for speed
    // Order matters - more specific patterns first
    if (/\b(code|coding|programming|debug|deploy|commit|git|terminal|ide|vscode|vim|neovim|develop|implement|refactor|pr|pull request|merge|feature|bug fix|deep work)\b/.test(lowerText)) {
      return 'coding';
    }
    if (/\b(meeting|call|zoom|huddle|sync|standup|1:1|interview|google meet|teams|conference|presentation)\b/.test(lowerText)) {
      return 'meetings';
    }
    if (/\b(email|inbox|reply|replying|sent|gmail|outlook|mail)\b/.test(lowerText)) {
      return 'email';
    }
    if (/\b(twitter|discord|slack|social|chat|dm|messaging|whatsapp|telegram|x\.com|reddit|hacker news|hn)\b/.test(lowerText)) {
      return 'social';
    }
    if (/\b(break|lunch|coffee|walk|rest|away|snack|stretch|nap|relax)\b/.test(lowerText)) {
      return 'breaks';
    }
    if (/\b(research|reading|browser|browsing|google|searching|documentation|docs|article|blog|youtube|video)\b/.test(lowerText)) {
      return 'browsing';
    }
    
    return 'other';
  }

  /**
   * Get time blocks from analyzed media for a date
   */
  async getTimeBlocks(date: string): Promise<Array<{
    timestamp: string;
    category: ActivityCategory;
    focusScore: number;
    description: string;
  }>> {
    const media = this.db.getMediaByDate(date);
    const blocks: Array<{
      timestamp: string;
      category: ActivityCategory;
      focusScore: number;
      description: string;
    }> = [];

    for (const m of media) {
      if (m.analysis_json) {
        try {
          const analysis = JSON.parse(m.analysis_json);
          blocks.push({
            timestamp: m.timestamp,
            category: analysis.category || 'other',
            focusScore: analysis.focusScore || 50,
            description: analysis.description || '',
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Also include check-ins classified by text
    const checkIns = this.db.getCheckInsByDate(date);
    for (const ci of checkIns) {
      const category = await this.classifyText(ci.message);
      blocks.push({
        timestamp: ci.timestamp,
        category,
        focusScore: 75, // Assume manual check-ins indicate focus
        description: ci.message,
      });
    }

    // Sort by timestamp
    blocks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return blocks;
  }
}
