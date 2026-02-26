/**
 * TrustEngine Unit Tests
 *
 * Run with: npx ts-node core/safety/trust-engine.test.ts
 * Or integrate with Jest/Vitest when available
 */

import {
  TrustEngine,
  TrustTierThresholds,
} from './trust-engine';

import {
  EventWeights,
  VerificationLevel,
  NEGATIVE_EVENT_EXPIRATION_MS,
} from './types';

import type { SafetyEvent } from './types';

// ============================================
// TEST UTILITIES
// ============================================

interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
}

const tests: TestCase[] = [];
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void): void {
  tests.push({ name, fn });
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be < ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
  };
}

async function runTests() {
  console.log('\n🧪 Running TrustEngine Tests\n');
  console.log('='.repeat(50));

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================
// MOCK DATA HELPERS
// ============================================

interface MockUserData {
  id: string;
  verification_level: VerificationLevel;
  created_at: string;
}

const createMockUser = (overrides: Partial<MockUserData> = {}): MockUserData => ({
  id: 'user-123',
  verification_level: 'basic',
  created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
  ...overrides,
});

const createMockEvent = (
  type: SafetyEvent['type'],
  overrides: Partial<SafetyEvent> = {}
): SafetyEvent => ({
  id: `event-${Date.now()}-${Math.random()}`,
  user_id: 'user-123',
  type,
  severity: 1,
  weight: EventWeights[type as keyof typeof EventWeights] || 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ============================================
// TESTS: calculateTier
// ============================================

test('calculateTier: score >= 80 returns green', () => {
  const engine = new TrustEngine();
  expect(engine.calculateTier(80)).toBe('green');
  expect(engine.calculateTier(90)).toBe('green');
  expect(engine.calculateTier(100)).toBe('green');
});

test('calculateTier: score >= 60 and < 80 returns yellow', () => {
  const engine = new TrustEngine();
  expect(engine.calculateTier(60)).toBe('yellow');
  expect(engine.calculateTier(70)).toBe('yellow');
  expect(engine.calculateTier(79)).toBe('yellow');
});

test('calculateTier: score < 60 returns red', () => {
  const engine = new TrustEngine();
  expect(engine.calculateTier(59)).toBe('red');
  expect(engine.calculateTier(30)).toBe('red');
  expect(engine.calculateTier(0)).toBe('red');
});

test('static calculateTier works the same', () => {
  expect(TrustEngine.calculateTier(80)).toBe('green');
  expect(TrustEngine.calculateTier(65)).toBe('yellow');
  expect(TrustEngine.calculateTier(40)).toBe('red');
});

// ============================================
// TESTS: calculateScore - Base case
// ============================================

test('calculateScore: new user with no events gets base score + bonuses', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 = 70
  expect(result.score).toBe(70);
  expect(result.tier).toBe('yellow'); // 70 is yellow (< 80)
  expect(result.breakdown.base).toBe(50);
  expect(result.breakdown.accountAgeBonus).toBe(10);
  expect(result.breakdown.noReportsBonus).toBe(10);
});

test('calculateScore: new account (< 90 days) gets no age bonus', () => {
  const engine = new TrustEngine();
  const user = createMockUser({
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  });
  const events: SafetyEvent[] = [];

  const result = engine.calculateScore(user, events);

  // Base 50 + no reports 10 = 60
  expect(result.score).toBe(60);
  expect(result.breakdown.accountAgeBonus).toBe(0);
});

test('calculateScore: advanced verification gives +10', () => {
  const engine = new TrustEngine();
  const user = createMockUser({ verification_level: 'advanced' });
  const events: SafetyEvent[] = [];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 + verification 10 = 80
  expect(result.score).toBe(80);
  expect(result.tier).toBe('green');
  expect(result.breakdown.verificationBonus).toBe(10);
});

// ============================================
// TESTS: calculateScore - Session completed
// ============================================

test('calculateScore: session_completed events add +1 each', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('session_completed'),
    createMockEvent('session_completed'),
    createMockEvent('session_completed'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 + 3 sessions = 73
  expect(result.score).toBe(73);
  expect(result.breakdown.sessionCompletedBonus).toBe(3);
});

test('calculateScore: session_completed bonus caps at 30', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = Array(50).fill(null).map(() =>
    createMockEvent('session_completed')
  );

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 + 30 (capped) = 100
  expect(result.score).toBe(100);
  expect(result.breakdown.sessionCompletedBonus).toBe(30);
});

// ============================================
// TESTS: calculateScore - Negative events
// ============================================

test('calculateScore: no_show events subtract -5 each', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('no_show'),
    createMockEvent('no_show'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 - 10 (2 no-shows) = 60
  expect(result.score).toBe(60);
  expect(result.breakdown.noShowPenalty).toBe(10);
});

test('calculateScore: check_in_fail events subtract -10 each', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('check_in_fail'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 - 10 = 60
  expect(result.score).toBe(60);
  expect(result.breakdown.checkInFailPenalty).toBe(10);
});

test('calculateScore: report_confirmed events subtract -15 each and remove bonus', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('report_confirmed'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + NO noReportsBonus - 15 = 45
  expect(result.score).toBe(45);
  expect(result.breakdown.noReportsBonus).toBe(0);
  expect(result.breakdown.reportConfirmedPenalty).toBe(15);
});

test('calculateScore: account_warning events subtract -20 each', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('account_warning'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + account age 10 + no reports 10 - 20 = 50
  expect(result.score).toBe(50);
  expect(result.breakdown.accountWarningPenalty).toBe(20);
});

test('calculateScore: score cannot go below 0', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  // 10 account warnings = -200 points
  const events: SafetyEvent[] = Array(10).fill(null).map(() =>
    createMockEvent('account_warning')
  );

  const result = engine.calculateScore(user, events);

  expect(result.score).toBe(0);
  expect(result.tier).toBe('red');
});

