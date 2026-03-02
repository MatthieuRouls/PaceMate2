/**
 * Intelligent Matching & Risk-Aware Join Logic Unit Tests
 *
 * Run with: npx tsx core/safety/matching.test.ts
 */

import {
  RiskEvaluationService,
  getRiskEvaluationService,
  resetRiskEvaluationService,
} from './matching.service';

import {
  RiskThresholds,
  RiskWeights,
  IncidentWeights,
  ContextualRiskFactors,
  NeutralMessages,
  DEFAULT_INCIDENT_DATA,
  DEFAULT_SESSION_CONTEXT,
} from './matching.types';

import type {
  RiskEvaluationInput,
  IncidentData,
  SessionContext,
  JoinDecision,
} from './matching.types';

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
    toInclude<U>(expected: U) {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`Expected array to include ${expected}`);
      }
    },
    not: {
      toBe(expected: T) {
        if (actual === expected) {
          throw new Error(`Expected ${actual} NOT to be ${expected}`);
        }
      },
      toHaveProperty(prop: string) {
        if (typeof actual === 'object' && actual !== null && prop in actual) {
          throw new Error(`Expected object NOT to have property "${prop}"`);
        }
      },
      toContain(expected: string) {
        if (typeof actual === 'string' && actual.includes(expected)) {
          throw new Error(`Expected "${actual}" NOT to contain "${expected}"`);
        }
      },
    },
  };
}

function createMockInput(overrides: Partial<RiskEvaluationInput> = {}): RiskEvaluationInput {
  return {
    session_id: `session-${Date.now()}`,
    requester_id: `requester-${Date.now()}`,
    host_id: `host-${Date.now()}`,
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: { ...DEFAULT_INCIDENT_DATA },
    host_incidents: { ...DEFAULT_INCIDENT_DATA },
    session_context: { ...DEFAULT_SESSION_CONTEXT },
    ...overrides,
  };
}

async function runTests() {
  console.log('\n🧪 Running Intelligent Matching & Risk-Aware Join Tests\n');
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
// TESTS: Configuration Constants
// ============================================

test('RiskThresholds has correct values', () => {
  expect(RiskThresholds.AUTO_ACCEPT_MAX).toBe(30);
  expect(RiskThresholds.MANUAL_REVIEW_MAX).toBe(60);
  expect(RiskThresholds.VERIFICATION_REQUIRED_MAX).toBe(80);
});

test('RiskWeights sum to 1.0', () => {
  const sum = RiskWeights.HOST_TRUST +
              RiskWeights.REQUESTER_TRUST +
              RiskWeights.RECENT_INCIDENTS +
              RiskWeights.CONTEXTUAL_RISK;
  // Use tolerance for floating point precision
  expect(Math.abs(sum - 1)).toBeLessThan(0.0001);
});

test('IncidentWeights has correct values', () => {
  expect(IncidentWeights.CONFIRMED_INCIDENT).toBe(25);
  expect(IncidentWeights.PENDING_REPORT).toBe(10);
  expect(IncidentWeights.RECENT_NEGATIVE_FEEDBACK).toBe(5);
});

// ============================================
// TESTS: Host Trust Risk Component
// ============================================

test('calculateHostTrustRisk: high trust = low risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateHostTrustRisk(100);
  expect(risk).toBe(0); // 100 trust = 0 risk
});

test('calculateHostTrustRisk: low trust = high risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateHostTrustRisk(0);
  expect(risk).toBe(40); // 0 trust = 100 * 0.4 = 40 risk
});

test('calculateHostTrustRisk: medium trust = medium risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateHostTrustRisk(50);
  expect(risk).toBe(20); // 50 trust = 50 * 0.4 = 20 risk
});

test('calculateHostTrustRisk: clamps input to 0-100', () => {
  const service = new RiskEvaluationService();
  expect(service.calculateHostTrustRisk(-10)).toBe(40); // Clamped to 0
  expect(service.calculateHostTrustRisk(150)).toBe(0);  // Clamped to 100
});

// ============================================
// TESTS: Requester Trust Risk Component
// ============================================

