/**
 * Dynamic Reputation Visualization System - Types and Models
 *
 * This module defines the trust profile and reputation scoring system.
 *
 * PRIVACY RULES:
 * - Public API returns only status + qualitative indicators
 * - Numeric trustScore is INTERNAL ONLY
 * - Never expose exact scores to users
 */

// ============================================
// TRUST STATUS
// ============================================

/**
 * Trust status based on score thresholds
 * - validated: Score > 80, trusted user
 * - new: Score 50-80, building reputation
 * - observed: Score 20-50, under monitoring
 * - restricted: Score < 20, limited access
 */
export type TrustStatus = 'validated' | 'new' | 'observed' | 'restricted';

/**
 * Qualitative trust indicators for public display
 */
export type TrustIndicator =
  | 'highly_trusted'      // validated + long history
  | 'trusted'             // validated
  | 'building_trust'      // new
  | 'needs_verification'  // observed
  | 'limited';            // restricted

// ============================================
// TRUST PROFILE MODEL
// ============================================

/**
 * Complete trust profile (INTERNAL USE ONLY)
 * Contains numeric scores - never expose to public API
 */
export interface TrustProfile {
  user_id: string;

  // Core scoring (INTERNAL)
  trust_score: number;           // 0-100, NEVER expose
  raw_score: number;             // Uncapped score for calculations

  // Status
  status: TrustStatus;
  indicator: TrustIndicator;

  // Activity metrics
  completed_runs: number;
  total_runs_participated: number;
  runs_as_host: number;

  // Feedback metrics
  positive_feedback_count: number;
  negative_feedback_count: number;
  recent_positive_feedback: number;  // Last 30 days
  recent_negative_feedback: number;  // Last 30 days

  // Verification
  verification_level: VerificationLevelReputation;
  phone_verified: boolean;
  photo_verified: boolean;

  // Incidents
  incidents_count: number;
  recent_incidents: number;          // Last 90 days
  last_incident_at?: string;

  // Time factors
  account_created_at: string;
  account_age_days: number;
  last_activity_at: string;
  last_recalculation_at: string;

  // Decay tracking
  decay_applied: number;             // Total decay points applied

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Verification levels for reputation system
 */
export type VerificationLevelReputation = 'none' | 'basic' | 'advanced' | 'premium';

/**
 * Public trust profile (safe to expose via API)
 * NO numeric scores
 */
export interface PublicTrustProfile {
  user_id: string;
  status: TrustStatus;
  indicator: TrustIndicator;

  // Qualitative only
  is_verified: boolean;
  verification_level: VerificationLevelReputation;
  has_completed_runs: boolean;
  is_active_runner: boolean;       // Activity in last 30 days
  account_age_category: 'new' | 'established' | 'veteran';

