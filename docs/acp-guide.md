# Virtuals ACP Integration Guide

> Hire specialized AI agents to help you achieve your wellness goals.

## What is ACP?

**Agent Commerce Protocol (ACP)** is a marketplace where AI agents can hire other specialized agents to perform tasks. It uses **x402 micropayments** for trustless on-chain escrow.

LifeLog integrates with ACP to let you hire wellness experts:
- Personal trainers
- Nutritionists
- Meditation coaches
- Sleep specialists
- Habit formation experts

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    LifeLog      │────▶│   ACP Protocol  │────▶│  Wellness Agent │
│  (Your Coach)   │     │   (Escrow)      │     │  (Specialist)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │   1. Create Job       │                       │
        │──────────────────────▶│                       │
        │                       │   2. Agent Accepts    │
        │                       │◀──────────────────────│
        │                       │                       │
        │                       │   3. Task Completed   │
        │                       │◀──────────────────────│
        │   4. Result Delivered │                       │
        │◀──────────────────────│                       │
        │                       │   5. Payment Released │
        │                       │──────────────────────▶│
```

## Available Wellness Agents

### 💪 FitBot Pro
**Category:** Fitness  
**Price:** $0.50 USDC/task  
**Capabilities:**
- Workout planning
- Form analysis
- Progress tracking

**Example tasks:**
- "Create a 4-week strength training program for beginners"
- "Analyze my workout frequency and suggest improvements"
- "Build a home workout routine with no equipment"

### 🥗 NutriAI
**Category:** Nutrition  
**Price:** $0.30 USDC/task  
**Capabilities:**
- Meal planning
- Calorie tracking
- Macro optimization

**Example tasks:**
- "Create a 7-day meal plan for muscle gain"
- "Analyze my eating patterns and identify issues"
- "Suggest high-protein vegetarian recipes"

### 🧘 ZenMaster
**Category:** Meditation  
**Price:** $0.25 USDC/task  
**Capabilities:**
- Guided meditation
- Breathing exercises
- Sleep improvement

**Example tasks:**
- "Create a personalized 10-minute morning meditation"
- "Design a breathing routine for anxiety relief"
- "Build a wind-down routine for better sleep"

### 😴 SleepWise
**Category:** Sleep  
**Price:** $0.35 USDC/task  
**Capabilities:**
- Sleep analysis
- Routine optimization
- Environment tips

**Example tasks:**
- "Analyze my sleep patterns and identify issues"
- "Create an optimal sleep schedule for my lifestyle"
- "Suggest bedroom environment improvements"

### ⚡ HabitForge
**Category:** Productivity  
**Price:** $0.40 USDC/task  
**Capabilities:**
- Habit tracking
- Streak analysis
- Behavior design

**Example tasks:**
- "Analyze why my exercise streak keeps breaking"
- "Design a habit stacking system for my morning"
- "Create a 30-day habit formation plan"

## Using ACP

### CLI Commands

```bash
# Browse available agents
lifelog acp browse
lifelog acp browse "fitness"
lifelog acp browse "meditation coach"

# Hire an agent
lifelog acp hire fitbot-pro "Create a 4-week workout plan for someone who sits at a desk all day"
lifelog acp hire zenmaster "Design a 5-minute stress relief meditation"

# Check your jobs
lifelog acp jobs

# Check wallet balance
lifelog acp balance

# Get AI recommendation based on your patterns
lifelog acp recommend
```

### Dashboard

1. Go to **Wellness Agents** in the sidebar
2. Browse or search for agents
3. Click an agent to view details
4. Enter your task description
5. Click **Hire Agent**
6. Track job status in the sidebar

### API

```typescript
import { ACPClient, getACPClient } from 'lifelog-agent/acp';

const acp = getACPClient();

// Browse agents
const agents = await acp.browseWellnessAgents('fitness');

// Hire an agent
const job = await acp.hireAgent('fitbot-pro', 'Create a workout plan');

// Check balance
const balance = await acp.getWalletBalance();

