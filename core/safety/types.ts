/**
 * Safety Module - Types and Models
 *
 * Types for user verification, trust scoring, and safety events.
 * These types extend the core Profile for safety-related functionality.
 */

// ============================================
// VERIFICATION LEVELS
// ============================================

/**
 * User verification level
 * - none: No verification completed
 * - basic: Phone verified
 * - advanced: Phone + Photo verified
 */
export type VerificationLevel = 'none' | 'basic' | 'advanced';

/**
 * Trust tier based on user behavior and history
 * - green: Trusted user, no issues
 * - yellow: Warning state, some flags
 * - red: Blocked from critical actions
 */
export type TrustTier = 'green' | 'yellow' | 'red';

// ============================================
// SAFETY PROFILE EXTENSION
// ============================================

/**
 * Safety-related fields to extend the Profile model
 * These fields should be added to the profiles table in Supabase
 */
export interface SafetyProfile {
  // Verification status
  phone_verified: boolean;
  photo_verified: boolean;
  verification_level: VerificationLevel;

  // Trust scoring
  trust_score: number; // 0-100
  trust_tier: TrustTier;

  // Safety flags (bitmask for multiple flags)
  safety_flags: number;

  // Suspension
  suspension_until?: string; // ISO date string
  suspension_reason?: string;
}

/**
 * Default safety profile values for new users
 */
export const DEFAULT_SAFETY_PROFILE: SafetyProfile = {
  phone_verified: false,
  photo_verified: false,
  verification_level: 'none',
  trust_score: 50, // Neutral starting score
  trust_tier: 'green',
  safety_flags: 0,
};

// ============================================
// SAFETY FLAGS (BITMASK)
// ============================================

/**
 * Safety flags as bitmask values
 * Can be combined: user.safety_flags = FLAG_NO_SHOW | FLAG_REPORTED
 */
export const SafetyFlags = {
  NONE: 0,
  NO_SHOW: 1 << 0,           // 1 - User didn't show up to session
  REPORTED: 1 << 1,          // 2 - User has been reported
  CHECK_IN_FAIL: 1 << 2,     // 4 - Failed to check in
  SUSPICIOUS: 1 << 3,        // 8 - Suspicious behavior detected
  SPAM: 1 << 4,              // 16 - Spam behavior
  HARASSMENT: 1 << 5,        // 32 - Harassment reports
  FAKE_PROFILE: 1 << 6,      // 64 - Suspected fake profile
  MULTIPLE_ACCOUNTS: 1 << 7, // 128 - Multiple accounts detected
} as const;

/**
 * Check if a user has a specific safety flag
 */
export function hasFlag(userFlags: number, flag: number): boolean {
  return (userFlags & flag) !== 0;
}

/**
 * Add a flag to user's safety flags
 */
export function addFlag(userFlags: number, flag: number): number {
  return userFlags | flag;
}

/**
 * Remove a flag from user's safety flags
 */
export function removeFlag(userFlags: number, flag: number): number {
  return userFlags & ~flag;
}

// ============================================
// SAFETY EVENT MODEL
// ============================================

/**
 * Types of safety events that can be logged
 * Events used for trust score calculation are marked with [TRUST]
 */
export type SafetyEventType =
  // Trust-affecting events (used in recalculate)
  | 'session_completed'   // [TRUST +1] User completed a session
  | 'no_show'             // [TRUST -5] User didn't show up
  | 'check_in_fail'       // [TRUST -10] Failed to check in
  | 'report_confirmed'    // [TRUST -15] Report against user was confirmed
  | 'report_rejected'     // Report against user was rejected (no penalty)
  | 'account_warning'     // [TRUST -20] Official warning issued
  // Non-trust events
  | 'report'              // User was reported (pending investigation)
  | 'suspension'          // User was suspended
  | 'unsuspension'        // User was unsuspended
  | 'verification'        // Verification status changed
  | 'trust_change'        // Trust score/tier changed (logged after recalculate)
  | 'flag_added'          // Safety flag was added
  | 'flag_removed';       // Safety flag was removed

