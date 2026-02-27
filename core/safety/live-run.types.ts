/**
 * Live Run Safety System - Types and Models
 *
 * This module defines types for real-time run tracking and emergency systems.
 * All location data is encrypted and auto-deleted after 7 days.
 */

// ============================================
// RUN SESSION MODEL
// ============================================

/**
 * Status of a run session
 */
export type RunSessionStatus =
  | 'scheduled'    // Session created but not started
  | 'active'       // Currently running
  | 'paused'       // Temporarily paused
  | 'completed'    // Successfully finished
  | 'emergency'    // Emergency triggered
  | 'abandoned';   // Session ended without proper completion

/**
 * Safety monitoring configuration for a session
 */
export interface SafetyMonitoringConfig {
  enabled: boolean;
  // Anomaly detection thresholds
  no_movement_threshold_seconds: number;  // Default: 180 (3 min)
  route_deviation_threshold_meters: number; // Default: 1000 (1 km)
  // Notification settings
  notify_participants: boolean;
  notify_trusted_contacts: boolean;
  // Tracking frequency
  normal_ping_interval_seconds: number;   // Default: 10
  emergency_ping_interval_seconds: number; // Default: 3
}

/**
 * Default safety monitoring configuration
 */
export const DEFAULT_SAFETY_MONITORING: SafetyMonitoringConfig = {
  enabled: true,
  no_movement_threshold_seconds: 180,      // 3 minutes
  route_deviation_threshold_meters: 1000,  // 1 km
  notify_participants: true,
  notify_trusted_contacts: true,
  normal_ping_interval_seconds: 10,
  emergency_ping_interval_seconds: 3,
};

/**
 * Participant in a run session
 */
export interface RunParticipant {
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  last_location?: RunLocationPoint;
  status: 'joined' | 'running' | 'paused' | 'finished' | 'emergency';
}

/**
 * Run Session
 * Main model for tracking a live run
 */
export interface RunSession {
  id: string;
  host_id: string;
  session_id?: string;  // Reference to original planned session
  participants: RunParticipant[];
  status: RunSessionStatus;
  start_time?: string;
  end_time?: string;
  planned_route?: PlannedRoute;
  safety_monitoring: SafetyMonitoringConfig;
  emergency_triggered_at?: string;
  emergency_reason?: EmergencyReason;
  created_at: string;
  updated_at: string;
  expires_at: string;  // Auto-delete after 7 days
}

/**
 * Planned route for deviation detection
 */
export interface PlannedRoute {
  waypoints: GeoPoint[];
  total_distance_meters: number;
  estimated_duration_seconds: number;
}

/**
 * Simple geo point
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

// ============================================
// RUN LOCATION POINT MODEL
// ============================================

/**
 * Single GPS location point
 * Stored encrypted, auto-deleted after 7 days
 */
export interface RunLocationPoint {
  id: string;
  session_id: string;
  user_id: string;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;       // GPS accuracy in meters
  speed?: number;          // Speed in m/s
  heading?: number;        // Direction in degrees
  timestamp: string;
  is_emergency_ping: boolean;
}

/**
 * Input for recording a location point
 */
export interface RecordLocationInput {
  session_id: string;
  user_id: string;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  is_emergency_ping?: boolean;
}

// ============================================
// TRUSTED CONTACT MODEL
// ============================================

/**
 * Trusted contact for emergency notifications
 */
export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;  // e.g., "spouse", "parent", "friend"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a trusted contact
 */
export interface CreateTrustedContactInput {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

/**
 * Update input for trusted contact
 */
export interface UpdateTrustedContactInput {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  is_active?: boolean;
}

// ============================================
// EMERGENCY SYSTEM
// ============================================

/**
 * Reasons for emergency trigger
 */
export type EmergencyReason =
  | 'manual_trigger'       // User pressed emergency button
  | 'no_movement'          // No GPS movement detected
  | 'route_deviation'      // User deviated from planned route
  | 'signal_lost'          // Lost GPS signal for too long
  | 'fall_detected'        // Accelerometer detected fall (future)
  | 'panic_gesture';       // Specific gesture detected (future)

/**
 * Emergency alert sent to contacts
 */
export interface EmergencyAlert {
  id: string;
  session_id: string;
  user_id: string;
  reason: EmergencyReason;
  location: GeoPoint;
  timestamp: string;
  notified_participants: string[];
  notified_contacts: string[];
  resolved_at?: string;
  resolution_notes?: string;
}

/**
 * Emergency trigger input
 */
export interface TriggerEmergencyInput {
  session_id: string;
  user_id: string;
  reason: EmergencyReason;
  location?: GeoPoint;
  message?: string;
}

/**
 * Emergency notification payload
 */
export interface EmergencyNotification {
  type: 'emergency_alert';
  alert_id: string;
  session_id: string;
  user_name: string;
  reason: EmergencyReason;
  location: GeoPoint;
  timestamp: string;
  message?: string;
  action_url: string;  // Deep link to view location
}

// ============================================
// ANOMALY DETECTION
// ============================================

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  has_anomaly: boolean;
  anomaly_type?: 'no_movement' | 'route_deviation' | 'signal_lost';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    last_movement_seconds_ago?: number;
    deviation_meters?: number;
    signal_lost_seconds?: number;
  };
  should_trigger_emergency: boolean;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

