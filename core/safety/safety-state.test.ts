/**
 * Safety-Driven Product Architecture Tests
 *
 * Run with: npx tsx core/safety/safety-state.test.ts
 */

import {
  SafetyStateService,
  getSafetyStateService,
  resetSafetyStateService,
} from './safety-state.service';

import {
  SafeModeService,
  getSafeModeService,
  resetSafeModeService,
  SessionForFiltering,
  UserForFiltering,
} from './safe-mode.service';

import {
  SafetyCronService,
  getSafetyCronService,
  resetSafetyCronService,
} from './safety-cron.service';

import {
  StateTransitionRules,
  StateCapabilities,
  SafetyStateMessages,
  DEFAULT_SAFE_MODE_SETTINGS,
  SAFE_MODE_FILTERS,
} from './safety-state.types';

import type {
  SafetyState,
  TransitionEvaluationInput,
} from './safety-state.types';

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
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
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
    },
  };
}

function createMockEvaluationInput(overrides: Partial<TransitionEvaluationInput> = {}): TransitionEvaluationInput {
  return {
    user_id: `user-${Date.now()}`,
    current_state: 'normal',
    trust_score: 70,
    negative_feedbacks_count: 0,
    incidents_count: 0,
    high_risk_evaluations_count: 0,
    has_serious_incident: false,
    consecutive_clean_days: 0,
    ...overrides,
  };
}

function createMockSession(overrides: Partial<SessionForFiltering> = {}): SessionForFiltering {
  return {
    id: `session-${Date.now()}`,
    host_id: `host-${Date.now()}`,
    host_trust_score: 75,
    host_verification_level: 'verified',
    host_safety_state: 'normal',
    participant_count: 4,
    max_participants: 10,
    is_private: false,
    location_type: 'public',
    ...overrides,
  };
}

function createMockUser(overrides: Partial<UserForFiltering> = {}): UserForFiltering {
  return {
    id: `user-${Date.now()}`,
    trust_score: 75,
    verification_level: 'verified',
    safety_state: 'normal',
    total_runs: 10,
    hosted_sessions: 5,
    ...overrides,
  };
}

async function runTests() {
  console.log('\n🧪 Running Safety-Driven Product Architecture Tests\n');
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

test('StateTransitionRules has correct thresholds', () => {
  expect(StateTransitionRules.NEGATIVE_FEEDBACKS_FOR_MONITORING).toBe(3);
  expect(StateTransitionRules.INCIDENTS_FOR_RESTRICTION).toBe(2);
  expect(StateTransitionRules.REHABILITATION_DAYS).toBe(30);
});

test('StateCapabilities defined for all states', () => {
  expect(StateCapabilities.normal).toBeDefined();
  expect(StateCapabilities.monitored).toBeDefined();
  expect(StateCapabilities.restricted).toBeDefined();
  expect(StateCapabilities.suspended).toBeDefined();
});

test('Normal state has full capabilities', () => {
  const caps = StateCapabilities.normal;
  expect(caps.can_join_sessions).toBeTruthy();
  expect(caps.can_host_sessions).toBeTruthy();
  expect(caps.can_create_1on1).toBeTruthy();
  expect(caps.visible_to_safe_mode_users).toBeTruthy();
});

test('Suspended state has no capabilities', () => {
  const caps = StateCapabilities.suspended;
  expect(caps.can_join_sessions).toBeFalsy();
  expect(caps.can_host_sessions).toBeFalsy();
  expect(caps.can_create_1on1).toBeFalsy();
  expect(caps.visible_to_safe_mode_users).toBeFalsy();
});

test('Restricted state has limited capabilities', () => {
  const caps = StateCapabilities.restricted;
  expect(caps.can_join_sessions).toBeTruthy();
  expect(caps.can_host_sessions).toBeFalsy();
  expect(caps.can_create_1on1).toBeFalsy();
  expect(caps.min_session_size).toBe(3);
});

// ============================================
// TESTS: Safety State Service - Profile Management
// ============================================

test('getOrCreateProfile creates default profile', async () => {
  const service = new SafetyStateService();
  const profile = await service.getOrCreateProfile('user-1');

  expect(profile.user_id).toBe('user-1');
  expect(profile.safety_state).toBe('normal');
  expect(profile.safety_enhanced_mode).toBeFalsy();
  expect(profile.consecutive_clean_days).toBe(0);
});

test('getOrCreateProfile returns existing profile', async () => {
  const service = new SafetyStateService();

  const profile1 = await service.getOrCreateProfile('user-2');
  const profile2 = await service.getOrCreateProfile('user-2');

  expect(profile1.user_id).toBe(profile2.user_id);
  expect(profile1.created_at).toBe(profile2.created_at);
});

// ============================================
// TESTS: Transition Evaluation - Escalation
// ============================================

test('evaluateTransition: normal -> monitored on negative feedbacks', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'normal',
    negative_feedbacks_count: 3,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('monitored');
  expect(result.reason).toBe('multiple_negative_feedbacks');
});