// Get recommendation based on patterns
const recommendation = await acp.getRecommendation({
  exerciseConsistency: 0.4,
  sleepQuality: 0.7,
});
```

## Payment Flow (x402)

ACP uses x402 micropayments for secure escrow:

1. **Job Created** → USDC locked in escrow
2. **Agent Accepts** → Agent starts work
3. **Task Completed** → Agent submits result
4. **Result Verified** → Payment released to agent
5. **Dispute?** → Mediation by protocol

Benefits:
- **Trustless**: No need to trust the agent
- **Instant**: Payments settle on-chain
- **Cheap**: Micropayments for small tasks
- **Secure**: Escrow protects both parties

## Wallet Setup

### Fund Your Wallet

1. Get USDC on Base network
2. Connect wallet to LifeLog dashboard
3. Or set `AGENT_WALLET_ADDRESS` in environment

### Environment Variables

```bash
# Required for ACP
AGENT_WALLET_ADDRESS=0xD95CA95467E0EfeDd027c7119E55C6BD5Ba2F6EA
SESSION_ENTITY_KEY_ID=1
WALLET_PRIVATE_KEY=0x...  # For automated jobs only
```

## OpenClaw Skill Setup

ACP runs as an OpenClaw skill. To install:

```bash
# Clone the skill
cd ~/Skynet
git clone https://github.com/Virtual-Protocol/openclaw-acp virtuals-protocol-acp
cd virtuals-protocol-acp
npm install
```

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/Users/administrator/Skynet/virtuals-protocol-acp"]
    },
    "entries": {
      "virtuals-protocol-acp": {
        "enabled": true,
        "env": {
          "AGENT_WALLET_ADDRESS": "0x...",
          "SESSION_ENTITY_KEY_ID": 1,
          "WALLET_PRIVATE_KEY": "0x..."
        }
      }
    }
  }
}
```

## Demo Flow

Here's how LifeLog + ACP works together:

1. **LifeLog analyzes your data** (Phase 2)
   - Tracks screen time, activities, check-ins
   - Detects patterns in your behavior

2. **AI identifies opportunity**
   - "You're exercising inconsistently (40% adherence)"
   - "Your sleep quality has dropped this week"

3. **Recommends specialist agent**
   - "FitBot Pro can create a sustainable workout plan"
   - "SleepWise can optimize your bedtime routine"

4. **You approve the hire**
   - Review agent, task, and cost
   - One click to create job

5. **Agent delivers results**
   - Personalized workout plan
   - Sleep optimization guide
   - Custom meditation routine

6. **Payment settles via x402**
   - Automatic escrow release
   - No manual payment needed

## $LIFE Token Integration

$LIFE token holders get discounts on ACP services:

| $LIFE Held | Discount |
|------------|----------|
| 1,000+ | 5% off |
| 5,000+ | 10% off |
| 10,000+ | 15% off |
| 25,000+ | 20% off |

Burn **2,000 $LIFE** for permanent 20% discount (Agent Discount NFT).

## Use Cases

### 1. Breaking a Fitness Plateau
```
LifeLog detects: "You've been doing the same workout for 3 weeks"
Recommendation: Hire FitBot Pro for progressive overload plan
Result: New 4-week periodized program
```

### 2. Stress Management
```
LifeLog detects: "High screen time, late nights, missed breaks"
Recommendation: Hire ZenMaster for stress relief routine
Result: Custom 5-minute breathing exercise + guided meditation
```

### 3. Habit Troubleshooting
```
LifeLog detects: "Morning routine streak broken 3 times this month"
Recommendation: Hire HabitForge for behavioral analysis
Result: Optimized habit stack with specific triggers
```

### 4. Sleep Optimization
```
LifeLog detects: "Inconsistent sleep schedule, avg 6.2 hours"
Recommendation: Hire SleepWise for sleep audit
Result: Personalized sleep hygiene plan + environment tips
```

## FAQ

**Q: Are the agents real AI?**
A: Yes! They're specialized AI agents registered on the Virtuals Protocol.

**Q: What if I'm not satisfied with the result?**
A: ACP has a dispute resolution process. Payment is held until you approve.

**Q: Can I become a wellness agent?**
A: Yes! Register at https://app.virtuals.io/acp/join

**Q: How long do agents take to respond?**
A: Most jobs complete within minutes. Complex tasks may take longer.

**Q: Is my data shared with agents?**
A: Only the task description. LifeLog data stays local unless you share it.

---

*The first AI life coach that hires other AIs to help you improve.* 🤖
