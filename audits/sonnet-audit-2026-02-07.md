# Security Audit — Nudge Backend (2026-02-07) — Opus

**Auditor:** Claude Opus 4 (AI Security Audit)  
**Date:** February 7, 2026  
**Scope:** Next.js Dashboard API routes, XP/Redemption system, Libraries, Middleware  
**Previous Audits:** Feb 2 (Opus/Sonnet), Feb 4 (Opus/Sonnet)  
**Context:** Moltiverse Hackathon — auth relaxed for demo purposes

---

## Summary

**Overall Score: 52/100** (Down from 68/100 on Feb 4 — new attack surface from XP/Redemption system)

The addition of the XP award, redemption, and weekly pool systems introduces substantial new attack surface. The core issue: **these systems have real economic value** (XP converts to $NUDGE tokens, the wallet/claim endpoint performs real on-chain token transfers) yet have **zero authentication**. The previous audit's critical issues (C1: hardcoded API key in iOS, C2: Privy credentials in source) appear to still be present. New critical issues center on the unauthenticated XP minting, redemption race conditions, and the completely unauthenticated pool distribution trigger.

| Severity | Count | Notes |
|----------|-------|-------|
| 🔴 Critical | 4 | XP/Redemption economics exploitable, wallet/claim drains tokens |
| 🟠 High | 5 | Missing auth on most endpoints, pool distribution abuse |
| 🟡 Medium | 7 | Race conditions, information leakage, CORS gaps |
| 🟢 Low | 5 | Logging, minor validation gaps |
| ℹ️ Informational | 4 | Architecture observations |

---

## 🔴 Critical Issues

### C-1: Unauthenticated XP Award Endpoint Allows Unlimited XP Minting

**File:** `dashboard/src/app/(dashboard)/api/xp/award/route.ts`  
**Lines:** 15–16 (comment: "Auth removed for hackathon demo")  
**Severity:** CRITICAL  

**Finding:**  
The XP award endpoint has **no authentication at all**. Anyone can POST to `/api/xp/award` with any `userId` and any valid `XPActivity` to mint arbitrary XP:

```typescript
export async function POST(request: NextRequest) {
  // Note: Auth removed for hackathon demo - XP is gamification, not sensitive
  // TODO: Re-enable auth with user sessions post-hackathon
  
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.write);
  if (rateLimitError) return rateLimitError;
  // ...
  const result = await awardXP(userId, activity as XPActivity, metadata);
```

The comment "XP is gamification, not sensitive" is **factually incorrect** — XP converts to $NUDGE tokens via `/api/xp/redeem` at real economic rates. This is a direct money printer.

**Attack scenario:**
1. Script sends `POST /api/xp/award` with `{"userId":"attacker", "activity":"STREAK_30DAY"}` (200 XP each)
2. Rate limit: 10/min → attacker earns 2,000 XP/min = 120,000 XP/hour
3. At level 11+ rate (5 XP = 1 $NUDGE), that's 24,000 $NUDGE/hour
4. Daily cap is 250 $NUDGE per user, but attacker can use **unlimited fake userIds** then redeem from each

**Impact:**
- Unlimited $NUDGE token minting
- Weekly pool share manipulation (inflate own XP to claim majority of 50,000 $NUDGE pool)
- Complete destruction of XP economy fairness

**Recommendation:**
1. **Immediately** add `validateApiKey()` or better, server-side-only XP award (never expose to client)
2. XP should only be awarded by backend logic (check-in created → auto-award), never by a direct API call from client
3. If must be client-callable, require user session auth + verify the activity actually happened

---

### C-2: Unauthenticated Wallet Claim Endpoint Transfers Real Tokens

**File:** `dashboard/src/app/(dashboard)/api/wallet/claim/route.ts`  
**Lines:** Entire file  
**Severity:** CRITICAL  

**Finding:**  
This is no longer mock data (as noted in the Feb 4 audit). The endpoint now performs **real on-chain ERC20 token transfers** using the platform's private key, with **zero authentication**:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, amount: requestedAmount } = body;
    // ...
    const claimAmount = requestedAmount || '100'; // Default 100 NUDGE for demo
    // ...
    const txHash = await walletClient.sendTransaction({
      to: NUDGE_TOKEN,
      data,  // ERC20 transfer to attacker's address
      chain: monadTestnet,
    });
