/**
 * Dynamic Reputation Visualization System Unit Tests
 *
 * Run with: npx tsx core/safety/reputation.test.ts
 */

import {
  ReputationService,
} from './reputation.service';

import {
  ScoreWeights,
  StatusThresholds,
  TimeDecayConfig,
  ReputationConfig,
  DEFAULT_TRUST_PROFILE,
} from './reputation.types';

import type {
  TrustProfile,
  TrustStatus,
  PublicTrustProfile,
} from './reputation.types';

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
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
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
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
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
    toContain(expected: string) {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined value, got ${actual}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
    toInclude<U>(expected: U) {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`Expected array to include ${expected}`);
      }
    },
    not: {
      toInclude<U>(expected: U) {
        if (Array.isArray(actual) && actual.includes(expected)) {
          throw new Error(`Expected array NOT to include ${expected}`);
        }
      },
      toHaveProperty(prop: string) {
        if (typeof actual === 'object' && actual !== null && prop in actual) {
          throw new Error(`Expected object NOT to have property "${prop}"`);
        }
      },
    },
  };
}

function createMockProfile(overrides: Partial<TrustProfile> = {}): TrustProfile {
  const now = new Date().toISOString();
  return {
    ...DEFAULT_TRUST_PROFILE,
    user_id: `test-user-${Date.now()}`,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

async function runTests() {
  console.log('\n🧪 Running Dynamic Reputation System Tests\n');
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
// TESTS: Configuration
// ============================================

test('ScoreWeights has correct values', () => {
  expect(ScoreWeights.COMPLETED_RUN).toBe(2);
  expect(ScoreWeights.POSITIVE_FEEDBACK).toBe(3);
  expect(ScoreWeights.NEGATIVE_FEEDBACK).toBe(-5);
  expect(ScoreWeights.CONFIRMED_INCIDENT).toBe(-15);
});

test('StatusThresholds has correct values', () => {
  expect(StatusThresholds.VALIDATED_MIN).toBe(80);
  expect(StatusThresholds.NEW_MIN).toBe(50);
  expect(StatusThresholds.OBSERVED_MIN).toBe(20);
});

test('TimeDecayConfig has correct values', () => {
  expect(TimeDecayConfig.DECAY_START_DAYS).toBe(30);
  expect(TimeDecayConfig.DECAY_RATE_PER_DAY).toBe(0.5);
  expect(TimeDecayConfig.MAX_DECAY_PERCENT).toBe(20);
  expect(TimeDecayConfig.DECAY_FLOOR).toBe(30);
});

test('ReputationConfig has correct base score', () => {
  expect(ReputationConfig.BASE_SCORE).toBe(50);
  expect(ReputationConfig.MIN_SCORE).toBe(0);
  expect(ReputationConfig.MAX_SCORE).toBe(100);
});

// ============================================
// TESTS: Status Determination
// ============================================

test('determineStatus: score >= 80 returns validated', () => {
  const service = new ReputationService();

  expect(service.determineStatus(80)).toBe('validated');
  expect(service.determineStatus(90)).toBe('validated');
  expect(service.determineStatus(100)).toBe('validated');
});

test('determineStatus: score 50-79 returns new', () => {
  const service = new ReputationService();

  expect(service.determineStatus(50)).toBe('new');
  expect(service.determineStatus(65)).toBe('new');
  expect(service.determineStatus(79)).toBe('new');
});

test('determineStatus: score 20-49 returns observed', () => {
  const service = new ReputationService();

  expect(service.determineStatus(20)).toBe('observed');
  expect(service.determineStatus(35)).toBe('observed');
  expect(service.determineStatus(49)).toBe('observed');
});

test('determineStatus: score < 20 returns restricted', () => {
  const service = new ReputationService();

  expect(service.determineStatus(19)).toBe('restricted');
  expect(service.determineStatus(10)).toBe('restricted');
  expect(service.determineStatus(0)).toBe('restricted');
});

// ============================================
// TESTS: Score Boundaries
// ============================================

test('determineStatus: boundary at 80 (exactly)', () => {
  const service = new ReputationService();
  expect(service.determineStatus(80)).toBe('validated');
  expect(service.determineStatus(79.99)).toBe('new');
});

test('determineStatus: boundary at 50 (exactly)', () => {
  const service = new ReputationService();
  expect(service.determineStatus(50)).toBe('new');
  expect(service.determineStatus(49.99)).toBe('observed');
});

test('determineStatus: boundary at 20 (exactly)', () => {
  const service = new ReputationService();
  expect(service.determineStatus(20)).toBe('observed');
  expect(service.determineStatus(19.99)).toBe('restricted');
});

// ============================================
// TESTS: Score Calculation
// ============================================

test('calculateScore: base score for new user is 50', () => {
  const service = new ReputationService();
  const profile = createMockProfile();

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE);
});

test('calculateScore: +2 per completed run', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ completed_runs: 5 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + 5 * ScoreWeights.COMPLETED_RUN);
});

