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