```

**Critical issues in this single endpoint:**
1. **No authentication** — anyone can call it
2. **Attacker-controlled `amount`** — the `requestedAmount` from the body is used directly with no upper bound validation
3. **No verification of entitlement** — no check that the user earned any rewards
4. **No rate limiting** — no `checkRateLimit()` call
5. **Platform private key used for signing** — drains the platform wallet

**Attack:**
```bash
curl -X POST https://littlenudge.app/api/wallet/claim \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xATTACKER...", "amount":"999999999"}'
```

This transfers 999,999,999 $NUDGE tokens from the platform wallet to the attacker.

**Impact:** Complete draining of the platform's $NUDGE token treasury.

**Recommendation:**
1. **Immediately** add authentication
2. Remove attacker-controlled `amount` — only allow claiming earned, unclaimed rewards from database
3. Add rate limiting
4. Add per-address claim limits
5. Require signed message proving address ownership

---

### C-3: Daily Redemption Cap Bypassable via Multiple UserIds

**File:** `dashboard/src/lib/xp-turso.ts` (function `redeemXPForNudge`, line ~320)  
**File:** `dashboard/src/app/(dashboard)/api/xp/redeem/route.ts`  
**Severity:** CRITICAL  

**Finding:**  
The daily cap of 250 $NUDGE is enforced per-userId:

```typescript
export async function getDailyRedemptionTotal(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(nudgeAwarded), 0) as total 
          FROM nudge_redemptions 
          WHERE userId = ? AND DATE(createdAt) = ?`,
    args: [userId, today],
  });
  return Number(result.rows[0]?.total ?? 0);
}
```

But since there's no authentication, `userId` is client-supplied and arbitrary. An attacker can:
1. Award XP to userId "attacker-1", "attacker-2", ..., "attacker-N"
2. Redeem 250 $NUDGE from each
3. Total: N × 250 $NUDGE per day, with no upper bound on N

Combined with C-1, this makes the daily cap completely meaningless.

**Impact:** Daily cap bypass, unlimited $NUDGE extraction.

**Recommendation:**
1. Tie userId to authenticated sessions (Privy wallet address as userId)
2. Add IP-based secondary cap as defense-in-depth
3. Implement global daily distribution cap across all users

---

### C-4: Unauthenticated Weekly Pool Distribution Trigger

**File:** `dashboard/src/app/(dashboard)/api/xp/pool/route.ts` (POST handler)  
**Lines:** 60–64 (comment: "For hackathon demo, no auth required")  
**Severity:** CRITICAL  

**Finding:**
```typescript
export async function POST(request: NextRequest) {
  // Rate limiting - use token limit since this modifies state
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  try {
    const result = await distributeWeeklyPool();
```

Anyone can trigger the 50,000 $NUDGE weekly pool distribution at any time. Combined with C-1 (fake XP minting), an attacker can:
1. Mint enormous XP for themselves early in the week
2. Trigger distribution immediately
3. Claim the vast majority of 50,000 $NUDGE

**Also:** The `distributeWeeklyPool()` function in `xp-turso.ts` has no idempotency protection across different weeks. The check `WHERE distributed = 0` only prevents re-distributing the same pool, but an attacker can trigger distribution early (e.g., Monday) to capture the pool before legitimate users earn XP throughout the week.

**Impact:** Theft of entire weekly pool (50,000 $NUDGE).

**Recommendation:**
1. Add strong authentication (admin-only or cron secret)
2. Add time-gate: pool can only be distributed after `weekEnd` date
3. Add minimum participant threshold
4. Consider making distribution automatic via cron instead of API-triggered

---

## 🟠 High Issues

### H-1: Agent Message Endpoint Has No Authentication

**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts`  
**Severity:** HIGH  

**Finding:**  
No `validateApiKey()` call. The `nudge-coach` agent (free tier) is completely unprotected. Anyone can send unlimited messages, consuming OpenAI API credits.

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json() as MessageRequest;
    // No auth check anywhere
```