/**
 * Severity levels for safety events
 * 1 = Minor, 5 = Critical
 */
export type SafetyEventSeverity = 1 | 2 | 3 | 4 | 5;

/**
 * Safety event record
 * Logs all safety-related events for audit trail
 */
export interface SafetyEvent {
  id: string;
  user_id: string;
  type: SafetyEventType;
  severity: SafetyEventSeverity;
  weight: number; // Trust score impact (positive or negative)
  description?: string;
  metadata?: Record<string, unknown>;
  created_by?: string; // Admin/system user who created the event
  created_at: string;
  expires_at?: string; // When this event stops affecting trust score
}

/**
 * Input for creating a new safety event
 */
export interface CreateSafetyEventInput {
  user_id: string;
  type: SafetyEventType;
  severity: SafetyEventSeverity;
  weight?: number; // Auto-calculated if not provided
  description?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  expires_at?: string; // Auto-set for negative events if not provided
}

/**
 * Default weights for trust-affecting events
 */
export const EventWeights = {
  session_completed: 1,    // +1 per completed session (capped at 30 total)
  no_show: -5,             // -5 per no-show
  check_in_fail: -10,      // -10 per failed check-in
  report_confirmed: -15,   // -15 per confirmed report
  account_warning: -20,    // -20 per official warning
} as const;

/**
 * Expiration period for negative events (6 months in milliseconds)
 */
export const NEGATIVE_EVENT_EXPIRATION_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// ============================================
// SESSION SAFETY SETTINGS
// ============================================

/**
 * Safety-related settings for sessions
 * These fields should be added to the sessions table
 */
export interface SessionSafetySettings {
  verified_only: boolean;        // Only verified users can join
  min_trust_score?: number;      // Minimum trust score required (0-100)
  require_check_in: boolean;     // Require check-in at session location
  allow_trust_tier_yellow: boolean; // Allow yellow tier users
}

/**
 * Default session safety settings
 */
export const DEFAULT_SESSION_SAFETY: SessionSafetySettings = {
  verified_only: false,
  min_trust_score: undefined,
  require_check_in: false,
  allow_trust_tier_yellow: true,
};

// ============================================
// SAFETY ERROR CODES
// ============================================

/**
 * Error codes returned by SafetyGuard
 * Frontend can use these to show appropriate messages
 */
export const SafetyErrorCode = {
  // Verification errors
  PHONE_REQUIRED: 'SAFETY_PHONE_REQUIRED',
  PHOTO_REQUIRED: 'SAFETY_PHOTO_REQUIRED',
  VERIFICATION_REQUIRED: 'SAFETY_VERIFICATION_REQUIRED',

  // Trust errors
  TRUST_TIER_RED: 'SAFETY_TRUST_TIER_RED',
  TRUST_TIER_YELLOW_NOT_ALLOWED: 'SAFETY_TRUST_TIER_YELLOW_NOT_ALLOWED',
  TRUST_SCORE_TOO_LOW: 'SAFETY_TRUST_SCORE_TOO_LOW',

  // Suspension errors
  USER_SUSPENDED: 'SAFETY_USER_SUSPENDED',

  // General errors
  ACTION_BLOCKED: 'SAFETY_ACTION_BLOCKED',
  USER_NOT_FOUND: 'SAFETY_USER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SAFETY_SESSION_NOT_FOUND',
} as const;

export type SafetyErrorCodeType = typeof SafetyErrorCode[keyof typeof SafetyErrorCode];

/**
 * Safety validation result
 */
export interface SafetyValidationResult {
  allowed: boolean;
  errorCode?: SafetyErrorCodeType;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

/**
 * Create a successful validation result
 */
export function validationSuccess(): SafetyValidationResult {
  return { allowed: true };
}

/**
 * Create a failed validation result
 */
export function validationFailure(
  errorCode: SafetyErrorCodeType,
  errorMessage: string,
  details?: Record<string, unknown>
): SafetyValidationResult {
  return {
    allowed: false,
    errorCode,
    errorMessage,
    details,
  };
}