test('evaluateTransition: normal stays normal with few feedbacks', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'normal',
    negative_feedbacks_count: 2,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeFalsy();
});

test('evaluateTransition: monitored -> restricted on incidents', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'monitored',
    incidents_count: 2,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('restricted');
  expect(result.reason).toBe('repeated_incidents');
});

test('evaluateTransition: monitored -> restricted on high risk evaluations', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'monitored',
    high_risk_evaluations_count: 5,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('restricted');
  expect(result.reason).toBe('high_risk_score_repeated');
});

test('evaluateTransition: restricted -> suspended on serious incident', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'restricted',
    has_serious_incident: true,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('suspended');
  expect(result.reason).toBe('confirmed_serious_incident');
});

// ============================================
// TESTS: Transition Evaluation - De-escalation
// ============================================

test('evaluateTransition: restricted -> normal after rehabilitation', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'restricted',
    consecutive_clean_days: 30,
    incidents_count: 0,
    negative_feedbacks_count: 0,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('normal');
  expect(result.reason).toBe('rehabilitation_period_complete');
});

test('evaluateTransition: monitored -> normal after clean period', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'monitored',
    consecutive_clean_days: 14,
    incidents_count: 0,
    negative_feedbacks_count: 0,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeTruthy();
  expect(result.new_state).toBe('normal');
});

test('evaluateTransition: restricted stays restricted with issues', () => {
  const service = new SafetyStateService();

  const input = createMockEvaluationInput({
    current_state: 'restricted',
    consecutive_clean_days: 30,
    incidents_count: 1, // Still has issues
    negative_feedbacks_count: 0,
  });

  const result = service.evaluateTransition(input);

  expect(result.should_transition).toBeFalsy();
});

// ============================================
// TESTS: Transition Application
// ============================================

test('isValidTransition: valid transitions', () => {
  const service = new SafetyStateService();

  expect(service.isValidTransition('normal', 'monitored')).toBeTruthy();
  expect(service.isValidTransition('monitored', 'restricted')).toBeTruthy();
  expect(service.isValidTransition('monitored', 'normal')).toBeTruthy();
  expect(service.isValidTransition('restricted', 'suspended')).toBeTruthy();
  expect(service.isValidTransition('restricted', 'normal')).toBeTruthy();
});

test('isValidTransition: invalid transitions', () => {
  const service = new SafetyStateService();

  expect(service.isValidTransition('normal', 'restricted')).toBeFalsy();
  expect(service.isValidTransition('normal', 'suspended')).toBeFalsy();
  expect(service.isValidTransition('monitored', 'suspended')).toBeFalsy();
});

test('applyTransition: successful transition', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-transition');

  const result = await service.applyTransition({
    user_id: 'user-transition',
    new_state: 'monitored',
    reason: 'multiple_negative_feedbacks',
    triggered_by: 'system',
  });

  expect(result.success).toBeTruthy();
  expect(result.previous_state).toBe('normal');
  expect(result.new_state).toBe('monitored');
});

test('applyTransition: fails for invalid transition', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-invalid');

  const result = await service.applyTransition({
    user_id: 'user-invalid',
    new_state: 'suspended', // Invalid from normal
    reason: 'admin_action',
    triggered_by: 'system',
  });

  expect(result.success).toBeFalsy();
  expect(result.error).toBeDefined();
});

