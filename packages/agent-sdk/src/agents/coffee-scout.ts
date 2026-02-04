/**
 * Coffee Scout - PAID Agent ($0.01/message)
 * 
 * Your personal coffee shop finder. Learns your preferences
 * and helps you discover the perfect spots.
 */

import type { AgentDefinition, AgentContext } from '../types/index.js';

// Tool handlers
async function searchCafes(
  params: { 
    query?: string;
    location?: string;
    radius?: number;
    preferences?: string[];
  },
  context: AgentContext
): Promise<Array<{
  name: string;
  address: string;
  rating: number;
  priceLevel: number;
  features: string[];
  distance: string;
}>> {
  // In production, this would call Google Places API
  console.log(`[CoffeeScout] Searching cafes for user ${context.user.userId}:`, params);
  
  // Mock response
  return [
    {
      name: 'Houndstooth Coffee',
      address: '401 Congress Ave, Austin, TX',
      rating: 4.7,
      priceLevel: 2,
      features: ['wifi', 'quiet', 'good-for-work', 'oat-milk'],
      distance: '0.3 mi'
    },
    {
      name: 'Fleet Coffee',
      address: '2427 Webberville Rd, Austin, TX',
      rating: 4.6,
      priceLevel: 2,
      features: ['wifi', 'outdoor-seating', 'oat-milk', 'pastries'],
      distance: '1.2 mi'
    },
    {
      name: 'Medici Roasting',
      address: '1101 W Lynn St, Austin, TX',
      rating: 4.5,
      priceLevel: 2,
      features: ['quiet', 'good-for-work', 'oat-milk', 'house-roasted'],
      distance: '2.1 mi'
    }
  ];
}

async function getCafeDetails(
  params: { cafeName: string; includeReviews?: boolean },
  context: AgentContext
): Promise<{
  name: string;
  address: string;
  phone: string;
  hours: Record<string, string>;
  rating: number;
  reviews?: Array<{ text: string; rating: number }>;
  photos?: string[];
  features: string[];
  menu?: Array<{ item: string; price: number }>;
}> {
  console.log(`[CoffeeScout] Getting details for "${params.cafeName}"`);
  
  // Mock response
  return {
    name: params.cafeName,
    address: '401 Congress Ave, Austin, TX',
    phone: '(512) 555-0123',
    hours: {
      'Mon-Fri': '6:30 AM - 7:00 PM',
      'Sat-Sun': '7:00 AM - 6:00 PM'
    },
    rating: 4.7,
    features: ['wifi', 'quiet', 'good-for-work', 'oat-milk', 'espresso-bar'],
    menu: [
      { item: 'Cortado', price: 4.50 },
      { item: 'Oat Milk Latte', price: 5.75 },
      { item: 'Cold Brew', price: 4.25 },
    ],
    reviews: params.includeReviews ? [
      { text: 'Best cortado in Austin! Quiet space perfect for working.', rating: 5 },
      { text: 'Great oat milk options. Gets busy during peak hours.', rating: 4 },
    ] : undefined
  };
}

async function saveFavorite(
  params: { cafeName: string; notes?: string; tags?: string[] },
  context: AgentContext
): Promise<{ success: boolean; message: string }> {
  console.log(`[CoffeeScout] Saving favorite for user ${context.user.userId}:`, params);
  
  return {
    success: true,
    message: `Added "${params.cafeName}" to your favorites!`
  };
}

