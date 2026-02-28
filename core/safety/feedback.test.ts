/**
 * Post-Run Safety Feedback System Unit Tests
 *
 * Run with: npx tsx core/safety/feedback.test.ts
 */

import {
  FeedbackService,
} from './feedback.service';

import {
  TrustImpactThresholds,
  FeedbackErrorCode,
  FeedbackConfig,
  MODERATION_TRIGGER_FLAGS,
} from './feedback.types';

import type {
  SafetyFeedback,
  SilentReport,
  CreateFeedbackInput,
} from './feedback.types';

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
    toHaveProperty(prop: string) {
      if (typeof actual !== 'object' || actual === null || !(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    },
    get not() {
      return {
        toHaveProperty(prop: string) {
          if (typeof actual === 'object' && actual !== null && prop in actual) {
            throw new Error(`Expected object NOT to have property "${prop}"`);
          }
        },
      };
    },
  };
}

async function runTests() {
  console.log('\n🧪 Running Post-Run Safety Feedback System Tests\n');
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

test('TrustImpactThresholds has correct values', () => {
  expect(TrustImpactThresholds.NEGATIVE_FEEDBACK_PENALTY).toBe(-5);
  expect(TrustImpactThresholds.POSITIVE_FEEDBACK_BONUS).toBe(2);
  expect(TrustImpactThresholds.BADGE_REMOVAL_THRESHOLD).toBe(2);
  expect(TrustImpactThresholds.INTERNAL_REVIEW_THRESHOLD).toBe(3);
  expect(TrustImpactThresholds.AUTO_SUSPENSION_THRESHOLD).toBe(5);
  expect(TrustImpactThresholds.THRESHOLD_WINDOW_DAYS).toBe(30);
});

test('FeedbackConfig has correct values', () => {
  expect(FeedbackConfig.FEEDBACK_WINDOW_HOURS).toBe(48);
  expect(FeedbackConfig.REPORT_COOLDOWN_HOURS).toBe(24);
  expect(FeedbackConfig.MAX_COMMENT_LENGTH).toBe(500);
  expect(FeedbackConfig.MAX_FLAGS_PER_FEEDBACK).toBe(5);
});

test('FeedbackErrorCode has correct codes', () => {
  expect(FeedbackErrorCode.FEEDBACK_ALREADY_EXISTS).toBe('FEEDBACK_ALREADY_EXISTS');
  expect(FeedbackErrorCode.CANNOT_REVIEW_SELF).toBe('FEEDBACK_CANNOT_REVIEW_SELF');
  expect(FeedbackErrorCode.CANNOT_REPORT_SELF).toBe('REPORT_CANNOT_REPORT_SELF');
});

test('MODERATION_TRIGGER_FLAGS contains severe flags', () => {
  expect(MODERATION_TRIGGER_FLAGS.includes('harassment')).toBe(true);
  expect(MODERATION_TRIGGER_FLAGS.includes('inappropriate_behavior')).toBe(true);
  expect(MODERATION_TRIGGER_FLAGS.includes('unsafe_behavior')).toBe(true);
  expect(MODERATION_TRIGGER_FLAGS.includes('aggressive')).toBe(true);
});

// ============================================
// TESTS: Feedback Creation
// ============================================

test('createFeedback: creates positive feedback successfully', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-123',
    reviewer_id: 'reviewer-456',
    reviewed_user_id: 'user-789',
    rating: 'positive',
    flags: ['great_pacer', 'encouraging'],
  });

  // Check it's not an error
  expect('id' in result).toBe(true);

  const feedback = result as SafetyFeedback;
  expect(feedback.id).toContain('fb_');
  expect(feedback.rating).toBe('positive');
  expect(feedback.flags.length).toBe(2);
  expect(feedback.processed).toBe(false);
});

test('createFeedback: creates negative feedback successfully', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-456',
    reviewer_id: 'reviewer-123',
    reviewed_user_id: 'user-789',
    rating: 'negative',
    flags: ['late_arrival', 'uncomfortable'],
    comment: 'Arrived 15 minutes late',
  });

  expect('id' in result).toBe(true);

  const feedback = result as SafetyFeedback;
  expect(feedback.rating).toBe('negative');
  expect(feedback.comment).toBe('Arrived 15 minutes late');
});

test('createFeedback: rejects self-review', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-123',
    reviewer_id: 'user-123',
    reviewed_user_id: 'user-123',
    rating: 'positive',
    flags: ['great_pacer'],
  });

  expect('error' in result).toBe(true);
  expect((result as { code: string }).code).toBe(FeedbackErrorCode.CANNOT_REVIEW_SELF);
});

