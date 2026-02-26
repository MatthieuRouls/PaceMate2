/**
 * SafetyGuard Unit Tests
 *
 * Run with: npx ts-node core/safety/safety-guard.test.ts
 * Or integrate with Jest/Vitest when available
 */

import {
  SafetyGuard,
  SafetyErrorCode,
  SafetyValidationResult,
  TrustTier,
  VerificationLevel,
} from './index';

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
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
  };
}

async function runTests() {
  console.log('\n🧪 Running SafetyGuard Tests\n');
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
// MOCK DATA
// ============================================

const createMockUser = (overrides: Partial<{
  id: string;
  phone_verified: boolean;
  photo_verified: boolean;
  verification_level: VerificationLevel;
  trust_score: number;
  trust_tier: TrustTier;
  safety_flags: number;
  suspension_until?: string;
}> = {}) => ({
  id: 'user-123',
  phone_verified: true,
  photo_verified: false,
  verification_level: 'basic' as VerificationLevel,
  trust_score: 50,
  trust_tier: 'green' as TrustTier,
  safety_flags: 0,
  ...overrides,
});

const createMockSession = (overrides: Partial<{
  id: string;
  creator_id: string;
  verified_only: boolean;
  min_trust_score?: number;
  allow_trust_tier_yellow: boolean;
}> = {}) => ({
  id: 'session-123',
  creator_id: 'creator-123',
  verified_only: false,
  min_trust_score: undefined,
  allow_trust_tier_yellow: true,
  ...overrides,
});

// ============================================
// TESTS: checkPhoneVerified
// ============================================

test('checkPhoneVerified: allows verified users', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ phone_verified: true });
  const result = guard.checkPhoneVerified(user);

  expect(result.allowed).toBe(true);
  expect(result.errorCode).toBe(undefined);
});

test('checkPhoneVerified: blocks unverified users', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ phone_verified: false });
  const result = guard.checkPhoneVerified(user);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.PHONE_REQUIRED);
});

// ============================================
// TESTS: checkTrustTier
// ============================================

test('checkTrustTier: allows green tier', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'green' });
  const result = guard.checkTrustTier(user);

  expect(result.allowed).toBe(true);
});

test('checkTrustTier: allows yellow tier when permitted', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'yellow' });
  const result = guard.checkTrustTier(user, true);

  expect(result.allowed).toBe(true);
});

test('checkTrustTier: blocks yellow tier when not permitted', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'yellow' });
  const result = guard.checkTrustTier(user, false);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_TIER_YELLOW_NOT_ALLOWED);
});

test('checkTrustTier: always blocks red tier', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'red' });
  const result = guard.checkTrustTier(user, true);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_TIER_RED);
});

// ============================================
// TESTS: checkVerificationLevel
// ============================================

test('checkVerificationLevel: allows matching level', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ verification_level: 'basic' });
  const result = guard.checkVerificationLevel(user, 'basic');

  expect(result.allowed).toBe(true);
});

test('checkVerificationLevel: allows higher level', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ verification_level: 'advanced' });
  const result = guard.checkVerificationLevel(user, 'basic');

  expect(result.allowed).toBe(true);
});

test('checkVerificationLevel: blocks lower level', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ verification_level: 'none' });
  const result = guard.checkVerificationLevel(user, 'basic');

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.VERIFICATION_REQUIRED);
});

// ============================================
// TESTS: checkTrustScore
// ============================================

test('checkTrustScore: allows sufficient score', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_score: 70 });
  const result = guard.checkTrustScore(user, 50);

  expect(result.allowed).toBe(true);
});

test('checkTrustScore: blocks insufficient score', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_score: 30 });
  const result = guard.checkTrustScore(user, 50);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_SCORE_TOO_LOW);
});

// ============================================
// TESTS: checkSuspension
// ============================================

test('checkSuspension: allows non-suspended users', () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ suspension_until: undefined });
  const result = guard.checkSuspension(user);

  expect(result.allowed).toBe(true);
});

test('checkSuspension: allows expired suspension', () => {
  const guard = new SafetyGuard();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const user = createMockUser({ suspension_until: pastDate });
  const result = guard.checkSuspension(user);

  expect(result.allowed).toBe(true);
});

test('checkSuspension: blocks active suspension', () => {
  const guard = new SafetyGuard();
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const user = createMockUser({ suspension_until: futureDate });
  const result = guard.checkSuspension(user);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.USER_SUSPENDED);
});

// ============================================
// TESTS: validateJoin
// ============================================

test('validateJoin: allows valid user on basic session', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser();
  const session = createMockSession();

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(true);
});

test('validateJoin: blocks unverified phone', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ phone_verified: false });
  const session = createMockSession();

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.PHONE_REQUIRED);
});

test('validateJoin: blocks red tier user', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'red' });
  const session = createMockSession();

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_TIER_RED);
});

test('validateJoin: blocks unverified user on verified-only session', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ verification_level: 'none' });
  const session = createMockSession({ verified_only: true });

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.VERIFICATION_REQUIRED);
});

test('validateJoin: blocks low trust score on high-trust session', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_score: 30 });
  const session = createMockSession({ min_trust_score: 60 });

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_SCORE_TOO_LOW);
});

test('validateJoin: blocks suspended user', async () => {
  const guard = new SafetyGuard();
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const user = createMockUser({ suspension_until: futureDate });
  const session = createMockSession();

  const result = await guard.validateJoin('user-123', 'session-123', user, session);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.USER_SUSPENDED);
});

// ============================================
// TESTS: validateCreateSession
// ============================================

test('validateCreateSession: allows valid user', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser();

  const result = await guard.validateCreateSession('user-123', user);

  expect(result.allowed).toBe(true);
});

test('validateCreateSession: blocks unverified phone', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ phone_verified: false });

  const result = await guard.validateCreateSession('user-123', user);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.PHONE_REQUIRED);
});

test('validateCreateSession: blocks red tier', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'red' });

  const result = await guard.validateCreateSession('user-123', user);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.TRUST_TIER_RED);
});

test('validateCreateSession: allows yellow tier', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser({ trust_tier: 'yellow' });

  const result = await guard.validateCreateSession('user-123', user);

  expect(result.allowed).toBe(true);
});

// ============================================
// TESTS: validateMessage
// ============================================

test('validateMessage: allows valid user', async () => {
  const guard = new SafetyGuard();
  const user = createMockUser();

  const result = await guard.validateMessage('user-123', 'target-123', user);

  expect(result.allowed).toBe(true);
});

test('validateMessage: blocks suspended user', async () => {
  const guard = new SafetyGuard();
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const user = createMockUser({ suspension_until: futureDate });

  const result = await guard.validateMessage('user-123', 'target-123', user);

  expect(result.allowed).toBe(false);
  expect(result.errorCode).toBe(SafetyErrorCode.USER_SUSPENDED);
});

// ============================================
// RUN TESTS
// ============================================

runTests();