test('calculateRequesterTrustRisk: high trust = low risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateRequesterTrustRisk(100);
  expect(risk).toBe(0);
});

test('calculateRequesterTrustRisk: low trust = high risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateRequesterTrustRisk(0);
  expect(risk).toBe(30); // 100 * 0.3 = 30
});

// ============================================
// TESTS: Incident Risk Component
// ============================================

test('calculateIncidentRisk: no incidents = 0 risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateIncidentRisk(
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 }
  );
  expect(risk).toBe(0);
});

test('calculateIncidentRisk: requester incident adds risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateIncidentRisk(
    { confirmed_incidents: 1, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 }
  );
  // 1 incident * 25 * 0.7 (requester weight) * 0.2 (incident weight) = 3.5
  expect(risk).toBeGreaterThan(0);
  expect(risk).toBeLessThan(10);
});

test('calculateIncidentRisk: multiple incidents compound', () => {
  const service = new RiskEvaluationService();
  const singleIncident = service.calculateIncidentRisk(
    { confirmed_incidents: 1, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 }
  );
  const multipleIncidents = service.calculateIncidentRisk(
    { confirmed_incidents: 3, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 }
  );
  expect(multipleIncidents).toBeGreaterThan(singleIncident);
});

test('calculateIncidentRisk: host incidents add less risk than requester', () => {
  const service = new RiskEvaluationService();
  const requesterIncident = service.calculateIncidentRisk(
    { confirmed_incidents: 1, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 }
  );
  const hostIncident = service.calculateIncidentRisk(
    { confirmed_incidents: 0, pending_reports: 0, recent_negative_feedback: 0 },
    { confirmed_incidents: 1, pending_reports: 0, recent_negative_feedback: 0 }
  );
  expect(requesterIncident).toBeGreaterThan(hostIncident);
});

// ============================================
// TESTS: Contextual Risk Component
// ============================================

test('calculateContextualRisk: default context has some risk', () => {
  const service = new RiskEvaluationService();
  const risk = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'public',
    is_first_time_pair: true,
    group_size: 2,
    workout_intensity: 'medium',
  });
  // First time pair adds 15, so risk = 15 * 0.1 = 1.5
  expect(risk).toBeGreaterThan(0);
});

test('calculateContextualRisk: verified venue reduces risk', () => {
  const service = new RiskEvaluationService();
  // Need baseline risk (first_time_pair) to see the reduction
  const publicRisk = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'public',
    is_first_time_pair: true,
    group_size: 2,
    workout_intensity: 'medium',
  });
  const verifiedRisk = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'verified_venue',
    is_first_time_pair: true,
    group_size: 2,
    workout_intensity: 'medium',
  });
  expect(verifiedRisk).toBeLessThan(publicRisk);
});

test('calculateContextualRisk: large group reduces risk', () => {
  const service = new RiskEvaluationService();
  // Need baseline risk (first_time_pair) to see the reduction
  const smallGroup = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'public',
    is_first_time_pair: true,
    group_size: 2,
    workout_intensity: 'medium',
  });
  const largeGroup = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'public',
    is_first_time_pair: true,
    group_size: 6,
    workout_intensity: 'medium',
  });
  expect(largeGroup).toBeLessThan(smallGroup);
});

test('calculateContextualRisk: remote location increases risk', () => {
  const service = new RiskEvaluationService();
  const publicRisk = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'public',
    is_first_time_pair: false,
    group_size: 2,
    workout_intensity: 'medium',
  });
  const remoteRisk = service.calculateContextualRisk({
    scheduled_time: new Date().toISOString(),
    location_type: 'remote',
    is_first_time_pair: false,
    group_size: 2,
    workout_intensity: 'medium',
  });
  expect(remoteRisk).toBeGreaterThan(publicRisk);
});

// ============================================
// TESTS: Decision Determination
// ============================================

test('determineDecision: risk < 30 = auto_accept', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(0)).toBe('auto_accept');
  expect(service.determineDecision(15)).toBe('auto_accept');
  expect(service.determineDecision(29)).toBe('auto_accept');
  expect(service.determineDecision(29.9)).toBe('auto_accept');
});

