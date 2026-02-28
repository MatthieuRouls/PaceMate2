/**
 * Post-Run Safety Feedback System - Types and Models
 *
 * This module handles post-session feedback for safety monitoring.
 * All feedback is confidential and reviewer identity is never exposed.
 *
 * IMPORTANT:
 * - Never notify the reported user about negative feedback
 * - Reviewer identity must remain confidential
 * - All actions are logged for audit trail
 */

// ============================================
// FEEDBACK MODEL
// ============================================

/**
 * Feedback rating types
 */
export type FeedbackRating = 'positive' | 'neutral' | 'negative';

/**
 * Predefined feedback flags for quick selection
 */
export type FeedbackFlag =
  // Positive flags
  | 'great_pacer'
  | 'encouraging'
  | 'punctual'
  | 'good_communication'
  | 'safe_runner'
  // Neutral flags
  | 'no_interaction'
  | 'different_pace'
  // Negative flags
  | 'inappropriate_behavior'
  | 'harassment'
  | 'no_show'
  | 'late_arrival'
  | 'unsafe_behavior'
  | 'aggressive'
  | 'uncomfortable'
  | 'didnt_follow_route'
  | 'other';

/**
 * Negative flags that trigger moderation
 */
export const MODERATION_TRIGGER_FLAGS: FeedbackFlag[] = [
  'inappropriate_behavior',
  'harassment',
  'unsafe_behavior',
  'aggressive',
  'uncomfortable',
];

/**
 * Safety Feedback record
 */
export interface SafetyFeedback {
  id: string;
  session_id: string;
  reviewer_id: string;        // NEVER expose to reviewed user
  reviewed_user_id: string;
  rating: FeedbackRating;
  flags: FeedbackFlag[];
  comment?: string;           // Optional detailed feedback
  anonymous: boolean;         // If true, even admins can't see reviewer
  created_at: string;
  // Internal fields
  processed: boolean;         // Has this been processed by trust engine?
  processed_at?: string;
  moderation_triggered: boolean;
}

/**
 * Input for creating feedback
 */
export interface CreateFeedbackInput {
  session_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: FeedbackRating;
  flags: FeedbackFlag[];
  comment?: string;
  anonymous?: boolean;
}

/**
 * Public feedback view (safe to return to API)
 * NEVER includes reviewer identity
 */
export interface PublicFeedbackView {
  id: string;
  session_id: string;
  rating: FeedbackRating;
  flags: FeedbackFlag[];
  // No comment, no reviewer_id
  created_at: string;
}

// ============================================
// SILENT REPORT MODEL
// ============================================

/**
 * Silent report types
 */
export type SilentReportType =
  | 'safety_concern'
  | 'harassment'
  | 'fake_profile'
  | 'spam'
  | 'inappropriate_content'
  | 'threatening_behavior'
  | 'other';

/**
 * Silent report - independent of sessions
 */
export interface SilentReport {
  id: string;
  reporter_id: string;        // NEVER expose
  reported_user_id: string;
  type: SilentReportType;
  description?: string;
  evidence_urls?: string[];   // Screenshots, etc.
  created_at: string;
  // Moderation fields
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  assigned_to?: string;       // Moderator ID
  resolved_at?: string;
  resolution_notes?: string;
}

/**
 * Input for creating silent report
 */
export interface CreateSilentReportInput {
  reporter_id: string;
  reported_user_id: string;
  type: SilentReportType;
  description?: string;
  evidence_urls?: string[];
}

// ============================================
// MODERATION QUEUE
// ============================================

/**
 * Moderation status for a user
 */
export type ModerationStatus =
  | 'clear'           // No issues
  | 'flagged'         // Has flags, needs review
  | 'under_review'    // Currently being reviewed
  | 'warned'          // Warning issued
  | 'suspended'       // Temporarily suspended
  | 'banned';         // Permanently banned

/**
 * User moderation record
 */
export interface UserModerationRecord {
  user_id: string;
  status: ModerationStatus;
  total_negative_feedback: number;
  negative_feedback_30_days: number;
  silent_reports_count: number;
  pending_reports_count: number;
  badges_removed: string[];
  warnings_count: number;
  last_warning_at?: string;
  suspension_until?: string;
  last_activity_at: string;
  // Risk score (0-100)
  risk_score: number;
}

/**
 * Moderation queue item for admin view
 */
export interface ModerationQueueItem {
  user_id: string;
  user_name?: string;
  status: ModerationStatus;
  risk_score: number;
  negative_feedback_count: number;
  silent_reports_count: number;
  most_recent_issue_at: string;
  flags_summary: Record<FeedbackFlag, number>;
  requires_action: boolean;
}

