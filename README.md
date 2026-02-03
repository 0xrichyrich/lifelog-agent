# LifeLog Agent

Multimodal AI life coach that records, analyzes, and coaches you through your daily activities — with on-chain token rewards for hitting your goals.

**Status:** Phase 1 Complete (Foundation + Data Collection)

## Features

- 📹 **Screen Recording** — Capture what you're working on
- 📷 **Camera Snapshots** — Periodic workspace photos
- 🎤 **Audio Recording** — With Whisper transcription
- 📝 **Manual Check-ins** — Log thoughts and activities
- 📊 **SQLite Storage** — All data stays local
- 📁 **Markdown Logs** — Human-readable daily logs

## Installation

```bash
git clone https://github.com/0xrichyrich/lifelog-agent.git
cd lifelog-agent
npm install
npm run build
```

## CLI Usage

```bash
# Start a recording session
node dist/cli/index.js start my-session

# Add a manual check-in
node dist/cli/index.js checkin "Working on feature X"

# Check status
node dist/cli/index.js status

# Stop session
node dist/cli/index.js stop

# Export day's data
node dist/cli/index.js export 2026-02-02
```

## Configuration

Edit `config.json` to customize:

```json
{
  "dataDir": "./data",
  "logsDir": "./logs",
  "intervals": {
    "screenRecordDurationMs": 60000,
    "screenRecordIntervalMs": 300000,
    "cameraSnapshotIntervalMs": 300000
  }
}
```

## Database Schema

- `activities` — Session events (start, stop, recordings)
- `check_ins` — Manual log entries
- `media` — Screen recordings, camera snapshots, audio files
- `summaries` — Daily AI-generated summaries

## Requirements

- macOS (for screen/camera recording via OpenClaw)
- Node.js 20+
- OpenClaw with paired node
- OpenAI API key (for Whisper transcription)

## Privacy

All data stays on your local machine. No cloud sync, no external servers.

## Roadmap

- [x] Phase 1: Foundation + Data Collection
- [ ] Phase 2: AI Analysis Engine
- [ ] Phase 3: Coaching System
- [ ] Phase 4: Dashboard UI
- [ ] Phase 5: $LIFE Token Integration
- [ ] Phase 6: Demo + Marketing

## License

MIT
