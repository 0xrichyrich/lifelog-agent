import { NextRequest, NextResponse } from 'next/server';

/**
 * Agents List Endpoint
 * Returns available AI agents for the multi-agent platform
 */

// Agent definitions with personalities and pricing
const AGENTS = [
  {
    id: 'nudge-coach',
    name: 'Nudge Coach',
    icon: '🌱',
    personality: 'Your wellness companion. Gentle check-ins, emotional support, and positive reinforcement.',
    pricing: { perMessage: 0, isFree: true, freeTierDaily: null },
    triggers: ['check-in', 'mood', 'wellness', 'tired', 'stressed'],
  },
  {
    id: 'coffee-scout',
    name: 'Coffee Scout',
    icon: '☕',
    personality: 'Local coffee expert. Finds the perfect café based on your vibe, location, and preferences.',
    pricing: { perMessage: 10000, isFree: false, freeTierDaily: 3 },
    triggers: ['coffee', 'café', 'work spot', 'study spot'],
  },
  {
    id: 'book-buddy',
    name: 'Book Buddy',
    icon: '📚',
    personality: 'Your literary companion. Book recommendations, reading lists, and bookish conversations.',
    pricing: { perMessage: 10000, isFree: false, freeTierDaily: 3 },
    triggers: ['book', 'read', 'recommend', 'author'],
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    agents: AGENTS,
  });
}