  // Badges (earned through reputation)
  badges: TrustBadge[];
}

/**
 * Trust badges earned through reputation
 */
export type TrustBadge =
  | 'verified_runner'        // Basic verification complete
  | 'trusted_pacer'          // 10+ completed runs with good feedback
  | 'community_favorite'     // High positive feedback ratio
  | 'reliable_host'          // 5+ successful hosted sessions
  | 'safety_champion'        // Advanced verification + clean record
  | 'veteran_runner';        // 1+ year with good standing

// ============================================
// SCORE CALCULATION
// ============================================

/**
 * Score change weights
 */
export const ScoreWeights = {
  // Positive events
  COMPLETED_RUN: 2,
  POSITIVE_FEEDBACK: 3,
  VERIFICATION_BASIC: 5,
  VERIFICATION_ADVANCED: 10,
  HOST_SUCCESS: 3,

  // Negative events
  NEGATIVE_FEEDBACK: -5,
  NO_SHOW: -8,
  CONFIRMED_INCIDENT: -15,
  WARNING_RECEIVED: -10,

  // Bonuses
  ACCOUNT_AGE_90_DAYS: 5,
  ACCOUNT_AGE_1_YEAR: 10,
  PERFECT_MONTH: 5,           // No incidents in a month with activity

  // Caps
  MAX_RUN_BONUS: 50,          // Cap on points from runs
  MAX_FEEDBACK_BONUS: 30,     // Cap on points from feedback
} as const;

/**
 * Status thresholds
 */
export const StatusThresholds = {
  VALIDATED_MIN: 80,          // Score > 80 = validated
  NEW_MIN: 50,                // Score 50-80 = new
  OBSERVED_MIN: 20,           // Score 20-50 = observed
  // Score < 20 = restricted
} as const;

/**
 * Time decay configuration
 */
export const TimeDecayConfig = {
  // Decay starts after X days of inactivity
  DECAY_START_DAYS: 30,

  // Points lost per day of inactivity (after start)
  DECAY_RATE_PER_DAY: 0.5,

  // Maximum decay (percentage of score)
  MAX_DECAY_PERCENT: 20,

  // Score floor (never decay below this)
  DECAY_FLOOR: 30,

  // Recovery rate on activity
  ACTIVITY_RECOVERY: 5,
} as const;

// ============================================
// RECALCULATION
// ============================================

/**
 * Events that trigger recalculation
 */
export type RecalculationTrigger =
  | 'run_completed'
  | 'feedback_received'
  | 'incident_confirmed'
  | 'verification_completed'
  | 'warning_issued'
  | 'manual_admin'
  | 'scheduled_decay'
  | 'appeal_approved';

/**
 * Recalculation input
 */
export interface RecalculationInput {
  user_id: string;
  trigger: RecalculationTrigger;
  event_data?: {
    event_type?: string;
    points_change?: number;
    metadata?: Record<string, unknown>;
  };
  admin_id?: string;          // For manual recalculation
}

/**
 * Recalculation result
 */
export interface RecalculationResult {
  user_id: string;
  previous_score: number;
  new_score: number;
  score_change: number;
  previous_status: TrustStatus;
  new_status: TrustStatus;
  status_changed: boolean;
  decay_applied: number;
  badges_earned: TrustBadge[];
  badges_lost: TrustBadge[];
  recalculated_at: string;
}

/**
 * Score breakdown for admin view
 */
export interface ScoreBreakdown {
  base_score: number;
  run_bonus: number;
  feedback_bonus: number;
  verification_bonus: number;
  age_bonus: number;
  incident_penalty: number;
  decay_penalty: number;
  total_raw: number;
  total_capped: number;
}

// ============================================
// API TYPES
// ============================================

/**
 * Public API response for trust profile
 */
export interface PublicTrustResponse {
  success: boolean;
  profile?: PublicTrustProfile;
  error_message?: string;
}

/**
 * Admin API response with full details
 */
export interface AdminTrustResponse {
  success: boolean;
  profile?: TrustProfile;
  breakdown?: ScoreBreakdown;
  history?: TrustHistoryEntry[];
  error_message?: string;
}

/**
 * Trust history entry for admin view
 */
export interface TrustHistoryEntry {
  id: string;
  user_id: string;
  timestamp: string;
  trigger: RecalculationTrigger;
  previous_score: number;
  new_score: number;
  change: number;
  previous_status: TrustStatus;
  new_status: TrustStatus;
  details?: Record<string, unknown>;
}

// ============================================
// ERROR CODES
// ============================================

export const ReputationErrorCode = {
  USER_NOT_FOUND: 'REPUTATION_USER_NOT_FOUND',
  PROFILE_NOT_FOUND: 'REPUTATION_PROFILE_NOT_FOUND',
  RECALCULATION_FAILED: 'REPUTATION_RECALCULATION_FAILED',
  NOT_AUTHORIZED: 'REPUTATION_NOT_AUTHORIZED',
  INVALID_TRIGGER: 'REPUTATION_INVALID_TRIGGER',
  INTERNAL_ERROR: 'REPUTATION_INTERNAL_ERROR',
} as const;

export type ReputationErrorCodeType = typeof ReputationErrorCode[keyof typeof ReputationErrorCode];

// ============================================
// CONFIGURATION
// ============================================

export const ReputationConfig = {
  // Initial values
  BASE_SCORE: 50,              // Starting score for new users
  MIN_SCORE: 0,
  MAX_SCORE: 100,

  // Recalculation
  AUTO_RECALC_INTERVAL_HOURS: 24,
  HISTORY_RETENTION_DAYS: 365,

  // Thresholds for indicators
  VETERAN_DAYS: 365,
  ESTABLISHED_DAYS: 90,
  ACTIVE_DAYS: 30,

  // Badge requirements
  TRUSTED_PACER_RUNS: 10,
  RELIABLE_HOST_SESSIONS: 5,
  COMMUNITY_FAVORITE_RATIO: 0.8, // 80% positive feedback
} as const;

/**
 * Default trust profile for new users
 */
export const DEFAULT_TRUST_PROFILE: Omit<TrustProfile, 'user_id' | 'created_at' | 'updated_at'> = {
  trust_score: ReputationConfig.BASE_SCORE,
  raw_score: ReputationConfig.BASE_SCORE,
  status: 'new',
  indicator: 'building_trust',
  completed_runs: 0,
  total_runs_participated: 0,
  runs_as_host: 0,
  positive_feedback_count: 0,
  negative_feedback_count: 0,
  recent_positive_feedback: 0,
  recent_negative_feedback: 0,
  verification_level: 'none',
  phone_verified: false,
  photo_verified: false,
  incidents_count: 0,
  recent_incidents: 0,
  account_created_at: new Date().toISOString(),
  account_age_days: 0,
  last_activity_at: new Date().toISOString(),
  last_recalculation_at: new Date().toISOString(),
  decay_applied: 0,
};
