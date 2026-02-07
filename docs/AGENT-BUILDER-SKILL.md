# Nudge Agent Builder Skill

Build and submit AI wellness agents to the Nudge marketplace using x402 micropayments on Monad.

## Overview

Nudge is an AI life coach app with a marketplace where third-party agents provide specialized wellness services. Agents are paid per-message via the **x402 protocol** — HTTP-native crypto micropayments using USDC on Monad.

**Platform:** https://www.littlenudge.app
**Token:** $NUDGE on nad.fun (`0x99cDfA46B933ea28Edf4BB620428E24C8EB63367`)
**Chain:** Monad Mainnet (Chain ID: 143)

---

## Quick Start

### 1. Define Your Agent

```json
{
  "name": "FitBot Pro",
  "icon": "💪",
  "description": "Personal fitness trainer that creates workout plans and tracks progress",
  "category": "wellness",
  "systemPrompt": "You are FitBot Pro, a certified personal trainer...",
  "pricing": {
    "perMessage": 10000,
    "isFree": false
  },
  "creatorWallet": "0xYourWalletAddress",
  "capabilities": ["workout-planning", "form-analysis", "progress-tracking"]
}
```

### 2. Submit to Marketplace (x402 Flow)

**Step 1: Request listing (get payment details)**

```bash
curl -X POST https://www.littlenudge.app/api/marketplace/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FitBot Pro",
    "icon": "💪",
    "description": "Personal fitness trainer",
    "category": "wellness",
    "systemPrompt": "You are FitBot Pro...",
    "pricing": { "perMessage": 10000, "isFree": false },
    "creatorWallet": "0xYourWallet",
    "capabilities": ["workout-planning"]
  }'
```

**Response: 402 Payment Required**
```json
{
  "error": "Payment Required",
  "amount": 100000,
  "x402": {
    "version": "1.0",
    "accepts": ["usdc"],
    "price": 100000,
    "payTo": "0x2390C495896C78668416859d9dE84212fCB10801",
    "memo": "Agent listing fee for: FitBot Pro"
  }
}
```

**Step 2: Pay on-chain**

Send the listing fee (currently $0.10 USDC) to the platform wallet on Monad.

**Step 3: Re-submit with payment proof**

```bash
curl -X POST https://www.littlenudge.app/api/marketplace/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FitBot Pro",
    "icon": "💪",
    "description": "Personal fitness trainer",
    "category": "wellness",
    "systemPrompt": "You are FitBot Pro, a certified personal trainer...",
    "pricing": { "perMessage": 10000, "isFree": false },
    "creatorWallet": "0xYourWallet",
    "capabilities": ["workout-planning"],
    "paymentProof": "0xYourTransactionHash"
  }'
```

**Response: 201 Created**
```json
{
  "success": true,
  "agent": {
    "id": "community-fitbot-pro-abc123",
    "name": "FitBot Pro",
    "status": "active"
  }
}
```

### 3. Users Chat With Your Agent (x402 Per-Message)

```bash
# First message without payment → 402
curl -X POST https://www.littlenudge.app/api/agents/community-fitbot-pro-abc123/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <user_session_token>" \
  -d '{"message": "Create a workout plan for me", "userId": "0xUserWallet"}'

# Response: 402 with payment details
# Pay on-chain, then retry with proof:
curl -X POST https://www.littlenudge.app/api/agents/community-fitbot-pro-abc123/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <user_session_token>" \
  -d '{
    "message": "Create a workout plan for me",
    "userId": "0xUserWallet",
    "paymentProof": "0xPaymentTxHash"
  }'
```

---

## Agent Categories

| Category | Description | Examples |
|----------|-------------|---------|
| `wellness` | Health, fitness, mental wellness | Fitness trainer, meditation guide, sleep coach |
| `productivity` | Time management, focus, habits | Habit tracker, pomodoro coach, goal setter |
| `lifestyle` | Daily life, hobbies, social | Coffee scout, recipe planner, book buddy |
| `entertainment` | Fun, games, creative | Trivia bot, story writer, joke teller |

---

## Pricing

### Listing Fee
- **Amount:** $0.10 USDC (100,000 micro-units)
- **Payment:** One-time, on Monad mainnet
- **Token:** USDC

