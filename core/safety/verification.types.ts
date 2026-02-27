/**
 * Verification Types - Advanced identity verification models
 *
 * This module defines types for the advanced verification system including:
 * - UserVerification records
 * - Liveness check results
 * - Face matching results
 * - Media storage
 */

// ============================================
// VERIFICATION LEVELS
// ============================================

/**
 * Extended verification levels for the new system
 */
export type VerificationLevelExtended = 'none' | 'basic' | 'advanced' | 'premium';

/**
 * Verification status
 */
export type VerificationStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';

/**
 * Verification provider
 */
export type VerificationProvider = 'internal' | 'stripe_identity' | 'jumio' | 'onfido';

// ============================================
// USER VERIFICATION MODEL
// ============================================

/**
 * UserVerification record
 * Tracks all verification attempts for a user
 */
export interface UserVerification {
  id: string;
  user_id: string;
  level: VerificationLevelExtended;
  status: VerificationStatus;
  provider: VerificationProvider;

  // Verification results
  liveness_score?: number;      // 0-1, from liveness check
  face_match_score?: number;    // 0-1, from face matching
  overall_score?: number;       // Combined score

  // Manual review
  requires_manual_review: boolean;
  reviewed_by?: string;
  review_notes?: string;

  // Media references (encrypted storage keys, NOT URLs)
  selfie_video_key?: string;
  profile_photo_key?: string;

  // Metadata
  metadata?: VerificationMetadata;

  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at?: string;          // When verification expires
  reviewed_at?: string;
}

/**
 * Metadata stored with verification
 */
export interface VerificationMetadata {
  // Device info
  device_fingerprint?: string;
  user_agent?: string;
  ip_address_hash?: string;     // Hashed, not raw

  // Anti-abuse
  phone_hash?: string;          // Hashed phone for blacklist check
  email_hash?: string;          // Hashed email for blacklist check

  // Provider-specific data
  provider_verification_id?: string;
  provider_session_id?: string;

  // Rejection reason
  rejection_reason?: VerificationRejectionReason;
  rejection_details?: string;
}

/**
 * Reasons for verification rejection
 */
export type VerificationRejectionReason =
  | 'liveness_failed'
  | 'face_mismatch'
  | 'low_quality_media'
  | 'suspicious_activity'
  | 'duplicate_account'
  | 'blacklisted'
  | 'manual_rejection'
  | 'expired';

// ============================================
// VERIFICATION REQUEST/RESPONSE
// ============================================

/**
 * Input for starting advanced verification
 */
export interface StartVerificationInput {
  user_id: string;
  level: VerificationLevelExtended;
  device_fingerprint?: string;
  user_agent?: string;
}

/**
 * Result of starting verification
 */
export interface StartVerificationResult {
  success: boolean;
  verification_id?: string;
  upload_urls?: {
    selfie_video: string;
    profile_photo?: string;
  };
  error_code?: VerificationErrorCodeType;
  error_message?: string;
}

/**
 * Input for submitting verification media
 */
export interface SubmitVerificationInput {
  verification_id: string;
  selfie_video_key: string;
  profile_photo_key?: string;
}

/**
 * Result of verification processing
 */
export interface VerificationProcessResult {
  success: boolean;
  status: VerificationStatus;
  verification_id: string;
  liveness_score?: number;
  face_match_score?: number;
  overall_score?: number;
  requires_manual_review: boolean;
  error_code?: VerificationErrorCodeType;
  error_message?: string;
}

/**
 * Public verification status (safe to expose to frontend)
 * NEVER includes exact scores
 */
export interface PublicVerificationStatus {
  level: VerificationLevelExtended;
  status: VerificationStatus;
  is_verified: boolean;
  can_upgrade: boolean;
  pending_verification_id?: string;
  rejection_reason?: VerificationRejectionReason;
}

// ============================================
// LIVENESS CHECK
// ============================================

/**
 * Liveness check result
 */
export interface LivenessCheckResult {
  success: boolean;
  score: number;            // 0-1
  is_live: boolean;         // score >= threshold
  confidence: 'low' | 'medium' | 'high';
  checks_passed: LivenessCheck[];
  checks_failed: LivenessCheck[];
}

/**
 * Individual liveness checks
 */
export type LivenessCheck =
  | 'face_detected'
  | 'single_face'
  | 'eyes_open'
  | 'natural_movement'
  | 'no_mask'
  | 'no_screenshot'
  | 'depth_check';

// ============================================
// FACE MATCHING
// ============================================

/**
 * Face matching result
 */
