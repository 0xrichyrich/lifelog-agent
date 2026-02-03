# LifeLog Onboarding Flow

## Overview

A 7-screen onboarding experience designed to get users to their "aha moment" within 60 seconds. The flow follows the **Do, Don't Show** principle—users actively participate rather than passively read.

## Aha Moment Definition

**What gets users hooked on LifeLog?**

The aha moment is a 3-step sequence:
1. **First check-in** → User actively logs something (not passive tutorial)
2. **See timeline visualization** → Their data appears in beautiful context
3. **Understand the pattern** → "As you log more, patterns emerge"

This creates immediate value demonstration and investment (IKEA effect—users value what they create).

---

## Screen-by-Screen Breakdown

### Screen 1: Welcome
**Purpose:** Emotional hook, establish brand

| Element | Details |
|---------|---------|
| Hero Visual | Animated brain with neural pathways, glowing blue (#3b82f6) |
| Headline | "LifeLog" |
| Subheadline | "The AI life coach that pays you to improve" |
| CTA | "Get Started" (implicit—swipe or tap Continue) |

**Animations:**
- Brain pulses with subtle glow
- Sparkle effects around the brain
- Fade-in on appear

**Rationale:** Creates wonder and curiosity. The crypto angle ("pays you") is a unique differentiator that hooks interest without being the sole focus.

---

### Screen 2: How It Works
**Purpose:** Set expectations, build mental model

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | 📝 | Log Your Day | Quick check-ins, automatic timeline tracking |
| 2 | 🧠 | AI Analyzes Patterns | Discover what makes you productive & happy |
| 3 | 🪙 | Earn $LIFE Tokens | Get rewarded for hitting your goals |

**Rationale:** Three simple points that explain the full value loop. Users understand the give (logging) and the get (insights + crypto). Sets up the investment → reward cycle.

---

### Screen 3: First Check-In (Interactive!) ⭐
**Purpose:** THE AHA MOMENT TRIGGER

| Element | Details |
|---------|---------|
| Prompt | "What's on your mind right now?" |
| Input | TextEditor with 120px height |
| Quick Prompts | Tappable pills: "Feeling focused 🎯", "Just woke up ☀️", etc. |
| CTA | "Log It" button |
| Success State | Checkmark, quoted text, "Logged just now" |

**Behavior:**
- Keyboard auto-focuses on appear
- Quick prompts pre-fill text (lower friction)
- Cannot proceed until check-in is submitted
- Success animation with haptic feedback

**Rationale:** This is the critical screen. Per the playbook: "Do, don't show." Users must **do** their first check-in, not just read about it. This creates:
1. **Investment** — They've put effort in
2. **Data** — We have something to show them
3. **Habit initiation** — First action in the loop

---

### Screen 4: Timeline Preview
**Purpose:** Show immediate value from their action

| Element | Details |
|---------|---------|
| Header | "Your Timeline" |
| Subheadline | "This is what your day looks like. As you log more, patterns emerge." |
| Visual | Mini timeline with their check-in + sample data |
| Highlight | Their check-in has "NEW" badge and highlighted row |

**Animations:**
- Timeline rows animate in sequentially (0.1s delay each)
- Their check-in row pulses subtly

**Rationale:** Immediate feedback loop. User sees their action reflected in the product. The sample data (Focus time, Meeting) shows what the timeline will look like as they use it more.

---

### Screen 5: Set First Goal
**Purpose:** Create commitment, establish tracking

| Goal Template | Icon | Target |
|---------------|------|--------|
| 4hrs Deep Work | 🧠 | 4 hours/day |
| Exercise 3x/week | 🏃 | 3 times/week |
| Daily Check-in | 📝 | 1 check-in/day |
| Read 30min | 📖 | 30 min/day |

**Behavior:**
- Single selection (radio-style)
- Cannot proceed without selection
- Haptic feedback on selection
- Selected card has colored border

**Rationale:** Goals create accountability and give the AI something to coach toward. Starting with templates reduces decision fatigue. "Daily Check-in" is strategically placed as it reinforces the core habit.

---

### Screen 6: Enable Coaching
**Purpose:** Secure notification permission with clear value prop

| Element | Details |
|---------|---------|
| Header | "Enable AI Coaching" |
| Subheadline | "Get daily insights & gentle nudges from your AI coach" |
| Example Notification | "You've been scrolling for 45min. Time to refocus? 🎯" |
| CTA | "Allow Notifications" |

**Behavior:**
- Example notification animates in with shadow
- Triggers system notification permission dialog
- Gracefully handles denial (can change in Settings)

**Rationale:** Per the playbook: "Permission requests at strategic moments." By this point, user has:
1. Made a check-in (invested)
2. Seen their timeline (received value)
3. Set a goal (created commitment)

They're primed to want coaching help to achieve their goal.

---

### Screen 7: You're All Set!
**Purpose:** Celebrate, summarize, launch into app

| Element | Details |
|---------|---------|
| Visual | Large success checkmark with green glow |
| Header | "You're All Set!" |
| Summary | Checklist of what they accomplished |
| CTA | "Start Improving" (gradient button) |

**Summary Items:**
- ✅ Logged your first check-in
- ✅ Set goal: [selected goal name]
- ✅ Enabled AI coaching

**Rationale:** Celebration creates positive emotional anchor. Summary reinforces what they've done (endowed progress effect). Gradient CTA feels premium and exciting.

---

## Technical Implementation

### File Structure
```
LifeLog/
├── LifeLogApp.swift          # Entry point, checks onboarding state
├── Views/
│   └── OnboardingView.swift  # All 7 screens
```

### Key Components

```swift
// Main container with state management
struct OnboardingView: View {
    @Binding var hasCompletedOnboarding: Bool
    @State private var currentPage = 0
    @State private var firstCheckInText = ""
    @State private var selectedGoalTemplate: GoalTemplate? = nil
}

// Individual screens
struct WelcomeScreen: View
struct HowItWorksScreen: View
struct FirstCheckInScreen: View       // Interactive!
struct TimelinePreviewScreen: View
struct SetGoalScreen: View
struct EnableCoachingScreen: View
struct AllSetScreen: View
```

### Navigation Logic

```swift
private var canAdvance: Bool {
    switch currentPage {
    case 2: return showCheckInSuccess  // Must complete check-in
    case 4: return selectedGoalTemplate != nil  // Must select goal
    default: return true
    }
}
```

### Persistence

```swift
// Check on app launch
@State private var hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")

// Set on completion
UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `Color.background` | #0a0a0a | Screen backgrounds |
| `Color.cardBackground` | #1a1a1a | Card surfaces |
| `Color.textPrimary` | #e5e5e5 | Main text |
| `Color.brandAccent` | #3b82f6 | Primary actions, highlights |
| `Color.success` | #10b981 | Positive states, goals |
| `Color.warning` | #f59e0b | Streaks, notifications |

---

## Metrics to Track

### Primary Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Onboarding Completion Rate** | >80% | Users who reach Screen 7 / Users who start |
| **Time to First Check-in** | <60s | Timestamp of first check-in - app open time |
| **Skip Rate** | <15% | Users who tap Skip / Total users |

### Screen-Level Funnel

| Screen | Expected Drop-off | Action if High |
|--------|------------------|----------------|
| 1 → 2 | <5% | Improve hero visual/copy |
| 2 → 3 | <10% | Simplify "How It Works" |
| 3 → 4 | <5% | Add more quick prompts, reduce friction |
| 4 → 5 | <10% | Better timeline visualization |
| 5 → 6 | <10% | Add more goal templates |
| 6 → 7 | <15% | Better notification value prop |

### Secondary Metrics

| Metric | Purpose |
|--------|---------|
| Avg. time per screen | Find friction points |
| Quick prompt usage | Measure friction reduction |
| Goal template distribution | Understand user intent |
| Notification opt-in rate | Measure trust/value |

---

## A/B Testing Ideas

1. **Screen 3: Check-in prompt variations**
   - "What's on your mind?" vs "How are you feeling?" vs "What are you working on?"

2. **Screen 5: Number of goal templates**
   - 3 options vs 4 options vs 6 options

3. **Screen 6: Notification timing**
   - Before goal selection vs after
   - With example vs without

4. **Skip button visibility**
   - Always visible vs appears after 5s vs no skip button

---

## Competitive Analysis

| App | Onboarding Style | Aha Moment | Lessons |
|-----|------------------|------------|---------|
| **Streaks** | Minimal, goal-first | Set first habit | Trust user intent |
| **Habitify** | Feature showcase | Create first habit | Good empty states |
| **Strides** | Tutorial-heavy | First tracking | Too much explanation |
| **Way of Life** | Interactive | First log | Good "do it now" approach |

**LifeLog Differentiation:**
- Crypto rewards (unique)
- AI coaching (modern)
- Interactive check-in during onboarding (best practice)

---

## Future Enhancements

### Phase 2
- [ ] Personalization screen ("What brings you to LifeLog?")
- [ ] Avatar/profile creation
- [ ] Referral code entry
- [ ] Connect wallet (optional)

### Phase 3
- [ ] Video welcome from AI coach
- [ ] Sample week preview (demo data)
- [ ] Import from other apps
- [ ] Team/social features introduction

---

## Reset Onboarding (Dev/Testing)

```swift
// In Settings or via debug menu
UserDefaults.standard.removeObject(forKey: "hasCompletedOnboarding")
```

Or add a hidden gesture in Settings:
```swift
.onLongPressGesture(minimumDuration: 5) {
    UserDefaults.standard.removeObject(forKey: "hasCompletedOnboarding")
}
```