**Impact:**
- Unlimited OpenAI API cost burn (gpt-4o-mini at ~$0.15/1M input tokens)
- No accountability for abuse
- Prompt injection attacks against the AI agents

**Recommendation:** Add `validateApiKey()` or user session auth. At minimum, add IP-based rate limiting specific to this endpoint (it currently has none).

---

### H-2: No Authentication on 13 of 23 API Endpoints

**Severity:** HIGH  

**Endpoints with NO authentication:**

| Endpoint | Method | Risk |
|----------|--------|------|
| `/api/checkins` | GET, POST | Data read/write |
| `/api/activities` | GET | Data read |
| `/api/agents` | GET | Low risk |
| `/api/agents/[agentId]/message` | POST | OpenAI cost burn |
| `/api/health` | GET | Info disclosure |
| `/api/insights` | GET | Data read |
| `/api/wallet/balance` | GET | Privacy leak |
| `/api/wallet/history` | GET | Privacy leak |
| `/api/wallet/claim` | POST | **Real token transfer** |
| `/api/marketplace/agents` | GET | Low risk |
| `/api/xp/award` | POST | **XP minting** |
| `/api/xp/status` | GET | Data read |
| `/api/xp/history` | GET | Data read |
| `/api/xp/leaderboard` | GET | Data read |
| `/api/xp/redeem` | GET, POST | **Token redemption** |
| `/api/xp/pool` | GET, POST | **Pool distribution** |

**Endpoints WITH authentication (`validateApiKey`):**

| Endpoint | Method |
|----------|--------|
| `/api/summaries` | GET |
| `/api/token` | GET, POST |
| `/api/transcribe` | POST |
| `/api/export` | GET |
| `/api/acp` | GET, POST |
| `/api/goals` | GET (commented out) |
| `/api/marketplace/submit` | POST (uses x402 payment) |

The most sensitive operations (XP award, token redemption, wallet claim, pool distribution) are the ones **without** auth.

**Recommendation:** Add authentication to all state-changing endpoints at minimum. The XP/wallet/redemption endpoints should require authenticated user sessions.

---

### H-3: Replay Protection for x402 Payments Is In-Memory Only

**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts`  
**Lines:** 90–92  
**Severity:** HIGH  

```typescript
const processedTxHashes = new Set<string>();
```

The replay protection set resets on every cold start and is not shared across serverless instances. An attacker can:
1. Make a legitimate $NUDGE payment once
2. Wait for a cold start or hit a different instance
3. Reuse the same txHash for unlimited free messages

The cleanup logic (lines 108-115) also deletes the **oldest** half of entries when the set exceeds 10,000, meaning legitimate entries can be removed, re-enabling replays.

**Impact:** Paid agent usage without paying after the first transaction.

**Recommendation:**
- Store processed tx hashes in Turso database (already available)
- Add a `used_payment_txhashes` table with `txHash TEXT UNIQUE`
- Or use Upstash Redis for fast dedup

---

### H-4: Community Agent System Prompts Accessible via Shared Global State

**File:** `dashboard/src/app/(dashboard)/api/marketplace/submit/route.ts` (lines 35–37)  
**File:** `dashboard/src/app/(dashboard)/api/marketplace/agents/route.ts` (line 24)  
**Severity:** HIGH  

While `marketplace/agents` strips `systemPrompt` from the response (good), the `marketplace/submit` GET endpoint does **not**:

```typescript
// marketplace/submit/route.ts - GET handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const agentId = searchParams.get('id');

  const agents = loadCommunityAgents();

  if (agentId) {
    const agent = agents.find(a => a.id === agentId);
    // Returns FULL agent object including systemPrompt
    return NextResponse.json({ agent });
  }

  if (wallet) {
    const userAgents = agents.filter(...);
    // Returns FULL agent objects including systemPrompt
    return NextResponse.json({ agents: userAgents, total: userAgents.length });
  }

  return NextResponse.json({ agents, total: agents.length });
  // Returns ALL community agents with systemPrompts exposed
}
```

Anyone can `GET /api/marketplace/submit` to see all community agents' system prompts (intellectual property of the creators).

**Impact:** IP theft of agent system prompts, enables prompt injection tailored to specific agents.

**Recommendation:** Strip `systemPrompt` from all GET responses in `marketplace/submit/route.ts`, same as `marketplace/agents/route.ts` already does.

---

### H-5: Goals Endpoint Reads from Filesystem (Potential Path Traversal Risk)

**File:** `dashboard/src/app/(dashboard)/api/goals/route.ts`  
**Lines:** 18–30  
**Severity:** HIGH  

```typescript
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const goalsPath = path.resolve(dataDir, 'goals.json');

