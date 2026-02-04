/**
 * Example Server Implementation
 * 
 * Run with: npx tsx examples/server.ts
 */

// Note: This example requires express to be installed
// npm install express @types/express

import type { Request, Response, NextFunction, Application } from 'express';

// Import SDK components
import {
  AgentRegistry,
  MessageRouter,
  PaymentManager,
  createAgentRouter,
  nudgeCoachAgent,
  coffeeScoutAgent,
  bookBuddyAgent,
} from '../src/index.js';

async function main() {
  // Dynamic import express (peer dependency)
  const express = (await import('express')).default;
  
  const app: Application = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());
  
  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Simple auth middleware (mock)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // In production, verify JWT/session and set userId
    (req as any).userId = req.headers['x-user-id'] || 'demo-user';
    next();
  });

  // Mount the agent API
  app.use('/api', createAgentRouter(express));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ 
      status: 'ok',
      agents: AgentRegistry.getAll().length,
      version: '1.0.0'
    });
  });

  // Home page with API docs
  app.get('/', (_req: Request, res: Response) => {
    const agents = AgentRegistry.getAll();
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Nudge Agent Platform</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .agent { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .agent-icon { font-size: 2em; }
    .price { color: #4CAF50; font-weight: bold; }
    .free { color: #2196F3; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🌟 Nudge Agent Platform</h1>
  <p>Multi-agent AI platform with x402 micropayments.</p>
  
  <h2>Available Agents</h2>
  ${agents.map(a => `
    <div class="agent">
      <span class="agent-icon">${a.icon}</span>
      <strong>${a.name}</strong>
      <span class="${a.pricing.isFree ? 'free' : 'price'}">
        ${a.pricing.isFree ? 'FREE' : `$${(a.pricing.perMessage / 1_000_000).toFixed(2)}/msg`}
      </span>
      <p>${a.personality}</p>
    </div>
  `).join('')}
  
  <h2>API Endpoints</h2>
  <ul>
    <li><code>GET /api/agents</code> - List all agents</li>
    <li><code>POST /api/agents/:id/message</code> - Send message to agent</li>
    <li><code>GET /api/agents/:id/pricing</code> - Get agent pricing</li>
    <li><code>POST /api/route</code> - Auto-route message to best agent</li>
  </ul>
  
  <h2>Try It</h2>
  <pre>
# List agents
curl http://localhost:${PORT}/api/agents

# Send message to Nudge Coach (free)
curl -X POST http://localhost:${PORT}/api/agents/nudge-coach/message \\
  -H "Content-Type: application/json" \\
  -d '{"message": "I am feeling tired today"}'

# Route a message automatically
curl -X POST http://localhost:${PORT}/api/route \\
  -H "Content-Type: application/json" \\
  -d '{"message": "I need coffee recommendations"}'
  </pre>
</body>
</html>
    `);
  });

  // Start server
  app.listen(PORT, () => {
    console.log('');
    console.log('🌟 Nudge Agent Platform');
    console.log('========================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('Available agents:');
    AgentRegistry.getAll().forEach(agent => {
      const price = agent.pricing.isFree 
        ? 'FREE' 
        : `$${(agent.pricing.perMessage / 1_000_000).toFixed(2)}/msg`;
      console.log(`  ${agent.icon} ${agent.name} - ${price}`);
    });
    console.log('');
    console.log('Try:');
    console.log(`  curl http://localhost:${PORT}/api/agents`);
    console.log('');
  });
}

main().catch(console.error);
