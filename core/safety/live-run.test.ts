/**
 * Live Run Safety System Unit Tests
 *
 * Run with: npx tsx core/safety/live-run.test.ts
 */

import {
  LiveRunService,
} from './live-run.service';

import {
  LiveRunConfig,
  LiveRunErrorCode,
  DEFAULT_SAFETY_MONITORING,
} from './live-run.types';

import type {
  RunSession,
  RunLocationPoint,
  GeoPoint,
} from './live-run.types';

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
  };
}

async function runTests() {
  console.log('\n🧪 Running Live Run Safety System Tests\n');
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

test('LiveRunConfig has correct values', () => {
  expect(LiveRunConfig.DATA_RETENTION_DAYS).toBe(7);
  expect(LiveRunConfig.MAX_PARTICIPANTS).toBe(50);
  expect(LiveRunConfig.MAX_TRUSTED_CONTACTS).toBe(5);
  expect(LiveRunConfig.DEFAULT_NO_MOVEMENT_THRESHOLD).toBe(180);
  expect(LiveRunConfig.DEFAULT_ROUTE_DEVIATION_THRESHOLD).toBe(1000);
});

test('DEFAULT_SAFETY_MONITORING has correct values', () => {
  expect(DEFAULT_SAFETY_MONITORING.enabled).toBe(true);
  expect(DEFAULT_SAFETY_MONITORING.no_movement_threshold_seconds).toBe(180);
  expect(DEFAULT_SAFETY_MONITORING.route_deviation_threshold_meters).toBe(1000);
  expect(DEFAULT_SAFETY_MONITORING.normal_ping_interval_seconds).toBe(10);
  expect(DEFAULT_SAFETY_MONITORING.emergency_ping_interval_seconds).toBe(3);
});

test('LiveRunErrorCode has correct codes', () => {
  expect(LiveRunErrorCode.SESSION_NOT_FOUND).toBe('LIVE_RUN_SESSION_NOT_FOUND');
  expect(LiveRunErrorCode.NOT_PARTICIPANT).toBe('LIVE_RUN_NOT_PARTICIPANT');
  expect(LiveRunErrorCode.EMERGENCY_ALREADY_ACTIVE).toBe('LIVE_RUN_EMERGENCY_ALREADY_ACTIVE');
});

// ============================================
// TESTS: Session Management
// ============================================

test('startSession: creates new session successfully', async () => {
  const service = new LiveRunService();

  const result = await service.startSession({
    host_id: 'host-123',
  });

  expect(result.success).toBe(true);
  expect(result.run_session).toBeDefined();
  expect(result.run_session!.id).toContain('run_');
  expect(result.run_session!.host_id).toBe('host-123');
  expect(result.run_session!.status).toBe('active');
  expect(result.websocket_url).toBeDefined();
});

test('startSession: includes host as first participant', async () => {
  const service = new LiveRunService();

  const result = await service.startSession({
    host_id: 'host-123',
  });

  expect(result.success).toBe(true);
  expect(result.run_session!.participants.length).toBeGreaterThanOrEqual(1);
  expect(result.run_session!.participants[0].user_id).toBe('host-123');
  expect(result.run_session!.participants[0].is_active).toBe(true);
  expect(result.run_session!.participants[0].status).toBe('running');
});

test('startSession: applies custom safety monitoring config', async () => {
  const service = new LiveRunService();

  const result = await service.startSession({
    host_id: 'host-123',
    safety_monitoring: {
      no_movement_threshold_seconds: 300,
      notify_trusted_contacts: false,
    },
  });

  expect(result.success).toBe(true);
  expect(result.run_session!.safety_monitoring.no_movement_threshold_seconds).toBe(300);
  expect(result.run_session!.safety_monitoring.notify_trusted_contacts).toBe(false);
  // Default values preserved
  expect(result.run_session!.safety_monitoring.enabled).toBe(true);
});

test('startSession: sets expiration date 7 days in future', async () => {
  const service = new LiveRunService();

  const result = await service.startSession({
    host_id: 'host-123',
  });

  expect(result.success).toBe(true);

  const expiresAt = new Date(result.run_session!.expires_at);
  const now = new Date();
  const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  expect(diffDays).toBeGreaterThan(6.9);
  expect(diffDays).toBeLessThan(7.1);
});

test('endSession: ends session successfully', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  expect(startResult.success).toBe(true);

  // End session
  const endResult = await service.endSession({
    session_id: startResult.run_session!.id,
    user_id: 'host-123',
    status: 'completed',
  });

  expect(endResult.success).toBe(true);
  expect(endResult.session!.status).toBe('completed');
  expect(endResult.session!.end_time).toBeDefined();
  expect(endResult.stats).toBeDefined();
});

