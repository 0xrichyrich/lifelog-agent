# Security Audit — Nudge (2026-02-07) — Opus

**Date:** February 7, 2026
**Auditor:** Claude Opus 4.5 (Subagent Security Audit)
**Scope:** Smart Contracts (NudgeToken, FeeSplitter, NudgeBuyback) + XP Redemption Backend
**Context:** Pre-hackathon submission audit for $200K prize pool

---

## Summary

**Overall Score: 82/100** (↑ from 68/100 on Feb 4)

This audit evaluates the Nudge smart contracts and the new XP redemption backend system. The smart contracts are well-designed with proper security patterns from OpenZeppelin. The XP redemption system is new and introduces several business logic concerns that could be exploited.

| Severity | Count | New vs Previous |
|----------|-------|-----------------|
| 🔴 Critical | 1 | NEW (backend) |
| 🟠 High | 3 | 1 NEW, 2 existing |
| 🟡 Medium | 4 | 3 NEW, 1 existing |
| 🟢 Low | 5 | 3 NEW, 2 existing |
| ℹ️ Informational | 3 | — |

### Previous Audit Status
The HIGH-1 issue from the Feb 4 fee-contracts-audit (incorrect balance calculation) has been **FIXED**. The balance before/after pattern is now correctly implemented in `executeBuyback()`.

---

## Critical Issues (must fix)

### C1: Race Condition — Double-Spend XP in Concurrent Redemptions
**File:** `dashboard/src/lib/xp-turso.ts`, `redeemXPForNudge()` (Lines 285-350)
**Severity:** 🔴 CRITICAL
**Status:** NEW

**Vulnerability:**
The XP redemption function performs a "check-then-act" pattern without transaction isolation:

```typescript
// STEP 1: Check balance
if (xpAmount > user.currentXP) {
  return { error: 'Insufficient XP' };
}

// STEP 2: (Async operations, time passes...)
const dailyRedeemed = await getDailyRedemptionTotal(userId);

// STEP 3: Deduct XP (separate query)
await client.execute({
  sql: `UPDATE user_xp SET currentXP = currentXP - ? WHERE userId = ?`,
  args: [actualXpSpent, now, userId],
});
```

**Attack Scenario (Race Condition):**
1. User has 100 XP
2. User sends 2 concurrent redemption requests for 100 XP each
3. Both requests pass the balance check (step 1) since they see 100 XP
4. Both requests deduct 100 XP (step 3)
5. Result: 200 XP spent but only 100 XP existed → **negative balance** or **double NUDGE payout**

**Impact:**
- Users can redeem more XP than they have
- Infinite $NUDGE generation through rapid concurrent requests
- Breaks the economic model completely

**Recommendation:**
Use an atomic SQL operation with a WHERE clause check:

```typescript
// Atomic: only succeeds if balance >= xpAmount
const result = await client.execute({
  sql: `UPDATE user_xp 
        SET currentXP = currentXP - ? 
        WHERE userId = ? AND currentXP >= ?`,
  args: [actualXpSpent, userId, actualXpSpent],
});

if (result.rowsAffected === 0) {
  return { error: 'Insufficient XP or concurrent modification' };
}
```

Alternatively, use Turso transactions:
```typescript
const tx = await client.transaction('write');
try {
  const user = await tx.execute({ sql: 'SELECT * FROM user_xp WHERE userId = ? FOR UPDATE', args: [userId] });
  // ... validate and update within transaction ...
  await tx.commit();
} catch (e) {
  await tx.rollback();
  throw e;
}
```

---

## High Issues

### H1: Daily Cap Bypass via Timezone Manipulation
**File:** `dashboard/src/lib/xp-turso.ts`, `getDailyRedemptionTotal()` (Lines 205-220)
**Severity:** 🟠 HIGH
**Status:** NEW

**Vulnerability:**
The daily cap check uses server-side date with no timezone enforcement:

```typescript
async function getDailyRedemptionTotal(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]; // Uses server timezone
  
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(nudgeAwarded), 0) as total 
          FROM nudge_redemptions 
          WHERE userId = ? AND DATE(createdAt) = ?`,
    args: [userId, today],
  });