// ============================================
// TESTS: Event expiration
// ============================================

test('isEventActive: recent negative event is active', () => {
  const engine = new TrustEngine();
  const event = createMockEvent('no_show', {
    created_at: new Date().toISOString(),
  });

  expect(engine.isEventActive(event)).toBe(true);
});

test('isEventActive: old negative event (> 6 months) is expired', () => {
  const engine = new TrustEngine();
  const sevenMonthsAgo = new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000);
  const event = createMockEvent('no_show', {
    created_at: sevenMonthsAgo.toISOString(),
  });

  expect(engine.isEventActive(event)).toBe(false);
});

test('isEventActive: positive events never expire', () => {
  const engine = new TrustEngine();
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  const event = createMockEvent('session_completed', {
    created_at: twoYearsAgo.toISOString(),
  });

  expect(engine.isEventActive(event)).toBe(true);
});

test('isEventActive: respects explicit expires_at', () => {
  const engine = new TrustEngine();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const futureEvent = createMockEvent('no_show', {
    expires_at: tomorrow.toISOString(),
  });
  const pastEvent = createMockEvent('no_show', {
    expires_at: yesterday.toISOString(),
  });

  expect(engine.isEventActive(futureEvent)).toBe(true);
  expect(engine.isEventActive(pastEvent)).toBe(false);
});

test('calculateScore: expired events are ignored', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const sevenMonthsAgo = new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000);

  const events: SafetyEvent[] = [
    createMockEvent('no_show', { created_at: sevenMonthsAgo.toISOString() }), // Expired
    createMockEvent('no_show'), // Active
  ];

  const result = engine.calculateScore(user, events);

  // Only 1 active no_show, not 2
  expect(result.breakdown.noShowPenalty).toBe(5);
  expect(result.activeEvents).toBe(1);
  expect(result.expiredEventsIgnored).toBe(1);
});

// ============================================
// TESTS: Complex scenarios
// ============================================

test('calculateScore: good user reaches green tier', () => {
  const engine = new TrustEngine();
  const user = createMockUser({ verification_level: 'advanced' });
  const events: SafetyEvent[] = Array(20).fill(null).map(() =>
    createMockEvent('session_completed')
  );

  const result = engine.calculateScore(user, events);

  // Base 50 + sessions 20 + age 10 + no reports 10 + verification 10 = 100
  expect(result.score).toBe(100);
  expect(result.tier).toBe('green');
});

test('calculateScore: problematic user ends up in red tier', () => {
  const engine = new TrustEngine();
  const user = createMockUser({
    verification_level: 'none',
    created_at: new Date().toISOString(), // New account
  });
  const events: SafetyEvent[] = [
    createMockEvent('report_confirmed'),
    createMockEvent('no_show'),
    createMockEvent('no_show'),
    createMockEvent('check_in_fail'),
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + no reports 0 - 15 - 10 - 10 = 15
  // No age bonus (new), no verification bonus
  expect(result.score).toBe(15);
  expect(result.tier).toBe('red');
});

test('calculateScore: mixed events calculate correctly', () => {
  const engine = new TrustEngine();
  const user = createMockUser();
  const events: SafetyEvent[] = [
    createMockEvent('session_completed'),
    createMockEvent('session_completed'),
    createMockEvent('session_completed'),
    createMockEvent('session_completed'),
    createMockEvent('session_completed'), // +5
    createMockEvent('no_show'), // -5
  ];

  const result = engine.calculateScore(user, events);

  // Base 50 + age 10 + no reports 10 + sessions 5 - no_show 5 = 70
  expect(result.score).toBe(70);
  expect(result.tier).toBe('yellow');
});

// ============================================
// TESTS: Tier thresholds
// ============================================

test('TrustTierThresholds has correct values', () => {
  expect(TrustTierThresholds.GREEN_MIN).toBe(80);
  expect(TrustTierThresholds.YELLOW_MIN).toBe(60);
});

// ============================================
// TESTS: EventWeights
// ============================================

test('EventWeights has correct values', () => {
  expect(EventWeights.session_completed).toBe(1);
  expect(EventWeights.no_show).toBe(-5);
  expect(EventWeights.check_in_fail).toBe(-10);
  expect(EventWeights.report_confirmed).toBe(-15);
  expect(EventWeights.account_warning).toBe(-20);
});

// ============================================
// RUN TESTS
// ============================================

runTests();