const expectedPrefix = path.resolve(dataDir);
if (!goalsPath.startsWith(expectedPrefix)) {
  console.error('Path traversal attempt detected');
  return NextResponse.json({ goals: [], source: 'empty' });
}

if (fs.existsSync(goalsPath)) {
  const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
```

While there's a path traversal check for the constructed path, the `DATA_DIR` env var itself could be manipulated in certain deployment scenarios. More importantly, `fs.readFileSync` on Vercel's serverless can expose bundled files. The `path.join(process.cwd(), '..', 'data')` resolves to a parent of the deployment directory.

Additionally, the authentication is **commented out**:
```typescript
// Auth removed for public access - rate limiting only
// if (authError) return authError;
```

Combined with the `fs` import and filesystem read, this is concerning. The `goals.json` content is parsed without schema validation — malicious JSON could cause issues downstream.

**Impact:** Information disclosure if DATA_DIR is misconfigured; unauthenticated access to goals data.

**Recommendation:**
1. Move goals to database (Turso) instead of filesystem
2. Re-enable authentication
3. Add JSON schema validation on the parsed data
4. Remove `fs` import — filesystem operations are fragile on serverless

---

## 🟡 Medium Issues

### M-1: Race Condition in XP Redemption (TOCTOU)

**File:** `dashboard/src/lib/xp-turso.ts` (function `redeemXPForNudge`)  
**Lines:** ~325–375  
**Severity:** MEDIUM  

The redemption function has a classic Time-of-Check-to-Time-of-Use (TOCTOU) vulnerability:

```typescript
// Step 1: CHECK - Read user's current XP
const user = await getOrCreateUser(userId);

// Step 2: CHECK - Read daily redemption total
const dailyRedeemed = await getDailyRedemptionTotal(userId);

// ... calculations ...

// Step 3: USE - Deduct XP (separate query, no transaction)
await client.execute({
  sql: `UPDATE user_xp SET currentXP = currentXP - ?, lastActivityAt = ? WHERE userId = ?`,
  args: [actualXpSpent, now, userId],
});

// Step 4: USE - Record redemption (separate query)
await client.execute({
  sql: `INSERT INTO nudge_redemptions (userId, xpSpent, nudgeAwarded, ...) VALUES (?, ?, ?, ?, ?, ?)`,
  args: [userId, actualXpSpent, finalNudge, streakMultiplier, user.level, now],
});
```

If two concurrent requests arrive:
1. Both read `currentXP = 1000` and `dailyRedeemed = 0`
2. Both pass the balance/cap checks
3. Both deduct XP and record redemptions
4. User with 1000 XP redeems 2000 XP worth of $NUDGE
5. `currentXP` goes negative (no CHECK constraint on the column)

**Impact:** Double-spending XP, bypassing daily cap via concurrent requests.

**Recommendation:**
1. Wrap check-and-deduct in a database transaction
2. Add a `CHECK (currentXP >= 0)` constraint on `user_xp` table
3. Use `UPDATE ... SET currentXP = currentXP - ? WHERE currentXP >= ?` (conditional update)
4. Use `RETURNING` to atomically get the new value

Example fix:
```typescript
const result = await client.execute({
  sql: `UPDATE user_xp SET currentXP = currentXP - ? 
        WHERE userId = ? AND currentXP >= ?`,
  args: [actualXpSpent, userId, actualXpSpent],
});
if (result.rowsAffected === 0) {
  return { success: false, error: 'Insufficient XP (concurrent redemption)' };
}
```

---

### M-2: In-Memory Rate Limiting Ineffective on Vercel Serverless

**File:** `dashboard/src/lib/rate-limit.ts`  
**Severity:** MEDIUM (Previously flagged — still not fixed)  

The rate limiter uses `new Map<string, RateLimitEntry>()` which resets on cold starts and isn't shared across instances. On Vercel, this means:
- Each function instance has its own rate limit state
- Cold starts (common after ~5 min idle) reset all limits
- Concurrent requests may hit different instances

Every rate limit in the application is effectively advisory, not enforceable. This amplifies the impact of all other unauthenticated endpoints.

**Recommendation:** Use Upstash Redis (`@upstash/ratelimit`) — designed for Vercel serverless.

---

### M-3: Error Information Leakage Across Multiple Endpoints

**Severity:** MEDIUM  

Multiple endpoints expose raw error messages and stack traces:

| File | Line | Leak |
|------|------|------|
| `checkins/route.ts` | 68 | `details: error instanceof Error ? error.message : 'Unknown error'` |
| `checkins/route.ts` | 92 | Same pattern in GET |
| `activities/route.ts` | 46 | `error: error instanceof Error ? error.message : 'Unknown error'` |
| `insights/route.ts` | 107 | Same pattern |
| `export/route.ts` | 35 | `details: error instanceof Error ? error.message : 'Unknown error'` |
| `wallet/claim/route.ts` | 94 | `error: 'Transaction failed: ' + (txError.shortMessage || txError.message)` |
| `checkins/route.ts` | 38–42 | Database setup instructions exposed: `'Visit /api/setup to initialize the database...'` |

The `wallet/claim` error at line 94 is particularly concerning — `txError.message` from `viem` can contain RPC URLs, wallet addresses, nonce values, and gas estimation details.

**Impact:** Aids attackers in understanding internal architecture, database configuration, and blockchain interaction details.

**Recommendation:**  
- Return generic error messages to client: `{ error: "Internal server error" }`
- Log full details server-side only
- Never forward third-party library error messages to clients

---

### M-4: `userId` Is Not Validated or Sanitized in XP Routes

**Files:** All XP routes (`xp/award`, `xp/status`, `xp/history`, `xp/redeem`, `xp/pool`)  
**Severity:** MEDIUM  

The `userId` parameter is accepted without any length limit, format validation, or sanitization:

```typescript
// xp/award/route.ts
const { userId, activity, metadata = {} } = body;
if (!userId) { ... }  // Only checks existence, not format

// xp/status/route.ts
const userId = searchParams.get('userId');
if (!userId) { ... }
```

While parameterized queries prevent SQL injection, extremely long userIds (e.g., 1MB strings) could:
- Cause excessive database storage consumption
- Slow down queries on non-indexed text comparisons
- Be used for enumeration attacks

**Recommendation:**
- Add `userId` validation: max 100 chars, alphanumeric + basic punctuation
- Consider using `validateMessage()` or a new `validateUserId()` function
- Ideally, derive userId from authenticated session (not client-supplied)

---

### M-5: Health Endpoint Exposes Version Information

**File:** `dashboard/src/app/(dashboard)/api/health/route.ts`  
**Line:** 9  
**Severity:** MEDIUM  

```typescript
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
}
```

Exposing the application version allows attackers to identify known vulnerabilities for that specific version.

**Recommendation:** Return only `{ status: 'healthy' }` for public access. Include version in internal monitoring only.

---

### M-6: Inconsistent Platform Wallet Addresses

**Severity:** MEDIUM (Previously flagged — still not fixed)  

| File | Address | Usage |
|------|---------|-------|
| `agents/[agentId]/message/route.ts:12` | `0x4f9e2dc880328facc0ebc8f3a6b0e9b0f0e0e0e0` (fallback) | Payment receipt |
| `marketplace/submit/route.ts:24` | `0x2390C495896C78668416859d9dE84212fCB10801` | Listing fee |
| `payment-verification.ts:14` | `0x2390C495896C78668416859d9dE84212fCB10801` | Verification |
| `wallet/claim/route.ts:16` | `0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F` (token contract) | Token transfers |

The fallback `0x4f9e...e0e0` is obviously a placeholder (repeating hex pattern). If `PLATFORM_WALLET_ADDRESS` env var is not set, payments go to a random/uncontrolled address.

**Recommendation:** 
- Centralize all wallet addresses in env vars with startup validation
- Fail hard if addresses are not configured (no fallbacks for financial operations)

---

### M-7: Marketplace Agent Submission Has No Duplicate Payment Check

**File:** `dashboard/src/app/(dashboard)/api/marketplace/submit/route.ts`  
**Severity:** MEDIUM  

The marketplace submission verifies the payment on-chain, but doesn't track which tx hashes have already been used for submissions. An attacker can:
1. Submit agent A with valid tx hash
2. Submit agent B with the same tx hash
3. Both succeed — only one payment for two listings

**Recommendation:** Store used payment tx hashes in database, check before accepting new submissions.

---

## 🟢 Low Issues

### L-1: Conversation History Unbounded Memory Growth

**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts`  
**Line:** 55  
**Severity:** LOW  

