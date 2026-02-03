# @lifelog/sdk

Add wellness tracking and habit logging to any app. Earn $LIFE tokens for hitting your goals.

## Installation

```bash
npm install @lifelog/sdk
# or
yarn add @lifelog/sdk
# or
pnpm add @lifelog/sdk
```

## Quick Start

```typescript
import { LifeLog } from '@lifelog/sdk';

const lifelog = new LifeLog({
  apiKey: process.env.LIFELOG_API_KEY, // Optional - works in local-only mode too
  localOnly: true, // Default: store data locally
});

// Log what you're doing
await lifelog.checkIn({
  message: "Deep work session on smart contracts",
  category: "coding",
  duration: 45,
  mood: 4,
});

// Track goal progress
const result = await lifelog.trackGoal({
  name: "Code 4 hours today",
  progress: 180,  // 3 hours done
  total: 240,     // 4 hour target
  unit: "minutes"
});

if (result.completed) {
  console.log(`🎉 Goal completed! Earned ${result.reward} $LIFE`);
}

// Log achievements
await lifelog.logActivity({
  type: 'achievement',
  name: 'First Commit',
  points: 50
});

// Get your streaks
const streaks = await lifelog.getStreaks();
console.log(`🔥 Coding streak: ${streaks[0]?.current} days`);
```

## Use Cases

### Productivity Apps
```typescript
// Track task completion
await lifelog.checkIn({
  message: `Completed task: ${task.title}`,
  category: "productivity"
});

// Track Pomodoro sessions
await lifelog.logActivity({
  type: 'end_session',
  name: 'pomodoro',
  duration: 25
});
```

### Gaming Apps
```typescript
// Log in-game achievements
await lifelog.logActivity({
  type: 'achievement',
  name: 'Reached Level 10',
  points: 100,
  metadata: { game: 'your-game', level: 10 }
});

// Track play sessions
await lifelog.checkIn({
  message: "Gaming session",
  category: "gaming",
  duration: 60
});
```

### DeFi / Trading
```typescript
// Trading journal
await lifelog.checkIn({
  message: `Trade: ${action} ${amount} ${token}`,
  category: "trading",
  metadata: {
    action,
    amount,
    token,
    pnl: profitLoss
  }
});

// Track trading goals
await lifelog.trackGoal({
  name: "Research 3 tokens today",
  progress: tokensResearched,
  total: 3
});
```

### Fitness / Health
```typescript
// Log workouts
await lifelog.checkIn({
  message: "Morning run",
  category: "exercise",
  duration: 30,
  energy: 5
});

// Track fitness goals
await lifelog.trackGoal({
  name: "Exercise 4x this week",
  progress: workoutsThisWeek,
  total: 4
});
```

## API Reference

### `new LifeLog(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | `undefined` | Your LifeLog API key |
| `baseUrl` | string | `https://api.lifelog.app` | Custom API endpoint |
| `debug` | boolean | `false` | Enable console logging |
| `localOnly` | boolean | `true` | Store data locally only |

### `checkIn(options)`

Log what you're currently doing.

```typescript
await lifelog.checkIn({
  message: "Working on feature",  // Required
  category: "coding",             // Optional
  duration: 30,                   // Optional (minutes)
  mood: 4,                        // Optional (1-5)
  energy: 3,                      // Optional (1-5)
  metadata: { key: "value" }      // Optional
});
```

### `trackGoal(options)`

Track progress toward a goal.

```typescript
const result = await lifelog.trackGoal({
  name: "Deep work 4hrs",   // Required
  progress: 180,            // Required
  total: 240,               // Required
  unit: "minutes",          // Optional
  category: "work"          // Optional
});

// Returns: { success: boolean, completed: boolean, reward?: number }
```

### `logActivity(options)`

Log an activity event.

```typescript
await lifelog.logActivity({
  type: 'achievement',      // 'start_session' | 'end_session' | 'achievement' | 'milestone' | 'custom'
  name: "First PR Merged",  // Required
  duration: 30,             // Optional (for end_session)
  points: 50,               // Optional (for achievements)
  metadata: {}              // Optional
});

// Returns: { success: boolean, lifeEarned?: number }
```

### `getStreaks()`

Get current streak information.

```typescript
const streaks = await lifelog.getStreaks();
// Returns: StreakInfo[]
// { name: string, current: number, longest: number, lastActivity: string }
```

### `getTokenBalance(walletAddress?)`

Get $LIFE token balance.

```typescript
const balance = await lifelog.getTokenBalance('0x...');
// Returns: { balance: number, unclaimed: number, totalEarned: number }
```

### `getDailyInsight(date?)`

Get AI-generated daily insight.

```typescript
const insight = await lifelog.getDailyInsight('2026-02-02');
// Returns: InsightSummary or null
```

### `exportLocalData()`

Export all locally stored data.

```typescript
const data = lifelog.exportLocalData();
// Save to file or sync to server
```

## $LIFE Token Rewards

| Action | Reward |
|--------|--------|
| Complete daily goal | 100 $LIFE |
| Complete weekly goal | 500 $LIFE |
| Achievement unlocked | 50+ $LIFE |
| Milestone reached | 200 $LIFE |
| Streak bonus | 50 $LIFE/day |

## Quick Functions

For simple use cases, use the convenience functions:

```typescript
import { checkIn, trackGoal, logAchievement } from '@lifelog/sdk';

await checkIn("Working on project", "coding");
const completed = await trackGoal("Code 4 hours", 240, 240);
await logAchievement("First Commit", 50);
```

## Hackathon Note 🏆

This SDK is part of the LifeLog Agent project for the Solana Agent Hackathon. If you integrate it, you'll:

1. Add value to your users (wellness tracking)
2. Help them earn $LIFE tokens
3. Be part of the LifeLog ecosystem

Built with ❤️ by the LifeLog team.

## License

MIT