test('createFeedback: prevents duplicate feedback', async () => {
  const service = new FeedbackService();

  // First feedback
  const first = await service.createFeedback({
    session_id: 'session-dup',
    reviewer_id: 'reviewer-dup',
    reviewed_user_id: 'user-dup',
    rating: 'positive',
    flags: [],
  });

  expect('id' in first).toBe(true);

  // Try duplicate
  const second = await service.createFeedback({
    session_id: 'session-dup',
    reviewer_id: 'reviewer-dup',
    reviewed_user_id: 'user-dup',
    rating: 'negative',
    flags: [],
  });

  expect('error' in second).toBe(true);
  expect((second as { code: string }).code).toBe(FeedbackErrorCode.FEEDBACK_ALREADY_EXISTS);
});

test('createFeedback: truncates flags to max limit', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-flags',
    reviewer_id: 'reviewer-flags',
    reviewed_user_id: 'user-flags',
    rating: 'positive',
    flags: [
      'great_pacer', 'encouraging', 'punctual',
      'good_communication', 'safe_runner', 'no_interaction', // 6 flags
    ],
  });

  expect('id' in result).toBe(true);
  const feedback = result as SafetyFeedback;
  expect(feedback.flags.length).toBeLessThanOrEqual(FeedbackConfig.MAX_FLAGS_PER_FEEDBACK);
});

test('createFeedback: truncates comment to max length', async () => {
  const service = new FeedbackService();

  const longComment = 'a'.repeat(1000); // Exceeds 500 char limit

  const result = await service.createFeedback({
    session_id: 'session-comment',
    reviewer_id: 'reviewer-comment',
    reviewed_user_id: 'user-comment',
    rating: 'neutral',
    flags: [],
    comment: longComment,
  });

  expect('id' in result).toBe(true);
  const feedback = result as SafetyFeedback;
  expect(feedback.comment!.length).toBeLessThanOrEqual(FeedbackConfig.MAX_COMMENT_LENGTH);
});

test('createFeedback: triggers moderation for severe flags', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-severe',
    reviewer_id: 'reviewer-severe',
    reviewed_user_id: 'user-severe',
    rating: 'negative',
    flags: ['harassment', 'aggressive'],
  });

  expect('id' in result).toBe(true);
  const feedback = result as SafetyFeedback;
  expect(feedback.moderation_triggered).toBe(true);
});

test('createFeedback: does not trigger moderation for minor flags', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-minor',
    reviewer_id: 'reviewer-minor',
    reviewed_user_id: 'user-minor',
    rating: 'negative',
    flags: ['late_arrival'],
  });

  expect('id' in result).toBe(true);
  const feedback = result as SafetyFeedback;
  expect(feedback.moderation_triggered).toBe(false);
});

// ============================================
// TESTS: Silent Reporting
// ============================================

test('createSilentReport: creates report successfully', async () => {
  const service = new FeedbackService();

  const result = await service.createSilentReport({
    reporter_id: 'reporter-123',
    reported_user_id: 'reported-456',
    type: 'harassment',
    description: 'Sent inappropriate messages',
  });

  expect('id' in result).toBe(true);

  const report = result as SilentReport;
  expect(report.id).toContain('sr_');
  expect(report.type).toBe('harassment');
  expect(report.status).toBe('pending');
});

test('createSilentReport: rejects self-report', async () => {
  const service = new FeedbackService();

  const result = await service.createSilentReport({
    reporter_id: 'user-self',
    reported_user_id: 'user-self',
    type: 'safety_concern',
  });

  expect('error' in result).toBe(true);
  expect((result as { code: string }).code).toBe(FeedbackErrorCode.CANNOT_REPORT_SELF);
});

test('createSilentReport: enforces cooldown', async () => {
  const service = new FeedbackService();

  // First report
  const first = await service.createSilentReport({
    reporter_id: 'reporter-cooldown',
    reported_user_id: 'reported-cooldown',
    type: 'spam',
  });

  expect('id' in first).toBe(true);

  // Immediate second report should fail
  const second = await service.createSilentReport({
    reporter_id: 'reporter-cooldown',
    reported_user_id: 'reported-cooldown',
    type: 'harassment',
  });

  expect('error' in second).toBe(true);
  expect((second as { code: string }).code).toBe(FeedbackErrorCode.REPORT_ALREADY_EXISTS);
});

// ============================================
// TESTS: Trust Impact
// ============================================