```

**Issue:**
- `new Date().toISOString()` is always UTC
- `DATE(createdAt)` in SQLite is also UTC
- A user on the US West Coast (UTC-8) could exploit the 8-hour window where "today" differs

More critically, if a user knows server time is UTC:
- At 11:59 PM UTC, redeem 250 NUDGE (hits cap)
- Wait 2 minutes to 12:01 AM UTC  
- Redeem another 250 NUDGE (new day, cap reset)
- **Result:** 500 NUDGE in ~2 minutes vs intended 250/day

**Impact:** Daily cap of 250 NUDGE can be exceeded by timing redemptions around UTC midnight.

**Recommendation:**
1. Use UTC consistently and document the day boundary
2. Consider a rolling 24-hour window instead of calendar day:
```typescript
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
// SUM redemptions WHERE createdAt > twentyFourHoursAgo
```

---

### H2: Weekly Pool Distribution Lacks Authentication
**File:** `dashboard/src/app/(dashboard)/api/xp/pool/route.ts`, `POST` handler (Lines 48-80)
**Severity:** 🟠 HIGH  
**Status:** NEW

**Vulnerability:**
```typescript
export async function POST(request: NextRequest) {
  // Rate limiting only - NO authentication!
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.token);
  if (rateLimitError) return rateLimitError;
  
  // Anyone can trigger this!
  const result = await distributeWeeklyPool();
```

**Impact:**
- Anyone can call `/api/xp/pool` POST to distribute the weekly pool
- If called prematurely (mid-week), users with low XP that week get unfairly large shares
- If called multiple times, could create duplicate distributions (though `distributed` flag helps)
- Griefing attack: call distribution when pool is nearly empty or at unfavorable time

**Recommendation:**
1. Add admin authentication (API key or JWT)
2. Add time-based guard (only allow after weekEnd date):
```typescript
if (new Date() < new Date(pool.weekEnd + 'T23:59:59Z')) {
  return { error: 'Pool cannot be distributed before week ends' };
}
```

---

### H3: In-Memory Rate Limiting Ineffective (Previous - Still Unpatched)
**File:** `dashboard/src/lib/rate-limit.ts`
**Severity:** 🟠 HIGH
**Status:** EXISTING (from Feb 4 audit)

This was identified in previous audits but remains unpatched. On Vercel serverless:
- Rate limit store resets on cold starts
- Parallel invocations have separate stores  
- Trivially bypassable via concurrent requests

**Recommendation:** Use Upstash Redis or Vercel KV for persistent rate limiting.

---

## Medium Issues

### M1: Integer Precision Loss in NUDGE Calculations
**File:** `dashboard/src/lib/xp-turso.ts`, `redeemXPForNudge()` (Lines 310-320)
**Severity:** 🟡 MEDIUM
**Status:** NEW

**Vulnerability:**
```typescript
const baseNudge = xpAmount / rate;  // Integer division in JS
const nudgeWithStreak = baseNudge * streakMultiplier;

// Later:
actualXpSpent = Math.ceil((finalNudge / streakMultiplier) * rate);
```

JavaScript performs floating-point division, then the result is rounded:
```typescript
return {
  nudgeAwarded: Math.round(finalNudge * 100) / 100,  // Rounds to 2 decimals
};
```

**Example Exploitation:**
- User redeems 7 XP at rate 10 (Level 1-5)
- baseNudge = 7/10 = 0.7
- After rounding: 0.7 NUDGE awarded
- But: 0.7 * 10 = 7 XP should be deducted
- Due to ceil/round interplay, small discrepancies accumulate

**Impact:** Over many transactions, users could gain or lose small amounts of XP/NUDGE due to rounding inconsistencies.

**Recommendation:**
Use integer math throughout, treating everything in smallest units (wei-equivalent):
```typescript
const NUDGE_DECIMALS = 1e18;
const baseNudgeWei = (BigInt(xpAmount) * NUDGE_DECIMALS) / BigInt(rate);
```

---

### M2: Streak Multiplier Timing Attack
**File:** `dashboard/src/lib/xp-turso.ts`, `calculateStreak()` (Lines 150-175)
**Severity:** 🟡 MEDIUM
**Status:** NEW

**Vulnerability:**
The streak calculation compares activity dates to "today" but doesn't consider timezone:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);  // Midnight in server timezone

for (let i = 0; i < result.rows.length; i++) {
  const activityDate = new Date(String(result.rows[i].day));
  activityDate.setHours(0, 0, 0, 0);  // Also server timezone
  
  const expectedDate = new Date(today);
  expectedDate.setDate(expectedDate.getDate() - i);
```

**Attack Scenario:**
1. User lives in UTC+12 (New Zealand)
2. Server is in UTC
3. User logs activity at 11 PM local time (11 AM UTC)
4. Next day at 1 AM local time (1 PM UTC same day), user tries to redeem
5. Streak shows as broken because server-side "today" hasn't changed

**Impact:** Users in certain timezones may have streaks incorrectly broken or incorrectly maintained, affecting their multiplier.