test('determineDecision: risk 30-59 = manual_review', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(30)).toBe('manual_review');
  expect(service.determineDecision(45)).toBe('manual_review');
  expect(service.determineDecision(59)).toBe('manual_review');
  expect(service.determineDecision(59.9)).toBe('manual_review');
});

test('determineDecision: risk 60-79 = verification_required', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(60)).toBe('verification_required');
  expect(service.determineDecision(70)).toBe('verification_required');
  expect(service.determineDecision(79)).toBe('verification_required');
  expect(service.determineDecision(79.9)).toBe('verification_required');
});

test('determineDecision: risk >= 80 = blocked', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(80)).toBe('blocked');
  expect(service.determineDecision(90)).toBe('blocked');
  expect(service.determineDecision(100)).toBe('blocked');
});

test('determineDecision: boundary at exactly 30', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(30)).toBe('manual_review');
});

test('determineDecision: boundary at exactly 60', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(60)).toBe('verification_required');
});

test('determineDecision: boundary at exactly 80', () => {
  const service = new RiskEvaluationService();
  expect(service.determineDecision(80)).toBe('blocked');
});

// ============================================
// TESTS: Risk Level Determination
// ============================================

test('determineRiskLevel: < 30 = low', () => {
  const service = new RiskEvaluationService();
  expect(service.determineRiskLevel(0)).toBe('low');
  expect(service.determineRiskLevel(29)).toBe('low');
});

test('determineRiskLevel: 30-59 = medium', () => {
  const service = new RiskEvaluationService();
  expect(service.determineRiskLevel(30)).toBe('medium');
  expect(service.determineRiskLevel(59)).toBe('medium');
});

test('determineRiskLevel: 60-79 = high', () => {
  const service = new RiskEvaluationService();
  expect(service.determineRiskLevel(60)).toBe('high');
  expect(service.determineRiskLevel(79)).toBe('high');
});

test('determineRiskLevel: >= 80 = critical', () => {
  const service = new RiskEvaluationService();
  expect(service.determineRiskLevel(80)).toBe('critical');
  expect(service.determineRiskLevel(100)).toBe('critical');
});

// ============================================
// TESTS: Status Overrides
// ============================================

test('applyStatusOverrides: restricted requester always blocked', () => {
  const service = new RiskEvaluationService();

  // Even with low risk score, restricted user is blocked
  expect(service.applyStatusOverrides('auto_accept', 80, 15)).toBe('blocked');
  expect(service.applyStatusOverrides('manual_review', 80, 10)).toBe('blocked');
});

test('applyStatusOverrides: restricted host requires verification', () => {
  const service = new RiskEvaluationService();

  // Host is restricted, escalate to verification
  expect(service.applyStatusOverrides('auto_accept', 15, 80)).toBe('verification_required');
  expect(service.applyStatusOverrides('manual_review', 10, 70)).toBe('verification_required');
});

test('applyStatusOverrides: normal scores unchanged', () => {
  const service = new RiskEvaluationService();

  expect(service.applyStatusOverrides('auto_accept', 80, 80)).toBe('auto_accept');
  expect(service.applyStatusOverrides('manual_review', 60, 60)).toBe('manual_review');
  expect(service.applyStatusOverrides('blocked', 30, 30)).toBe('blocked');
});

// ============================================
// TESTS: Full Evaluation Flow
// ============================================

test('evaluateJoinRequest: high trust users get auto_accept', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 90,
    requester_trust_score: 90,
    session_context: {
      ...DEFAULT_SESSION_CONTEXT,
      is_first_time_pair: false,
      location_type: 'verified_venue',
      group_size: 4,
    },
  });

  const result = await service.evaluateJoinRequest(input);

  expect(result.success).toBeTruthy();
  expect(result.decision).toBe('auto_accept');
  expect(result.can_join).toBeTruthy();
});

test('evaluateJoinRequest: low trust users need review', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 40,
    requester_trust_score: 40,
  });

  const result = await service.evaluateJoinRequest(input);

  expect(result.success).toBeTruthy();
  expect(result.decision).not.toBe('auto_accept');
});

