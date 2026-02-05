/**
 * XP Service Tests
 * 
 * Run with: npx ts-node src/services/xp.test.ts
 * Or: node --loader ts-node/esm src/services/xp.test.ts
 */

import { XPService, XPActivity, XP_REWARDS } from './xp.js';

// Test helpers
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.error(`   ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed: expected true');
  }
}

// ==================== LEVEL CALCULATION TESTS ====================

console.log('\n📊 Level Calculation Tests\n');

test('Level 0 for XP < 100', () => {
  assertEqual(XPService.calculateLevel(0), 0);
  assertEqual(XPService.calculateLevel(50), 0);
  assertEqual(XPService.calculateLevel(99), 0);
});

test('Level 1 at 100 XP', () => {
  assertEqual(XPService.calculateLevel(100), 1);
});

test('Level 1 for 100-399 XP', () => {
  assertEqual(XPService.calculateLevel(100), 1);
  assertEqual(XPService.calculateLevel(200), 1);
  assertEqual(XPService.calculateLevel(399), 1);
});

test('Level 2 at 400 XP', () => {
  assertEqual(XPService.calculateLevel(400), 2);
});

test('Level 5 at 2,500 XP', () => {
  assertEqual(XPService.calculateLevel(2500), 5);
});

test('Level 10 at 10,000 XP', () => {
  assertEqual(XPService.calculateLevel(10000), 10);
});

test('Level 20 at 40,000 XP', () => {
  assertEqual(XPService.calculateLevel(40000), 20);
});

test('Level calculation is floored', () => {
  // 9999 XP should be level 9 (sqrt(9999/100) = 9.999...)
  assertEqual(XPService.calculateLevel(9999), 9);
  // 10001 XP should be level 10
  assertEqual(XPService.calculateLevel(10001), 10);
});

// ==================== XP FOR LEVEL TESTS ====================

console.log('\n📈 XP For Level Tests\n');

test('Level 1 requires 100 XP', () => {
  assertEqual(XPService.xpForLevel(1), 100);
});

test('Level 5 requires 2,500 XP', () => {
  assertEqual(XPService.xpForLevel(5), 2500);
});

test('Level 10 requires 10,000 XP', () => {
  assertEqual(XPService.xpForLevel(10), 10000);
});

test('Level 20 requires 40,000 XP', () => {
  assertEqual(XPService.xpForLevel(20), 40000);
});

test('Level 0 requires 0 XP', () => {
  assertEqual(XPService.xpForLevel(0), 0);
});

// ==================== REDEMPTION BOOST TESTS ====================

console.log('\n🎁 Redemption Boost Tests\n');

test('No boost for levels 0-4', () => {
  assertEqual(XPService.getRedemptionBoost(0), 0);
  assertEqual(XPService.getRedemptionBoost(1), 0);
  assertEqual(XPService.getRedemptionBoost(4), 0);
});

test('10% boost for levels 5-9', () => {
  assertEqual(XPService.getRedemptionBoost(5), 10);
  assertEqual(XPService.getRedemptionBoost(7), 10);
  assertEqual(XPService.getRedemptionBoost(9), 10);
});

test('25% boost for levels 10-19', () => {
  assertEqual(XPService.getRedemptionBoost(10), 25);
  assertEqual(XPService.getRedemptionBoost(15), 25);
  assertEqual(XPService.getRedemptionBoost(19), 25);
});

test('50% boost for level 20+', () => {
  assertEqual(XPService.getRedemptionBoost(20), 50);
  assertEqual(XPService.getRedemptionBoost(50), 50);
  assertEqual(XPService.getRedemptionBoost(100), 50);
});

// ==================== NUDGE CALCULATION TESTS ====================

console.log('\n💰 NUDGE Calculation Tests\n');

test('Base rate: 1000 XP = 100 NUDGE (level 0)', () => {
  assertEqual(XPService.calculateNudgeForXP(1000, 0), 100);
});

test('Base rate: 100 XP = 10 NUDGE (level 0)', () => {
  assertEqual(XPService.calculateNudgeForXP(100, 0), 10);
});

test('Level 5 boost: 1000 XP = 110 NUDGE (10% boost)', () => {
  assertEqual(XPService.calculateNudgeForXP(1000, 5), 110);
});

test('Level 10 boost: 1000 XP = 125 NUDGE (25% boost)', () => {
  assertEqual(XPService.calculateNudgeForXP(1000, 10), 125);
});

test('Level 20 boost: 1000 XP = 150 NUDGE (50% boost)', () => {
  assertEqual(XPService.calculateNudgeForXP(1000, 20), 150);
});

test('Fractional NUDGE is floored', () => {
  // 150 XP at level 0 = 15 NUDGE
  assertEqual(XPService.calculateNudgeForXP(150, 0), 15);
  // 155 XP at level 0 = 15.5 -> 15 NUDGE
  assertEqual(XPService.calculateNudgeForXP(155, 0), 15);
});

test('Complex redemption: 5000 XP at level 15', () => {
  // Base: 500 NUDGE, with 25% boost = 625 NUDGE
  assertEqual(XPService.calculateNudgeForXP(5000, 15), 625);
});

// ==================== XP REWARDS TESTS ====================

console.log('\n🏆 XP Rewards Tests\n');

test('Daily check-in rewards 10 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.DAILY_CHECKIN], 10);
});

test('Mood log rewards 5 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.MOOD_LOG], 5);
});

test('Goal complete rewards 25 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.GOAL_COMPLETE], 25);
});

test('7-day streak rewards 50 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.STREAK_7DAY], 50);
});

test('30-day streak rewards 200 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.STREAK_30DAY], 200);
});

test('Badge earned rewards 100 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.BADGE_EARNED], 100);
});

test('Agent interaction rewards 2 XP', () => {
  assertEqual(XP_REWARDS[XPActivity.AGENT_INTERACTION], 2);
});

// ==================== PROGRESSION MATH TESTS ====================

console.log('\n📐 Progression Math Tests\n');

test('Progress from level 0 to 1 is 100 XP', () => {
  const l0 = XPService.xpForLevel(0);
  const l1 = XPService.xpForLevel(1);
  assertEqual(l1 - l0, 100);
});

test('Progress from level 1 to 2 is 300 XP', () => {
  const l1 = XPService.xpForLevel(1);
  const l2 = XPService.xpForLevel(2);
  assertEqual(l2 - l1, 300);
});

test('Progress from level 10 to 11 is 2100 XP', () => {
  const l10 = XPService.xpForLevel(10);
  const l11 = XPService.xpForLevel(11);
  assertEqual(l11 - l10, 2100);
});

test('Daily check-ins to reach level 1: 10 days', () => {
  const xpNeeded = 100;
  const dailyXP = XP_REWARDS[XPActivity.DAILY_CHECKIN];
  assertEqual(Math.ceil(xpNeeded / dailyXP), 10);
});

test('Realistic week progression', () => {
  // A week of activity:
  // 7 daily check-ins (70 XP)
  // 7 mood logs (35 XP)
  // 2 goals completed (50 XP)
  // 20 agent interactions (40 XP)
  // 1 week streak (50 XP)
  // Total: 245 XP -> Level 1
  const weekXP = 
    7 * XP_REWARDS[XPActivity.DAILY_CHECKIN] +
    7 * XP_REWARDS[XPActivity.MOOD_LOG] +
    2 * XP_REWARDS[XPActivity.GOAL_COMPLETE] +
    20 * XP_REWARDS[XPActivity.AGENT_INTERACTION] +
    XP_REWARDS[XPActivity.STREAK_7DAY];
  
  assertEqual(weekXP, 245);
  assertEqual(XPService.calculateLevel(weekXP), 1);
});

// ==================== SUMMARY ====================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