test('endSession: returns error for non-existent session', async () => {
  const service = new LiveRunService();

  const result = await service.endSession({
    session_id: 'non-existent',
    user_id: 'user-123',
    status: 'completed',
  });

  expect(result.success).toBe(false);
  expect(result.error_code).toBe(LiveRunErrorCode.SESSION_NOT_FOUND);
});

test('joinSession: allows user to join active session', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Join session
  const joinResult = await service.joinSession(
    startResult.run_session!.id,
    'participant-456'
  );

  expect(joinResult.success).toBe(true);
  expect(joinResult.run_session!.participants.length).toBe(2);
  expect(joinResult.websocket_url).toBeDefined();
});

test('leaveSession: marks participant as left', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Join session
  await service.joinSession(startResult.run_session!.id, 'participant-456');

  // Leave session
  const left = await service.leaveSession(
    startResult.run_session!.id,
    'participant-456'
  );

  expect(left).toBe(true);
});

// ============================================
// TESTS: Location Tracking
// ============================================

test('recordLocation: records location for active participant', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Record location
  const location = await service.recordLocation({
    session_id: startResult.run_session!.id,
    user_id: 'host-123',
    lat: 48.8566,
    lng: 2.3522,
    speed: 3.5,
  });

  expect(location).toBeDefined();
  expect(location!.id).toContain('loc_');
  expect(location!.lat).toBe(48.8566);
  expect(location!.lng).toBe(2.3522);
  expect(location!.speed).toBe(3.5);
});

test('recordLocation: returns null for invalid session', async () => {
  const service = new LiveRunService();

  const location = await service.recordLocation({
    session_id: 'invalid-session',
    user_id: 'user-123',
    lat: 48.8566,
    lng: 2.3522,
  });

  expect(location).toBeNull();
});

test('getLocationHistory: denies access to non-participants', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Try to get history as non-participant
  const history = await service.getLocationHistory(
    startResult.run_session!.id,
    'non-participant-999'
  );

  // Should return empty array (access denied)
  expect(history.length).toBe(0);
});

// ============================================
// TESTS: Emergency System
// ============================================

test('triggerEmergency: triggers emergency successfully', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Record a location first
  await service.recordLocation({
    session_id: startResult.run_session!.id,
    user_id: 'host-123',
    lat: 48.8566,
    lng: 2.3522,
  });

  // Trigger emergency
  const alert = await service.triggerEmergency({
    session_id: startResult.run_session!.id,
    user_id: 'host-123',
    reason: 'manual_trigger',
    location: { lat: 48.8566, lng: 2.3522 },
  });

  expect(alert).toBeDefined();
  expect(alert!.id).toContain('emg_');
  expect(alert!.reason).toBe('manual_trigger');
});

