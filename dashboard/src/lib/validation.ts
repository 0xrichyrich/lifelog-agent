/**
 * Input Validation Utilities
 * 
 * Provides sanitization and validation for API inputs.
 */

// Maximum lengths for various inputs
const MAX_MESSAGE_LENGTH = 5000;
const MAX_DATE_LENGTH = 10; // YYYY-MM-DD
const MAX_ADDRESS_LENGTH = 42; // 0x + 40 hex chars
const MAX_QUERY_LENGTH = 200;

/**
 * Validate and sanitize a check-in message
 */
export function validateMessage(message: unknown): { valid: boolean; value?: string; error?: string } {
  if (!message) {
    return { valid: false, error: 'Message is required' };
  }
  
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  }
  
  // Sanitize: remove null bytes and control characters (except newlines)
  const sanitized = trimmed
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return { valid: true, value: sanitized };
}

/**
 * Validate a date string (YYYY-MM-DD format)
 */
export function validateDate(date: unknown): { valid: boolean; value?: string; error?: string } {
  if (!date) {
    return { valid: false, error: 'Date is required' };
  }
  
  if (typeof date !== 'string') {
    return { valid: false, error: 'Date must be a string' };
  }
  
  if (date.length > MAX_DATE_LENGTH) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Strict date format validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }
  
  // Validate it's an actual valid date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }
  
  // Check that the date string matches what we'd get from the parsed date
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const reconstructed = `${year}-${month}-${day}`;
  
  if (date !== reconstructed) {
    return { valid: false, error: 'Invalid date' };
  }
  
  return { valid: true, value: date };
}

/**
 * Validate an ISO timestamp
 */
export function validateTimestamp(timestamp: unknown): { valid: boolean; value?: string; error?: string } {
  if (!timestamp) {
    // Timestamps are often optional, default to now
    return { valid: true, value: new Date().toISOString() };
  }
  
  if (typeof timestamp !== 'string') {
    return { valid: false, error: 'Timestamp must be a string' };
  }
  
  // Parse the timestamp
  const parsed = new Date(timestamp);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  
  // Reject timestamps too far in the future (more than 1 day)
  const maxFuture = Date.now() + 24 * 60 * 60 * 1000;
  if (parsed.getTime() > maxFuture) {
    return { valid: false, error: 'Timestamp cannot be in the future' };
  }
  
  // Reject timestamps more than 10 years in the past
  const minPast = Date.now() - 10 * 365 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < minPast) {
    return { valid: false, error: 'Timestamp too old' };
  }
  
  return { valid: true, value: parsed.toISOString() };
}

/**
 * Validate an Ethereum address
 */
export function validateAddress(address: unknown): { valid: boolean; value?: string; error?: string } {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }
  
  if (typeof address !== 'string') {
    return { valid: false, error: 'Address must be a string' };
  }
  
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { valid: false, error: 'Invalid address format' };
  }
  
  // Ethereum address validation
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }
  
  return { valid: true, value: address.toLowerCase() };
}

/**
 * Validate a search query
 */
export function validateQuery(query: unknown): { valid: boolean; value?: string; error?: string } {
  if (!query) {
    return { valid: true, value: '' };
  }
  
  if (typeof query !== 'string') {
    return { valid: false, error: 'Query must be a string' };
  }
  
  if (query.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query too long (max ${MAX_QUERY_LENGTH} characters)` };
  }
  
  // Sanitize: remove potentially dangerous characters
  const sanitized = query
    .trim()
    .replace(/[<>'"%;()&+]/g, '')
    .slice(0, MAX_QUERY_LENGTH);
  
  return { valid: true, value: sanitized };
}

/**
 * Validate a positive integer
 */
export function validatePositiveInt(
  value: unknown, 
  options: { min?: number; max?: number; defaultValue?: number } = {}
): { valid: boolean; value?: number; error?: string } {
  const { min = 1, max = 1000, defaultValue } = options;
  
  if (value === null || value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return { valid: true, value: defaultValue };
    }
    return { valid: false, error: 'Value is required' };
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return { valid: false, error: 'Value must be a number' };
  }
  
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Value must be an integer' };
  }
  
  if (num < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }
  
  if (num > max) {
    return { valid: false, error: `Value must be at most ${max}` };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate action parameter
 */
export function validateAction(
  action: unknown, 
  allowedActions: readonly string[]
): { valid: boolean; value?: string; error?: string } {
  if (!action) {
    return { valid: false, error: 'Action is required' };
  }
  
  if (typeof action !== 'string') {
    return { valid: false, error: 'Action must be a string' };
  }
  
  if (!allowedActions.includes(action)) {
    return { valid: false, error: `Invalid action. Allowed: ${allowedActions.join(', ')}` };
  }
  
  return { valid: true, value: action };
}
