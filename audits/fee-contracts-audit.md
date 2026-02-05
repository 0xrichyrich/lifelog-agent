# Fee Contracts Security Audit

**Date:** 2026-02-04
**Auditor:** Skynet
**Contracts:** FeeSplitter.sol, NudgeBuyback.sol
**Network:** Monad Testnet (Chain ID: 10143)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 3 |
| 🔵 Low | 4 |
| ℹ️ Info | 3 |

**Overall Score: B+**

Both contracts follow security best practices with OpenZeppelin imports, reentrancy guards, and proper access controls. One high-severity issue identified in NudgeBuyback requires attention.

---

## Contract 1: NudgeFeeSplitter.sol

### ✅ Security Strengths
- Uses OpenZeppelin's battle-tested contracts (Ownable, ReentrancyGuard, SafeERC20)
- Reentrancy protection on all external state-changing functions
- Checks-Effects-Interactions pattern followed
- Input validation on all functions
- Events emitted for all state changes
- Emergency withdraw function for stuck funds

### 🟡 MEDIUM-1: Agent Wallet Can Be Overwritten
**Location:** `registerAgent()`
**Issue:** An agent's wallet can be overwritten without warning, potentially redirecting funds.
**Recommendation:** Add check or emit warning event:
```solidity
function registerAgent(bytes32 agentId, address wallet) external onlyOwner {
    require(wallet != address(0), "Invalid wallet");
    address existing = agentWallets[agentId];
    if (existing != address(0)) {
        emit AgentWalletChanged(agentId, existing, wallet);
    }
    agentWallets[agentId] = wallet;
    emit AgentRegistered(agentId, wallet);
}
```

### 🔵 LOW-1: No Maximum Array Length in claimFeesBatch
**Location:** `claimFeesBatch()`
**Issue:** Unbounded loop could hit gas limit with large arrays.
**Recommendation:** Add max length check:
```solidity
require(tokens.length <= 20, "Too many tokens");
```

### 🔵 LOW-2: No Pause Mechanism
**Issue:** No way to pause contract in emergency.
**Recommendation:** Consider adding OpenZeppelin Pausable.

### ℹ️ INFO-1: Treasury Transfer Could Fail Silently for Contracts
**Location:** `payAgentNative()`
**Issue:** If treasury is a contract without receive(), call will fail.
**Status:** Acceptable - require() catches failure.

---

## Contract 2: NudgeBuyback.sol

### ✅ Security Strengths
- Reentrancy guards on all external functions
- Owner-only access on sensitive operations
- Proper balance tracking for rewards
- Emergency withdraw available

### 🟠 HIGH-1: Incorrect Balance Calculation After Buyback
**Location:** `executeBuyback()`
**Issue:** Balance calculation assumes no tokens existed before buyback:
```solidity
uint256 nudgeReceived = IERC20(nudgeToken).balanceOf(address(this)) - totalPendingRewards;
```
If tokens were sent directly to contract, this underestimates buyback amount.
**Recommendation:** Track balance before and after:
```solidity
uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
IBondingCurveRouter(BONDING_CURVE_ROUTER).buy{value: monAmount}(params);
uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
uint256 nudgeReceived = balanceAfter - balanceBefore;
```

### 🟡 MEDIUM-2: Hardcoded Contract Addresses
**Location:** Constants at top
**Issue:** BONDING_CURVE_ROUTER and LENS are hardcoded to mainnet addresses but deployed on testnet.
**Recommendation:** Make these constructor parameters or add setter functions.
```solidity
address public bondingCurveRouter;
address public lens;

constructor(address _owner, address _router, address _lens) Ownable(_owner) {
    bondingCurveRouter = _router;
    lens = _lens;
}
```

### 🟡 MEDIUM-3: No Slippage Protection on Distribution
**Location:** `distributeRewards()`
**Issue:** Equal distribution means late joiners get same as early supporters.
**Recommendation:** Consider weighted distribution based on activity or time.

### 🔵 LOW-3: Recipient Array Unbounded
**Location:** `rewardRecipients[]`
**Issue:** Array can grow without limit, making iteration expensive.
**Recommendation:** Add maximum recipient count or paginated distribution.

### 🔵 LOW-4: removeRecipient() Gas Inefficient
**Location:** `removeRecipient()`
**Issue:** Linear search through array is O(n).
**Recommendation:** Track index in mapping for O(1) removal.

### ℹ️ INFO-2: No Minimum Buyback Amount
**Issue:** Very small buybacks waste gas.
**Recommendation:** Add minimum threshold.

### ℹ️ INFO-3: Deadline Hardcoded to 5 Minutes
**Location:** `executeBuyback()`
**Issue:** 5 minute deadline may be too short for congested network.
**Recommendation:** Make deadline a parameter.

---

## Deployment Verification

| Check | Status |
|-------|--------|
| Compiler version 0.8.20 | ✅ |
| Optimizer enabled | ✅ |
| Owner set correctly | ✅ |
| Treasury set correctly | ✅ |
| NUDGE token configured | ✅ |

---

## Recommended Fixes (Priority Order)

### Must Fix Before Mainnet:
1. **HIGH-1:** Fix balance calculation in executeBuyback()
2. **MEDIUM-2:** Make router/lens addresses configurable

### Should Fix:
3. **MEDIUM-1:** Add event for agent wallet changes
4. **MEDIUM-3:** Consider weighted distribution
5. **LOW-1:** Add array length limits

### Nice to Have:
6. Add Pausable functionality
7. Add minimum buyback threshold
8. Optimize removeRecipient()

---

## Fixed Code Snippets

### Fix HIGH-1 (NudgeBuyback.sol):
```solidity
function executeBuyback(uint256 slippageBps) external onlyOwner nonReentrant {
    require(nudgeToken != address(0), "NUDGE token not set");
    require(address(this).balance > 0, "No MON to spend");
    
    uint256 monAmount = address(this).balance;
    uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
    
    // Get quote from Lens
    (, uint256 expectedOut) = ILens(LENS).getAmountOut(
        nudgeToken,
        monAmount,
        true
    );
    
    uint256 minOut = (expectedOut * (10000 - slippageBps)) / 10000;
    
    IBondingCurveRouter.BuyParams memory params = IBondingCurveRouter.BuyParams({
        amountOutMin: minOut,
        token: nudgeToken,
        to: address(this),
        deadline: block.timestamp + 300
    });
    
    IBondingCurveRouter(BONDING_CURVE_ROUTER).buy{value: monAmount}(params);
    
    uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
    uint256 nudgeReceived = balanceAfter - balanceBefore;
    
    emit BuybackExecuted(monAmount, nudgeReceived);
}
```

---

## Conclusion

The contracts are well-structured and follow security best practices. The HIGH-1 issue should be fixed before any significant funds flow through the buyback contract. For testnet/hackathon purposes, current deployment is acceptable for demonstration.

**Verdict:** ✅ Safe for testnet use, fix HIGH-1 before mainnet.
