/**
 * Safety Module - Main entry point
 *
 * This module provides security and trust validation for PaceMate.
 *
 * Usage:
 *   import { SafetyGuard, getSafetyGuard, SafetyErrorCode } from '@/core/safety';
 *
 *   // Validate a join action
 *   const guard = getSafetyGuard();
 *   const result = await guard.validateJoin(userId, sessionId);
 *   if (!result.allowed) {
 *     throw new Error(result.errorCode);
 *   }
 */

// Types and models
export type {
  // Verification types
  VerificationLevel,
  TrustTier,

  // Safety profile
  SafetyProfile,

  // Safety events
  SafetyEventType,
  SafetyEventSeverity,
  SafetyEvent,
  CreateSafetyEventInput,

  // Session safety
  SessionSafetySettings,

  // Error codes
  SafetyErrorCodeType,

  // Validation results
  SafetyValidationResult,
} from './types';

export {
  // Safety profile defaults
  DEFAULT_SAFETY_PROFILE,

  // Safety flags
  SafetyFlags,
  hasFlag,
  addFlag,
  removeFlag,

  // Session safety defaults
  DEFAULT_SESSION_SAFETY,

  // Error codes
  SafetyErrorCode,

  // Validation result helpers
  validationSuccess,
  validationFailure,

  // Event weights and expiration
  EventWeights,
  NEGATIVE_EVENT_EXPIRATION_MS,
} from './types';

// Safety Guard
export {
  SafetyGuard,
  getSafetyGuard,
  resetSafetyGuard,
} from './safety-guard';

// Trust Engine
export {
  TrustEngine,
  getTrustEngine,
  resetTrustEngine,
  TrustScoreWeights,
  TrustTierThresholds,
} from './trust-engine';

export type { TrustCalculationResult } from './trust-engine';

// Verification Service (basic - placeholder)
export {
  VerificationService,
  VerificationConfig,
  type VerificationResult,
  type PhoneVerificationStartResult,
  type PhoneVerificationConfirmResult,
  type PhotoVerificationResult,
} from './verification.service';

// Advanced Verification Service
export {
  VerificationAdvancedService,
  getVerificationAdvancedService,
  resetVerificationAdvancedService,
} from './verification-advanced.service';

// Advanced Verification Types
export type {
  UserVerification,
  VerificationLevelExtended,
  VerificationStatus,
  VerificationProvider,
  VerificationMetadata,
  StartVerificationInput,
  StartVerificationResult,
  SubmitVerificationInput,
  VerificationProcessResult,
  PublicVerificationStatus,
  LivenessCheckResult,
  FaceMatchResult,
  AntiAbuseCheckResult,
  EncryptedMedia,
  VerificationErrorCodeType,
} from './verification.types';

export {
  VerificationErrorCode,
  VerificationThresholds,
} from './verification.types';

// Reporting Service (placeholder)
export {
  ReportingService,
  ReportThresholds,
  type ReportReason,
  type ReportInput,
  type ReportResult,
  type Report,
} from './reporting.service';

// Live Run Safety Service
export {
  LiveRunService,
  getLiveRunService,
  resetLiveRunService,
} from './live-run.service';

// Live Run Types
export type {
  RunSession,
  RunSessionStatus,
  RunParticipant,
  RunLocationPoint,
  RecordLocationInput,
  TrustedContact,
  CreateTrustedContactInput,
  UpdateTrustedContactInput,
  EmergencyAlert,
  EmergencyReason,
  TriggerEmergencyInput,
  EmergencyNotification,
  AnomalyDetectionResult,
  StartRunSessionInput,
  StartRunSessionResult,
  EndRunSessionInput,
  EndRunSessionResult,
  RunSessionStats,
  GeoPoint,
  SafetyMonitoringConfig,
  PlannedRoute,
  LiveTrackingMessage,
  LiveTrackingEventType,
  LiveRunErrorCodeType,
} from './live-run.types';

export {
  LiveRunConfig,
  LiveRunErrorCode,
  DEFAULT_SAFETY_MONITORING,
} from './live-run.types';

// Feedback Service
export {
  FeedbackService,
  getFeedbackService,
  resetFeedbackService,
} from './feedback.service';

// Feedback Types
export type {
  SafetyFeedback,
  CreateFeedbackInput,
  PublicFeedbackView,
  FeedbackRating,
  FeedbackFlag,
  SilentReport,
  CreateSilentReportInput,
  UserModerationRecord,
  ModerationQueueItem,
  ModerationActionInput,
  ModerationActionResult,
  ModerationStatus,
  TrustImpactResult,
  TrustImpactAction,
  AuditLogEntry,
  AuditLogType,
  FeedbackErrorCodeType,
} from './feedback.types';

export {
  TrustImpactThresholds,
  FeedbackErrorCode,
  FeedbackConfig,
  MODERATION_TRIGGER_FLAGS,
} from './feedback.types';

// Reputation Service
export {
  ReputationService,
  getReputationService,
  resetReputationService,
} from './reputation.service';

