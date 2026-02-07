# $LIFE Token Economics

> "The AI life coach that pays you to improve. Earn $LIFE by hitting your daily goals."

## Overview

$LIFE is an ERC-20 token on **Monad** that powers the LifeLog ecosystem. It creates a gamified incentive system where users earn tokens for achieving their wellness goals and can spend them to unlock premium features or discounted agent services.

## Token Details

| Property | Value |
|----------|-------|
| **Name** | LifeLog |
| **Symbol** | $LIFE |
| **Total Supply** | 1,000,000,000 (1 billion) |
| **Decimals** | 18 |
| **Blockchain** | Monad |
| **Standard** | ERC-20 |

## Earning $LIFE

You earn $LIFE tokens by completing goals tracked by LifeLog:

### Reward Structure

| Goal Type | Reward | Example |
|-----------|--------|---------|
| **Daily Goal** | 100 $LIFE | "4 hours deep work today" |
| **Weekly Goal** | 500 $LIFE | "Exercise 3x this week" |
| **Streak Bonus** | 50 $LIFE/day | "Check in every day" |

### Examples

- Complete a daily coding goal → **+100 $LIFE**
- Hit your weekly exercise target → **+500 $LIFE**
- Maintain a 7-day streak → **+350 $LIFE** (7 × 50)
- Perfect week (7 daily + 1 weekly) → **+1,200 $LIFE**

### How Rewards Work

1. LifeLog tracks your activities (screen time, check-ins, etc.)
2. AI analyzes data and calculates goal progress
3. When a goal is marked complete, you can claim on-chain
4. Tokens are minted directly to your wallet

```bash
# Check claimable rewards
lifelog token claimable

# Claim all pending rewards
lifelog token claim
```

## Spending $LIFE

Burn tokens to unlock premium features:

### Feature Costs

| Feature | Cost | Description |
|---------|------|-------------|
| **Premium Insights** | 1,000 $LIFE | Advanced analytics, AI predictions |
| **AI Coach Call** | 500 $LIFE | One-on-one session with AI coach |
| **Custom Goals** | 250 $LIFE | Create unlimited custom goal types |
| **Export Reports** | 100 $LIFE | PDF/CSV exports of your data |
| **Agent Discount** | 2,000 $LIFE | 20% off ACP wellness agent services |

```bash
# View available features
lifelog token features

# Unlock a feature (burns tokens)
lifelog token unlock premium_insights
```

## Agent Marketplace Integration

$LIFE token holders get special benefits in the ACP wellness marketplace:

### Discount System

| $LIFE Held | Discount |
|------------|----------|
| 1,000+ | 5% off agent services |
| 5,000+ | 10% off agent services |
| 10,000+ | 15% off agent services |
| 25,000+ | 20% off agent services |

### Agent Discount NFT

Burn **2,000 $LIFE** to receive a permanent "Agent Discount" NFT that gives 20% off all ACP services forever.

## Supply Mechanics

### Inflationary Pressure

- Tokens are minted when users complete goals
- Maximum theoretical inflation: ~10M tokens/month (if all users hit all goals)
- Actual inflation is self-limiting (requires real achievement)

### Deflationary Pressure

- Feature unlocks permanently burn tokens
- Optional cosmetic burns (badges, achievements)
- No team allocation = no sell pressure

### Supply Caps

- Hard cap: 1 billion tokens
- If cap is reached, reward rates automatically decrease
- Encourages early participation

## Distribution

| Category | Allocation | Notes |
|----------|------------|-------|
| User Rewards | 100% | All tokens earned by users |
| Team | 0% | No pre-mine, no allocation |
| Marketing | 0% | Organic growth only |
| Treasury | 0% | Decentralized from day 1 |

This is the fairest possible distribution: **every token must be earned**.

## Smart Contract

### Key Functions

```solidity
// Mint rewards (authorized minters only)
function rewardGoalCompletion(address to, uint256 goalId, uint256 goalType) external;

// Batch rewards (gas efficient)
function rewardGoalsBatch(address to, uint256[] goalIds, uint256[] goalTypes) external;

// Burn for feature unlock
function unlockFeature(string feature) external;

// Admin: Set reward rates
function setRewardRate(uint256 goalType, uint256 rate) external;

// Admin: Pause/unpause
function pause() external;
function unpause() external;
```

### Security

- Owner: Multi-sig (planned)
- Pausable: Yes (emergency stop)
- Upgradeable: No (immutable)
- Audited: Pending

## nad.fun Launch

$LIFE will be listed on [nad.fun](https://nad.fun), Monad's native token launchpad:

### Launch Parameters

- Initial liquidity: $50-100 USDC equivalent
- No pre-sale
- Fair launch with bonding curve
- Trading enabled immediately

### Why nad.fun?

- Native Monad integration
- Low fees, high speed
- Fair launch mechanics
- Strong community

## Roadmap

### Phase 1: Launch ✅
- Deploy contract to Monad
- Test reward/burn mechanics
- Verify on explorer

### Phase 2: Mainnet ✅
- Deploy to Monad mainnet
- Launch on nad.fun: https://nad.fun/tokens/0x99cDfA46B933ea28Edf4BB620428E24C8EB63367
- List on nad.fun
- Enable claiming in dashboard

### Phase 3: Features
- Premium feature rollout
- Agent discount system
- Leaderboards (optional)

### Phase 4: Governance (Future)
- Token voting on reward rates
- Community-proposed features
- Treasury creation (if needed)

## FAQ

**Q: Do I need $LIFE to use LifeLog?**
A: No! Core features are free. $LIFE unlocks premium features.

**Q: Can I buy $LIFE?**
A: Yes, on nad.fun after launch. But earning it is more fun!

**Q: What happens if I lose my wallet?**
A: Tokens are on-chain. No wallet = no tokens. Use a hardware wallet.

**Q: Can reward rates change?**
A: Yes, the owner can adjust rates. This may happen if the token becomes too inflationary.

**Q: Is there a max I can earn?**
A: No daily/weekly earning caps. Earn as much as you achieve!

---

*$LIFE: The token that rewards you for becoming your best self.* 🧠