```typescript
const conversations: Map<string, { role: string; content: string }[]> = new Map();
```

The Map grows without bound as new conversations are created. Each conversation key is `${userId}_${agentId}_${convId}`. With no eviction:
- Memory usage grows linearly with unique conversations
- No TTL means abandoned conversations persist until cold start
- An attacker creating many conversationIds could exhaust memory

**Recommendation:** Use LRU cache with max size and TTL, or move to database.

---

### L-2: `parseInt` Without Radix Validation in XP Routes

**File:** `dashboard/src/app/(dashboard)/api/xp/history/route.ts` (line 19)  
**File:** `dashboard/src/app/(dashboard)/api/xp/leaderboard/route.ts` (line 17)  
**Severity:** LOW  

```typescript
const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
```

While `parseInt` with a default value is relatively safe, `NaN` from malformed input propagates:
- `parseInt("abc")` → `NaN`
- `Math.min(NaN, 100)` → `NaN`
- `NaN` passed to SQL query as limit

The `@libsql/client` should handle this gracefully, but it's defensive programming to validate first.

**Recommendation:** Use `validatePositiveInt()` (already available in `validation.ts`) consistently across all XP routes.

---

### L-3: Debug Logging of Sensitive Information

**Files:** Multiple  
**Severity:** LOW  