test('applyTransition: admin can force any transition', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-admin');

  const result = await service.applyTransition({
    user_id: 'user-admin',
    new_state: 'suspended',
    reason: 'admin_action',
    triggered_by: 'admin',
  });

  expect(result.success).toBeTruthy();
  expect(result.new_state).toBe('suspended');
});

// ============================================
// TESTS: Capability Checks
// ============================================

test('canPerformAction: normal user can do everything', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-normal');

  const joinResult = await service.canPerformAction('user-normal', 'join_session');
  const hostResult = await service.canPerformAction('user-normal', 'host_session');
  const privateResult = await service.canPerformAction('user-normal', 'create_1on1');

  expect(joinResult.allowed).toBeTruthy();
  expect(hostResult.allowed).toBeTruthy();
  expect(privateResult.allowed).toBeTruthy();
});

test('canPerformAction: restricted user cannot host', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-restricted');
  await service.applyTransition({
    user_id: 'user-restricted',
    new_state: 'monitored',
    reason: 'admin_action',
    triggered_by: 'admin',
  });
  await service.applyTransition({
    user_id: 'user-restricted',
    new_state: 'restricted',
    reason: 'admin_action',
    triggered_by: 'admin',
  });

  const joinResult = await service.canPerformAction('user-restricted', 'join_session');
  const hostResult = await service.canPerformAction('user-restricted', 'host_session');
  const privateResult = await service.canPerformAction('user-restricted', 'create_1on1');

  expect(joinResult.allowed).toBeTruthy();
  expect(hostResult.allowed).toBeFalsy();
  expect(privateResult.allowed).toBeFalsy();
});

// ============================================
// TESTS: Public API (Safe)
// ============================================

test('getPublicStatus: returns safe message for restricted', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('user-public');
  await service.applyTransition({
    user_id: 'user-public',
    new_state: 'monitored',
    reason: 'admin_action',
    triggered_by: 'admin',
  });
  await service.applyTransition({
    user_id: 'user-public',
    new_state: 'restricted',
    reason: 'admin_action',
    triggered_by: 'admin',
  });

  const status = await service.getPublicStatus('user-public');

  expect(status.account_status).toBe('limited');
  expect(status.can_host_sessions).toBeFalsy();
  expect(status.message).toBeDefined();
});

test('SafetyStateMessages are neutral', () => {
  const restricted = SafetyStateMessages.restricted;
  const suspended = SafetyStateMessages.suspended;

  // Messages should not mention risk, danger, or safety concerns
  expect(restricted.message?.includes('risk')).not.toBeTruthy();
  expect(suspended.message?.includes('danger')).not.toBeTruthy();
});

// ============================================
// TESTS: Safe Mode Service
// ============================================

test('enableSafeMode: enables with defaults', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  const settings = await service.enableSafeMode('user-safe');

  expect(settings.enabled).toBeTruthy();
  expect(settings.only_validated_users).toBeTruthy();
  expect(settings.no_one_on_one).toBeTruthy();
  expect(settings.min_participants).toBe(3);
});

test('disableSafeMode: disables completely', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-disable');
  const settings = await service.disableSafeMode('user-disable');

  expect(settings.enabled).toBeFalsy();
});

test('filterSessions: filters unverified hosts', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-filter');

  const sessions = [
    createMockSession({ host_verification_level: 'certified' }),
    createMockSession({ host_verification_level: 'verified' }),
    createMockSession({ host_verification_level: 'basic' }),
    createMockSession({ host_verification_level: 'none' }),
  ];

  const result = await service.filterSessions('user-filter', sessions);

  expect(result.sessions).toHaveLength(2);
  expect(result.filtered_count).toBe(2);
  expect(result.applied_filters).toContain('only_validated_hosts');
});

test('filterSessions: filters private sessions', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-private');

  const sessions = [
    createMockSession({ is_private: false, max_participants: 10 }),
    createMockSession({ is_private: true, max_participants: 2 }),
    createMockSession({ is_private: false, max_participants: 2 }),
  ];

  const result = await service.filterSessions('user-private', sessions);

  expect(result.sessions).toHaveLength(1);
  expect(result.applied_filters).toContain('no_1on1');
});