**Recommendation:**
Store activity timestamps in UTC and allow users to declare their timezone, OR use a more forgiving 36-hour window for "consecutive days."

---

### M3: Smart Contract — Unbounded Batch Operations
**File:** `contracts/NudgeToken.sol`, `rewardGoalsBatch()` (Lines 87-110)
**Severity:** 🟡 MEDIUM
**Status:** EXISTING (partial fix)

**Vulnerability:**
```solidity
function rewardGoalsBatch(
    address to,
    uint256[] calldata goalIds,
    uint256[] calldata goalTypes
) external onlyMinter whenNotPaused nonReentrant {
    require(goalIds.length == goalTypes.length, "NudgeToken: length mismatch");
    // NO length limit!
    
    for (uint256 i = 0; i < goalIds.length; i++) {
```

While NudgeBuyback has a 100-user batch limit, NudgeToken has no limit. An authorized minter could submit a batch so large it exceeds the block gas limit.

**Impact:** DoS if batch is too large; wasted gas on failed transactions.

**Recommendation:**
Add explicit limit:
```solidity
require(goalIds.length <= 100, "NudgeToken: batch too large");
```

---

### M4: Smart Contract — No Event for Feature Cost Changes
**File:** `contracts/NudgeToken.sol`, `setFeatureCost()` (Line 135)
**Severity:** 🟡 MEDIUM
**Status:** EXISTING

**Vulnerability:**
```solidity
function setFeatureCost(string calldata feature, uint256 cost) external onlyOwner {
    featureCosts[feature] = cost;
    // NO EVENT EMITTED
}
```

**Impact:** 
- Off-chain systems cannot track feature cost changes
- Users may be surprised by price changes without notice
- Reduces transparency and auditability

**Recommendation:**
```solidity
event FeatureCostUpdated(string feature, uint256 oldCost, uint256 newCost);

function setFeatureCost(string calldata feature, uint256 cost) external onlyOwner {
    uint256 oldCost = featureCosts[feature];
    featureCosts[feature] = cost;
    emit FeatureCostUpdated(feature, oldCost, cost);
}
```

---

## Low Issues

### L1: SQL Queries Use String Concatenation for Limit
**File:** `dashboard/src/lib/xp-turso.ts`, multiple functions
**Severity:** 🟢 LOW
**Status:** NEW

**Observation:**
The limit parameter is passed directly to SQL:
```typescript
const result = await client.execute({
  sql: 'SELECT * FROM xp_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
  args: [userId, limit],
});
```

While Turso parameterized queries protect against injection, the `limit` value comes from user input in API routes and should be validated:

```typescript
export async function getHistory(userId: string, limit: number = 20): Promise<...> {
  // No validation that limit is reasonable
```

**Recommendation:**
```typescript
const safeLimit = Math.min(Math.max(1, limit), 100);  // Clamp to 1-100
```

---

### L2: Weekly Pool Claims Not Claimable by Users
**File:** `dashboard/src/lib/xp-turso.ts`, `distributeWeeklyPool()` (Lines 410-475)
**Severity:** 🟢 LOW
**Status:** NEW

**Observation:**
Weekly pool claims are recorded in `weekly_pool_claims` table, but there's no function for users to actually claim/receive these tokens. The distribution only records the claim, it doesn't:
1. Transfer tokens
2. Add to user's pending balance
3. Create a claimable entry

**Impact:** Users see "estimated NUDGE" in the pool UI but can never actually receive it.

**Recommendation:**
Implement actual token distribution:
- Either integrate with NudgeBuyback's `distributeRewardsCustom()` 
- Or add a `claimWeeklyReward()` function

---

### L3: Smart Contract — Emergency Withdraw Can Drain Pending Fees
**File:** `contracts/FeeSplitter.sol`, `emergencyWithdraw()` (Lines 195-210)
**Severity:** 🟢 LOW
**Status:** EXISTING

**Observation:**
```solidity
function emergencyWithdraw(
    address token,
    address to,
    uint256 amount
) external onlyOwner {
    // Can withdraw ANY amount, including pendingFees owed to agents
```

While owner-only, a malicious or compromised owner could steal agent fees.

**Recommendation:**
Add a safeguard that only allows withdrawing excess funds:
```solidity
require(
  IERC20(token).balanceOf(address(this)) - amount >= totalPendingForToken[token],
  "Cannot withdraw pending fees"
);
```

---

### L4: XP Transactions Table Grows Unbounded
**File:** `dashboard/src/lib/xp-turso.ts`
**Severity:** 🟢 LOW
**Status:** NEW

