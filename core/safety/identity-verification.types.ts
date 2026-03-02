/**
 * Identity Verification & Social Proof Layer Types
 *
 * SECURITY RULES:
 * - Encrypt ID documents
 * - Never expose selfieMatchScore publicly
 * - Admin review fallback for uncertain AI results
 * - Anti-multi-account detection
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// ============================================
// VERIFICATION LEVELS
// ============================================

export type VerificationLevelNumber = 0 | 1 | 2 | 3;

export type VerificationLevelName = 'basic' | 'phone_verified' | 'id_verified' | 'trusted';

export const VerificationLevelMap: Record<VerificationLevelNumber, VerificationLevelName> = {
  0: 'basic',
  1: 'phone_verified',
  2: 'id_verified',
  3: 'trusted',
};

export const VerificationLevelRequirements: Record<VerificationLevelNumber, string[]> = {
  0: ['email_verified'],
  1: ['phone_verified', 'profile_photo'],
  2: ['id_verified', 'selfie_match'],
  3: ['completed_runs_5', 'no_incidents', 'high_feedback_ratio'],
};

// ============================================
// CORE MODELS
// ============================================

export interface IdentityVerification {
  id: string;
  user_id: string;
  level: VerificationLevelNumber;
  level_name: VerificationLevelName;

  // Level 0 - Basic
  email_verified: boolean;
  email_verified_at?: string;

  // Level 1 - Phone Verified
  phone_verified: boolean;
  phone_verified_at?: string;
  phone_number_hash?: string; // Hashed for privacy
  has_profile_photo: boolean;
  profile_photo_verified_at?: string;

  // Level 2 - ID Verified
  id_verified: boolean;
  id_verified_at?: string;
  id_document_type?: IdDocumentType;
  id_document_country?: string;
  selfie_match_score?: number; // 0-100, NEVER expose publicly
  selfie_match_passed: boolean;
  selfie_verified_at?: string;

  // Level 3 - Social Proof
  completed_runs: number;
  incident_count: number;
  positive_feedback_ratio: number; // 0-1
  social_proof_achieved_at?: string;

  // Metadata
  verification_attempts: number;
  last_verification_attempt_at?: string;
  admin_review_required: boolean;
  admin_review_reason?: AdminReviewReason;
  admin_reviewed_at?: string;
  admin_reviewer_id?: string;

  // Anti-fraud
  device_fingerprints: string[];
  flagged_for_multi_account: boolean;
  multi_account_check_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  verified_at?: string; // Last level achievement
}

export type IdDocumentType =
  | 'passport'
  | 'national_id'
  | 'drivers_license'
  | 'residence_permit';

export type AdminReviewReason =
  | 'low_selfie_confidence'
  | 'document_quality_issue'
  | 'potential_fraud'
  | 'multi_account_detected'
  | 'revalidation_required'
  | 'manual_request';

// ============================================
// THRESHOLDS & CONFIG
// ============================================

export const VerificationThresholds = {
  // Selfie match
  SELFIE_MATCH_AUTO_PASS: 85,
  SELFIE_MATCH_AUTO_FAIL: 40,
  SELFIE_MATCH_ADMIN_REVIEW: 60, // Between fail and pass = admin review

  // Social proof (Level 3)
  MIN_COMPLETED_RUNS: 5,
  MAX_INCIDENTS_ALLOWED: 0,
  MIN_POSITIVE_FEEDBACK_RATIO: 0.8,

  // Anti-fraud
  MAX_VERIFICATION_ATTEMPTS_PER_DAY: 3,
  MAX_DEVICES_PER_ACCOUNT: 5,
  MULTI_ACCOUNT_SIMILARITY_THRESHOLD: 0.9,

  // Revalidation
  REVALIDATION_DAYS_AFTER_SUSPENSION: 0, // Immediate
  ID_EXPIRY_CHECK_DAYS: 365,
} as const;

export const VerificationConfig = {
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  HASH_ALGORITHM: 'sha256',
  DOCUMENT_RETENTION_DAYS: 30,
  SELFIE_RETENTION_DAYS: 7,
} as const;

// ============================================
// LEVEL REQUIREMENTS CHECK
// ============================================

export interface LevelRequirementsCheck {
  level: VerificationLevelNumber;
  met: boolean;
  requirements: RequirementStatus[];
  missing: string[];
  blocking_reason?: string;
}

export interface RequirementStatus {
  requirement: string;
  met: boolean;
  value?: string | number | boolean;
  required_value?: string | number | boolean;
}

// ============================================
// VERIFICATION ACTIONS
// ============================================

export interface StartVerificationInput {
  user_id: string;
  target_level: VerificationLevelNumber;
  device_fingerprint?: string;
}

export interface StartVerificationResult {
  success: boolean;
  verification_id: string;
  current_level: VerificationLevelNumber;
  target_level: VerificationLevelNumber;
  steps_required: VerificationStep[];
  error?: string;
}

export type VerificationStep =
  | 'verify_email'
  | 'verify_phone'
  | 'upload_profile_photo'
  | 'upload_id_document'
  | 'capture_selfie'
  | 'complete_runs'
  | 'build_reputation';

export interface SubmitDocumentInput {
  user_id: string;
  document_type: IdDocumentType;
  document_data: EncryptedDocument;
  document_country: string;
}

export interface EncryptedDocument {
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  key_id: string;
}

export interface SubmitSelfieInput {
  user_id: string;
  selfie_data: EncryptedDocument;
}

export interface VerificationStepResult {
  success: boolean;
  step: VerificationStep;
  level_achieved?: VerificationLevelNumber;
  requires_admin_review: boolean;
  admin_review_reason?: AdminReviewReason;
  next_step?: VerificationStep;
  error?: string;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminVerificationReview {
  verification_id: string;
  user_id: string;
  review_type: AdminReviewReason;
  selfie_match_score?: number;
  document_images?: string[]; // Encrypted references
  risk_indicators: RiskIndicator[];
  recommendation: 'approve' | 'reject' | 'request_new';
  confidence: number;
}

export interface RiskIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AdminReviewAction {
  verification_id: string;
  admin_id: string;
  action: 'approve' | 'reject' | 'request_resubmission';
  reason?: string;
  level_to_grant?: VerificationLevelNumber;
}

export interface AdminReviewResult {
  success: boolean;
  verification_id: string;
  new_level?: VerificationLevelNumber;
  user_notified: boolean;
  error?: string;
}

// ============================================
// CONSTRAINT CHECKS
// ============================================

export interface SessionConstraintCheck {
  allowed: boolean;
  required_level: VerificationLevelNumber;
  current_level: VerificationLevelNumber;
  reason?: string;
  upgrade_path?: VerificationStep[];
}

export type SessionType = 'solo_mixed' | 'group' | 'private' | 'safe_mode';

export const SessionLevelRequirements: Record<SessionType, VerificationLevelNumber> = {
  solo_mixed: 1,
  group: 0,
  private: 1,
  safe_mode: 2,
};

// ============================================
// SUSPENSION & REVALIDATION
// ============================================

export interface RevalidationRequirement {
  required: boolean;
  reason: RevalidationReason;
  steps_required: VerificationStep[];
  deadline?: string;
}

export type RevalidationReason =
  | 'suspension_lifted'
  | 'document_expired'
  | 'suspicious_activity'
  | 'periodic_review'
  | 'policy_change';

export interface RevalidationResult {
  success: boolean;
  user_id: string;
  previous_level: VerificationLevelNumber;
  new_level: VerificationLevelNumber;
  revalidation_complete: boolean;
  pending_steps?: VerificationStep[];
  error?: string;
}

// ============================================
// MULTI-ACCOUNT DETECTION
// ============================================

export interface MultiAccountCheck {
  user_id: string;
  is_flagged: boolean;
  confidence: number;
  similar_accounts: SimilarAccountMatch[];
  check_factors: MultiAccountFactor[];
}

export interface SimilarAccountMatch {
  other_user_id: string;
  similarity_score: number;
  matching_factors: string[];
}

export interface MultiAccountFactor {
  factor: string;
  value: string;
  matches_count: number;
  risk_level: 'low' | 'medium' | 'high';
}

// ============================================
// PUBLIC API (SAFE RESPONSES)
// ============================================

export interface PublicVerificationStatus {
  level: VerificationLevelNumber;
  level_name: VerificationLevelName;
  badges: VerificationBadge[];
  can_upgrade: boolean;
  next_level_requirements?: string[];
}

export interface VerificationBadge {
  type: 'email' | 'phone' | 'id' | 'trusted';
  label: string;
  achieved_at?: string;
}

// NEVER expose internal scores
export const PublicBadgeLabels: Record<VerificationLevelNumber, string> = {
  0: 'Email verifie',
  1: 'Telephone verifie',
  2: 'Identite verifiee',
  3: 'Membre de confiance',
};

// ============================================
// ERROR CODES
// ============================================

export type IdentityVerificationErrorCode =
  | 'USER_NOT_FOUND'
  | 'VERIFICATION_NOT_FOUND'
  | 'ALREADY_AT_LEVEL'
  | 'REQUIREMENTS_NOT_MET'
  | 'DOCUMENT_INVALID'
  | 'SELFIE_MISMATCH'
  | 'ADMIN_REVIEW_PENDING'
  | 'RATE_LIMITED'
  | 'MULTI_ACCOUNT_DETECTED'
  | 'REVALIDATION_REQUIRED'
  | 'SUSPENSION_ACTIVE'
  | 'INTERNAL_ERROR';

export const IdentityVerificationErrorMessages: Record<IdentityVerificationErrorCode, string> = {
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  VERIFICATION_NOT_FOUND: 'Verification introuvable.',
  ALREADY_AT_LEVEL: 'Vous avez deja atteint ce niveau.',
  REQUIREMENTS_NOT_MET: 'Conditions requises non remplies.',
  DOCUMENT_INVALID: 'Document non valide.',
  SELFIE_MISMATCH: 'La photo ne correspond pas.',
  ADMIN_REVIEW_PENDING: 'Verification en cours de revision.',
  RATE_LIMITED: 'Trop de tentatives. Reessayez plus tard.',
  MULTI_ACCOUNT_DETECTED: 'Compte duplique detecte.',
  REVALIDATION_REQUIRED: 'Revalidation de l\'identite requise.',
  SUSPENSION_ACTIVE: 'Compte suspendu.',
  INTERNAL_ERROR: 'Une erreur est survenue.',
};

// ============================================
// ENCRYPTION HELPERS
// ============================================

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag: string;
}

export function encryptDocument(data: string, key: Buffer): EncryptionResult {
  const iv = randomBytes(16);
  const cipher = createCipheriv(VerificationConfig.ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptDocument(
  encrypted: string,
  iv: string,
  authTag: string,
  key: Buffer
): string {
  const decipher = createDecipheriv(
    VerificationConfig.ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================
// DEFAULT VALUES
// ============================================

export function createDefaultVerification(userId: string): IdentityVerification {
  const now = new Date().toISOString();
  return {
    id: '',
    user_id: userId,
    level: 0,
    level_name: 'basic',
    email_verified: false,
    phone_verified: false,
    has_profile_photo: false,
    id_verified: false,
    selfie_match_passed: false,
    completed_runs: 0,
    incident_count: 0,
    positive_feedback_ratio: 0,
    verification_attempts: 0,
    admin_review_required: false,
    device_fingerprints: [],
    flagged_for_multi_account: false,
    created_at: now,
    updated_at: now,
  };
}
