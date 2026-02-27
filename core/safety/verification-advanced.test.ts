/**
 * VerificationAdvancedService Unit Tests
 *
 * Run with: npx tsx core/safety/verification-advanced.test.ts
 */

import {
  VerificationAdvancedService,
} from './verification-advanced.service';

import {
  VerificationThresholds,
  VerificationErrorCode,
} from './verification.types';

import type {
  LivenessCheckResult,
  FaceMatchResult,
} from './verification.types';

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
  };
}

async function runTests() {
  console.log('\n🧪 Running VerificationAdvancedService Tests\n');
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

test('VerificationThresholds has correct values', () => {
  expect(VerificationThresholds.LIVENESS_MIN).toBe(0.7);
  expect(VerificationThresholds.FACE_MATCH_MIN).toBe(0.8);
  expect(VerificationThresholds.OVERALL_MIN).toBe(0.8);
  expect(VerificationThresholds.MAX_DEVICES_PER_USER).toBe(3);
  expect(VerificationThresholds.MEDIA_RETENTION_DAYS).toBe(30);
});

test('VerificationErrorCode has correct codes', () => {
  expect(VerificationErrorCode.LIVENESS_FAILED).toBe('VERIFICATION_LIVENESS_FAILED');
  expect(VerificationErrorCode.FACE_MISMATCH).toBe('VERIFICATION_FACE_MISMATCH');
  expect(VerificationErrorCode.PHONE_ALREADY_USED).toBe('VERIFICATION_PHONE_ALREADY_USED');
  expect(VerificationErrorCode.BLACKLISTED).toBe('VERIFICATION_BLACKLISTED');
});

// ============================================
// TESTS: Liveness Check
// ============================================

test('performLivenessCheck: returns score between 0.5 and 1.0', async () => {
  const service = new VerificationAdvancedService();
  const result = await service.performLivenessCheck('test-video-key');

  expect(result.success).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(0.5);
  expect(result.score).toBeLessThan(1.01);
});

test('performLivenessCheck: sets is_live based on threshold', async () => {
  const service = new VerificationAdvancedService();

  // Run multiple times to get different scores
  let foundLive = false;
  let foundNotLive = false;

  for (let i = 0; i < 20; i++) {
    const result = await service.performLivenessCheck(`test-video-${i}`);
    if (result.score >= VerificationThresholds.LIVENESS_MIN) {
      expect(result.is_live).toBe(true);
      foundLive = true;
    } else {
      expect(result.is_live).toBe(false);
      foundNotLive = true;
    }
    if (foundLive && foundNotLive) break;
  }
});

test('performLivenessCheck: returns checks passed/failed arrays', async () => {
  const service = new VerificationAdvancedService();
  const result = await service.performLivenessCheck('test-video-checks');

  expect(result.checks_passed).toBeDefined();
  expect(result.checks_failed).toBeDefined();
});

// ============================================
// TESTS: Face Matching
// ============================================

test('performFaceMatch: returns failure when no profile photo', async () => {
  const service = new VerificationAdvancedService();
  const result = await service.performFaceMatch('test-video-key');

  expect(result.success).toBe(false);
  expect(result.score).toBe(0);
  expect(result.is_match).toBe(false);
});

test('performFaceMatch: returns score between 0.6 and 1.0 when both provided', async () => {
  const service = new VerificationAdvancedService();
  const result = await service.performFaceMatch('test-video-key', 'test-photo-key');

  expect(result.success).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(0.6);
  expect(result.score).toBeLessThan(1.01);
});

test('performFaceMatch: sets is_match based on threshold', async () => {
  const service = new VerificationAdvancedService();

  // Run multiple times to get different scores
  for (let i = 0; i < 10; i++) {
    const result = await service.performFaceMatch(`video-${i}`, `photo-${i}`);
    if (result.score >= VerificationThresholds.FACE_MATCH_MIN) {
      expect(result.is_match).toBe(true);
    } else {
      expect(result.is_match).toBe(false);
    }
  }
});

// ============================================
// TESTS: Overall Score Calculation
// ============================================

test('calculateOverallScore: returns weighted average', () => {
  const service = new VerificationAdvancedService();

  const livenessResult: LivenessCheckResult = {
    success: true,
    score: 0.9,
    is_live: true,
    confidence: 'high',
    checks_passed: ['face_detected'],
    checks_failed: [],
  };

  const faceMatchResult: FaceMatchResult = {
    success: true,
    score: 0.85,
    is_match: true,
    confidence: 'high',
  };

  const overall = service.calculateOverallScore(livenessResult, faceMatchResult);

  // Expected: 0.9 * 0.4 + 0.85 * 0.6 = 0.36 + 0.51 = 0.87
  expect(overall).toBeGreaterThanOrEqual(0.86);
  expect(overall).toBeLessThan(0.88);
});

test('calculateOverallScore: liveness weight is 40%', () => {
  const service = new VerificationAdvancedService();

  const livenessResult: LivenessCheckResult = {
    success: true,
    score: 1.0,
    is_live: true,
    confidence: 'high',
    checks_passed: [],
    checks_failed: [],
  };

  const faceMatchResult: FaceMatchResult = {
    success: true,
    score: 0.0,
    is_match: false,
    confidence: 'low',
  };

  const overall = service.calculateOverallScore(livenessResult, faceMatchResult);

  // Expected: 1.0 * 0.4 + 0.0 * 0.6 = 0.4
  expect(overall).toBeGreaterThanOrEqual(0.39);
  expect(overall).toBeLessThan(0.41);
});

test('calculateOverallScore: face match weight is 60%', () => {
  const service = new VerificationAdvancedService();

  const livenessResult: LivenessCheckResult = {
    success: true,
    score: 0.0,
    is_live: false,
    confidence: 'low',
    checks_passed: [],
    checks_failed: [],
  };

  const faceMatchResult: FaceMatchResult = {
    success: true,
    score: 1.0,
    is_match: true,
    confidence: 'high',
  };

  const overall = service.calculateOverallScore(livenessResult, faceMatchResult);

  // Expected: 0.0 * 0.4 + 1.0 * 0.6 = 0.6
  expect(overall).toBeGreaterThanOrEqual(0.59);
  expect(overall).toBeLessThan(0.61);
});

// ============================================
// TESTS: Start Verification
// ============================================

test('startVerification: returns verification_id on success', async () => {
  const service = new VerificationAdvancedService();

  const result = await service.startVerification({
    user_id: 'test-user-123',
    level: 'advanced',
  });

  expect(result.success).toBe(true);
  expect(result.verification_id).toBeDefined();
  expect(result.verification_id!).toContain('ver_');
});

test('startVerification: returns upload_urls on success', async () => {
  const service = new VerificationAdvancedService();

  const result = await service.startVerification({
    user_id: 'test-user-123',
    level: 'advanced',
  });

  expect(result.success).toBe(true);
  expect(result.upload_urls).toBeDefined();
  expect(result.upload_urls!.selfie_video).toBeDefined();
});

// ============================================
// TESTS: Anti-Abuse
// ============================================

test('checkAntiAbuse: allows normal user', async () => {
  const service = new VerificationAdvancedService();

  const result = await service.checkAntiAbuse('normal-user-123');

  expect(result.allowed).toBe(true);
  expect(result.flags.length).toBe(0);
});

// ============================================
// TESTS: Verification Status
// ============================================

test('getVerificationStatus: returns correct defaults for new user', async () => {
  const service = new VerificationAdvancedService();

  const status = await service.getVerificationStatus('new-user-123');

  expect(status.level).toBe('none');
  expect(status.is_verified).toBe(false);
  expect(status.can_upgrade).toBe(true);
});

// ============================================
// TESTS: Service Instance
// ============================================

test('service can be instantiated without Supabase', () => {
  const service = new VerificationAdvancedService();
  expect(service).toBeDefined();
});

test('service can be instantiated with Supabase credentials', () => {
  const service = new VerificationAdvancedService(
    'https://example.supabase.co',
    'test-key'
  );
  expect(service).toBeDefined();
});

// ============================================
// RUN TESTS
// ============================================

runTests();