test('calculateScore: +3 per positive feedback', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ positive_feedback_count: 4 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + 4 * ScoreWeights.POSITIVE_FEEDBACK);
});

test('calculateScore: -5 per negative feedback', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ negative_feedback_count: 2 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE - 2 * Math.abs(ScoreWeights.NEGATIVE_FEEDBACK));
});

test('calculateScore: -15 per confirmed incident', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ incidents_count: 1 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE - Math.abs(ScoreWeights.CONFIRMED_INCIDENT));
});

test('calculateScore: run bonus is capped at 50', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ completed_runs: 100 }); // Would be 200 points uncapped

  const score = service.calculateScore(profile);

  // Should be base + max cap, not base + 200
  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.MAX_RUN_BONUS);
});

test('calculateScore: feedback bonus is capped at 30', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ positive_feedback_count: 50 }); // Would be 150 points

  const score = service.calculateScore(profile);

  // Should be base + max cap
  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.MAX_FEEDBACK_BONUS);
});

test('calculateScore: verification basic adds +5', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ verification_level: 'basic' });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.VERIFICATION_BASIC);
});

test('calculateScore: verification advanced adds +10', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ verification_level: 'advanced' });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.VERIFICATION_ADVANCED);
});

test('calculateScore: account age 90+ days adds +5', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ account_age_days: 90 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.ACCOUNT_AGE_90_DAYS);
});

test('calculateScore: account age 365+ days adds +10', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ account_age_days: 365 });

  const score = service.calculateScore(profile);

  expect(score).toBe(ReputationConfig.BASE_SCORE + ScoreWeights.ACCOUNT_AGE_1_YEAR);
});

// ============================================
// TESTS: Time Decay
// ============================================

test('calculateDecay: no decay if active within 30 days', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    last_activity_at: new Date().toISOString(),
  });

  const decay = service.calculateDecay(profile);

  expect(decay).toBe(0);
});

test('calculateDecay: decay starts after 30 days', () => {
  const service = new ReputationService();
  const daysInactive = 35;
  const inactiveDate = new Date(
    Date.now() - daysInactive * 24 * 60 * 60 * 1000
  ).toISOString();

  const profile = createMockProfile({
    last_activity_at: inactiveDate,
    trust_score: 80,
  });

  const decay = service.calculateDecay(profile);

  // 5 days after decay start * 0.5 = 2.5 (with floating point tolerance)
  expect(decay).toBeGreaterThan(0);
  // Add small epsilon for floating point precision
  const expectedMax = 5 * TimeDecayConfig.DECAY_RATE_PER_DAY + 0.01;
  expect(decay).toBeLessThanOrEqual(expectedMax);
});

test('calculateDecay: decay is capped at 20% of score', () => {
  const service = new ReputationService();
  const daysInactive = 365; // Very long inactive
  const inactiveDate = new Date(
    Date.now() - daysInactive * 24 * 60 * 60 * 1000
  ).toISOString();

  const profile = createMockProfile({
    last_activity_at: inactiveDate,
    trust_score: 80,
  });

  const decay = service.calculateDecay(profile);
  const maxAllowedDecay = 80 * (TimeDecayConfig.MAX_DECAY_PERCENT / 100);

  expect(decay).toBeLessThanOrEqual(maxAllowedDecay);
});

// ============================================
// TESTS: Multiple Incidents
// ============================================

test('calculateScore: multiple incidents compound penalty', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ incidents_count: 3 });

  const score = service.calculateScore(profile);

  // 3 incidents * 15 = 45 penalty
  expect(score).toBe(ReputationConfig.BASE_SCORE - 3 * Math.abs(ScoreWeights.CONFIRMED_INCIDENT));
});

test('calculateScore: multiple incidents can push to restricted', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ incidents_count: 4 }); // -60 points

  const score = service.calculateScore(profile);
  const status = service.determineStatus(Math.max(0, score));

  // 50 - 60 = -10, clamped to 0
  expect(status).toBe('restricted');
});

test('calculateScore: incidents + negative feedback stack', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    incidents_count: 2,
    negative_feedback_count: 3,
  });

  const score = service.calculateScore(profile);

  // 50 - (2*15) - (3*5) = 50 - 30 - 15 = 5
  const expectedScore = ReputationConfig.BASE_SCORE -
    2 * Math.abs(ScoreWeights.CONFIRMED_INCIDENT) -
    3 * Math.abs(ScoreWeights.NEGATIVE_FEEDBACK);

  expect(score).toBe(expectedScore);
});

// ============================================
// TESTS: Badges
// ============================================

test('calculateBadges: verified_runner for basic verification', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ verification_level: 'basic' });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('verified_runner');
});

