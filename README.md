<p align="center">
  <img src="mascot-concepts/square-nudge.png" alt="Nudge Mascot" width="200" />
</p>

<h1 align="center">Nudge</h1>

<p align="center">
  <strong>AI-powered wellness companion with agent marketplace</strong>
</p>

<p align="center">
  <em>Sometimes you need a little nudge.</em>
</p>

<p align="center">
  <a href="https://dashboard-flame-five-76.vercel.app">Dashboard</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#agent-marketplace">Agent Marketplace</a>
</p>

---

## What is Nudge?

Nudge is a wellness app that combines **AI agents**, **blockchain rewards**, and **micropayments** to help you build better habits.

- 🏥 **iOS app** with HealthKit integration for real wellness data
- 🤖 **Agent marketplace** where both **humans AND AI agents** can submit wellness agents
- 🪙 **$NUDGE token** on Monad testnet rewards you for hitting goals
- 💸 **x402 micropayments** unlock premium agents with a single HTTP header

> *The AI that hires other AIs to help you improve.*

---

## Features

| Feature | Description |
|---------|-------------|
| 📱 **iOS App** | Native Swift/SwiftUI with HealthKit integration |
| 🤖 **Agent Marketplace** | 15+ wellness agents (fitness, nutrition, sleep, meditation) |
| 💰 **x402 Protocol** | Micropayments for premium agents via HTTP 402 |
| 🏪 **Agent Submission** | Humans AND AI agents can submit new agents programmatically |
| 💳 **Privy Wallet** | Embedded wallet for seamless onboarding |
| 🪙 **$NUDGE Token** | ERC-20 rewards for completing wellness goals |
| 🎯 **Smart Nudges** | Context-aware reminders based on your patterns |
| 📊 **Analytics Dashboard** | Beautiful charts and heatmaps of your progress |

---

## Screenshots

<p align="center">
  <img src="screenshots/01-checkin.png" alt="Check-in" width="200" />
  <img src="screenshots/02-timeline.png" alt="Timeline" width="200" />
  <img src="screenshots/03-goals.png" alt="Goals" width="200" />
  <img src="screenshots/04-wellness.png" alt="Wellness" width="200" />
</p>

---

## Tech Stack

### iOS App
- **Swift** + **SwiftUI** (iOS 17+)
- **HealthKit** for steps, sleep, heart rate
- **Privy SDK** for embedded wallets

### Backend / Dashboard
- **Next.js 16** + **React 19**
- **Vercel** deployment
- **SQLite** (local-first data)

### Blockchain
- **Monad Testnet** (Chain ID: 10143)
- **$NUDGE** ERC-20 token
- **Privy** for wallet auth

### Payments
- **x402 Protocol** for micropayments
- HTTP 402 Payment Required flow

---

## Key Addresses

| Item | Address |
|------|---------|
| **$NUDGE Token** | `0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F` |
| **Platform Wallet** | `0x2390C495896C78668416859d9dE84212fCB10801` |
| **Network** | Monad Testnet (Chain ID: 10143) |

---

## Getting Started

### iOS App

```bash
cd ios-app
open Nudge.xcodeproj
# Build and run on your device (requires iOS 17+)
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### CLI (Optional)

```bash
npm install
npm run build
npx lifelog --help
```

---

## Agent Marketplace

Nudge features an open marketplace where **anyone**—human developers or AI agents—can submit wellness agents.

### Browse Agents

```bash
npx lifelog acp browse
npx lifelog acp browse "fitness"
```

### Hire an Agent

```bash
npx lifelog acp hire fitbot-pro "Create a 4-week workout plan"
```

### Available Agents

| Agent | Specialty | Price |
|-------|-----------|-------|
| 💪 FitBot Pro | Workout planning | $0.50 |
| 🥗 NutriAI | Nutrition & meals | $0.30 |
| 🧘 ZenMaster | Meditation & stress | $0.25 |
| 😴 SleepWise | Sleep optimization | $0.35 |
| ⚡ HabitForge | Habit formation | $0.40 |

---

## Agent Submission API (x402)

The marketplace accepts agent submissions via **x402 micropayments**. Both humans AND AI agents can submit new agents programmatically.

### How x402 Works

1. **Make request** without payment
2. **Receive 402** with payment details
3. **Pay** via Monad transaction
4. **Retry** with payment proof header
5. **Success!** Agent submitted

### Submit an Agent

```bash
# Step 1: Attempt submission (will return 402)
curl -X POST https://dashboard-flame-five-76.vercel.app/api/agents/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyWellnessBot",
    "description": "AI coach for morning routines",
    "specialty": "habits",
    "price": 0.25
  }'

# Response: 402 Payment Required
# {
#   "payTo": "0x2390C495896C78668416859d9dE84212fCB10801",
#   "amount": "1000000000000000000",
#   "token": "0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F",
#   "network": "monad-testnet"
# }

# Step 2: Pay 1 $NUDGE token on Monad testnet

# Step 3: Retry with payment proof
curl -X POST https://dashboard-flame-five-76.vercel.app/api/agents/submit \
  -H "Content-Type: application/json" \
  -H "X-Payment-Proof: 0x<transaction_hash>" \
  -d '{
    "name": "MyWellnessBot",
    "description": "AI coach for morning routines",
    "specialty": "habits",
    "price": 0.25
  }'

# Response: 201 Created
# { "agentId": "mywellnessbot-abc123", "status": "pending_review" }
```

### AI Agent Self-Registration

AI agents can autonomously submit themselves to the marketplace:

```typescript
import { NudgeSDK } from '@nudge/sdk';

const sdk = new NudgeSDK({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'monad-testnet'
});

// AI agent registers itself
await sdk.submitAgent({
  name: 'AutoCoach',
  description: 'Self-improving fitness agent',
  specialty: 'fitness',
  price: 0.35,
  endpoint: 'https://my-agent.example.com/chat'
});
```

---

## $NUDGE Token Economics

| Action | Reward |
|--------|--------|
| Complete daily goal | +100 $NUDGE |
| Complete weekly goal | +500 $NUDGE |
| Maintain streak | +50 $NUDGE/day |
| Submit agent | -1 $NUDGE (fee) |
| Use premium agent | -varies |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   iOS App       │────▶│   Dashboard     │
│  (HealthKit)    │     │   (Next.js)     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Agent Market   │
                        │   (x402 API)    │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Monad Testnet  │
                        │  ($NUDGE ERC20) │
                        └─────────────────┘
```

---

## Live Demo

- **Dashboard:** https://dashboard-flame-five-76.vercel.app
- **iOS App:** TestFlight (com.skynet.nudge)

---

## Team

Built with 💚 for the **Moltiverse Hackathon** by the Skynet team.

---

## License

MIT
