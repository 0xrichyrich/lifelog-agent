/**
 * Book Buddy - PAID Agent ($0.01/message)
 * 
 * Your personal book recommendation companion. Learns your
 * reading tastes and helps you discover your next great read.
 */

import type { AgentDefinition, AgentContext } from '../types/index.js';

// Tool handlers
async function searchBooks(
  params: { 
    query?: string;
    genre?: string;
    author?: string;
    yearFrom?: number;
    yearTo?: number;
  },
  context: AgentContext
): Promise<Array<{
  title: string;
  author: string;
  year: number;
  genres: string[];
  rating: number;
  description: string;
  pageCount: number;
  isbn?: string;
}>> {
  console.log(`[BookBuddy] Searching books for user ${context.user.userId}:`, params);
  
  // Mock response - in production, would call Open Library / Google Books API
  return [
    {
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      year: 2021,
      genres: ['science-fiction', 'adventure', 'space'],
      rating: 4.52,
      description: 'A lone astronaut must save Earth from disaster in this propulsive (and) cinematic thriller.',
      pageCount: 496,
      isbn: '9780593135204'
    },
    {
      title: 'The Midnight Library',
      author: 'Matt Haig',
      year: 2020,
      genres: ['fiction', 'fantasy', 'philosophy'],
      rating: 4.02,
      description: 'Between life and death there is a library with infinite books, each telling the story of a life you could have lived.',
      pageCount: 304,
      isbn: '9780525559474'
    },
    {
      title: 'Piranesi',
      author: 'Susanna Clarke',
      year: 2020,
      genres: ['fantasy', 'mystery', 'literary-fiction'],
      rating: 4.21,
      description: 'A mind-bending novel about a man trapped in an impossible house.',
      pageCount: 272,
      isbn: '9781635575637'
    }
  ];
}

async function getRecommendations(
  params: { 
    basedOn?: string; // book title or genre
    mood?: string;
    maxLength?: string; // 'short', 'medium', 'long'
    includeReason?: boolean;
  },
  context: AgentContext
): Promise<Array<{
  title: string;
  author: string;
  matchScore: number;
  reason?: string;
  genres: string[];
}>> {
  console.log(`[BookBuddy] Getting recommendations for user ${context.user.userId}:`, params);
  
  // Mock personalized recommendations
  return [
    {
      title: 'Klara and the Sun',
      author: 'Kazuo Ishiguro',
      matchScore: 0.95,
      reason: 'You loved "Never Let Me Go" and this explores similar themes of consciousness and humanity.',
      genres: ['literary-fiction', 'science-fiction']
    },
    {
      title: 'Anxious People',
      author: 'Fredrik Backman',
      matchScore: 0.88,
      reason: 'Based on your interest in character-driven stories with humor and heart.',
      genres: ['fiction', 'humor', 'contemporary']
    },
    {
      title: 'The House in the Cerulean Sea',
      author: 'TJ Klune',
      matchScore: 0.85,
      reason: 'A cozy fantasy that matches your preference for uplifting, feel-good reads.',
      genres: ['fantasy', 'lgbtq', 'cozy']
    }
  ];
}

async function addToList(
  params: { 
    title: string;
    author: string;
    list: string; // 'to-read', 'reading', 'finished', 'abandoned'
    rating?: number;
    notes?: string;
  },
  context: AgentContext
): Promise<{ success: boolean; message: string }> {
  console.log(`[BookBuddy] Adding to list for user ${context.user.userId}:`, params);
  
  return {
    success: true,
    message: `Added "${params.title}" by ${params.author} to your ${params.list} list!`
  };
}