/**
 * Moderation action input
 */
export interface ModerationActionInput {
  user_id: string;
  action: 'warn' | 'remove_badge' | 'suspend' | 'ban' | 'clear' | 'dismiss';
  badge_to_remove?: string;
  suspension_days?: number;
  reason: string;
  moderator_id: string;
}

/**
 * Moderation action result
 */
export interface ModerationActionResult {
  success: boolean;
  user_id: string;
  action: ModerationActionInput['action'];
  new_status: ModerationStatus;
  trust_score_change?: number;
  error_message?: string;
}

// ============================================
// TRUST IMPACT
// ============================================

/**
 * Trust impact thresholds
 */
export const TrustImpactThresholds = {
  // Score changes
  NEGATIVE_FEEDBACK_PENALTY: -5,
  POSITIVE_FEEDBACK_BONUS: 2,

  // Escalation thresholds
  BADGE_REMOVAL_THRESHOLD: 2,    // 2 negative in 30 days
  INTERNAL_REVIEW_THRESHOLD: 3,  // 3 negative triggers review
  AUTO_SUSPENSION_THRESHOLD: 5,  // 5 negative = auto suspend

  // Time windows
  THRESHOLD_WINDOW_DAYS: 30,

  // Silent report thresholds
  SILENT_REPORT_REVIEW_THRESHOLD: 2,
  SILENT_REPORT_SUSPENSION_THRESHOLD: 3,
} as const;

/**
 * Trust impact result
 */
export interface TrustImpactResult {
  user_id: string;
  previous_score: number;
  new_score: number;
  score_change: number;
  actions_triggered: TrustImpactAction[];
}

/**
 * Actions triggered by trust impact
 */
export type TrustImpactAction =
  | { type: 'score_decreased'; amount: number }
  | { type: 'score_increased'; amount: number }
  | { type: 'badge_removed'; badge: string }
  | { type: 'internal_review_triggered' }
  | { type: 'auto_suspended'; days: number }
  | { type: 'flagged_for_moderation' };

// ============================================
// AUDIT LOG
// ============================================

/**
 * Audit log entry types
 */
export type AuditLogType =
  | 'feedback_created'
  | 'feedback_processed'
  | 'silent_report_created'
  | 'silent_report_resolved'
  | 'moderation_action'
  | 'trust_impact_applied'
  | 'auto_suspension'
  | 'badge_removal'
  | 'warning_issued';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  type: AuditLogType;
  actor_id: string;           // System or moderator
  target_user_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// ERROR CODES
// ============================================

export const FeedbackErrorCode = {
  // Feedback errors
  FEEDBACK_ALREADY_EXISTS: 'FEEDBACK_ALREADY_EXISTS',
  INVALID_SESSION: 'FEEDBACK_INVALID_SESSION',
  NOT_PARTICIPANT: 'FEEDBACK_NOT_PARTICIPANT',
  CANNOT_REVIEW_SELF: 'FEEDBACK_CANNOT_REVIEW_SELF',
  SESSION_NOT_ENDED: 'FEEDBACK_SESSION_NOT_ENDED',

  // Report errors
  REPORT_ALREADY_EXISTS: 'REPORT_ALREADY_EXISTS',
  CANNOT_REPORT_SELF: 'REPORT_CANNOT_REPORT_SELF',

  // Moderation errors
  USER_NOT_FOUND: 'MODERATION_USER_NOT_FOUND',
  INVALID_ACTION: 'MODERATION_INVALID_ACTION',
  NOT_AUTHORIZED: 'MODERATION_NOT_AUTHORIZED',

  // General errors
  INTERNAL_ERROR: 'FEEDBACK_INTERNAL_ERROR',
} as const;

export type FeedbackErrorCodeType = typeof FeedbackErrorCode[keyof typeof FeedbackErrorCode];

// ============================================
// CONFIGURATION
// ============================================

export const FeedbackConfig = {
  // Timing
  FEEDBACK_WINDOW_HOURS: 48,      // Can leave feedback within 48h of session end
  REPORT_COOLDOWN_HOURS: 24,      // Minimum time between reports for same user

  // Limits
  MAX_COMMENT_LENGTH: 500,
  MAX_FLAGS_PER_FEEDBACK: 5,
  MAX_EVIDENCE_URLS: 5,

  // Moderation
  AUTO_FLAG_SEVERE_KEYWORDS: true,
  REQUIRE_FLAG_FOR_NEGATIVE: true,
} as const;