| File | Line | Data Logged |
|------|------|-------------|
| `payment-verification.ts` | 85 | `from`, `to`, `amount`, `txHash` |
| `payment-verification.ts` | 113 | Same for ERC20 |
| `agents/[agentId]/message/route.ts` | 116 | txHash, agentId, amount |
| `wallet/claim/route.ts` | 67 | Address, amount, txHash |

Payment-related logs contain transaction details that could be sensitive in production log aggregators (Vercel logs are accessible via dashboard).

**Recommendation:** Use structured logging with log levels; mark payment logs as `debug` level, strip in production.

---

### L-4: Missing `Content-Type` Validation on POST Endpoints

**Severity:** LOW  

POST endpoints parse `request.json()` without first checking `Content-Type: application/json`. Sending non-JSON content types would trigger an unhandled parse error caught by the outer try/catch, but the error response may vary.

**Recommendation:** Add early check:
```typescript
if (!request.headers.get('content-type')?.includes('application/json')) {
  return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
}
```

---

### L-5: Leaderboard UserId Masking Is Weak

**File:** `dashboard/src/app/(dashboard)/api/xp/leaderboard/route.ts` (line 36)  
**Severity:** LOW  

```typescript
function maskUserId(userId: string): string {
  if (userId.length <= 4) return '****';
  return `${userId.slice(0, 2)}...${userId.slice(-2)}`;
}
```

For Ethereum-style addresses (`0x1234...abcd`), the first 2 chars are always `0x` and the last 2 narrow the address space significantly. For short usernames, 2+2 visible chars may be enough to identify users.