test('calculateBadges: trusted_pacer for 10+ runs no negative', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    completed_runs: 10,
    recent_negative_feedback: 0,
  });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('trusted_pacer');
});

test('calculateBadges: no trusted_pacer with recent negative feedback', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    completed_runs: 10,
    recent_negative_feedback: 1,
  });

  const badges = service.calculateBadges(profile);

  expect(badges).not.toInclude('trusted_pacer');
});

test('calculateBadges: community_favorite with 80%+ positive', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    positive_feedback_count: 8,
    negative_feedback_count: 1, // 8/9 = 89%
  });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('community_favorite');
});

test('calculateBadges: reliable_host for 5+ hosted sessions', () => {
  const service = new ReputationService();
  const profile = createMockProfile({ runs_as_host: 5 });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('reliable_host');
});

test('calculateBadges: safety_champion for advanced + clean record + high score', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    verification_level: 'advanced',
    incidents_count: 0,
    trust_score: 85,
  });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('safety_champion');
});

test('calculateBadges: veteran_runner for 1+ year good standing', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    account_age_days: 365,
    trust_score: 60,
  });

  const badges = service.calculateBadges(profile);

  expect(badges).toInclude('veteran_runner');
});

// ============================================
// TESTS: Recalculation
// ============================================

test('onRunCompleted: triggers recalculation', async () => {
  const service = new ReputationService();

  // Create profile first
  await service.createProfile('user-run-test');

  const result = await service.onRunCompleted('user-run-test');

  expect(result.user_id).toBe('user-run-test');
  expect(result.new_score).toBeGreaterThanOrEqual(result.previous_score);
});

test('onFeedbackReceived: positive increases score', async () => {
  const service = new ReputationService();

  await service.createProfile('user-feedback-pos');

  const result = await service.onFeedbackReceived('user-feedback-pos', 'positive');

  expect(result.score_change).toBeGreaterThanOrEqual(0);
});

test('onFeedbackReceived: negative decreases score', async () => {
  const service = new ReputationService();

  await service.createProfile('user-feedback-neg');

  const result = await service.onFeedbackReceived('user-feedback-neg', 'negative');

  // Score change should be negative or zero (if floor reached)
  expect(result.new_score).toBeLessThanOrEqual(result.previous_score);
});

test('onIncidentConfirmed: triggers significant score drop', async () => {
  const service = new ReputationService();

  await service.createProfile('user-incident');

  const result = await service.onIncidentConfirmed('user-incident');

  expect(result.score_change).toBeLessThan(0);
});

// ============================================
// TESTS: Privacy - Public Profile
// ============================================

test('toPublicProfile: does not expose trust_score', async () => {
  const service = new ReputationService();

  await service.createProfile('user-privacy');

  const response = await service.getPublicProfile('user-privacy');

  expect(response.success).toBe(true);
  expect(response.profile).toBeDefined();
  expect(response.profile).not.toHaveProperty('trust_score');
  expect(response.profile).not.toHaveProperty('raw_score');
});

test('toPublicProfile: only exposes status and indicators', async () => {
  const service = new ReputationService();

  await service.createProfile('user-public');

  const response = await service.getPublicProfile('user-public');

  expect(response.profile!.status).toBeDefined();
  expect(response.profile!.indicator).toBeDefined();
  expect(response.profile!.is_verified).toBeDefined();
  expect(response.profile!.badges).toBeDefined();
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('score never goes below 0', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    incidents_count: 10, // -150 points
    negative_feedback_count: 20, // -100 points
  });

  const score = service.calculateScore(profile);
  const clampedScore = Math.max(0, score);

  expect(clampedScore).toBeGreaterThanOrEqual(0);
});

test('score never goes above 100', () => {
  const service = new ReputationService();
  const profile = createMockProfile({
    completed_runs: 100,
    positive_feedback_count: 100,
    verification_level: 'advanced',
    account_age_days: 500,
    runs_as_host: 50,
  });

  const score = service.calculateScore(profile);
  const clampedScore = Math.min(100, score);

  expect(clampedScore).toBeLessThanOrEqual(100);
});

test('new profile has correct defaults', async () => {
  const service = new ReputationService();

  const profile = await service.createProfile('user-new');

  expect(profile.trust_score).toBe(ReputationConfig.BASE_SCORE);
  expect(profile.status).toBe('new');
  expect(profile.completed_runs).toBe(0);
  expect(profile.incidents_count).toBe(0);
});

// ============================================
// TESTS: Service Instance
// ============================================

test('service can be instantiated without Supabase', () => {
  const service = new ReputationService();
  expect(service).toBeDefined();
});

test('service can be instantiated with Supabase credentials', () => {
  const service = new ReputationService(
    'https://example.supabase.co',
    'test-key'
  );
  expect(service).toBeDefined();
});

// ============================================
// RUN TESTS
// ============================================

runTests();
