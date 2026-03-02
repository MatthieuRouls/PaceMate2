/**
 * Identity Verification & Social Proof Layer Tests
 *
 * Run with: npx tsx core/safety/identity-verification.test.ts
 */

import {
  IdentityVerificationService,
  getIdentityVerificationService,
  resetIdentityVerificationService,
} from './identity-verification.service';

import {
  VerificationThresholds,
  VerificationLevelMap,
  SessionLevelRequirements,
  PublicBadgeLabels,
  createDefaultVerification,
} from './identity-verification.types';

import type {
  IdentityVerification,
  VerificationLevelNumber,
} from './identity-verification.types';

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
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined value, got ${actual}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`);
      }
    },
    toHaveLength(expected: number) {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(`Expected array of length ${expected}, got ${Array.isArray(actual) ? actual.length : 'non-array'}`);
      }
    },
    toContain<U>(expected: U) {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    },
    not: {
      toBe(expected: T) {
        if (actual === expected) {
          throw new Error(`Expected ${actual} NOT to be ${expected}`);
        }
      },
      toBeTruthy() {
        if (actual) {
          throw new Error(`Expected falsy value, got ${actual}`);
        }
      },
      toContain<U>(expected: U) {
        if (Array.isArray(actual) && actual.includes(expected)) {
          throw new Error(`Expected array NOT to contain ${expected}`);
        }
      },
    },
  };
}

function createMockVerification(overrides: Partial<IdentityVerification> = {}): IdentityVerification {
  const base = createDefaultVerification(`user-${Date.now()}`);
  return {
    ...base,
    id: `idv_${Date.now()}`,
    ...overrides,
  };
}

async function runTests() {
  console.log('\n🧪 Running Identity Verification & Social Proof Tests\n');
  console.log('='.repeat(60));

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

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================
// TESTS: Configuration Constants
// ============================================

test('VerificationThresholds has correct values', () => {
  expect(VerificationThresholds.SELFIE_MATCH_AUTO_PASS).toBe(85);
  expect(VerificationThresholds.SELFIE_MATCH_AUTO_FAIL).toBe(40);
  expect(VerificationThresholds.MIN_COMPLETED_RUNS).toBe(5);
  expect(VerificationThresholds.MIN_POSITIVE_FEEDBACK_RATIO).toBe(0.8);
});

test('VerificationLevelMap has all levels', () => {
  expect(VerificationLevelMap[0]).toBe('basic');
  expect(VerificationLevelMap[1]).toBe('phone_verified');
  expect(VerificationLevelMap[2]).toBe('id_verified');
  expect(VerificationLevelMap[3]).toBe('trusted');
});

test('SessionLevelRequirements has correct values', () => {
  expect(SessionLevelRequirements.solo_mixed).toBe(1);
  expect(SessionLevelRequirements.group).toBe(0);
  expect(SessionLevelRequirements.private).toBe(1);
  expect(SessionLevelRequirements.safe_mode).toBe(2);
});

// ============================================
// TESTS: Default Verification
// ============================================

test('createDefaultVerification creates correct defaults', () => {
  const verification = createDefaultVerification('user-123');

  expect(verification.user_id).toBe('user-123');
  expect(verification.level).toBe(0);
  expect(verification.level_name).toBe('basic');
  expect(verification.email_verified).toBeFalsy();
  expect(verification.phone_verified).toBeFalsy();
  expect(verification.id_verified).toBeFalsy();
  expect(verification.selfie_match_passed).toBeFalsy();
  expect(verification.completed_runs).toBe(0);
});

// ============================================
// TESTS: Level Requirements - Level 0
// ============================================

test('checkLevelRequirements: Level 0 requires email', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({ email_verified: false });

  const check = service.checkLevelRequirements(verification, 0);

  expect(check.met).toBeFalsy();
  expect(check.missing).toContain('email_verified');
});

test('checkLevelRequirements: Level 0 met with email', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({ email_verified: true });

  const check = service.checkLevelRequirements(verification, 0);

  expect(check.met).toBeTruthy();
  expect(check.missing).toHaveLength(0);
});

// ============================================
// TESTS: Level Requirements - Level 1
// ============================================

test('checkLevelRequirements: Level 1 requires phone and photo', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: false,
    has_profile_photo: false,
  });

  const check = service.checkLevelRequirements(verification, 1);

  expect(check.met).toBeFalsy();
  expect(check.missing).toContain('phone_verified');
  expect(check.missing).toContain('profile_photo');
});

test('checkLevelRequirements: Level 1 met with phone and photo', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
  });

  const check = service.checkLevelRequirements(verification, 1);

  expect(check.met).toBeTruthy();
  expect(check.missing).toHaveLength(0);
});

// ============================================
// TESTS: Level Requirements - Level 2
// ============================================

test('checkLevelRequirements: Level 2 requires ID and selfie', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: false,
    selfie_match_passed: false,
  });

  const check = service.checkLevelRequirements(verification, 2);

  expect(check.met).toBeFalsy();
  expect(check.missing).toContain('id_verified');
  expect(check.missing).toContain('selfie_match');
});

test('checkLevelRequirements: Level 2 met with ID and selfie', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
  });

  const check = service.checkLevelRequirements(verification, 2);

  expect(check.met).toBeTruthy();
  expect(check.missing).toHaveLength(0);
});

// ============================================
// TESTS: Level Requirements - Level 3
// ============================================

test('checkLevelRequirements: Level 3 requires social proof', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    completed_runs: 3,
    incident_count: 1,
    positive_feedback_ratio: 0.5,
  });

  const check = service.checkLevelRequirements(verification, 3);

  expect(check.met).toBeFalsy();
  expect(check.missing).toContain('completed_runs');
  expect(check.missing).toContain('no_incidents');
  expect(check.missing).toContain('positive_feedback_ratio');
});

test('checkLevelRequirements: Level 3 met with full social proof', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    completed_runs: 5,
    incident_count: 0,
    positive_feedback_ratio: 0.85,
  });

  const check = service.checkLevelRequirements(verification, 3);

  expect(check.met).toBeTruthy();
  expect(check.missing).toHaveLength(0);
});

// ============================================
// TESTS: Level Transitions
// ============================================

test('verifyEmail: upgrades to Level 0', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const result = await service.verifyEmail('user-email');

  expect(result.success).toBeTruthy();
  expect(result.step).toBe('verify_email');

  const verification = await service.getVerification('user-email');
  expect(verification?.email_verified).toBeTruthy();
});

test('verifyPhone: contributes to Level 1', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // First verify email
  await service.verifyEmail('user-phone');

  // Then verify phone
  const result = await service.verifyPhone('user-phone', 'hash123');

  expect(result.success).toBeTruthy();
  expect(result.step).toBe('verify_phone');

  const verification = await service.getVerification('user-phone');
  expect(verification?.phone_verified).toBeTruthy();
  expect(verification?.phone_number_hash).toBe('hash123');
});

test('uploadProfilePhoto: completes Level 1 requirements', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Setup Level 1 prerequisites
  await service.verifyEmail('user-photo');
  await service.verifyPhone('user-photo', 'hash456');

  // Upload photo
  const result = await service.uploadProfilePhoto('user-photo');

  expect(result.success).toBeTruthy();
  expect(result.level_achieved).toBe(1);

  const verification = await service.getVerification('user-photo');
  expect(verification?.level).toBe(1);
  expect(verification?.level_name).toBe('phone_verified');
});

test('updateSocialProof: achieves Level 3', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create user at Level 2
  const verification = createMockVerification({
    user_id: 'user-social',
    level: 2,
    level_name: 'id_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    completed_runs: 0,
    incident_count: 0,
    positive_feedback_ratio: 0,
  });
  await service.setVerification(verification);

  // Update with full social proof
  const result = await service.updateSocialProof('user-social', 5, 0, 0.9);

  expect(result.success).toBeTruthy();
  expect(result.level_achieved).toBe(3);

  const updated = await service.getVerification('user-social');
  expect(updated?.level).toBe(3);
  expect(updated?.level_name).toBe('trusted');
});

// ============================================
// TESTS: Threshold Boundaries
// ============================================

test('Level 3: exactly 5 runs is sufficient', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    completed_runs: 5,
    incident_count: 0,
    positive_feedback_ratio: 0.8,
  });

  const check = service.checkLevelRequirements(verification, 3);
  expect(check.requirements.find((r) => r.requirement === 'completed_runs')?.met).toBeTruthy();
});

test('Level 3: 4 runs is insufficient', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    completed_runs: 4,
    incident_count: 0,
    positive_feedback_ratio: 0.8,
  });

  const check = service.checkLevelRequirements(verification, 3);
  expect(check.requirements.find((r) => r.requirement === 'completed_runs')?.met).toBeFalsy();
});

test('Level 3: 0 incidents required', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    completed_runs: 10,
    incident_count: 1,
    positive_feedback_ratio: 0.9,
  });

  const check = service.checkLevelRequirements(verification, 3);
  expect(check.requirements.find((r) => r.requirement === 'no_incidents')?.met).toBeFalsy();
});

test('Level 3: exactly 0.8 feedback ratio is sufficient', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    completed_runs: 5,
    incident_count: 0,
    positive_feedback_ratio: 0.8,
  });

  const check = service.checkLevelRequirements(verification, 3);
  expect(check.requirements.find((r) => r.requirement === 'positive_feedback_ratio')?.met).toBeTruthy();
});

test('Level 3: 0.79 feedback ratio is insufficient', () => {
  const service = new IdentityVerificationService();
  const verification = createMockVerification({
    completed_runs: 5,
    incident_count: 0,
    positive_feedback_ratio: 0.79,
  });

  const check = service.checkLevelRequirements(verification, 3);
  expect(check.requirements.find((r) => r.requirement === 'positive_feedback_ratio')?.met).toBeFalsy();
});

// ============================================
// TESTS: Session Constraints
// ============================================

test('checkSessionConstraint: solo_mixed requires Level 1', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create Level 0 user
  await service.verifyEmail('user-solo');

  const result = await service.checkSessionConstraint('user-solo', 'solo_mixed');

  expect(result.allowed).toBeFalsy();
  expect(result.required_level).toBe(1);
  expect(result.current_level).toBe(0);
  expect(result.upgrade_path).toBeDefined();
});

test('checkSessionConstraint: safe_mode requires Level 2', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create Level 1 user
  const verification = createMockVerification({
    user_id: 'user-safe',
    level: 1,
    level_name: 'phone_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
  });
  await service.setVerification(verification);

  const result = await service.checkSessionConstraint('user-safe', 'safe_mode');

  expect(result.allowed).toBeFalsy();
  expect(result.required_level).toBe(2);
  expect(result.upgrade_path).toContain('upload_id_document');
});

test('checkSessionConstraint: group allows Level 0', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  await service.verifyEmail('user-group');

  const result = await service.checkSessionConstraint('user-group', 'group');

  expect(result.allowed).toBeTruthy();
  expect(result.required_level).toBe(0);
});

test('checkSessionConstraint: Level 2 user can access safe_mode', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const verification = createMockVerification({
    user_id: 'user-level2',
    level: 2,
    level_name: 'id_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
  });
  await service.setVerification(verification);

  const result = await service.checkSessionConstraint('user-level2', 'safe_mode');

  expect(result.allowed).toBeTruthy();
});

// ============================================
// TESTS: Suspension & Revalidation
// ============================================

test('requireRevalidation: downgrades level and requires ID re-verification', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create Level 2 user
  const verification = createMockVerification({
    user_id: 'user-suspend',
    level: 2,
    level_name: 'id_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
  });
  await service.setVerification(verification);

  await service.requireRevalidation('user-suspend', 'suspension_lifted');

  const updated = await service.getVerification('user-suspend');
  expect(updated?.level).toBe(1);
  expect(updated?.id_verified).toBeFalsy();
  expect(updated?.selfie_match_passed).toBeFalsy();
  expect(updated?.admin_review_required).toBeTruthy();
});

test('checkRevalidationRequired: returns required after suspension', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const verification = createMockVerification({
    user_id: 'user-check-reval',
    admin_review_required: true,
    admin_review_reason: 'revalidation_required',
  });
  await service.setVerification(verification);

  const result = await service.checkRevalidationRequired('user-check-reval');

  expect(result.required).toBeTruthy();
  expect(result.reason).toBe('suspension_lifted');
  expect(result.steps_required).toContain('upload_id_document');
  expect(result.steps_required).toContain('capture_selfie');
});

test('completeRevalidation: restores level after re-verification', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create user needing revalidation at Level 1
  const verification = createMockVerification({
    user_id: 'user-complete-reval',
    level: 1,
    level_name: 'phone_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    admin_review_required: true,
    admin_review_reason: 'revalidation_required',
  });
  await service.setVerification(verification);

  const result = await service.completeRevalidation('user-complete-reval');

  expect(result.success).toBeTruthy();
  expect(result.revalidation_complete).toBeTruthy();
  expect(result.new_level).toBe(2);

  const updated = await service.getVerification('user-complete-reval');
  expect(updated?.admin_review_required).toBeFalsy();
});

// ============================================
// TESTS: Multi-Account Detection
// ============================================

test('trackDeviceFingerprint: flags multiple accounts', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // First user with device
  await service.startVerification({
    user_id: 'user-device-1',
    target_level: 1,
    device_fingerprint: 'fingerprint-shared',
  });

  // Second user with same device
  await service.startVerification({
    user_id: 'user-device-2',
    target_level: 1,
    device_fingerprint: 'fingerprint-shared',
  });

  const verification = await service.getVerification('user-device-2');
  expect(verification?.flagged_for_multi_account).toBeTruthy();
});

test('checkMultiAccount: detects shared devices', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Setup two users with same fingerprint
  await service.startVerification({
    user_id: 'user-multi-1',
    target_level: 1,
    device_fingerprint: 'shared-fp',
  });
  await service.startVerification({
    user_id: 'user-multi-2',
    target_level: 1,
    device_fingerprint: 'shared-fp',
  });

  const check = await service.checkMultiAccount('user-multi-2');

  expect(check.is_flagged).toBeTruthy();
  expect(check.similar_accounts.length).toBeGreaterThan(0);
  expect(check.check_factors.some((f) => f.factor === 'device_fingerprint')).toBeTruthy();
});

// ============================================
// TESTS: Admin Review
// ============================================

test('processAdminReview: approve grants level', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create user with pending review
  const verification = createMockVerification({
    user_id: 'user-admin-review',
    level: 1,
    level_name: 'phone_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    admin_review_required: true,
    admin_review_reason: 'low_selfie_confidence',
    selfie_match_score: 65,
  });
  await service.setVerification(verification);

  // Manually add to pending reviews
  (service as unknown as { pendingReviews: Map<string, unknown> }).pendingReviews.set(verification.id, {
    verification_id: verification.id,
    user_id: verification.user_id,
    review_type: 'low_selfie_confidence',
    selfie_match_score: 65,
    risk_indicators: [],
    recommendation: 'approve',
    confidence: 0.7,
  });

  const result = await service.processAdminReview({
    verification_id: verification.id,
    admin_id: 'admin-1',
    action: 'approve',
    level_to_grant: 2,
  });

  expect(result.success).toBeTruthy();
  expect(result.new_level).toBe(2);

  const updated = await service.getVerification('user-admin-review');
  expect(updated?.admin_review_required).toBeFalsy();
  expect(updated?.selfie_match_passed).toBeTruthy();
});

// ============================================
// TESTS: Public API (Safe)
// ============================================

test('getPublicStatus: returns safe data without scores', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const verification = createMockVerification({
    user_id: 'user-public',
    level: 2,
    level_name: 'id_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    selfie_match_score: 92, // Should NOT be exposed
  });
  await service.setVerification(verification);

  const status = await service.getPublicStatus('user-public');

  expect(status.level).toBe(2);
  expect(status.level_name).toBe('id_verified');
  expect(status.badges.length).toBeGreaterThan(0);
  expect(status.badges.some((b) => b.type === 'id')).toBeTruthy();

  // Should NOT contain score
  expect((status as unknown as Record<string, unknown>).selfie_match_score).toBeUndefined();
});

test('getPublicStatus: shows upgrade path', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const verification = createMockVerification({
    user_id: 'user-upgrade',
    level: 1,
    level_name: 'phone_verified',
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
  });
  await service.setVerification(verification);

  const status = await service.getPublicStatus('user-upgrade');

  expect(status.can_upgrade).toBeTruthy();
  expect(status.next_level_requirements).toBeDefined();
  expect(status.next_level_requirements).toContain('id_verified');
});

// ============================================
// TESTS: Rate Limiting
// ============================================

test('startVerification: rate limits excessive attempts', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  // Create user with many attempts
  const verification = createMockVerification({
    user_id: 'user-rate-limit',
    verification_attempts: 3,
    last_verification_attempt_at: new Date().toISOString(),
  });
  await service.setVerification(verification);

  const result = await service.startVerification({
    user_id: 'user-rate-limit',
    target_level: 1,
  });

  expect(result.success).toBeFalsy();
  expect(result.error?.includes('Rate limited')).toBeTruthy();
});

// ============================================
// TESTS: Already at Level
// ============================================

test('startVerification: rejects if already at level', async () => {
  const service = new IdentityVerificationService();
  service.clearCaches();

  const verification = createMockVerification({
    user_id: 'user-already',
    level: 2,
    level_name: 'id_verified',
  });
  await service.setVerification(verification);

  const result = await service.startVerification({
    user_id: 'user-already',
    target_level: 1,
  });

  expect(result.success).toBeFalsy();
  expect(result.error?.includes('Already at or above')).toBeTruthy();
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('calculateCurrentLevel: calculates correctly', () => {
  const service = new IdentityVerificationService();

  const verification = createMockVerification({
    level: 2,
    email_verified: true,
    phone_verified: true,
    has_profile_photo: true,
    id_verified: true,
    selfie_match_passed: true,
    completed_runs: 10,
    incident_count: 0,
    positive_feedback_ratio: 0.95,
  });

  const level = service.calculateCurrentLevel(verification);
  expect(level).toBe(3);
});

test('singleton pattern works correctly', () => {
  resetIdentityVerificationService();

  const service1 = getIdentityVerificationService();
  const service2 = getIdentityVerificationService();

  expect(service1).toBe(service2);
});

test('PublicBadgeLabels are neutral', () => {
  expect(PublicBadgeLabels[0]).toBe('Email verifie');
  expect(PublicBadgeLabels[1]).toBe('Telephone verifie');
  expect(PublicBadgeLabels[2]).toBe('Identite verifiee');
  expect(PublicBadgeLabels[3]).toBe('Membre de confiance');

  // Should not contain sensitive terms
  Object.values(PublicBadgeLabels).forEach((label) => {
    expect(label.toLowerCase().includes('score')).toBeFalsy();
    expect(label.toLowerCase().includes('risk')).toBeFalsy();
  });
});

// ============================================
// RUN TESTS
// ============================================

runTests();