// Reputation Types
export type {
  TrustProfile,
  TrustStatus,
  TrustIndicator,
  TrustBadge,
  PublicTrustProfile,
  RecalculationTrigger,
  RecalculationInput,
  RecalculationResult,
  ScoreBreakdown,
  PublicTrustResponse,
  AdminTrustResponse,
  TrustHistoryEntry,
  ReputationErrorCodeType,
} from './reputation.types';

export {
  ScoreWeights,
  StatusThresholds,
  TimeDecayConfig,
  ReputationConfig,
  ReputationErrorCode,
  DEFAULT_TRUST_PROFILE,
} from './reputation.types';

// Matching & Risk Evaluation Service
export {
  RiskEvaluationService,
  getRiskEvaluationService,
  resetRiskEvaluationService,
} from './matching.service';

// Matching Types
export type {
  JoinRiskEvaluation,
  JoinDecision,
  RiskLevel,
  ReviewTrigger,
  RiskEvaluationInput,
  RiskEvaluationResult,
  PublicJoinResponse,
  IncidentData,
  SessionContext,
  RiskBreakdown,
  AdminEvaluationView,
  InternalReviewRequest,
  HighRiskAttemptLog,
  MatchingErrorCode,
} from './matching.types';

export {
  RiskThresholds,
  RiskWeights,
  IncidentWeights,
  ContextualRiskFactors,
  ReviewConfig,
  NeutralMessages,
  MatchingErrorMessages,
  DEFAULT_INCIDENT_DATA,
  DEFAULT_SESSION_CONTEXT,
} from './matching.types';

// Safety State Service
export {
  SafetyStateService,
  getSafetyStateService,
  resetSafetyStateService,
} from './safety-state.service';

// Safety State Types
export type {
  SafetyState,
  SafetyStateTransition,
  SafetyStateHistory,
  StateChangeReason,
  UserSafetyProfile,
  StateCapabilitySet,
  SafeModeSettings,
  SafeModeCustomFilter,
  TransitionEvaluationInput,
  TransitionEvaluationResult,
  ApplyTransitionInput,
  ApplyTransitionResult,
  CronJobResult,
  CronJobError,
  CronJobSummary,
  DailyEvaluationInput,
  RecentFeedbackSummary,
  RecentIncidentSummary,
  RecentRiskSummary,
  PublicUserSafetyStatus,
  AdminSafetyView,
  SafetyMetrics,
  AdminRecommendation,
  AdminTransitionInput,
  SafetyStateErrorCode,
} from './safety-state.types';

export {
  StateTransitionRules,
  StateCapabilities,
  DEFAULT_SAFE_MODE_SETTINGS,
  SAFE_MODE_FILTERS,
  SafetyStateMessages,
  SafetyStateErrorMessages,
  DEFAULT_USER_SAFETY_PROFILE,
  createDefaultSafetyProfile,
} from './safety-state.types';

// Safe Mode Service
export {
  SafeModeService,
  getSafeModeService,
  resetSafeModeService,
} from './safe-mode.service';

export type {
  SessionForFiltering,
  UserForFiltering,
  SafeModeFilterResult,
  SessionFilterResult,
  UserFilterResult,
} from './safe-mode.service';

// Safety Cron Service
export {
  SafetyCronService,
  getSafetyCronService,
  resetSafetyCronService,
  CronConfig,
} from './safety-cron.service';

// Identity Verification Service
export {
  IdentityVerificationService,
  getIdentityVerificationService,
  resetIdentityVerificationService,
} from './identity-verification.service';

// Identity Verification Types
export type {
  IdentityVerification,
  VerificationLevelNumber,
  VerificationLevelName,
  IdDocumentType,
  AdminReviewReason as IdentityAdminReviewReason,
  LevelRequirementsCheck,
  RequirementStatus,
  StartVerificationInput as IdentityStartVerificationInput,
  StartVerificationResult as IdentityStartVerificationResult,
  VerificationStep as IdentityVerificationStep,
  SubmitDocumentInput,
  EncryptedDocument,
  SubmitSelfieInput,
  VerificationStepResult as IdentityVerificationStepResult,
  AdminVerificationReview,
  RiskIndicator as IdentityRiskIndicator,
  AdminReviewAction as IdentityAdminReviewAction,
  AdminReviewResult as IdentityAdminReviewResult,
  SessionConstraintCheck,
  SessionType,
  RevalidationRequirement,
  RevalidationReason,
  RevalidationResult,
  MultiAccountCheck,
  SimilarAccountMatch,
  MultiAccountFactor,
  PublicVerificationStatus as IdentityPublicVerificationStatus,
  VerificationBadge,
  IdentityVerificationErrorCode,
  EncryptionResult,
} from './identity-verification.types';

export {
  VerificationLevelMap,
  VerificationLevelRequirements,
  VerificationThresholds as IdentityVerificationThresholds,
  VerificationConfig as IdentityVerificationConfig,
  SessionLevelRequirements,
  PublicBadgeLabels,
  IdentityVerificationErrorMessages,
  encryptDocument,
  decryptDocument,
  createDefaultVerification,
} from './identity-verification.types';
