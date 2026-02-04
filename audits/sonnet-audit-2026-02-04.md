# Security Audit Report - LifeLog Agent (Nudge)
## Sonnet Review - February 4, 2026

**Auditor:** Claude Sonnet (Second Opinion)  
**Repository:** `~/Skynet/lifelog-agent`  
**Scope:** iOS App + Dashboard Backend  
**Purpose:** Moltiverse Hackathon Submission

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 4 |
| 🟡 Medium | 6 |
| 🟢 Low | 5 |

**Overall Security Score: 58/100** (Needs Improvement)

The codebase demonstrates good security awareness in several areas (input validation, rate limiting, parameterized queries, timing-safe comparison) but has critical issues that must be addressed before production deployment.

---

## 🔴 CRITICAL Issues

### C-1: Hardcoded API Key in iOS App Source Code
**File:** `ios-app/LifeLog/Services/APIClient.swift:17`
```swift
init(baseURL: String = "...", apiKey: String? = "629f39419aca200337cb85b275fcbfbb99e58cd0d279a39eb9da0dc486b43e0a")
```

**Description:** The production API key is hardcoded as a default parameter in the `APIClient` initializer. This key will be compiled into the iOS app binary and can be extracted using standard reverse engineering tools (strings, class-dump, Hopper).

**Impact:** 
- Anyone with the app binary can extract the API key
- Unauthorized access to all API endpoints
- Data exfiltration, manipulation of check-ins, token claims
- Complete compromise of user data

**Recommendation:**
1. Remove the hardcoded default immediately
2. Change the API key (the current one is compromised)
3. Require users to enter their API key or use device-bound authentication
4. Consider implementing OAuth2 with Privy instead of static API keys

```swift
// SECURE: No default value
init(baseURL: String = "https://...", apiKey: String? = nil)
```

---

### C-2: Weak x402 Payment Verification
**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts:75-95`

```typescript
function verifyPaymentProof(proof: PaymentProof, agentId: string): boolean {
  // ...
  // In production: verify signature matches the expected message format
  // For now, accept any well-formed proof
  console.log('[Payment] Proof accepted for agent:', agentId, 'paymentId:', proof.paymentId);
  return true;
}
```

**Description:** The payment verification function accepts ANY well-formed proof without actually verifying:
- The cryptographic signature
- The on-chain transaction
- That the payment went to the correct address
- That the amount matches the required price

**Impact:**
- Free access to paid agents by sending fake payment proofs
- Revenue loss / economic attack on the platform
- Marketplace agents can be used without payment

**Recommendation:**
1. Verify signature using Web3 libraries (ethers.js, viem)
2. If on-chain verification is needed, call an RPC to verify transaction
3. At minimum, track payment IDs server-side to prevent replay

```typescript
import { verifyMessage } from 'ethers';

function verifyPaymentProof(proof: PaymentProof, agentId: string): boolean {
  // Reconstruct expected message
  const expectedMessage = `Payment ${proof.paymentId} for ${agentId}`;
  
  // Verify signature
  const signer = verifyMessage(expectedMessage, proof.signature);
  
  // Check signer matches expected wallet
  // Check payment ID hasn't been used (use Set/Map or database)
  // Optionally verify on-chain
}
```

---

## 🟠 HIGH Issues

### H-1: Missing Authentication on Critical Routes
**Files:** 
- `dashboard/src/app/(dashboard)/api/wallet/balance/route.ts`
- `dashboard/src/app/(dashboard)/api/wallet/claim/route.ts`
- `dashboard/src/app/(dashboard)/api/marketplace/agents/route.ts`

**Description:** These endpoints do NOT call `validateApiKey()` despite handling sensitive wallet operations. The `/wallet/claim` endpoint can be called by anyone to claim rewards.

**Impact:**
- Unauthorized balance queries
- Potential for unauthorized reward claims
- Data leakage about wallet balances

**Recommendation:**
```typescript
// Add to each route
const authError = validateApiKey(request);
if (authError) return authError;
```

---

### H-2: Privy App ID and Client ID Exposed in Source
**File:** `ios-app/LifeLog/Services/PrivyService.swift:19-21`

```swift
private let appId = "cml88575000qmjr0bt3tivdrr"
private let appClientId = "client-WY6VqnR715TBi3TYk8mmGfsVs6WTzKJDGmaWHsr3sHU3G"
```

**Description:** While Privy app IDs are semi-public (they appear in web bundles), hardcoding both the App ID and Client ID makes it easier to impersonate the app or create phishing attacks.

**Impact:**
- Easier to create fake apps that authenticate through the same Privy app
- Potential for credential phishing

**Recommendation:**
- Use an Info.plist entry or XCConfig file (which can be excluded from version control)
- At minimum, document that these are intentionally public

---

### H-3: Wallet Address Stored in UserDefaults
**File:** `ios-app/LifeLog/Services/PrivyService.swift:73`

```swift
UserDefaults.standard.set(wallet.address, forKey: "walletAddress")
```

**Description:** Wallet addresses are stored in UserDefaults instead of Keychain. While the address itself isn't a secret, UserDefaults is backed up to iCloud and can be accessed by other apps in some configurations.

**Impact:**
- Wallet address correlation across devices
- Privacy leakage through iCloud backup

**Recommendation:**
- Keep wallet address in Keychain for consistency with other sensitive data
- Or mark the UserDefaults key to exclude from backup:
```swift
UserDefaults.standard.set(true, forKey: "walletAddress_excludeFromBackup")
```

---

### H-4: Missing Payment Replay Protection
**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts`