**Recommendation:** Show fewer characters or use a hash-based pseudonym.

---

## ℹ️ Informational

### I-1: CORS Allows `localhost` Origins in Production

**File:** `dashboard/src/middleware.ts` (lines 14–15)  

```typescript
const ALLOWED_ORIGINS = [
  // ...production URLs...
  'http://localhost:3000',
  'http://localhost:3001',
];
```

This isn't exploitable from a remote attacker's perspective (browsers won't send `http://localhost` as origin for non-localhost requests), but it's a hygiene issue. Should use `NODE_ENV` to conditionally include development origins.

---

### I-2: `unsafe-eval` in Content Security Policy

**File:** `dashboard/src/middleware.ts` (line 33)  

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
```

`unsafe-eval` is required by some frameworks (Next.js dev mode) but weakens XSS protection in production. If possible, use `nonce`-based CSP for scripts.

---

### I-3: Weekly Pool Distribution Has No Minimum Activity Threshold

**File:** `dashboard/src/lib/xp-turso.ts` (function `distributeWeeklyPool`)  

A user who earns 1 XP gets a proportional share of the 50,000 $NUDGE pool. If only one user is active in a week with 1 XP, they get the entire 50,000 $NUDGE. No minimum participation threshold exists.

**Recommendation:** Require minimum weekly XP (e.g., 50 XP) to qualify for pool distribution.

---

### I-4: `timingSafeEqual` in `auth.ts` Short-Circuits on Length

**File:** `dashboard/src/lib/auth.ts` (line 46)  

```typescript
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;  // Early return reveals key length
  }