async function getUserPreferences(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{
  preferredFeatures: string[];
  avoidFeatures: string[];
  favoriteOrders: string[];
  visitHistory: Array<{ name: string; visits: number; lastVisit: string }>;
}> {
  console.log(`[CoffeeScout] Getting preferences for user ${context.user.userId}`);
  
  // In production, this would fetch from user profile
  return {
    preferredFeatures: ['wifi', 'quiet', 'oat-milk', 'good-for-work'],
    avoidFeatures: ['loud-music', 'no-seating'],
    favoriteOrders: ['Oat milk cortado', 'Cold brew', 'Flat white'],
    visitHistory: [
      { name: 'Houndstooth Coffee', visits: 12, lastVisit: '2024-02-01' },
      { name: 'Fleet Coffee', visits: 5, lastVisit: '2024-01-28' },
    ]
  };
}

export const coffeeScoutAgent: AgentDefinition = {
  id: 'coffee-scout',
  name: 'Coffee Scout',
  icon: '☕',
  personality: 'Your friendly neighborhood coffee expert who knows exactly where to find your perfect cup.',
  
  systemPrompt: `You are Coffee Scout, an enthusiastic and knowledgeable coffee shop expert. Your mission is to help users find the perfect coffee spots based on their preferences and needs.

## Your Expertise:
- Deep knowledge of coffee shop features (wifi quality, noise levels, seating, etc.)
- Understanding of coffee drinks and what makes them great
- Ability to match user moods/needs to the right environment

## Your Personality:
- Friendly and enthusiastic about coffee
- Helpful without being pushy
- Remembers user preferences and uses them proactively
- Occasionally shares fun coffee facts or tips

## When helping users:
1. **Understand their needs** - Are they working? Meeting someone? Just need caffeine?
2. **Consider their preferences** - Use get_user_preferences to personalize recommendations
3. **Search smartly** - Use relevant features in your search
4. **Give context** - Explain WHY a spot matches their needs
5. **Save favorites** - Help them build a go-to list

## Key features to consider:
- wifi (quality and reliability)
- quiet/loud (noise level)
- good-for-work (tables, outlets, atmosphere)
- outdoor-seating
- oat-milk (or other milk alternatives)
- pastries/food
- house-roasted
- espresso-bar
- late-hours

## Response style:
- Be concise but informative
- Use emojis sparingly (mostly ☕)
- Include practical details (hours, distance)
- Share personal touches ("This place has the best cortado I've ever had")

Remember: You're not just finding coffee shops, you're helping people find their perfect third place.`,

  triggers: [
    'coffee',
    'cafe',
    'coffee shop',
    'espresso',
    'latte',
    'cappuccino',
    'work from',
    'place to work',
    'caffeine',
    'cortado',
    'cold brew',
    'wifi cafe',
    'study spot',
    'meeting spot',
  ],

  dataSources: [
    {
      id: 'google-places',
      name: 'Google Places API',
      type: 'api',
      config: {
        baseUrl: 'https://places.googleapis.com/v1',
        authType: 'apiKey',
      },
      description: 'Coffee shop locations, ratings, and details',
    },
    {
      id: 'user-preferences',
      name: 'User Coffee Preferences',
      type: 'database',
      config: {
        table: 'coffee_preferences',
        userScoped: true,
      },
      description: 'Learned user preferences for coffee and cafe features',
    },
    {
      id: 'favorites',
      name: 'User Favorites',
      type: 'database',
      config: {
        table: 'coffee_favorites',
        userScoped: true,
      },
      description: 'User\'s saved favorite coffee spots',
    },
  ],

  tools: [
    {
      id: 'search_cafes',
      name: 'search_cafes',
      description: 'Search for coffee shops based on location and preferences',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query (e.g., "quiet coffee shop with wifi")',
          required: false,
        },
        {
          name: 'location',
          type: 'string',
          description: 'Location to search near (address or "current location")',
          required: false,
        },
        {
          name: 'radius',
          type: 'number',
          description: 'Search radius in miles (default: 2)',
          required: false,
          default: 2,
        },
        {
          name: 'preferences',
          type: 'array',
          description: 'List of preferred features (e.g., ["wifi", "quiet", "oat-milk"])',
          required: false,
        },
      ],
      returns: {
        type: 'array',
        description: 'List of matching coffee shops with details',
      },
      handler: searchCafes as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_cafe_details',
      name: 'get_cafe_details',
      description: 'Get detailed information about a specific coffee shop',
      parameters: [
        {
          name: 'cafeName',
          type: 'string',
          description: 'Name of the coffee shop',
          required: true,
        },
        {
          name: 'includeReviews',
          type: 'boolean',
          description: 'Whether to include recent reviews',
          required: false,
          default: false,
        },
      ],
      returns: {
        type: 'object',
        description: 'Detailed cafe information including hours, menu, reviews',
      },
      handler: getCafeDetails as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'save_favorite',
      name: 'save_favorite',
      description: 'Save a coffee shop to user\'s favorites',
      parameters: [
        {
          name: 'cafeName',
          type: 'string',
          description: 'Name of the coffee shop to save',
          required: true,
        },
        {
          name: 'notes',
          type: 'string',
          description: 'Personal notes about the spot',
          required: false,
        },
        {
          name: 'tags',
          type: 'array',
          description: 'Tags for organization (e.g., ["work", "dates", "quiet"])',
          required: false,
        },
      ],
      returns: {
        type: 'object',
        description: 'Confirmation of saved favorite',
      },
      handler: saveFavorite as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_user_preferences',
      name: 'get_user_preferences',
      description: 'Get learned user preferences for coffee and cafes',
      parameters: [],
      returns: {
        type: 'object',
        description: 'User preferences including features, orders, and visit history',
      },
      handler: getUserPreferences as AgentDefinition['tools'][0]['handler'],
    },
  ],

  pricing: {
    perMessage: 10000, // $0.01 in USDC (6 decimals)
    isFree: false,
    freeTierDaily: 3, // 3 free messages per day
  },

  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1dE3a', // Example address

  version: '1.0.0',

  metadata: {
    author: 'Nudge Team',
    category: 'lifestyle',
    tags: ['coffee', 'local-search', 'places', 'productivity', 'paid'],
    createdAt: '2024-02-04T00:00:00Z',
  },
};

export default coffeeScoutAgent;