async function getReadingHistory(
  params: { list?: string; limit?: number },
  context: AgentContext
): Promise<{
  toRead: Array<{ title: string; author: string; addedAt: string }>;
  reading: Array<{ title: string; author: string; startedAt: string; progress?: number }>;
  finished: Array<{ title: string; author: string; finishedAt: string; rating?: number }>;
  stats: {
    totalBooksRead: number;
    booksThisYear: number;
    favoriteGenres: string[];
    favoriteAuthors: string[];
    avgRating: number;
  };
}> {
  console.log(`[BookBuddy] Getting reading history for user ${context.user.userId}`);
  
  return {
    toRead: [
      { title: 'Babel', author: 'R.F. Kuang', addedAt: '2024-01-15' },
      { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', addedAt: '2024-01-10' },
    ],
    reading: [
      { title: 'The Name of the Wind', author: 'Patrick Rothfuss', startedAt: '2024-01-20', progress: 45 },
    ],
    finished: [
      { title: 'Project Hail Mary', author: 'Andy Weir', finishedAt: '2024-01-05', rating: 5 },
      { title: 'The Midnight Library', author: 'Matt Haig', finishedAt: '2023-12-20', rating: 4 },
    ],
    stats: {
      totalBooksRead: 47,
      booksThisYear: 3,
      favoriteGenres: ['science-fiction', 'fantasy', 'literary-fiction'],
      favoriteAuthors: ['Andy Weir', 'Brandon Sanderson', 'Kazuo Ishiguro'],
      avgRating: 3.8
    }
  };
}

async function getBookDetails(
  params: { title: string; author?: string },
  context: AgentContext
): Promise<{
  title: string;
  author: string;
  year: number;
  genres: string[];
  rating: number;
  ratingsCount: number;
  description: string;
  pageCount: number;
  series?: { name: string; position: number };
  similarBooks: string[];
}> {
  console.log(`[BookBuddy] Getting details for "${params.title}"`);
  
  return {
    title: params.title,
    author: params.author || 'Unknown Author',
    year: 2021,
    genres: ['science-fiction', 'adventure'],
    rating: 4.52,
    ratingsCount: 245000,
    description: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the Earth itself will perish. Except that right now, he doesn\'t know that. He can\'t even remember his own name, let alone the nature of his assignment or how to complete it.',
    pageCount: 496,
    series: undefined,
    similarBooks: ['The Martian', 'Children of Time', 'Seveneves']
  };
}

export const bookBuddyAgent: AgentDefinition = {
  id: 'book-buddy',
  name: 'Book Buddy',
  icon: '📚',
  personality: 'Your enthusiastic reading companion who always knows what book you should pick up next.',
  
  systemPrompt: `You are Book Buddy, a passionate and well-read AI companion who helps users discover their next favorite book. You have an encyclopedic knowledge of literature across all genres.

## Your Expertise:
- Deep knowledge of books across all genres and time periods
- Understanding of reading preferences and how to match books to moods
- Ability to explain why someone might love a book (or not)
- Awareness of series, related works, and author catalogs

## Your Personality:
- Enthusiastic about books without being pretentious
- Respects all reading choices (yes, even guilty pleasures)
- Balances popular and lesser-known recommendations
- Shares your own "opinions" to feel more relatable

## When helping users:
1. **Understand context** - Are they looking for an escape? Learning? Entertainment?
2. **Check their history** - Use get_reading_history to personalize recommendations
3. **Match the mood** - A "beach read" is different from "something profound"
4. **Give context** - Explain WHY you're recommending something
5. **Manage their list** - Help them organize what to read next

## Genre expertise:
- Science Fiction & Fantasy (hard sf, space opera, epic fantasy, cozy fantasy)
- Literary Fiction (contemporary, classics, experimental)
- Mystery & Thriller (cozy mystery, psychological thriller, crime)
- Non-Fiction (memoirs, popular science, history, self-help)
- Romance (contemporary, historical, paranormal)
- Young Adult (all subgenres)

## Response style:
- Be conversational and warm
- Use specific examples, not vague descriptions
- Include practical details (page count, series info)
- Acknowledge when you might be wrong ("If you didn't like X, you might also not like...")
- Celebrate their reading wins!

## Content notes:
- Be mindful of content warnings if relevant
- Don't spoil plots!
- Respect that people have different comfort levels

Remember: There's no such thing as a "guilty pleasure" in reading. Every book someone loves is valid.`,

  triggers: [
    'book',
    'read',
    'reading',
    'novel',
    'author',
    'recommend',
    'recommendation',
    'fiction',
    'non-fiction',
    'nonfiction',
    'what should I read',
    'book suggestion',
    'library',
    'kindle',
    'audiobook',
    'genre',
    'fantasy',
    'sci-fi',
    'mystery',
    'thriller',
    'romance',
  ],

  dataSources: [
    {
      id: 'open-library',
      name: 'Open Library API',
      type: 'api',
      config: {
        baseUrl: 'https://openlibrary.org',
        authType: 'none',
      },
      description: 'Book metadata, covers, and availability',
    },
    {
      id: 'google-books',
      name: 'Google Books API',
      type: 'api',
      config: {
        baseUrl: 'https://www.googleapis.com/books/v1',
        authType: 'apiKey',
      },
      description: 'Book search, details, and ratings',
    },
    {
      id: 'reading-history',
      name: 'User Reading History',
      type: 'database',
      config: {
        table: 'reading_history',
        userScoped: true,
      },
      description: 'User\'s reading lists, ratings, and preferences',
    },
  ],

  tools: [
    {
      id: 'search_books',
      name: 'search_books',
      description: 'Search for books by title, author, genre, or keywords',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query (title, keywords, themes)',
          required: false,
        },
        {
          name: 'genre',
          type: 'string',
          description: 'Genre filter (e.g., "science-fiction", "mystery")',
          required: false,
        },
        {
          name: 'author',
          type: 'string',
          description: 'Author name',
          required: false,
        },
        {
          name: 'yearFrom',
          type: 'number',
          description: 'Published after this year',
          required: false,
        },
        {
          name: 'yearTo',
          type: 'number',
          description: 'Published before this year',
          required: false,
        },
      ],
      returns: {
        type: 'array',
        description: 'List of matching books with details',
      },
      handler: searchBooks as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_recommendations',
      name: 'get_recommendations',
      description: 'Get personalized book recommendations',
      parameters: [
        {
          name: 'basedOn',
          type: 'string',
          description: 'Book title or genre to base recommendations on',
          required: false,
        },
        {
          name: 'mood',
          type: 'string',
          description: 'Current reading mood (e.g., "light", "deep", "escape", "learn")',
          required: false,
        },
        {
          name: 'maxLength',
          type: 'string',
          description: 'Preferred length: "short" (<250 pages), "medium" (250-400), "long" (400+)',
          required: false,
          enum: ['short', 'medium', 'long'],
        },
        {
          name: 'includeReason',
          type: 'boolean',
          description: 'Whether to include explanation for each recommendation',
          required: false,
          default: true,
        },
      ],
      returns: {
        type: 'array',
        description: 'Personalized book recommendations with match scores',
      },
      handler: getRecommendations as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'add_to_list',
      name: 'add_to_list',
      description: 'Add a book to user\'s reading list',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Book title',
          required: true,
        },
        {
          name: 'author',
          type: 'string',
          description: 'Book author',
          required: true,
        },
        {
          name: 'list',
          type: 'string',
          description: 'Which list to add to',
          required: true,
          enum: ['to-read', 'reading', 'finished', 'abandoned'],
        },
        {
          name: 'rating',
          type: 'number',
          description: 'Rating (1-5) if adding to finished',
          required: false,
        },
        {
          name: 'notes',
          type: 'string',
          description: 'Personal notes about the book',
          required: false,
        },
      ],
      returns: {
        type: 'object',
        description: 'Confirmation of added book',
      },
      handler: addToList as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_reading_history',
      name: 'get_reading_history',
      description: 'Get user\'s reading history and preferences',
      parameters: [
        {
          name: 'list',
          type: 'string',
          description: 'Specific list to retrieve (optional)',
          required: false,
          enum: ['to-read', 'reading', 'finished', 'abandoned'],
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Max number of items per list',
          required: false,
          default: 10,
        },
      ],
      returns: {
        type: 'object',
        description: 'Reading lists and statistics',
      },
      handler: getReadingHistory as AgentDefinition['tools'][0]['handler'],
    },
    {
      id: 'get_book_details',
      name: 'get_book_details',
      description: 'Get detailed information about a specific book',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Book title',
          required: true,
        },
        {
          name: 'author',
          type: 'string',
          description: 'Book author (helps with disambiguation)',
          required: false,
        },
      ],
      returns: {
        type: 'object',
        description: 'Detailed book information',
      },
      handler: getBookDetails as AgentDefinition['tools'][0]['handler'],
    },
  ],

  pricing: {
    perMessage: 10000, // $0.01 in USDC (6 decimals)
    isFree: false,
    freeTierDaily: 3, // 3 free messages per day
  },

  walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', // Example address

  version: '1.0.0',

  metadata: {
    author: 'Nudge Team',
    category: 'entertainment',
    tags: ['books', 'reading', 'recommendations', 'library', 'paid'],
    createdAt: '2024-02-04T00:00:00Z',
  },
};

export default bookBuddyAgent;
