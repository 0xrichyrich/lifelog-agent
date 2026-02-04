# @nudge/agent-sdk

Multi-agent platform SDK for Nudge with x402 micropayments.

## Overview

The Nudge Agent SDK provides a complete framework for building and deploying AI agents with built-in micropayment support via the x402 protocol. Users can interact with different specialized agents, each with their own personality, tools, and pricing.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      iOS App / Web Client                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ GET /agents │  │POST /message│  │GET /pricing │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Message Router │ │ Payment Manager │ │ Agent Registry  │
│                 │ │                 │ │                 │
│ • Intent detect │ │ • x402 protocol │ │ • Load agents   │
│ • Route to agent│ │ • Verify proofs │ │ • Tool handlers │
│ • Multi-agent   │ │ • Track balance │ │ • Data sources  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  🌱 Nudge Coach │ │ ☕ Coffee Scout │ │  📚 Book Buddy  │
│     (FREE)      │ │  ($0.01/msg)    │ │   ($0.01/msg)   │
│                 │ │                 │ │                 │
│ Wellness/mood   │ │ Coffee finder   │ │ Book recs       │
│ tracking        │ │ + preferences   │ │ + reading lists │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Installation

```bash
npm install @nudge/agent-sdk
# or
pnpm add @nudge/agent-sdk
```

## Quick Start

```typescript
import express from 'express';
import { createAgentRouter } from '@nudge/agent-sdk';

const app = express();
app.use(express.json());

// Mount the agent API
app.use('/api', createAgentRouter(express));

app.listen(3000, () => {
  console.log('Nudge Agent Platform running on http://localhost:3000');
});
```

## Agent Definition

Each agent is defined by an `AgentDefinition` interface:

```typescript
interface AgentDefinition {
  id: string;              // Unique identifier
  name: string;            // Display name
  icon: string;            // Emoji or icon
  personality: string;     // Short description
  systemPrompt: string;    // Full AI system prompt
  triggers: string[];      // Keywords for routing
  dataSources: DataSource[]; // APIs/data the agent can access
  tools: AgentTool[];      // Actions the agent can take
  pricing: AgentPricing;   // Payment configuration
  walletAddress: string;   // Payment recipient
  version: string;
  metadata?: {...};
}
```

## Built-in Agents

### 🌱 Nudge Coach (FREE)
Your gentle wellness companion for mood tracking and self-care.

**Tools:**
- `log_checkin` - Record mood and energy levels
- `get_mood_history` - View mood patterns over time
- `suggest_activity` - Get personalized wellness suggestions

### ☕ Coffee Scout ($0.01/message)
Your personal coffee shop finder that learns your preferences.

**Tools:**
- `search_cafes` - Find coffee shops by location and features
- `get_cafe_details` - Get hours, menu, reviews
- `save_favorite` - Save spots to your list
- `get_user_preferences` - Access learned preferences

### 📚 Book Buddy ($0.01/message)
Book recommendations based on your reading history.

**Tools:**
- `search_books` - Search by title, author, genre
- `get_recommendations` - Personalized suggestions
- `add_to_list` - Manage your reading list
- `get_reading_history` - View your reading stats

## API Endpoints

### List Agents
```http
GET /api/agents
```

Response:
```json
{
  "agents": [
    {
      "id": "nudge-coach",
      "name": "Nudge Coach",
      "icon": "🌱",
      "personality": "Your gentle wellness companion",
      "pricing": {
        "perMessage": 0,
        "isFree": true
      },
      "triggers": ["mood", "wellness", "feeling", ...]
    },
    ...
  ]
}
```

### Send Message
```http
POST /api/agents/:id/message
Content-Type: application/json
X-Payment-Signature: <signature>  // If payment required

{
  "message": "I need a quiet coffee shop with good wifi",
  "conversationId": "conv_123",  // Optional
  "paymentProof": {              // If 402 was returned
    "signature": "...",
    "paymentId": "...",
    "timestamp": "...",
    "chain": "base"
  }
}
```

Success Response (200):
```json
{
  "conversationId": "conv_123",
  "response": {
    "id": "resp_456",
    "agentId": "coffee-scout",
    "content": "☕ I found 3 great spots near you...",
    "timestamp": "2024-02-04T12:00:00Z",
    "toolCalls": [...]
  }
}
```

Payment Required Response (402):
```json
{
  "agentId": "coffee-scout",
  "amount": 10000,
  "currency": "USDC",
  "recipient": "0x742d35...",
  "description": "Message to Coffee Scout",
  "expiresAt": "2024-02-04T12:30:00Z",
  "nonce": "abc123..."
}
```

### Get Pricing
```http
GET /api/agents/:id/pricing
```

Response:
```json
{
  "agentId": "coffee-scout",
  "pricing": {
    "perMessage": 10000,
    "isFree": false,
    "freeTierDaily": 3
  },
  "walletAddress": "0x742d35...",
  "acceptedCurrencies": ["USDC"],
  "supportedNetworks": ["base", "ethereum", "polygon", "arbitrum"]
}
```

### Start Session (Bulk Messages)
```http
POST /api/agents/:id/session
Content-Type: application/json

{
  "durationMinutes": 60,
  "paymentProof": {...}
}
```

### Route Message (Auto-detect Agent)
```http
POST /api/route
Content-Type: application/json

{
  "message": "I'm feeling stressed today"
}
```

