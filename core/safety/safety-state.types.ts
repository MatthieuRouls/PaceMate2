/**
 * Safety-Driven Product Architecture Types
 *
 * PRIVACY RULES:
 * - Never expose safety state details publicly
 * - Neutral UX messaging only
 * - All decisions logged for audit
 */

// ============================================
// SAFETY STATE ENUM
// ============================================

export type SafetyState = 'normal' | 'monitored' | 'restricted' | 'suspended';

export type SafetyStateTransition =
  | 'normal_to_monitored'
  | 'monitored_to_restricted'
  | 'restricted_to_suspended'
  | 'restricted_to_normal'
  | 'monitored_to_normal'
  | 'suspended_to_restricted'; // Admin only

// ============================================
// SAFETY STATE HISTORY MODEL
// ============================================

export interface SafetyStateHistory {
  id: string;
  user_id: string;
  previous_state: SafetyState;
  new_state: SafetyState;
  reason: StateChangeReason;
  reason_details?: string;
  triggered_by: 'system' | 'cron' | 'admin' | 'incident';
  related_entity_id?: string; // e.g., incident_id, feedback_id
  created_at: string;
}

export type StateChangeReason =
  | 'multiple_negative_feedbacks'
  | 'repeated_incidents'
  | 'high_risk_score_repeated'
  | 'confirmed_serious_incident'
  | 'rehabilitation_period_complete'
  | 'manual_review_approved'
  | 'admin_action'
  | 'appeal_approved'
  | 'cron_evaluation'
  | 'initial_state';

// ============================================
// USER SAFETY PROFILE EXTENSION
// ============================================