**Description:** There is no mechanism to track which payment proofs have been used. An attacker can resubmit the same payment proof multiple times to get unlimited messages.

**Impact:**
- Single payment used for unlimited messages
- Economic loss for the platform
- Abuse of paid agents

**Recommendation:**
- Track used payment IDs in Redis/database
- Reject any payment ID seen before
```typescript
const usedPaymentIds = new Set<string>(); // In production, use Redis

if (usedPaymentIds.has(proof.paymentId)) {
  return NextResponse.json({ error: 'Payment already used' }, { status: 400 });
}
usedPaymentIds.add(proof.paymentId);
```

---

## 🟡 MEDIUM Issues

### M-1: Inconsistent Platform Wallet Addresses
**Files:**
- `dashboard/src/app/(dashboard)/api/marketplace/submit/route.ts:15`
  - `0x2390C495896C78668416859d9dE84212fCB10801`
- `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts:19`
  - `0x4f9e2dc880328facc0ebc8f3a6b0e9b0f0e0e0e0` (fallback)

**Description:** Different routes use different platform wallet addresses for receiving payments.

**Impact:**
- Payments may go to wrong addresses
- Confusing user experience
- Potential loss of funds

**Recommendation:**
- Centralize wallet configuration in environment variables
- Use a single source of truth:
```typescript
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS!;
if (!PLATFORM_WALLET) throw new Error('PLATFORM_WALLET_ADDRESS not configured');
```

---

### M-2: In-Memory Rate Limiting (Not Production-Ready)
**File:** `dashboard/src/lib/rate-limit.ts`

**Description:** Rate limiting uses an in-memory Map that resets on server restart and doesn't work across serverless function instances (Vercel deployments).

**Impact:**
- Rate limits don't persist across deploys
- In serverless environment, each cold start resets limits
- Attackers can bypass by hitting different instances

**Recommendation:**
- Use Upstash Redis or Vercel KV for production
- The file already has a comment about this - implement it

---

### M-3: Agent System Prompts Could Allow Prompt Injection
**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts:28-52`

**Description:** Agent system prompts are hardcoded. User messages are passed directly to OpenAI without additional sanitization for prompt injection attacks.

**Impact:**
- Users could attempt to override agent personality
- Potential for jailbreaking agents to provide harmful content

**Recommendation:**
- Add prompt injection detection
- Wrap user messages with clear delimiters
```typescript
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'system', content: 'The following is a user message. Stay in character.' },
  ...history,
];
```

---

### M-4: Missing CSRF Protection for State-Changing Operations
**File:** Various API routes

**Description:** POST endpoints don't verify origin or include CSRF tokens. While CORS is configured, API key auth provides some protection.

**Impact:**
- Potential for cross-site request forgery if API key is leaked
- Malicious sites could trigger actions on behalf of users

**Recommendation:**
- Add origin verification in middleware
- Consider adding CSRF tokens for browser-based requests

---

### M-5: Conversation History Unbounded Growth
**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts:128-132`

**Description:** Conversations are stored in-memory with only a 10-message limit, but the Map itself grows unbounded as users create new conversations.

```typescript
const conversations: Map<string, { role: string; content: string }[]> = new Map();
```