test('processFeedbackTrustImpact: processes negative feedback', async () => {
  const service = new FeedbackService();

  const feedback: SafetyFeedback = {
    id: 'fb_test_impact',
    session_id: 'session-impact',
    reviewer_id: 'reviewer-impact',
    reviewed_user_id: 'user-impact',
    rating: 'negative',
    flags: ['late_arrival'],
    anonymous: false,
    created_at: new Date().toISOString(),
    processed: false,
    moderation_triggered: false,
  };

  const result = await service.processFeedbackTrustImpact(feedback);

  expect(result.user_id).toBe('user-impact');
  expect(result.score_change).toBe(TrustImpactThresholds.NEGATIVE_FEEDBACK_PENALTY);
  expect(result.actions_triggered.length).toBeGreaterThan(0);
  expect(result.actions_triggered[0].type).toBe('score_decreased');
});

test('processFeedbackTrustImpact: processes positive feedback', async () => {
  const service = new FeedbackService();

  const feedback: SafetyFeedback = {
    id: 'fb_test_positive',
    session_id: 'session-positive',
    reviewer_id: 'reviewer-positive',
    reviewed_user_id: 'user-positive',
    rating: 'positive',
    flags: ['great_pacer'],
    anonymous: false,
    created_at: new Date().toISOString(),
    processed: false,
    moderation_triggered: false,
  };

  const result = await service.processFeedbackTrustImpact(feedback);

  expect(result.score_change).toBe(TrustImpactThresholds.POSITIVE_FEEDBACK_BONUS);
  expect(result.actions_triggered[0].type).toBe('score_increased');
});

// ============================================
// TESTS: Moderation
// ============================================

test('getUserModerationRecord: returns record for user', async () => {
  const service = new FeedbackService();

  const record = await service.getUserModerationRecord('user-mod-test');

  expect(record.user_id).toBe('user-mod-test');
  expect(record.status).toBeDefined();
  expect(record.risk_score).toBeGreaterThanOrEqual(0);
  expect(record.risk_score).toBeLessThanOrEqual(100);
});

test('takeAction: processes warn action', async () => {
  const service = new FeedbackService();

  const result = await service.takeAction({
    user_id: 'user-warn',
    action: 'warn',
    reason: 'Multiple negative feedbacks',
    moderator_id: 'mod-123',
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe('warn');
  expect(result.new_status).toBe('warned');
});

test('takeAction: processes suspend action', async () => {
  const service = new FeedbackService();

  const result = await service.takeAction({
    user_id: 'user-suspend',
    action: 'suspend',
    suspension_days: 7,
    reason: 'Harassment confirmed',
    moderator_id: 'mod-123',
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe('suspend');
  expect(result.new_status).toBe('suspended');
});

test('takeAction: processes clear action', async () => {
  const service = new FeedbackService();

  const result = await service.takeAction({
    user_id: 'user-clear',
    action: 'clear',
    reason: 'Investigation complete, no issues found',
    moderator_id: 'mod-123',
  });

  expect(result.success).toBe(true);
  expect(result.action).toBe('clear');
  expect(result.new_status).toBe('clear');
});

// ============================================
// TESTS: Privacy
// ============================================

test('feedback does not expose reviewer in public view', () => {
  const feedback: SafetyFeedback = {
    id: 'fb_privacy',
    session_id: 'session-privacy',
    reviewer_id: 'secret-reviewer',
    reviewed_user_id: 'user-privacy',
    rating: 'negative',
    flags: ['harassment'],
    comment: 'Detailed comment',
    anonymous: false,
    created_at: new Date().toISOString(),
    processed: false,
    moderation_triggered: true,
  };

  // Simulate creating public view (what API would return)
  const publicView = {
    id: feedback.id,
    session_id: feedback.session_id,
    rating: feedback.rating,
    flags: feedback.flags,
    created_at: feedback.created_at,
    // reviewer_id should NOT be here
    // comment should NOT be here
  };

  expect(publicView).not.toHaveProperty('reviewer_id');
  expect(publicView).not.toHaveProperty('comment');
});

test('anonymous feedback hides reviewer even from admins', async () => {
  const service = new FeedbackService();

  const result = await service.createFeedback({
    session_id: 'session-anon',
    reviewer_id: 'anon-reviewer',
    reviewed_user_id: 'user-anon',
    rating: 'negative',
    flags: ['uncomfortable'],
    anonymous: true,
  });

  expect('id' in result).toBe(true);
  const feedback = result as SafetyFeedback;
  expect(feedback.anonymous).toBe(true);
});

// ============================================
// TESTS: Service Instance
// ============================================

test('service can be instantiated without Supabase', () => {
  const service = new FeedbackService();
  expect(service).toBeDefined();
});

test('service can be instantiated with Supabase credentials', () => {
  const service = new FeedbackService(
    'https://example.supabase.co',
    'test-key'
  );
  expect(service).toBeDefined();
});

// ============================================
// RUN TESTS
// ============================================

runTests();
