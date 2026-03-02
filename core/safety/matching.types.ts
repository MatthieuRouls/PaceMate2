/**
 * Intelligent Matching & Risk-Aware Join Logic Types
 *
 * PRIVACY RULES:
 * - Never expose numeric risk scores to users
 * - Neutral rejection messages only
 * - All evaluations logged for audit
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type JoinDecision = 'auto_accept' | 'manual_review' | 'verification_required' | 'blocked';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReviewTrigger =
  | 'high_risk_evaluation'
  | 'repeated_blocks'
  | 'trust_mismatch'
  | 'incident_history'
  | 'contextual_flags';

// ============================================
// DECISION THRESHOLDS
// ============================================

export const RiskThresholds = {
  AUTO_ACCEPT_MAX: 30,
  MANUAL_REVIEW_MAX: 60,
  VERIFICATION_REQUIRED_MAX: 80,
  // Above 80 = blocked
} as const;

export const RiskWeights = {
  HOST_TRUST: 0.4,
  REQUESTER_TRUST: 0.3,
  RECENT_INCIDENTS: 0.2,
  CONTEXTUAL_RISK: 0.1,
} as const;

export const IncidentWeights = {
  CONFIRMED_INCIDENT: 25,
  PENDING_REPORT: 10,
  RECENT_NEGATIVE_FEEDBACK: 5,
  MAX_INCIDENT_SCORE: 100,
} as const;

export const ContextualRiskFactors = {
  NIGHT_SESSION: 10,        // Sessions after 10pm
  FIRST_TIME_PAIR: 15,      // First time these users meet
  REMOTE_LOCATION: 20,      // Outside usual areas
  HIGH_INTENSITY: 5,        // High difficulty workout
  LARGE_GROUP: -10,         // Groups are safer
  VERIFIED_VENUE: -15,      // Known safe locations
} as const;

export const ReviewConfig = {
  HIGH_RISK_ATTEMPTS_THRESHOLD: 3,
  HIGH_RISK_WINDOW_HOURS: 24,
  BLOCK_COOLDOWN_HOURS: 48,
} as const;

// ============================================
// CORE MODELS
// ============================================

export interface JoinRiskEvaluation {
  id: string;
  session_id: string;
  requester_id: string;
  host_id: string;
  risk_score: number;
  decision: JoinDecision;
  risk_level: RiskLevel;
  created_at: string;
  // Internal fields
  host_trust_score: number;
  requester_trust_score: number;
  recent_incidents_weight: number;
  contextual_risk: number;
  factors_applied: string[];
  review_triggered: boolean;
  review_reason?: ReviewTrigger;
}

export interface RiskEvaluationInput {
  session_id: string;
  requester_id: string;
  host_id: string;
  // Trust scores (0-100)
  host_trust_score: number;
  requester_trust_score: number;
  // Incident data
  requester_incidents: IncidentData;
  host_incidents: IncidentData;
  // Context
  session_context: SessionContext;
}

export interface IncidentData {
  confirmed_incidents: number;
  pending_reports: number;
  recent_negative_feedback: number;
  last_incident_at?: string;
}

export interface SessionContext {
  scheduled_time: string;
  location_type: 'public' | 'private' | 'remote' | 'verified_venue';
  is_first_time_pair: boolean;
  group_size: number;
  workout_intensity: 'low' | 'medium' | 'high';
  is_night_session?: boolean;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface RiskEvaluationResult {
  success: boolean;
  evaluation_id: string;
  decision: JoinDecision;
  // Public-safe fields only
  can_join: boolean;
  requires_action: boolean;
  action_required?: 'verify_identity' | 'wait_for_approval' | 'contact_support';
  message: string;
  // Internal only - never expose to users
  _internal?: {
    risk_score: number;
    risk_level: RiskLevel;
    factors: string[];
    review_triggered: boolean;
  };
}

export interface PublicJoinResponse {
  can_join: boolean;
  status: 'accepted' | 'pending' | 'action_required' | 'unavailable';
  message: string;
  action_required?: 'verify_identity' | 'wait_for_approval';
}

// Neutral rejection messages - never reveal true reason
export const NeutralMessages = {
  AUTO_ACCEPT: 'Demande acceptee. Vous pouvez rejoindre la session.',
  MANUAL_REVIEW: 'Votre demande est en cours de traitement. L\'organisateur sera notifie.',
  VERIFICATION_REQUIRED: 'Une verification supplementaire est requise pour rejoindre cette session.',
  BLOCKED: 'Cette session n\'est pas disponible pour le moment.',
  GENERIC_UNAVAILABLE: 'Impossible de traiter votre demande. Veuillez reessayer plus tard.',
} as const;

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminEvaluationView {
  evaluation: JoinRiskEvaluation;
  requester_profile: {
    user_id: string;
    trust_status: string;
    verification_level: string;
    total_runs: number;
  };
  host_profile: {
    user_id: string;
    trust_status: string;
    verification_level: string;
    hosted_sessions: number;
  };
  risk_breakdown: RiskBreakdown;
  review_history: ReviewHistoryEntry[];
}

export interface RiskBreakdown {
  host_trust_component: number;
  requester_trust_component: number;
  incident_component: number;
  contextual_component: number;
  total_raw: number;
  total_capped: number;
  decision_reason: string;
}

export interface ReviewHistoryEntry {
  id: string;
  evaluation_id: string;
  reviewer_id?: string;
  action: 'approved' | 'rejected' | 'escalated';
  notes?: string;
  created_at: string;
}

// ============================================
// INTERNAL REVIEW TYPES
// ============================================

export interface InternalReviewRequest {
  evaluation_id: string;
  requester_id: string;
  trigger: ReviewTrigger;
  high_risk_count: number;
  created_at: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export interface HighRiskAttemptLog {
  user_id: string;
  attempts: {
    evaluation_id: string;
    risk_score: number;
    decision: JoinDecision;
    timestamp: string;
  }[];
  last_attempt_at: string;
}

// ============================================
// ERROR CODES
// ============================================

export type MatchingErrorCode =
  | 'EVALUATION_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'SESSION_FULL'
  | 'SESSION_CANCELLED'
  | 'USER_BLOCKED'
  | 'COOLDOWN_ACTIVE'
  | 'INTERNAL_ERROR';

export const MatchingErrorMessages: Record<MatchingErrorCode, string> = {
  EVALUATION_FAILED: 'Impossible d\'evaluer la demande.',
  SESSION_NOT_FOUND: 'Session introuvable.',
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  ALREADY_MEMBER: 'Vous etes deja membre de cette session.',
  SESSION_FULL: 'Cette session est complete.',
  SESSION_CANCELLED: 'Cette session a ete annulee.',
  USER_BLOCKED: 'Acces non autorise.',
  COOLDOWN_ACTIVE: 'Veuillez patienter avant de reessayer.',
  INTERNAL_ERROR: 'Une erreur est survenue.',
};

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_INCIDENT_DATA: IncidentData = {
  confirmed_incidents: 0,
  pending_reports: 0,
  recent_negative_feedback: 0,
};

export const DEFAULT_SESSION_CONTEXT: SessionContext = {
  scheduled_time: new Date().toISOString(),
  location_type: 'public',
  is_first_time_pair: true,
  group_size: 2,
  workout_intensity: 'medium',
};