Response:
```json
{
  "agentId": "nudge-coach",
  "confidence": 0.85,
  "reasoning": "Matched Nudge Coach based on keywords: feeling, stressed",
  "agent": {
    "id": "nudge-coach",
    "name": "Nudge Coach",
    "icon": "🌱"
  }
}
```

## x402 Payment Flow

1. **User sends message** to paid agent
2. **Server checks payment status**
   - Has free tier remaining? → Process message
   - Has prepaid balance? → Deduct and process
   - No balance? → Return 402
3. **Client receives 402** with payment details
4. **Client signs payment** using wallet (Privy, etc.)
5. **Client retries request** with `paymentProof`
6. **Server verifies** and processes message

### Payment Headers (x402 Standard)
```
X-Payment-Required: true
X-Payment-Address: 0x742d35...
X-Payment-Amount: 10000
X-Payment-Currency: USDC
X-Payment-Network: base
X-Payment-Expires: 2024-02-04T12:30:00Z
```

## iOS Integration

### Display Available Agents
```swift
struct AgentListView: View {
    @State private var agents: [Agent] = []
    
    var body: some View {
        List(agents) { agent in
            AgentRow(agent: agent)
        }
        .task {
            agents = try await AgentAPI.listAgents()
        }
    }
}
```

### Handle Agent Switching
```swift
class AgentService: ObservableObject {
    @Published var currentAgent: Agent?
    @Published var conversation: Conversation?
    
    func switchAgent(_ agent: Agent) {
        currentAgent = agent
        conversation = nil // Start fresh conversation
    }
    
    func sendMessage(_ text: String) async throws -> AgentMessage {
        guard let agent = currentAgent else { throw AgentError.noAgent }
        
        do {
            return try await api.sendMessage(
                agentId: agent.id,
                message: text,
                conversationId: conversation?.id
            )
        } catch APIError.paymentRequired(let paymentRequest) {
            // Trigger payment flow
            throw NeedsPaymentError(request: paymentRequest)
        }
    }
}
```

### Process x402 Payments (with Privy)
```swift
class PaymentHandler {
    let privy: PrivySDK
    
    func handlePaymentRequired(_ request: PaymentRequest) async throws -> PaymentProof {
        // 1. Show payment confirmation UI
        let confirmed = await showPaymentConfirmation(
            amount: request.formattedAmount,
            recipient: request.recipient
        )
        guard confirmed else { throw PaymentError.cancelled }
        
        // 2. Sign payment with Privy wallet
        let signature = try await privy.signTypedData(
            domain: PaymentDomain.nudge,
            types: PaymentTypes.message,
            value: [
                "amount": request.amount,
                "recipient": request.recipient,
                "nonce": request.nonce
            ]
        )
        
        // 3. Return proof
        return PaymentProof(
            signature: signature,
            paymentId: request.nonce,
            timestamp: ISO8601DateFormatter().string(from: Date()),
            chain: "base"
        )
    }
}
```

### Show Payment Confirmations
```swift
struct PaymentConfirmationView: View {
    let request: PaymentRequest
    let onConfirm: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Payment Required")
                .font(.headline)
            
            HStack {
                Text(request.agentIcon)
                    .font(.largeTitle)
                VStack(alignment: .leading) {
                    Text(request.agentName)
                    Text(request.description)
                        .foregroundColor(.secondary)
                }
            }
            
            Text(request.formattedAmount)
                .font(.title)
                .fontWeight(.bold)
            
            Text("Paid via USDC on Base")
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack {
                Button("Cancel", action: onCancel)
                    .buttonStyle(.bordered)
                
                Button("Confirm", action: onConfirm)
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

## Creating Custom Agents

```typescript
import { AgentDefinition, registerAgent } from '@nudge/agent-sdk';

const myAgent: AgentDefinition = {
  id: 'my-agent',
  name: 'My Custom Agent',
  icon: '🤖',
  personality: 'A helpful assistant for...',
  systemPrompt: `You are...`,
  triggers: ['keyword1', 'keyword2'],
  dataSources: [],
  tools: [
    {
      id: 'my_tool',
      name: 'my_tool',
      description: 'Does something useful',
      parameters: [
        { name: 'input', type: 'string', required: true, description: '...' }
      ],
      returns: { type: 'object', description: '...' },
      handler: async (params, context) => {
        // Tool implementation
        return { result: 'success' };
      }
    }
  ],
  pricing: {
    perMessage: 5000, // $0.005
    isFree: false,
    freeTierDaily: 5
  },
  walletAddress: '0x...',
  version: '1.0.0'
};

// Register the agent
registerAgent(myAgent);
```

## Configuration

### Payment Manager
```typescript
import { PaymentManager } from '@nudge/agent-sdk';

const payments = new PaymentManager({
  network: 'base',              // Default network
  expirationMinutes: 30,        // Payment request expiration
  minPaymentUsd: 0.001          // Minimum payment
});
```

### Message Router
```typescript
import { MessageRouter } from '@nudge/agent-sdk';

const router = new MessageRouter({
  defaultAgentId: 'nudge-coach',  // Fallback agent
  confidenceThreshold: 0.3,       // Min confidence to route
  enableMultiAgent: false         // Allow multiple agents per message
});
```

## License

MIT