test('filterSessions: filters low trust hosts', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-trust');

  const sessions = [
    createMockSession({ host_trust_score: 80 }),
    createMockSession({ host_trust_score: 50 }), // Below threshold
  ];

  const result = await service.filterSessions('user-trust', sessions);

  expect(result.sessions).toHaveLength(1);
  expect(result.applied_filters).toContain('min_trust_score');
});

test('filterSessions: filters restricted hosts', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-state');

  const sessions = [
    createMockSession({ host_safety_state: 'normal' }),
    createMockSession({ host_safety_state: 'monitored' }),
    createMockSession({ host_safety_state: 'restricted' }),
  ];

  const result = await service.filterSessions('user-state', sessions);

  expect(result.sessions).toHaveLength(2);
  expect(result.applied_filters).toContain('host_safety_state');
});

test('filterSessions: no filtering when disabled', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  const sessions = [
    createMockSession({ host_verification_level: 'none' }),
    createMockSession({ is_private: true }),
  ];

  const result = await service.filterSessions('user-disabled', sessions);

  expect(result.sessions).toHaveLength(2);
  expect(result.filtered_count).toBe(0);
});

test('checkSession: passes valid session', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-check');

  const session = createMockSession({
    host_verification_level: 'certified',
    host_trust_score: 90,
    host_safety_state: 'normal',
    is_private: false,
    max_participants: 10,
  });

  const result = await service.checkSession('user-check', session);

  expect(result.passed).toBeTruthy();
  expect(result.priority_boost).toBeGreaterThan(0);
});

test('checkSession: fails unverified host', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-fail');

  const session = createMockSession({
    host_verification_level: 'none',
  });

  const result = await service.checkSession('user-fail', session);

  expect(result.passed).toBeFalsy();
  expect(result.filtered_reason).toBeDefined();
});

// ============================================
// TESTS: User Filtering
// ============================================

test('filterUsers: filters unverified users', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('user-filter-users');

  const users = [
    createMockUser({ verification_level: 'certified' }),
    createMockUser({ verification_level: 'verified' }),
    createMockUser({ verification_level: 'basic' }),
    createMockUser({ verification_level: 'none' }),
  ];

  const result = await service.filterUsers('user-filter-users', users);

  expect(result.users).toHaveLength(2);
  expect(result.applied_filters).toContain('only_validated_users');
});

test('isUserVisible: respects safe mode filters', async () => {
  const service = new SafeModeService();
  service.clearCaches();

  await service.enableSafeMode('viewer');

  const validUser = createMockUser({
    verification_level: 'verified',
    trust_score: 80,
    safety_state: 'normal',
  });

  const invalidUser = createMockUser({
    verification_level: 'none',
    trust_score: 40,
    safety_state: 'restricted',
  });

  expect(await service.isUserVisible('viewer', validUser)).toBeTruthy();
  expect(await service.isUserVisible('viewer', invalidUser)).toBeFalsy();
});

// ============================================
// TESTS: Safe Mode Risk Adjustment
// ============================================

test('getSafeModeRiskAdjustment: increases risk for private session', () => {
  const service = new SafeModeService();

  const adjustment = service.getSafeModeRiskAdjustment(true, {
    is_private: true,
    participant_count: 2,
    host_verified: false,
  });

  // Private (15) + small (10) + unverified (10) = 35
  expect(adjustment).toBe(35);
});

test('getSafeModeRiskAdjustment: no adjustment when disabled', () => {
  const service = new SafeModeService();

  const adjustment = service.getSafeModeRiskAdjustment(false, {
    is_private: true,
    participant_count: 2,
    host_verified: false,
  });

  expect(adjustment).toBe(0);
});

// ============================================
// TESTS: Cron Service
// ============================================