```

The length check short-circuits, technically leaking the length of the API key. In practice this is low risk (key length is not highly sensitive), but Node.js `crypto.timingSafeEqual` with Buffer padding would be more correct.

---

## Security Strengths ✅

| Area | Assessment | Notes |
|------|-----------|-------|
| SQL Injection | ✅ **Strong** | All Turso queries use parameterized args throughout `db-turso.ts` and `xp-turso.ts` |
| Input Validation Library | ✅ **Good** | `validation.ts` is comprehensive (messages, dates, addresses, actions) |
| Payment Verification | ✅ **Improved** | `payment-verification.ts` does real on-chain verification via Monad RPC |
| CORS Config | ✅ **Good** | Origin allowlist, proper Vary header |
| Security Headers | ✅ **Good** | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Auth Module Design | ✅ **Good** | Constant-time comparison, Bearer + X-API-Key support |
| File Upload Validation | ✅ **Good** | Transcribe endpoint validates size and MIME type |
| Marketplace Prompt Stripping | ✅ **Good** | `marketplace/agents` strips systemPrompt from community agents |

---

## Recommendations — Priority Order

### 🚨 Before Any Public Demo (Critical)

1. **Add auth to `/api/wallet/claim`** — This transfers real tokens. One curl command drains the treasury. (C-2)
2. **Add auth to `/api/xp/award`** — Or better, make it internal-only. (C-1)
3. **Add auth + time-gate to `/api/xp/pool` POST** — Don't allow public pool distribution triggers. (C-4)
4. **Add auth to `/api/xp/redeem`** — Tie redemptions to authenticated users, not client-supplied IDs. (C-3)
5. **Remove attacker-controlled `amount` from wallet/claim** — Never let the client specify transfer amounts. (C-2)

### Before Production Launch

6. **Wrap redemption in database transaction** — Fix TOCTOU race condition. (M-1)
7. **Persist rate limiting** — Upstash Redis or Vercel KV. (M-2)
8. **Persist x402 replay protection** — Store used tx hashes in Turso. (H-3)
9. **Strip systemPrompt from marketplace/submit GET** — Protects creator IP. (H-4)
10. **Centralize wallet addresses** — Single env var, fail-hard if missing. (M-6)
11. **Sanitize error responses** — Never forward library errors to clients. (M-3)

### Infrastructure Hardening

12. Add global rate limits at CDN/edge layer (Vercel Edge Config or Cloudflare)
13. Add audit logging for all financial operations (XP award, redeem, claim, pool distribute)
14. Implement user session management (Privy auth → JWT → server-side session)
15. Add database constraints (`CHECK (currentXP >= 0)`, unique constraints on payment tx hashes)
16. Set up monitoring/alerting for anomalous XP minting or redemption patterns

---

## Files Reviewed

### API Routes (23 files)
- [x] `checkins/route.ts` — Rate limited, no auth, validated ✓
- [x] `activities/route.ts` — Rate limited, no auth, validated ✓
- [x] `agents/route.ts` — Static data, safe ✓
- [x] `agents/[agentId]/message/route.ts` — **No auth, payment replay risk**
- [x] `goals/route.ts` — Auth commented out, fs read
- [x] `health/route.ts` — Version exposure
- [x] `insights/route.ts` — Rate limited, no auth
- [x] `summaries/route.ts` — Auth ✓, rate limited ✓
- [x] `token/route.ts` — Auth ✓, validated ✓
- [x] `transcribe/route.ts` — Auth ✓, file validation ✓
- [x] `export/route.ts` — Auth ✓, rate limited ✓
- [x] `acp/route.ts` — Auth ✓, validated ✓
- [x] `wallet/balance/route.ts` — **No auth, mock data**
- [x] `wallet/history/route.ts` — **No auth, mock data**
- [x] `wallet/claim/route.ts` — **🔴 No auth, REAL token transfers**
- [x] `marketplace/submit/route.ts` — x402 payment, **leaks system prompts on GET**
- [x] `marketplace/agents/route.ts` — Strips prompts ✓
- [x] `xp/award/route.ts` — **🔴 No auth, mints XP freely**
- [x] `xp/status/route.ts` — No auth, rate limited
- [x] `xp/history/route.ts` — No auth, weak input validation
- [x] `xp/leaderboard/route.ts` — No auth, masks userIds
- [x] `xp/redeem/route.ts` — **🔴 No auth, redeems real value**
- [x] `xp/pool/route.ts` — **🔴 No auth, triggers 50K distribution**

### Libraries (5 files)
- [x] `lib/db-turso.ts` — Parameterized queries ✓, good patterns
- [x] `lib/xp-turso.ts` — Parameterized queries ✓, **race condition in redeem**
- [x] `lib/rate-limit.ts` — In-memory only, ineffective on serverless
- [x] `lib/validation.ts` — Comprehensive, well-designed ✓
- [x] `lib/auth.ts` — Good timing-safe comparison ✓
- [x] `lib/payment-verification.ts` — Real on-chain verification ✓

### Middleware
- [x] `middleware.ts` — CORS ✓, security headers ✓, localhost in prod origins

---

## Comparison with Previous Audits

| Issue | Feb 4 Status | Feb 7 Status | Notes |
|-------|-------------|-------------|-------|
| Hardcoded API key in iOS | 🔴 Critical | Not re-audited | iOS out of scope |
| Privy credentials in source | 🔴 Critical | Not re-audited | iOS out of scope |
| Agent message no auth | 🟠 High | 🟠 Still open | H-1 |
| Wallet claim no auth | 🟠 High (mock) | 🔴 **Escalated** (real transfers) | C-2 |
| Wallet balance no auth | 🟠 High | 🟠 Still open | H-2 |
| x402 payment verification | 🟡 Medium (fake) | ✅ **Fixed** | Real on-chain verification |
| In-memory rate limiting | 🟡 Medium | 🟡 Still open | M-2 |
| Platform wallet addresses | 🟡 Medium | 🟡 Still open | M-6 |
| New: XP award no auth | — | 🔴 **NEW** | C-1 |
| New: Daily cap bypass | — | 🔴 **NEW** | C-3 |
| New: Pool distribution trigger | — | 🔴 **NEW** | C-4 |
| New: Redemption race condition | — | 🟡 **NEW** | M-1 |

**Score change: 68/100 → 52/100** — The XP/redemption system added significant new attack surface without corresponding security controls. The wallet/claim endpoint escalated from mock data to real token transfers without adding authentication.

---

*This audit was performed by Claude Opus 4. For production deployment, supplement with manual penetration testing and professional security assessment.*