export interface UserSafetyProfile {
  user_id: string;
  safety_state: SafetyState;
  safety_enhanced_mode: boolean;
  state_changed_at: string;
  monitoring_start_at?: string;
  restriction_start_at?: string;
  suspension_start_at?: string;
  rehabilitation_eligible_at?: string;
  consecutive_clean_days: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// STATE MACHINE CONFIG
// ============================================

export const StateTransitionRules = {
  // Escalation thresholds
  NEGATIVE_FEEDBACKS_FOR_MONITORING: 3,
  INCIDENTS_FOR_RESTRICTION: 2,
  HIGH_RISK_EVALUATIONS_FOR_RESTRICTION: 5,
  HIGH_RISK_SCORE_THRESHOLD: 70,

  // Rehabilitation
  REHABILITATION_DAYS: 30,
  CLEAN_DAYS_FOR_MONITORED_TO_NORMAL: 14,

  // Windows
  FEEDBACK_WINDOW_DAYS: 30,
  INCIDENT_WINDOW_DAYS: 90,
  HIGH_RISK_WINDOW_DAYS: 7,
} as const;

export const StateCapabilities: Record<SafetyState, StateCapabilitySet> = {
  normal: {
    can_join_sessions: true,
    can_host_sessions: true,
    can_create_1on1: true,
    max_session_size: 50,
    min_session_size: 1,
    requires_validated_hosts: false,
    visible_to_safe_mode_users: true,
    can_message_first: true,
    priority_in_matching: 'normal',
  },
  monitored: {
    can_join_sessions: true,
    can_host_sessions: true,
    can_create_1on1: true,
    max_session_size: 20,
    min_session_size: 1,
    requires_validated_hosts: false,
    visible_to_safe_mode_users: true,
    can_message_first: true,
    priority_in_matching: 'normal',
  },
  restricted: {
    can_join_sessions: true,
    can_host_sessions: false,
    can_create_1on1: false,
    max_session_size: 10,
    min_session_size: 3,
    requires_validated_hosts: true,
    visible_to_safe_mode_users: false,
    can_message_first: false,
    priority_in_matching: 'deprioritized',
  },
  suspended: {
    can_join_sessions: false,
    can_host_sessions: false,
    can_create_1on1: false,
    max_session_size: 0,
    min_session_size: 0,
    requires_validated_hosts: false,
    visible_to_safe_mode_users: false,
    can_message_first: false,
    priority_in_matching: 'hidden',
  },
};

export interface StateCapabilitySet {
  can_join_sessions: boolean;
  can_host_sessions: boolean;
  can_create_1on1: boolean;
  max_session_size: number;
  min_session_size: number;
  requires_validated_hosts: boolean;
  visible_to_safe_mode_users: boolean;
  can_message_first: boolean;
  priority_in_matching: 'normal' | 'deprioritized' | 'hidden';
}

// ============================================
// SAFE MODE CONFIG
// ============================================

export interface SafeModeSettings {
  enabled: boolean;
  only_validated_users: boolean;
  no_one_on_one: boolean;
  min_participants: number;
  prefer_certified_hosts: boolean;
  custom_filters?: SafeModeCustomFilter[];
}

export interface SafeModeCustomFilter {
  type: 'min_trust_score' | 'min_runs' | 'verified_only' | 'location_type';
  value: number | string | boolean;
}

export const DEFAULT_SAFE_MODE_SETTINGS: SafeModeSettings = {
  enabled: false,
  only_validated_users: true,
  no_one_on_one: true,
  min_participants: 3,
  prefer_certified_hosts: true,
};

export const SAFE_MODE_FILTERS = {
  MIN_TRUST_SCORE: 60,
  MIN_HOST_RUNS: 5,
  MIN_PARTICIPANTS: 3,
  PREFER_VERIFIED_VENUES: true,
} as const;

// ============================================
// TRANSITION INPUT/OUTPUT
// ============================================

export interface TransitionEvaluationInput {
  user_id: string;
  current_state: SafetyState;
  trust_score: number;
  negative_feedbacks_count: number;
  incidents_count: number;
  high_risk_evaluations_count: number;
  has_serious_incident: boolean;
  days_since_last_incident?: number;
  consecutive_clean_days: number;
}

export interface TransitionEvaluationResult {
  should_transition: boolean;
  new_state?: SafetyState;
  reason?: StateChangeReason;
  reason_details?: string;
  confidence: number;
}

export interface ApplyTransitionInput {
  user_id: string;
  new_state: SafetyState;
  reason: StateChangeReason;
  reason_details?: string;
  triggered_by: 'system' | 'cron' | 'admin' | 'incident';
  related_entity_id?: string;
}

export interface ApplyTransitionResult {
  success: boolean;
  history_id?: string;
  previous_state: SafetyState;
  new_state: SafetyState;
  capabilities: StateCapabilitySet;
  error?: string;
}

// ============================================
// CRON JOB TYPES
// ============================================

export interface CronJobResult {
  job_id: string;
  started_at: string;
  completed_at: string;
  users_processed: number;
  transitions_applied: number;
  errors: CronJobError[];
  summary: CronJobSummary;
}

export interface CronJobError {
  user_id: string;
  error: string;
  stage: 'fetch' | 'evaluate' | 'transition' | 'log';
}

export interface CronJobSummary {
  normal_to_monitored: number;
  monitored_to_restricted: number;
  restricted_to_suspended: number;
  restricted_to_normal: number;
  monitored_to_normal: number;
  no_change: number;
}

export interface DailyEvaluationInput {
  user_id: string;
  current_profile: UserSafetyProfile;
  trust_score: number;
  recent_feedbacks: RecentFeedbackSummary;
  recent_incidents: RecentIncidentSummary;
  recent_risk_evaluations: RecentRiskSummary;
}

export interface RecentFeedbackSummary {
  negative_count: number;
  positive_count: number;
  total_count: number;
  last_negative_at?: string;
}

export interface RecentIncidentSummary {
  confirmed_count: number;
  pending_count: number;
  serious_count: number;
  last_incident_at?: string;
}

export interface RecentRiskSummary {
  high_risk_count: number;
  blocked_count: number;
  last_high_risk_at?: string;
}

// ============================================
// PUBLIC API TYPES (SAFE)
// ============================================

export interface PublicUserSafetyStatus {
  can_join_sessions: boolean;
  can_host_sessions: boolean;
  account_status: 'active' | 'limited' | 'inactive';
  message?: string;
}

// Neutral messages - never reveal true state
export const SafetyStateMessages: Record<SafetyState, PublicUserSafetyStatus> = {
  normal: {
    can_join_sessions: true,
    can_host_sessions: true,
    account_status: 'active',
  },
  monitored: {
    can_join_sessions: true,
    can_host_sessions: true,
    account_status: 'active',
  },
  restricted: {
    can_join_sessions: true,
    can_host_sessions: false,
    account_status: 'limited',
    message: 'Certaines fonctionnalites sont temporairement limitees.',
  },
  suspended: {
    can_join_sessions: false,
    can_host_sessions: false,
    account_status: 'inactive',
    message: 'Votre compte est temporairement inactif. Contactez le support.',
  },
};

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminSafetyView {
  user_id: string;
  profile: UserSafetyProfile;
  history: SafetyStateHistory[];
  capabilities: StateCapabilitySet;
  metrics: SafetyMetrics;
  recommendations: AdminRecommendation[];
}

export interface SafetyMetrics {
  total_sessions: number;
  sessions_as_host: number;
  positive_feedbacks: number;
  negative_feedbacks: number;
  incidents_total: number;
  incidents_confirmed: number;
  high_risk_evaluations: number;
  days_in_current_state: number;
}

export interface AdminRecommendation {
  action: 'escalate' | 'de-escalate' | 'review' | 'no_action';
  reason: string;
  confidence: number;
}

export interface AdminTransitionInput {
  user_id: string;
  new_state: SafetyState;
  reason: string;
  admin_id: string;
}

// ============================================
// ERROR CODES
// ============================================

export type SafetyStateErrorCode =
  | 'USER_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'ALREADY_IN_STATE'
  | 'TRANSITION_BLOCKED'
  | 'EVALUATION_FAILED'
  | 'CRON_JOB_FAILED'
  | 'INSUFFICIENT_DATA'
  | 'INTERNAL_ERROR';

export const SafetyStateErrorMessages: Record<SafetyStateErrorCode, string> = {
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  INVALID_TRANSITION: 'Transition non autorisee.',
  ALREADY_IN_STATE: 'L\'utilisateur est deja dans cet etat.',
  TRANSITION_BLOCKED: 'Cette transition n\'est pas possible actuellement.',
  EVALUATION_FAILED: 'Impossible d\'evaluer l\'etat.',
  CRON_JOB_FAILED: 'Le job de maintenance a echoue.',
  INSUFFICIENT_DATA: 'Donnees insuffisantes pour l\'evaluation.',
  INTERNAL_ERROR: 'Une erreur interne est survenue.',
};

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_USER_SAFETY_PROFILE: Omit<UserSafetyProfile, 'user_id' | 'created_at' | 'updated_at'> = {
  safety_state: 'normal',
  safety_enhanced_mode: false,
  state_changed_at: new Date().toISOString(),
  consecutive_clean_days: 0,
};

export function createDefaultSafetyProfile(userId: string): UserSafetyProfile {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    safety_state: 'normal',
    safety_enhanced_mode: false,
    state_changed_at: now,
    consecutive_clean_days: 0,
    created_at: now,
    updated_at: now,
  };
}