**Impact:**
- Memory exhaustion over time
- Denial of service
- Server instability

**Recommendation:**
- Add TTL-based eviction
- Use LRU cache with max size
- Move to database/Redis for production

---

### M-6: Export Endpoint Lacks Additional Authorization
**File:** `dashboard/src/app/(dashboard)/api/export/route.ts`

**Description:** While the export endpoint likely requires API key auth, exporting ALL user data should have additional safeguards.

**Impact:**
- Any compromised API key can exfiltrate all data
- No audit logging of exports

**Recommendation:**
- Add audit logging for exports
- Consider requiring additional confirmation
- Implement per-user scoping

---

## 🟢 LOW Issues

### L-1: Debug Console Logging in Production Code
**Files:** Various (PrivyService.swift, route.ts files)

**Description:** Console.log/print statements with potentially sensitive information (payment IDs, user IDs) are present.

**Recommendation:** Use a proper logging framework with log levels; disable debug logs in production.

---

### L-2: Hardcoded Token Contract Address in iOS App
**File:** `ios-app/LifeLog/Models/WalletModels.swift:110`

```swift
static let contractAddress = "0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F"
```

**Description:** Token contract address is hardcoded, making it difficult to update without app release.

**Recommendation:** Fetch from backend configuration endpoint.

---

### L-3: Missing Input Length Limits on Some Fields
**File:** `dashboard/src/app/(dashboard)/api/marketplace/submit/route.ts`

**Description:** While `systemPrompt` has a minimum length check, there's no maximum, allowing very large prompts.

**Recommendation:** Add maximum length validation (e.g., 2000 characters).

---

### L-4: Wallet History Returns Mock Data with Predictable IDs
**File:** `dashboard/src/app/(dashboard)/api/wallet/history/route.ts`

**Description:** Mock transaction hashes are predictable, which could confuse testing or allow manipulation in demo scenarios.

**Recommendation:** Use cryptographically random mock IDs if mocking is needed.

---

### L-5: Missing Error Boundary in Agent Message Handling
**File:** `dashboard/src/app/(dashboard)/api/agents/[agentId]/message/route.ts`

**Description:** If OpenAI returns malformed JSON, the route throws an unhandled error.

**Recommendation:** Add try/catch specifically around JSON parsing of OpenAI response.

---

## 👍 Security Positives

The following security measures are well-implemented:

1. **Parameterized SQL Queries** - All database queries use prepared statements with parameter binding
2. **Timing-Safe API Key Comparison** - `timingSafeEqual()` prevents timing attacks
3. **Input Validation Module** - Comprehensive validation for messages, dates, addresses, and actions
4. **Rate Limiting Framework** - Good structure, just needs persistent storage
5. **Security Headers** - CSP, X-Frame-Options, X-Content-Type-Options all set correctly
6. **CORS Configuration** - Properly restricts origins
7. **Keychain for Sensitive Data** - API key stored in Keychain correctly
8. **HealthKit Read-Only** - Only requests read permissions, not write
9. **.env in .gitignore** - Secrets file properly excluded from git
10. **File Upload Validation** - Transcription endpoint validates file size and type

---

## Recommendations Priority

### Immediate (Before Submission)
1. 🔴 **C-1**: Remove hardcoded API key from APIClient.swift
2. 🔴 **C-2**: Add real payment verification or mark as "demo only"
3. 🟠 **H-1**: Add auth to wallet/claim endpoint

### Short-Term (Before Production)
4. 🟠 **H-4**: Implement payment replay protection
5. 🟡 **M-1**: Centralize platform wallet configuration
6. 🟡 **M-2**: Implement persistent rate limiting

### Medium-Term
7. 🟡 **M-3**: Add prompt injection defenses
8. 🟡 **M-5**: Bound conversation memory
9. 🟠 **H-2/H-3**: Review key/address storage patterns

---

## Final Notes

This audit was conducted as a second opinion alongside an Opus audit. The codebase shows solid security fundamentals - the developer clearly understands common vulnerabilities and has implemented proper defenses in most areas. The critical issues are primarily around:

1. Credential handling (hardcoded API key)
2. Payment verification (not implemented for hackathon demo)

For a hackathon submission, many of the medium/low issues are acceptable with TODO comments. However, the hardcoded API key (C-1) should be fixed before any public demo, as it compromises all users.

---

*Generated by Claude Sonnet - Security Audit Subagent*  
*Date: 2026-02-04 15:42 CST*
