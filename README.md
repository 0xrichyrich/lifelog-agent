# LifeLog Agent

Multimodal AI life coach that records, analyzes, and coaches you through your daily activities — with on-chain token rewards for hitting your goals.

**Status:** Phase 3 Complete (Coaching System)

## Features

- 📹 **Screen Recording** — Capture what you're working on
- 📷 **Camera Snapshots** — Periodic workspace photos
- 🎤 **Audio Recording** — With Whisper transcription
- 📝 **Manual Check-ins** — Log thoughts and activities
- 📊 **SQLite Storage** — All data stays local
- 📁 **Markdown Logs** — Human-readable daily logs
- 🤖 **AI Analysis** — Claude-powered activity classification
- 🎯 **Goal Tracking** — Daily, weekly, and streak goals
- 🏋️ **AI Coaching** — Morning briefings, evening reviews, weekly insights
- 🔔 **Smart Nudges** — Context-aware productivity reminders

## Installation

```bash
git clone https://github.com/0xrichyrich/lifelog-agent.git
cd lifelog-agent
npm install
npm run build
```

## CLI Usage

### Data Collection

```bash
# Start a recording session
lifelog start my-session

# Add a manual check-in
lifelog checkin "Working on feature X"

# Check status
lifelog status

# Stop session
lifelog stop

# Export day's data
lifelog export 2026-02-02
```

### AI Analysis

```bash
# Run AI analysis on a day's data
lifelog analyze 2026-02-02

# Generate/view daily summary
lifelog summary 2026-02-02

# Show productivity patterns over N days
lifelog patterns 7
```

### Goal Management

```bash
# List all goals
lifelog goals list

# List goals with progress
lifelog goals list --progress

# Add a daily goal (240 min = 4hrs deep work)
lifelog goals add "Deep Work 4hrs/day" --type daily --target 240

# Add a weekly goal (3 exercise sessions per week)
lifelog goals add "Exercise 3x/week" --type weekly --target 3

# Add a streak goal (check in every day)
lifelog goals add "Daily check-in" --type streak --target 1

# Add a category-specific goal
lifelog goals add "Coding 6hrs/day" --type daily --target 360 --category coding

# Show progress for a specific date
lifelog goals progress 2026-02-02

# Remove a goal
lifelog goals remove <goal-id>
```

### AI Coaching

```bash
# Generate morning briefing
lifelog coach briefing

# Generate evening review
lifelog coach review

# Generate weekly insights (best on Sundays)
lifelog coach weekly

# Check for nudges (used by heartbeat system)
lifelog coach nudge

# Setup automated cron jobs (8am briefing, 8pm review, Sunday insights)
lifelog coach setup-cron

# Remove cron jobs
lifelog coach teardown-cron

# Check cron job status
lifelog coach cron-status

# Generate heartbeat config for OpenClaw integration
lifelog coach heartbeat-config
```

## Configuration

Edit `config.json` to customize:

```json
{
  "dataDir": "./data",
  "logsDir": "./logs",
  "summariesDir": "./summaries",
  "database": "./data/lifelog.db",
  "recordings": {
    "screenDir": "./data/recordings",
    "snapshotDir": "./data/snapshots",
    "audioDir": "./data/audio"
  },
  "intervals": {
    "screenRecordDurationMs": 60000,
    "screenRecordIntervalMs": 300000,
    "cameraSnapshotIntervalMs": 300000
  },
  "whisper": {
    "model": "whisper-1"
  },
  "analysis": {
    "model": "claude-sonnet-4-20250514"
  }
}
```

### API Key Setup

For standalone CLI usage, set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

When running through OpenClaw's cron system, the key is automatically provided.

## Cron Job Schedule

The coaching system can run on autopilot:

| Job | Schedule | Description |
|-----|----------|-------------|
| Morning Briefing | 8:00 AM CST daily | Yesterday's summary + today's goals |
| Evening Review | 8:00 PM CST daily | Today's progress + goal status |
| Weekly Insights | 6:00 PM CST Sundays | Week-over-week trends + recommendations |

Setup with: `lifelog coach setup-cron`

## Heartbeat Integration

The nudge system integrates with OpenClaw's heartbeat polling (~30min intervals) to provide smart nudges:

- **Distraction alert**: >30min on social media/browsing
- **Break reminder**: >2hrs of deep work without a break
- **Goal at risk**: Daily goals <50% complete after 2pm
- **Streak warning**: Active streaks that haven't been hit today (after 5pm)

Rate limited to max 1 nudge per hour.

## Database Schema

- `activities` — Session events (start, stop, recordings)
- `check_ins` — Manual log entries
- `media` — Screen recordings, camera snapshots, audio files + AI analysis
- `summaries` — Daily AI-generated summaries

## Data Files

- `goals.json` — User's goals with streak tracking
- `scheduler-config.json` — Cron job IDs
- `nudge-state.json` — Nudge rate limiting state

## Dashboard UI

The dashboard provides a beautiful visualization of your life data:

```bash
cd dashboard
npm install
npm run dev
```

Then visit **http://localhost:3000**

### Pages

- **/** — Today's Timeline (hour-by-hour color-coded activity blocks)
- **/goals** — Goal progress with streaks and milestones
- **/insights** — Charts, heatmaps, and productivity analytics
- **/settings** — Configure goals, privacy, and export data

## Privacy

All data stays on your local machine. No cloud sync, no external servers.

## Roadmap

- [x] Phase 1: Foundation + Data Collection
- [x] Phase 2: AI Analysis Engine
- [x] Phase 3: Coaching System
- [x] Phase 4: Dashboard UI (in progress)
- [ ] Phase 5: $LIFE Token Integration
- [ ] Phase 6: Demo + Marketing

## License

MIT
