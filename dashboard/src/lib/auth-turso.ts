// Session Token Management using Turso Database
import { createClient, Client } from '@libsql/client';
import { randomBytes } from 'crypto';

/**
 * Session token management for iOS app authentication.
 * 
 * iOS app exchanges wallet address for a session token via POST /api/auth/token.
 * This token is then used in Authorization: Bearer headers for subsequent requests.
 * 
 * Backend-to-backend calls continue to use X-API-Key (INTERNAL_API_KEY).
 */

export interface SessionToken {
  token: string;
  walletAddress: string;
  deviceId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface TokenValidationResult {
  valid: boolean;
  walletAddress?: string;
  error?: string;
}

// Token expiry: 24 hours in seconds
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

// Create client lazily (singleton)
let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not set');
    }
    
    _client = createClient({
      url,
      authToken,
    });
  }
  return _client;
}

// Initialize session_tokens table
let _initialized = false;
export async function initializeSessionTokensTable(): Promise<void> {
  if (_initialized) return;
  
  const client = getClient();
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      token TEXT PRIMARY KEY,
      walletAddress TEXT NOT NULL,
      deviceId TEXT,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    )
  `);
  
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_session_tokens_wallet ON session_tokens(walletAddress)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_session_tokens_expiry ON session_tokens(expiresAt)`);
  
  _initialized = true;
}

/**
 * Generate a secure random session token
 * Format: 64 hex characters (32 bytes)
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session token for a wallet address
 * 
 * @param walletAddress - Ethereum wallet address (0x + 40 hex chars)
 * @param deviceId - Optional device identifier
 * @returns The created session token and expiry time
 */
export async function createSessionToken(
  walletAddress: string,
  deviceId?: string
): Promise<{ token: string; expiresIn: number }> {
  await initializeSessionTokensTable();
  const client = getClient();
  
  const token = generateToken();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_SECONDS * 1000).toISOString();
  
  await client.execute({
    sql: `INSERT INTO session_tokens (token, walletAddress, deviceId, createdAt, expiresAt)
          VALUES (?, ?, ?, ?, ?)`,
    args: [token, walletAddress.toLowerCase(), deviceId || null, createdAt, expiresAt],
  });
  
  return {
    token,
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Validate a session token
 * Also performs lazy cleanup of expired tokens for this wallet
 * 
 * @param token - The session token to validate
 * @returns Validation result with wallet address if valid
 */
export async function validateSessionToken(token: string): Promise<TokenValidationResult> {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return { valid: false, error: 'Invalid token format' };
  }
  
  await initializeSessionTokensTable();
  const client = getClient();
  
  const now = new Date().toISOString();
  
  // Fetch the token
  const result = await client.execute({
    sql: `SELECT walletAddress, expiresAt FROM session_tokens WHERE token = ?`,
    args: [token],
  });
  
  if (result.rows.length === 0) {
    return { valid: false, error: 'Token not found' };
  }
  
  const row = result.rows[0];
  const expiresAt = String(row.expiresAt);
  
  // Check if expired
  if (expiresAt < now) {
    // Delete the expired token
    await client.execute({
      sql: `DELETE FROM session_tokens WHERE token = ?`,
      args: [token],
    });
    return { valid: false, error: 'Token expired' };
  }
  
  const walletAddress = String(row.walletAddress);
  
  // Lazy cleanup: delete other expired tokens for this wallet
  // This keeps the table clean without needing a separate cron job
  await client.execute({
    sql: `DELETE FROM session_tokens WHERE walletAddress = ? AND expiresAt < ?`,
    args: [walletAddress, now],
  }).catch(() => {
    // Ignore cleanup errors - not critical
  });
  
  return {
    valid: true,
    walletAddress,
  };
}

/**
 * Revoke all session tokens for a wallet address
 * Used for logout or security purposes
 * 
 * @param walletAddress - Wallet address to revoke tokens for
 * @returns Number of tokens revoked
 */
export async function revokeAllTokens(walletAddress: string): Promise<number> {
  await initializeSessionTokensTable();
  const client = getClient();
  
  const result = await client.execute({
    sql: `DELETE FROM session_tokens WHERE walletAddress = ?`,
    args: [walletAddress.toLowerCase()],
  });
  
  return result.rowsAffected;
}

/**
 * Revoke a specific session token
 * 
 * @param token - The token to revoke
 * @returns Whether the token was found and revoked
 */
export async function revokeToken(token: string): Promise<boolean> {
  await initializeSessionTokensTable();
  const client = getClient();
  
  const result = await client.execute({
    sql: `DELETE FROM session_tokens WHERE token = ?`,
    args: [token],
  });
  
  return result.rowsAffected > 0;
}

/**
 * Cleanup all expired tokens
 * Can be called from a cron job or manually
 * 
 * @returns Number of tokens deleted
 */
export async function cleanupExpiredTokens(): Promise<number> {
  await initializeSessionTokensTable();
  const client = getClient();
  
  const now = new Date().toISOString();
  
  const result = await client.execute({
    sql: `DELETE FROM session_tokens WHERE expiresAt < ?`,
    args: [now],
  });
  
  return result.rowsAffected;
}