test('evaluateJoinRequest: incident history increases risk', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const cleanInput = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
  });

  const incidentInput = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: {
      confirmed_incidents: 2,
      pending_reports: 1,
      recent_negative_feedback: 3,
    },
  });

  const cleanResult = await service.evaluateJoinRequest(cleanInput);
  const incidentResult = await service.evaluateJoinRequest(incidentInput);

  // Incident history should increase risk
  expect(incidentResult._internal?.risk_score).toBeGreaterThan(
    cleanResult._internal?.risk_score || 0
  );
});

test('evaluateJoinRequest: restricted requester always blocked', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 90,
    requester_trust_score: 10, // Restricted
  });

  const result = await service.evaluateJoinRequest(input);

  expect(result.decision).toBe('blocked');
  expect(result.can_join).toBeFalsy();
});

// ============================================
// TESTS: Cross Trust Scenarios
// ============================================

test('cross trust: high host + low requester = elevated risk', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 90,
    requester_trust_score: 30, // Low but not restricted
  });

  const result = await service.evaluateJoinRequest(input);

  // Should not auto-accept due to low requester trust
  expect(result._internal?.risk_score).toBeGreaterThan(20);
});

test('cross trust: low host + high requester = elevated risk', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 30,
    requester_trust_score: 90,
  });

  const result = await service.evaluateJoinRequest(input);

  // Should have elevated risk due to low host trust
  expect(result._internal?.risk_score).toBeGreaterThan(20);
});

test('cross trust: both low = high risk', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 25,
    requester_trust_score: 25,
  });

  const result = await service.evaluateJoinRequest(input);

  // Both low trust should result in high risk
  expect(result._internal?.risk_score).toBeGreaterThan(50);
});

// ============================================
// TESTS: Multiple Incidents
// ============================================

test('multiple incidents: stacking penalties', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const oneIncident = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: { confirmed_incidents: 1, pending_reports: 0, recent_negative_feedback: 0 },
  });

  const threeIncidents = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: { confirmed_incidents: 3, pending_reports: 0, recent_negative_feedback: 0 },
  });

  const result1 = await service.evaluateJoinRequest(oneIncident);
  const result3 = await service.evaluateJoinRequest(threeIncidents);

  expect(result3._internal?.risk_score).toBeGreaterThan(result1._internal?.risk_score || 0);
});

test('multiple incidents: combined with negative feedback', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const incidentsOnly = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: { confirmed_incidents: 2, pending_reports: 0, recent_negative_feedback: 0 },
  });

  const incidentsAndFeedback = createMockInput({
    host_trust_score: 70,
    requester_trust_score: 70,
    requester_incidents: { confirmed_incidents: 2, pending_reports: 1, recent_negative_feedback: 3 },
  });

  const result1 = await service.evaluateJoinRequest(incidentsOnly);
  const result2 = await service.evaluateJoinRequest(incidentsAndFeedback);

  expect(result2._internal?.risk_score).toBeGreaterThan(result1._internal?.risk_score || 0);
});

// ============================================
// TESTS: Privacy & Public API
// ============================================

test('toPublicResponse: does not expose risk score', () => {
  const service = new RiskEvaluationService();

  const result = {
    success: true,
    evaluation_id: 'test',
    decision: 'manual_review' as JoinDecision,
    can_join: false,
    requires_action: true,
    message: NeutralMessages.MANUAL_REVIEW,
    _internal: {
      risk_score: 45,
      risk_level: 'medium' as const,
      factors: ['low_trust'],
      review_triggered: false,
    },
  };

  const publicResponse = service.toPublicResponse(result);

  expect(publicResponse.can_join).toBeFalsy();
  expect(publicResponse.status).toBe('pending');
  expect(publicResponse.message).toBe(NeutralMessages.MANUAL_REVIEW);
  // Should not have risk_score
  expect((publicResponse as unknown as Record<string, unknown>).risk_score).toBe(undefined);
});