**Observation:**
Every XP award creates a transaction record that is never pruned:
```typescript
await client.execute({
  sql: 'INSERT INTO xp_transactions (userId, amount, activity, metadata, createdAt) VALUES (?, ?, ?, ?, ?)',
  args: [userId, xpAmount, activity, JSON.stringify(metadata), now],
});
```

With active users, this table will grow indefinitely, impacting query performance.

**Recommendation:**
1. Add periodic archival of old transactions (> 90 days)
2. Consider aggregating old transactions into weekly/monthly summaries
3. Add composite indexes for common query patterns

---

### L5: No Input Sanitization on userId
**File:** `dashboard/src/app/(dashboard)/api/xp/redeem/route.ts` (Lines 52-55)
**Severity:** 🟢 LOW
**Status:** NEW

**Observation:**
```typescript
if (!userId || typeof userId !== 'string') {
  return NextResponse.json({ error: 'userId is required' }, { status: 400 });
}
// No further validation — userId could be any string
```

While Turso parameterized queries prevent SQL injection, malicious userIds could:
- Be excessively long (DoS)
- Contain control characters
- Be used for log injection

**Recommendation:**
```typescript
const USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
if (!USER_ID_REGEX.test(userId)) {
  return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
}
```

---

## Informational

### I1: Smart Contracts Follow Best Practices ✅
All three contracts use:
- OpenZeppelin's audited base contracts
- ReentrancyGuard on state-changing functions
- Pausable for emergency stops
- Proper access control (Ownable, onlyMinter)
- SafeERC20 for token transfers
- Events for all state changes
- Security contact metadata

### I2: Previous HIGH-1 (Balance Calculation) Fixed ✅
The Feb 4 audit identified incorrect balance calculation in `executeBuyback()`. This is now correctly implemented:
```solidity
uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
// ... buy operation ...
uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
uint256 nudgeReceived = balanceAfter - balanceBefore;  // CORRECT
```

### I3: Weighted Distribution System Well-Designed
The NudgeBuyback weighted distribution system is well-implemented:
- O(1) recipient removal using swap-and-pop
- MAX_RECIPIENTS cap (10,000)
- Batch limits (100 users)
- Weight precision using 1e18 base
- Statistics tracking

---

## Recommendations

### 🚨 Before Hackathon Submission (Critical)
1. **Fix the race condition in XP redemption** (C1) — Use atomic SQL or transactions
2. **Add authentication to pool distribution endpoint** (H2) — Admin-only operation
3. **Add time guard to pool distribution** (H2) — Prevent premature distribution

### Before Production Launch
4. Migrate to persistent rate limiting (Upstash/Redis) (H3)
5. Use rolling 24-hour window for daily cap (H1)
6. Add batch size limits to NudgeToken (M3)
7. Add events for all admin state changes (M4)
8. Implement actual weekly pool claim mechanism (L2)
9. Add input validation for userId format (L5)

### Infrastructure
10. Consider formal verification for smart contracts
11. Add monitoring/alerting for redemption anomalies
12. Implement transaction archival for xp_transactions

---

## Files Audited

### Smart Contracts
- [x] `contracts/NudgeToken.sol` — Well-designed, minor issues
- [x] `contracts/FeeSplitter.sol` — Solid implementation
- [x] `contracts/NudgeBuyback.sol` — HIGH-1 fixed, good design

### XP Redemption Backend
- [x] `dashboard/src/lib/xp-turso.ts` — **CRITICAL race condition found**
- [x] `dashboard/src/app/(dashboard)/api/xp/redeem/route.ts` — Missing auth not critical here
- [x] `dashboard/src/app/(dashboard)/api/xp/pool/route.ts` — **Missing admin auth**

---

## Conclusion

The Nudge smart contracts are production-ready with minor improvements needed. The smart contracts benefit from OpenZeppelin's battle-tested libraries and follow security best practices.

**However, the XP redemption backend has a critical race condition (C1) that must be fixed before launch.** This vulnerability could allow users to generate unlimited $NUDGE tokens, completely breaking the economic model.

The daily cap bypass (H1) and unauthenticated pool distribution (H2) are serious but less immediately exploitable.

**Recommended minimum actions before submission:**
1. ⚠️ Fix XP redemption race condition with atomic SQL
2. Add admin authentication to pool distribution
3. Add batch limits to NudgeToken contract

With these fixes, the codebase demonstrates strong security awareness and is appropriate for hackathon submission. Production deployment should address remaining medium/low issues.

---

*This audit was performed by Claude Opus 4.5 AI analysis. For production deployment with real funds, supplement with professional penetration testing and formal verification.*