/**
 * WebSocket message types for live tracking
 */
export type LiveTrackingEventType =
  | 'session_started'
  | 'session_ended'
  | 'participant_joined'
  | 'participant_left'
  | 'location_update'
  | 'emergency_triggered'
  | 'emergency_resolved'
  | 'anomaly_detected'
  | 'ping'
  | 'pong';

/**
 * Base WebSocket message
 */
export interface LiveTrackingMessage<T = unknown> {
  type: LiveTrackingEventType;
  session_id: string;
  timestamp: string;
  payload: T;
}

/**
 * Location update payload
 */
export interface LocationUpdatePayload {
  user_id: string;
  location: RunLocationPoint;
}

/**
 * Participant update payload
 */
export interface ParticipantUpdatePayload {
  user_id: string;
  action: 'joined' | 'left' | 'status_changed';
  status?: RunParticipant['status'];
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Input for starting a run session
 */
export interface StartRunSessionInput {
  host_id: string;
  session_id?: string;  // Optional reference to planned session
  planned_route?: PlannedRoute;
  safety_monitoring?: Partial<SafetyMonitoringConfig>;
  participant_ids?: string[];
}

/**
 * Result of starting a run session
 */
export interface StartRunSessionResult {
  success: boolean;
  run_session?: RunSession;
  websocket_url?: string;
  error_code?: LiveRunErrorCodeType;
  error_message?: string;
}

/**
 * Input for ending a run session
 */
export interface EndRunSessionInput {
  session_id: string;
  user_id: string;
  status: 'completed' | 'abandoned';
  notes?: string;
}

/**
 * Result of ending a run session
 */
export interface EndRunSessionResult {
  success: boolean;
  session?: RunSession;
  stats?: RunSessionStats;
  error_code?: LiveRunErrorCodeType;
  error_message?: string;
}

/**
 * Statistics for a completed run session
 */
export interface RunSessionStats {
  duration_seconds: number;
  distance_meters: number;
  avg_speed_ms: number;
  max_speed_ms: number;
  elevation_gain_meters?: number;
  location_points_count: number;
}

// ============================================
// ERROR CODES
// ============================================

export const LiveRunErrorCode = {
  // Session errors
  SESSION_NOT_FOUND: 'LIVE_RUN_SESSION_NOT_FOUND',
  SESSION_ALREADY_ACTIVE: 'LIVE_RUN_SESSION_ALREADY_ACTIVE',
  SESSION_NOT_ACTIVE: 'LIVE_RUN_SESSION_NOT_ACTIVE',
  SESSION_ENDED: 'LIVE_RUN_SESSION_ENDED',

  // Permission errors
  NOT_PARTICIPANT: 'LIVE_RUN_NOT_PARTICIPANT',
  NOT_HOST: 'LIVE_RUN_NOT_HOST',
  ACCESS_DENIED: 'LIVE_RUN_ACCESS_DENIED',

  // Location errors
  INVALID_LOCATION: 'LIVE_RUN_INVALID_LOCATION',
  LOCATION_TOO_OLD: 'LIVE_RUN_LOCATION_TOO_OLD',

  // Emergency errors
  EMERGENCY_ALREADY_ACTIVE: 'LIVE_RUN_EMERGENCY_ALREADY_ACTIVE',
  EMERGENCY_NOT_ACTIVE: 'LIVE_RUN_EMERGENCY_NOT_ACTIVE',

  // Contact errors
  CONTACT_NOT_FOUND: 'LIVE_RUN_CONTACT_NOT_FOUND',
  CONTACT_LIMIT_REACHED: 'LIVE_RUN_CONTACT_LIMIT_REACHED',
  INVALID_CONTACT_INFO: 'LIVE_RUN_INVALID_CONTACT_INFO',

  // System errors
  WEBSOCKET_ERROR: 'LIVE_RUN_WEBSOCKET_ERROR',
  INTERNAL_ERROR: 'LIVE_RUN_INTERNAL_ERROR',
} as const;

export type LiveRunErrorCodeType = typeof LiveRunErrorCode[keyof typeof LiveRunErrorCode];

// ============================================
// CONFIGURATION
// ============================================

export const LiveRunConfig = {
  // Data retention
  DATA_RETENTION_DAYS: 7,

  // Session limits
  MAX_PARTICIPANTS: 50,
  MAX_SESSION_DURATION_HOURS: 12,
  MAX_TRUSTED_CONTACTS: 5,

  // Location tracking
  MIN_PING_INTERVAL_SECONDS: 3,
  MAX_PING_INTERVAL_SECONDS: 60,
  LOCATION_EXPIRY_SECONDS: 300,  // 5 minutes

  // Anomaly detection
  DEFAULT_NO_MOVEMENT_THRESHOLD: 180,    // 3 minutes
  DEFAULT_ROUTE_DEVIATION_THRESHOLD: 1000, // 1 km
  SIGNAL_LOST_THRESHOLD: 60,             // 1 minute

  // Emergency
  EMERGENCY_ESCALATION_DELAY_SECONDS: 30,

  // WebSocket
  WEBSOCKET_HEARTBEAT_INTERVAL: 30000,   // 30 seconds
  WEBSOCKET_RECONNECT_ATTEMPTS: 5,
} as const;