export interface FaceMatchResult {
  success: boolean;
  score: number;            // 0-1
  is_match: boolean;        // score >= threshold
  confidence: 'low' | 'medium' | 'high';
}

// ============================================
// MEDIA STORAGE
// ============================================

/**
 * Encrypted media record
 */
export interface EncryptedMedia {
  id: string;
  user_id: string;
  verification_id: string;
  type: 'selfie_video' | 'profile_photo' | 'id_document';
  storage_key: string;      // Encrypted storage location
  encryption_key_id: string; // Reference to encryption key
  size_bytes: number;
  mime_type: string;
  created_at: string;
  expires_at: string;       // Auto-delete after 30 days
}

/**
 * Media upload request
 */
export interface MediaUploadRequest {
  user_id: string;
  verification_id: string;
  type: EncryptedMedia['type'];
  mime_type: string;
  size_bytes: number;
}

/**
 * Signed upload URL result
 */
export interface SignedUploadUrl {
  upload_url: string;
  storage_key: string;
  expires_at: string;
}

// ============================================
// ANTI-ABUSE
// ============================================

/**
 * Anti-abuse check result
 */
export interface AntiAbuseCheckResult {
  allowed: boolean;
  flags: AntiAbuseFlag[];
  error_code?: VerificationErrorCodeType;
}

/**
 * Anti-abuse flags
 */
export type AntiAbuseFlag =
  | 'phone_already_used'
  | 'device_limit_exceeded'
  | 'email_blacklisted'
  | 'phone_blacklisted'
  | 'suspicious_pattern'
  | 'too_many_attempts';

/**
 * Blacklist entry
 */
export interface BlacklistEntry {
  id: string;
  type: 'email_hash' | 'phone_hash' | 'device_fingerprint';
  value_hash: string;
  reason: string;
  created_at: string;
  created_by: string;
}

/**
 * Device fingerprint record
 */
export interface DeviceFingerprint {
  id: string;
  fingerprint_hash: string;
  user_ids: string[];       // Users associated with this device
  verification_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

// ============================================
// ERROR CODES
// ============================================

export const VerificationErrorCode = {
  // Input errors
  INVALID_USER: 'VERIFICATION_INVALID_USER',
  INVALID_LEVEL: 'VERIFICATION_INVALID_LEVEL',
  ALREADY_VERIFIED: 'VERIFICATION_ALREADY_VERIFIED',
  PENDING_VERIFICATION: 'VERIFICATION_PENDING',

  // Media errors
  MEDIA_UPLOAD_FAILED: 'VERIFICATION_MEDIA_UPLOAD_FAILED',
  MEDIA_INVALID_FORMAT: 'VERIFICATION_MEDIA_INVALID_FORMAT',
  MEDIA_TOO_LARGE: 'VERIFICATION_MEDIA_TOO_LARGE',

  // Verification errors
  LIVENESS_FAILED: 'VERIFICATION_LIVENESS_FAILED',
  FACE_MISMATCH: 'VERIFICATION_FACE_MISMATCH',
  LOW_QUALITY: 'VERIFICATION_LOW_QUALITY',

  // Anti-abuse errors
  PHONE_ALREADY_USED: 'VERIFICATION_PHONE_ALREADY_USED',
  DEVICE_LIMIT_EXCEEDED: 'VERIFICATION_DEVICE_LIMIT_EXCEEDED',
  BLACKLISTED: 'VERIFICATION_BLACKLISTED',
  TOO_MANY_ATTEMPTS: 'VERIFICATION_TOO_MANY_ATTEMPTS',

  // System errors
  PROVIDER_ERROR: 'VERIFICATION_PROVIDER_ERROR',
  INTERNAL_ERROR: 'VERIFICATION_INTERNAL_ERROR',
} as const;

export type VerificationErrorCodeType = typeof VerificationErrorCode[keyof typeof VerificationErrorCode];

// ============================================
// CONFIGURATION
// ============================================

export const VerificationThresholds = {
  // Score thresholds for auto-approval
  LIVENESS_MIN: 0.7,
  FACE_MATCH_MIN: 0.8,
  OVERALL_MIN: 0.8,

  // Anti-abuse limits
  MAX_DEVICES_PER_USER: 3,
  MAX_VERIFICATIONS_PER_DEVICE: 5,
  MAX_ATTEMPTS_PER_DAY: 3,

  // Timing
  VERIFICATION_EXPIRY_DAYS: 365,    // How long verification is valid
  MEDIA_RETENTION_DAYS: 30,         // Auto-delete media after 30 days
  SESSION_TIMEOUT_MINUTES: 30,      // Verification session timeout
} as const;
