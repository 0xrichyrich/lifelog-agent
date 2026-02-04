/**
 * Nudge Coach - FREE Wellness Agent
 * 
 * Your gentle AI life coach. Helps with wellness check-ins,
 * mood tracking, and gentle nudges toward better habits.
 */

import type { AgentDefinition, AgentContext } from '../types/index.js';

// Tool handlers
async function logCheckin(
  params: { mood: string; energy: number; note?: string },
  context: AgentContext
): Promise<{ success: boolean; checkinId: string; message: string }> {
  // In production, this would persist to database
  const checkinId = `checkin_${Date.now()}`;
  console.log(`[NudgeCoach] Logged check-in for user ${context.user.userId}:`, params);
  
  return {
    success: true,
    checkinId,
    message: `Recorded your mood (${params.mood}) and energy level (${params.energy}/10).`
  };
}

async function getMoodHistory(
  params: { days?: number },
  context: AgentContext
): Promise<Array<{ date: string; mood: string; energy: number }>> {
  // Mock data - in production, fetch from database
  const days = params.days || 7;
  console.log(`[NudgeCoach] Fetching ${days} days of mood history for user ${context.user.userId}`);
  
  return [
    { date: '2024-02-03', mood: 'content', energy: 7 },
    { date: '2024-02-02', mood: 'tired', energy: 4 },
    { date: '2024-02-01', mood: 'energetic', energy: 8 },
  ];
}

async function suggestActivity(
  params: { currentMood: string; availableMinutes: number },
  context: AgentContext
): Promise<{ activity: string; reason: string; duration: number }> {
  const activities: Record<string, { activity: string; reason: string; duration: number }[]> = {
    stressed: [
      { activity: '5-minute breathing exercise', reason: 'Helps activate your parasympathetic nervous system', duration: 5 },
      { activity: 'Short walk outside', reason: 'Movement and nature help reduce cortisol', duration: 10 },
    ],
    tired: [
      { activity: 'Power nap', reason: 'A 20-minute nap can boost alertness', duration: 20 },
      { activity: 'Stretch break', reason: 'Gentle movement increases blood flow', duration: 5 },
    ],
    anxious: [
      { activity: 'Grounding exercise (5-4-3-2-1)', reason: 'Engages your senses to bring you to the present', duration: 3 },
      { activity: 'Journal for 5 minutes', reason: 'Writing can help process anxious thoughts', duration: 5 },
    ],
    default: [
      { activity: 'Mindful coffee/tea break', reason: 'A moment of presence can reset your focus', duration: 10 },
      { activity: 'Quick gratitude reflection', reason: 'Noting 3 good things boosts mood', duration: 2 },
    ]
  };

  const moodActivities = activities[params.currentMood] || activities.default;
  const suitable = moodActivities.filter(a => a.duration <= params.availableMinutes);
  const selected = suitable[0] || moodActivities[0];

  console.log(`[NudgeCoach] Suggested activity for mood "${params.currentMood}":`, selected);
  return selected;
}

export const nudgeCoachAgent: AgentDefinition = {
  id: 'nudge-coach',
  name: 'Nudge Coach',
  icon: '🌱',
  personality: 'Your gentle, empathetic wellness companion who helps you stay mindful and balanced.',
  
  systemPrompt: `You are Nudge Coach, a warm and empathetic AI wellness companion. Your role is to:

1. **Check in on the user's wellbeing** - Ask about their mood, energy, and how they're doing
2. **Track patterns** - Help users notice patterns in their mood and energy over time
3. **Suggest gentle activities** - Recommend small, achievable actions to improve wellbeing
4. **Celebrate wins** - Acknowledge progress, no matter how small
5. **Be supportive, not prescriptive** - Offer suggestions, not commands

Your tone should be:
- Warm and friendly, like a supportive friend
- Non-judgmental - there are no "bad" moods or feelings
- Encouraging but realistic
- Focused on small, sustainable habits

When using tools:
- Use log_checkin when the user shares their mood or how they're feeling
- Use get_mood_history to help users see patterns
- Use suggest_activity when they need ideas for self-care

Remember: You're here to gently nudge, not to fix. Meet users where they are.`,

  triggers: [
    'how are you feeling',
    'mood',
    'wellness',
    'check in',
    'feeling',
    'tired',
    'stressed',
    'anxious',
    'happy',
    'sad',
    'energy',
    'self care',
    'mental health',
    'mindfulness',
    'habit',
    'routine',
  ],

  dataSources: [
    {
      id: 'user-checkins',
      name: 'User Check-ins Database',
      type: 'database',
      config: {
        table: 'checkins',
        userScoped: true,
      },
      description: 'Historical mood and wellness check-ins for the user',
    },
    {
      id: 'activity-suggestions',
      name: 'Activity Library',
      type: 'memory',
      config: {
        namespace: 'activities',
        maxItems: 100,
      },
      description: 'Curated library of wellness activities',
    },
  ],

  tools: [
    {
      id: 'log_checkin',
      name: 'log_checkin',
      description: 'Log a wellness check-in with mood and energy level',
      parameters: [
        {
          name: 'mood',
          type: 'string',
          description: 'Current mood (e.g., happy, tired, stressed, content, anxious)',
          required: true,
        },
        {
          name: 'energy',
          type: 'number',
          description: 'Energy level from 1-10',
          required: true,
        },
        {
          name: 'note',
          type: 'string',
          description: 'Optional note or context',
          required: false,
        },
      ],
      returns: {
        type: 'object',
        description: 'Confirmation of logged check-in',
      },
      handler: logCheckin as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_mood_history',
      name: 'get_mood_history',
      description: 'Retrieve mood and energy history for pattern analysis',
      parameters: [
        {
          name: 'days',
          type: 'number',
          description: 'Number of days to look back (default: 7)',
          required: false,
          default: 7,
        },
      ],
      returns: {
        type: 'array',
        description: 'Array of historical check-ins',
      },
      handler: getMoodHistory as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'suggest_activity',
      name: 'suggest_activity',
      description: 'Suggest a wellness activity based on current mood and available time',
      parameters: [
        {
          name: 'currentMood',
          type: 'string',
          description: 'The user\'s current mood',
          required: true,
        },
        {
          name: 'availableMinutes',
          type: 'number',
          description: 'How many minutes the user has available',
          required: true,
        },
      ],
      returns: {
        type: 'object',
        description: 'Suggested activity with reason and duration',
      },
      handler: suggestActivity as AgentDefinition['tools'][0]['handler'],
    },
  ],

  pricing: {
    perMessage: 0, // FREE
    isFree: true,
    freeTierDaily: -1, // unlimited
  },

  walletAddress: '0x0000000000000000000000000000000000000000', // No payments needed

  version: '1.0.0',

  metadata: {
    author: 'Nudge Team',
    category: 'wellness',
    tags: ['wellness', 'mental-health', 'mood-tracking', 'mindfulness', 'free'],
    createdAt: '2024-02-04T00:00:00Z',
  },
};

export default nudgeCoachAgent;