### Per-Message Pricing
Set your own price per message:
- `perMessage`: Amount in USDC micro-units (6 decimals)
  - `10000` = $0.01 per message
  - `50000` = $0.05 per message
  - `100000` = $0.10 per message
- `isFree: true` = No charge (good for building audience)

### Revenue Split
- **80%** goes to the agent creator
- **20%** goes to the Nudge platform treasury
- Handled automatically by the `FeeSplitter` contract

---

## System Prompt Guidelines

Your `systemPrompt` defines your agent's personality and capabilities. Best practices:

1. **Be specific** about the agent's role and expertise
2. **Set boundaries** — what the agent should and shouldn't do
3. **Keep responses concise** (2-4 sentences typical for chat)
4. **Include personality traits** — users prefer agents with character
5. **Don't include harmful content** — agents are reviewed

**Example system prompt:**
```
You are ZenMaster 🧘, a meditation and mindfulness guide in the Nudge app.

Your role:
- Guide users through breathing exercises and meditations
- Help with stress management and anxiety relief
- Suggest mindfulness practices for daily routines
- Be calm, patient, and encouraging

Keep responses warm and concise. Use occasional emojis naturally.
Never provide medical advice — suggest professional help for serious concerns.
```

---

## x402 Protocol Reference

x402 is HTTP-native crypto payments. When a resource requires payment:

1. **Client sends request** → Server returns `402 Payment Required` with payment details
2. **Client pays on-chain** → Gets transaction hash
3. **Client retries with proof** → Server verifies on-chain, serves the resource

**Payment verification is real on-chain** — the server checks the Monad blockchain to confirm the transaction exists, has the correct amount, and sends to the correct recipient.

**Replay protection:** Each payment hash can only be used once (stored persistently in the database).

### For AI Agents Building Other Agents

If you're an AI agent and want to programmatically submit agents to the Nudge marketplace:

1. Use the x402 skill to handle payments: `/Users/administrator/clawd/skills/x402/SKILL.md`
2. Construct the agent JSON (see schema above)
3. POST to `/api/marketplace/submit`
4. Handle the 402 → pay → retry flow

---

## Contract Addresses (Monad Mainnet)

| Contract | Address | Description |
|----------|---------|-------------|
| $NUDGE (nad.fun) | `0x99cDfA46B933ea28Edf4BB620428E24C8EB63367` | Reward token |
| Pool | `0x861c41D7C04cc9c2A2bFD577cb8a7fc80BB8C663` | nad.fun bonding curve pool |
| FeeSplitter | `0xA3c103809d995a0e4d698b69f3DB9f2da643c053` | 80/20 revenue split |
| NudgeBuyback | `0x4E7825D923Cc09aA8be74C08B14c7Cd4A48522bc` | Token buyback |
| Platform Wallet | `0x2390C495896C78668416859d9dE84212fCB10801` | Treasury |

---

## API Reference

### List Agents
```
GET /api/agents
```
Returns all available agents (built-in + community).

### Get Agent Details
```
GET /api/agents/{agentId}
```

### Send Message
```
POST /api/agents/{agentId}/message
Content-Type: application/json
X-API-Key: <session_token>

{
  "message": "string",
  "userId": "string",
  "sessionId": "string (optional)",
  "paymentProof": "string (optional, for paid agents)"
}
```

### Submit Agent
```
POST /api/marketplace/submit
Content-Type: application/json

{
  "name": "string",
  "icon": "string (emoji)",
  "description": "string",
  "category": "wellness | productivity | lifestyle | entertainment",
  "systemPrompt": "string",
  "pricing": { "perMessage": number, "isFree": boolean },
  "creatorWallet": "0x...",
  "capabilities": ["string"],
  "paymentProof": "0x... (optional, include after payment)"
}
```

### Browse Marketplace
```
GET /api/marketplace
GET /api/marketplace?category=wellness
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Agent messages | 30 requests / minute |
| Marketplace submit | 5 requests / minute |
| Marketplace browse | 60 requests / minute |

---

## Testing

1. Submit a free agent (`isFree: true`) to test the flow without payment
2. Chat with your agent to verify the system prompt works
3. Check the marketplace to see your agent listed
4. Test paid flow with a small USDC amount

---

*Built with x402 protocol on Monad. Agents earn real revenue from day one.*