test('toPublicResponse: blocked shows unavailable status', () => {
  const service = new RiskEvaluationService();

  const result = {
    success: true,
    evaluation_id: 'test',
    decision: 'blocked' as JoinDecision,
    can_join: false,
    requires_action: false,
    message: NeutralMessages.BLOCKED,
  };

  const publicResponse = service.toPublicResponse(result);

  expect(publicResponse.status).toBe('unavailable');
  expect(publicResponse.message).toBe(NeutralMessages.BLOCKED);
});

test('neutral messages: blocked message is neutral', () => {
  // Should not reveal that user was blocked for risk reasons
  expect(NeutralMessages.BLOCKED).not.toContain('risk');
  expect(NeutralMessages.BLOCKED).not.toContain('block');
  expect(NeutralMessages.BLOCKED).not.toContain('danger');
});

// ============================================
// TESTS: High Risk Tracking
// ============================================

test('high risk tracking: tracks blocked attempts', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    requester_id: 'repeat-offender',
    host_trust_score: 90,
    requester_trust_score: 10, // Will be blocked
  });

  await service.evaluateJoinRequest(input);

  const attempts = service.getHighRiskAttempts('repeat-offender');
  expect(attempts).toBeTruthy();
  expect(attempts?.attempts.length).toBe(1);
});

test('high risk tracking: multiple attempts accumulate', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const baseInput = {
    requester_id: 'persistent-user',
    host_trust_score: 90,
    requester_trust_score: 10, // Will be blocked
    requester_incidents: { ...DEFAULT_INCIDENT_DATA },
    host_incidents: { ...DEFAULT_INCIDENT_DATA },
    session_context: { ...DEFAULT_SESSION_CONTEXT },
  };

  // Make 3 attempts
  for (let i = 0; i < 3; i++) {
    await service.evaluateJoinRequest({
      ...baseInput,
      session_id: `session-${i}`,
      host_id: `host-${i}`,
    });
  }

  const attempts = service.getHighRiskAttempts('persistent-user');
  expect(attempts?.attempts.length).toBe(3);
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('edge case: perfect scores = minimal risk', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 100,
    requester_trust_score: 100,
    session_context: {
      scheduled_time: new Date().toISOString(),
      location_type: 'verified_venue',
      is_first_time_pair: false,
      group_size: 10,
      workout_intensity: 'low',
    },
  });

  const result = await service.evaluateJoinRequest(input);

  expect(result.decision).toBe('auto_accept');
  expect(result._internal?.risk_score).toBeLessThan(10);
});

test('edge case: worst case = blocked', async () => {
  const service = new RiskEvaluationService();
  service.clearCaches();

  const input = createMockInput({
    host_trust_score: 0,
    requester_trust_score: 0,
    requester_incidents: {
      confirmed_incidents: 5,
      pending_reports: 3,
      recent_negative_feedback: 10,
    },
    host_incidents: {
      confirmed_incidents: 3,
      pending_reports: 2,
      recent_negative_feedback: 5,
    },
    session_context: {
      scheduled_time: new Date(new Date().setHours(23)).toISOString(), // Night
      location_type: 'remote',
      is_first_time_pair: true,
      group_size: 2,
      workout_intensity: 'high',
    },
  });

  const result = await service.evaluateJoinRequest(input);

  expect(result.decision).toBe('blocked');
  expect(result._internal?.risk_score).toBeGreaterThan(70);
});

test('edge case: clamped to 100 max', () => {
  const service = new RiskEvaluationService();

  // Even with extreme inputs, risk should not exceed 100
  const risk = service.calculateTotalRisk(50, 40, 30, 20);
  expect(risk).toBeLessThanOrEqual(100);
});

test('service can be instantiated without Supabase', () => {
  const service = new RiskEvaluationService();
  expect(service).toBeTruthy();
});

test('service can be instantiated with Supabase credentials', () => {
  const service = new RiskEvaluationService(
    'https://example.supabase.co',
    'fake-key'
  );
  expect(service).toBeTruthy();
});

test('singleton pattern works correctly', () => {
  resetRiskEvaluationService();
  const service1 = getRiskEvaluationService();
  const service2 = getRiskEvaluationService();
  expect(service1).toBe(service2);
});

// ============================================
// RUN TESTS
// ============================================

runTests();
