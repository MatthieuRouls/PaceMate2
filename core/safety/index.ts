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
} from './types';

// Safety Guard
export {
  SafetyGuard,
  getSafetyGuard,
  resetSafetyGuard,
} from './safety-guard';

// Trust Engine (placeholder)
export {
  TrustEngine,
  TrustScoreWeights,
  TrustTierThresholds,
} from './trust-engine';

// Verification Service (placeholder)
export {
  VerificationService,
  VerificationConfig,
  type VerificationResult,
  type PhoneVerificationStartResult,
  type PhoneVerificationConfirmResult,
  type PhotoVerificationResult,
} from './verification.service';

// Reporting Service (placeholder)
export {
  ReportingService,
  ReportThresholds,
  type ReportReason,
  type ReportInput,
  type ReportResult,
  type Report,
} from './reporting.service';