test('resolveEmergency: resolves emergency successfully', async () => {
  const service = new LiveRunService();

  // Start session
  const startResult = await service.startSession({
    host_id: 'host-123',
  });

  // Trigger emergency
  await service.triggerEmergency({
    session_id: startResult.run_session!.id,
    user_id: 'host-123',
    reason: 'manual_trigger',
    location: { lat: 48.8566, lng: 2.3522 },
  });

  // Resolve emergency
  const resolved = await service.resolveEmergency(
    startResult.run_session!.id,
    'host-123',
    'False alarm'
  );

  expect(resolved).toBe(true);
});

// ============================================
// TESTS: Distance Calculation
// ============================================

test('calculateDistance: calculates distance between Paris and London', () => {
  const service = new LiveRunService();

  const paris: GeoPoint = { lat: 48.8566, lng: 2.3522 };
  const london: GeoPoint = { lat: 51.5074, lng: -0.1278 };

  const distance = service.calculateDistance(paris, london);

  // Distance should be approximately 343 km
  expect(distance).toBeGreaterThan(340000);
  expect(distance).toBeLessThan(350000);
});

test('calculateDistance: returns 0 for same point', () => {
  const service = new LiveRunService();

  const point: GeoPoint = { lat: 48.8566, lng: 2.3522 };

  const distance = service.calculateDistance(point, point);

  expect(distance).toBe(0);
});

test('calculateDistance: calculates short distance accurately', () => {
  const service = new LiveRunService();

  // Two points about 100m apart
  const point1: GeoPoint = { lat: 48.8566, lng: 2.3522 };
  const point2: GeoPoint = { lat: 48.8575, lng: 2.3522 };

  const distance = service.calculateDistance(point1, point2);

  // Should be approximately 100m
  expect(distance).toBeGreaterThan(90);
  expect(distance).toBeLessThan(110);
});

// ============================================
// TESTS: Trusted Contacts
// ============================================

test('addTrustedContact: adds contact successfully', async () => {
  const service = new LiveRunService();

  const contact = await service.addTrustedContact({
    user_id: 'user-123',
    name: 'Emergency Contact',
    email: 'emergency@example.com',
    phone: '+33612345678',
    relationship: 'spouse',
  });

  expect(contact).toBeDefined();
  expect(contact!.id).toContain('tc_');
  expect(contact!.name).toBe('Emergency Contact');
  expect(contact!.is_active).toBe(true);
});

test('addTrustedContact: requires email or phone', async () => {
  const service = new LiveRunService();

  const contact = await service.addTrustedContact({
    user_id: 'user-123',
    name: 'Invalid Contact',
    // No email or phone
  });

  expect(contact).toBeNull();
});

test('updateTrustedContact: updates contact successfully', async () => {
  const service = new LiveRunService();

  // Note: In mock mode, update won't work without DB
  // This tests the method doesn't throw
  const result = await service.updateTrustedContact(
    'contact-123',
    'user-123',
    { name: 'Updated Name' }
  );

  // Will be null in mock mode (no DB)
  expect(result).toBeNull();
});

test('deleteTrustedContact: returns false for non-existent contact', async () => {
  const service = new LiveRunService();

  const deleted = await service.deleteTrustedContact('non-existent', 'user-123');

  expect(deleted).toBe(false);
});

// ============================================
// TESTS: WebSocket URLs
// ============================================

test('startSession: generates valid WebSocket URL', async () => {
  const service = new LiveRunService();

  const result = await service.startSession({
    host_id: 'host-123',
  });

  expect(result.success).toBe(true);
  expect(result.websocket_url).toContain('wss://');
  expect(result.websocket_url).toContain(result.run_session!.id);
  expect(result.websocket_url).toContain('token=');
});

// ============================================
// TESTS: Service Instance
// ============================================

test('service can be instantiated without Supabase', () => {
  const service = new LiveRunService();
  expect(service).toBeDefined();
});

test('service can be instantiated with Supabase credentials', () => {
  const service = new LiveRunService(
    'https://example.supabase.co',
    'test-key'
  );
  expect(service).toBeDefined();
});

// ============================================
// RUN TESTS
// ============================================

runTests();