test('runDailyEvaluation: processes users', async () => {
  resetSafetyStateService();
  const stateService = getSafetyStateService();
  const cronService = new SafetyCronService();
  cronService.setSafetyStateService(stateService);

  // Setup mock data
  cronService.setMockUserIds(['cron-user-1', 'cron-user-2']);
  cronService.setMockTrustScore('cron-user-1', 70);
  cronService.setMockTrustScore('cron-user-2', 70);
  cronService.setMockFeedbacks('cron-user-1', { negative_count: 0, positive_count: 5, total_count: 5 });
  cronService.setMockFeedbacks('cron-user-2', { negative_count: 3, positive_count: 0, total_count: 3 });

  const result = await cronService.runDailyEvaluation();

  expect(result.users_processed).toBe(2);
  expect(result.summary.normal_to_monitored).toBe(1); // cron-user-2
  expect(result.summary.no_change).toBe(1); // cron-user-1
});

test('runDailyEvaluation: handles empty user list', async () => {
  const cronService = new SafetyCronService();
  cronService.clearMockData();

  const result = await cronService.runDailyEvaluation();

  expect(result.users_processed).toBe(0);
  expect(result.transitions_applied).toBe(0);
});

test('runDailyEvaluation: increments clean days', async () => {
  resetSafetyStateService();
  const stateService = getSafetyStateService();
  const cronService = new SafetyCronService();
  cronService.setSafetyStateService(stateService);

  // Create monitored user
  await stateService.getOrCreateProfile('clean-user');
  await stateService.applyTransition({
    user_id: 'clean-user',
    new_state: 'monitored',
    reason: 'admin_action',
    triggered_by: 'admin',
  });

  // Setup mock data with no issues
  cronService.setMockUserIds(['clean-user']);
  cronService.setMockTrustScore('clean-user', 70);
  cronService.setMockFeedbacks('clean-user', { negative_count: 0, positive_count: 0, total_count: 0 });
  cronService.setMockIncidents('clean-user', { confirmed_count: 0, pending_count: 0, serious_count: 0 });

  await cronService.runDailyEvaluation();

  const profile = await stateService.getProfile('clean-user');
  expect(profile?.consecutive_clean_days).toBe(1);
});

// ============================================
// TESTS: History Logging
// ============================================

test('getHistory: returns transition history', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('history-user');
  await service.applyTransition({
    user_id: 'history-user',
    new_state: 'monitored',
    reason: 'multiple_negative_feedbacks',
    triggered_by: 'system',
  });

  const history = await service.getHistory('history-user');

  // Should have initial state + transition
  expect(history.length).toBeGreaterThan(0);
});

// ============================================
// TESTS: Admin API
// ============================================

test('adminTransition: allows any state change', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('admin-target');

  const result = await service.adminTransition({
    user_id: 'admin-target',
    new_state: 'suspended',
    reason: 'Policy violation',
    admin_id: 'admin-1',
  });

  expect(result.success).toBeTruthy();
  expect(result.new_state).toBe('suspended');
});

test('getAdminView: returns full details', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('admin-view-user');

  const view = await service.getAdminView('admin-view-user');

  expect(view).toBeDefined();
  expect(view?.profile).toBeDefined();
  expect(view?.capabilities).toBeDefined();
  expect(view?.recommendations).toBeDefined();
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('applyTransition: same state returns error', async () => {
  const service = new SafetyStateService();
  service.clearCaches();

  await service.getOrCreateProfile('same-state-user');

  const result = await service.applyTransition({
    user_id: 'same-state-user',
    new_state: 'normal',
    reason: 'admin_action',
    triggered_by: 'admin',
  });

  expect(result.success).toBeFalsy();
  expect(result.error).toBeDefined();
});

test('singleton pattern works correctly', () => {
  resetSafetyStateService();
  resetSafeModeService();
  resetSafetyCronService();

  const state1 = getSafetyStateService();
  const state2 = getSafetyStateService();
  expect(state1).toBe(state2);

  const safe1 = getSafeModeService();
  const safe2 = getSafeModeService();
  expect(safe1).toBe(safe2);

  const cron1 = getSafetyCronService();
  const cron2 = getSafetyCronService();
  expect(cron1).toBe(cron2);
});

// ============================================
// RUN TESTS
// ============================================

runTests();
