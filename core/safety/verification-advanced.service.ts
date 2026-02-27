/**
 * Advanced Verification Service
 *
 * Handles advanced identity verification including:
 * - Liveness check (selfie video)
 * - Face matching with profile photo
 * - Trust score integration via SafetyEvents
 * - Encrypted media storage
 * - Anti-abuse protections
 *
 * IMPORTANT:
 * - Never modify trustScore directly - use TrustEngine.recalculate()
 * - Never expose exact trustScore to frontend
 * - Media is encrypted and auto-deleted after 30 days
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import {
  UserVerification,
  VerificationStatus,
  VerificationLevelExtended,
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
  VerificationErrorCode,
  VerificationThresholds,
  EncryptedMedia,
  SignedUploadUrl,
  MediaUploadRequest,
} from './verification.types';
import { TrustEngine, getTrustEngine } from './trust-engine';
import { SafetyEventType } from './types';

// ============================================
// SERVICE CLASS
// ============================================

export class VerificationAdvancedService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private trustEngine: TrustEngine;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.trustEngine = getTrustEngine();
  }

  /**
   * Set the Supabase client (useful for dependency injection in tests)
   */
  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  /**
   * Set the TrustEngine (useful for dependency injection in tests)
   */
  setTrustEngine(engine: TrustEngine): void {
    this.trustEngine = engine;
  }

  // ============================================
  // MAIN VERIFICATION FLOW
  // ============================================

  /**
   * Start advanced verification process
   * Returns upload URLs for media
   */
  async startVerification(input: StartVerificationInput): Promise<StartVerificationResult> {
    // Anti-abuse checks first
    const abuseCheck = await this.checkAntiAbuse(input.user_id, input.device_fingerprint);
    if (!abuseCheck.allowed) {
      return {
        success: false,
        error_code: abuseCheck.error_code,
        error_message: `Verification blocked: ${abuseCheck.flags.join(', ')}`,
      };
    }

    // Check if user already has pending or approved verification
    const existingStatus = await this.getVerificationStatus(input.user_id);
    if (existingStatus.pending_verification_id) {
      return {
        success: false,
        error_code: VerificationErrorCode.PENDING_VERIFICATION,
        error_message: 'Une verification est deja en cours',
      };
    }

    if (existingStatus.is_verified && existingStatus.level === input.level) {
      return {
        success: false,
        error_code: VerificationErrorCode.ALREADY_VERIFIED,
        error_message: 'Ce niveau de verification est deja atteint',
      };
    }

    // Create verification record
    const verificationId = this.generateId();
    const verification: UserVerification = {
      id: verificationId,
      user_id: input.user_id,
      level: input.level,
      status: 'pending',
      provider: 'internal',
      requires_manual_review: false,
      metadata: {
        device_fingerprint: input.device_fingerprint,
        user_agent: input.user_agent,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.saveVerification(verification);

    // Generate signed upload URLs
    const uploadUrls = await this.generateUploadUrls({
      user_id: input.user_id,
      verification_id: verificationId,
      type: 'selfie_video',
      mime_type: 'video/webm',
      size_bytes: 0, // Will be validated on upload
    });

    return {
      success: true,
      verification_id: verificationId,
      upload_urls: {
        selfie_video: uploadUrls.upload_url,
      },
    };
  }

  /**
   * Submit verification media and process
   * This is called after media upload is complete
   */
  async submitVerification(input: SubmitVerificationInput): Promise<VerificationProcessResult> {
    // Get verification record
    const verification = await this.getVerification(input.verification_id);
    if (!verification) {
      return {
        success: false,
        status: 'rejected',
        verification_id: input.verification_id,
        requires_manual_review: false,
        error_code: VerificationErrorCode.INTERNAL_ERROR,
        error_message: 'Verification non trouvee',
      };
    }

    // Update status to processing
    await this.updateVerificationStatus(input.verification_id, 'processing');

    // Perform liveness check
    const livenessResult = await this.performLivenessCheck(input.selfie_video_key);

    // Perform face matching with profile photo
    const faceMatchResult = await this.performFaceMatch(
      input.selfie_video_key,
      input.profile_photo_key || verification.profile_photo_key
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(livenessResult, faceMatchResult);

    // Determine status based on scores
    let status: VerificationStatus;
    let requiresManualReview = false;

    if (
      livenessResult.score >= VerificationThresholds.LIVENESS_MIN &&
      faceMatchResult.score >= VerificationThresholds.FACE_MATCH_MIN &&
      overallScore >= VerificationThresholds.OVERALL_MIN
    ) {
      status = 'approved';
    } else if (overallScore >= 0.6) {
      // Borderline case - needs manual review
      status = 'pending';
      requiresManualReview = true;
    } else {
      status = 'rejected';
    }

    // Update verification record
    const updatedVerification: Partial<UserVerification> = {
      status,
      liveness_score: livenessResult.score,
      face_match_score: faceMatchResult.score,
      overall_score: overallScore,
      requires_manual_review: requiresManualReview,
      selfie_video_key: input.selfie_video_key,
      profile_photo_key: input.profile_photo_key,
      updated_at: new Date().toISOString(),
    };

    if (status === 'rejected') {
      updatedVerification.metadata = {
        ...verification.metadata,
        rejection_reason: livenessResult.score < VerificationThresholds.LIVENESS_MIN
          ? 'liveness_failed'
          : 'face_mismatch',
      };
    }

    await this.updateVerification(input.verification_id, updatedVerification);

    // If approved, trigger trust events
    if (status === 'approved') {
      await this.onVerificationApproved(verification.user_id, input.verification_id);
    }

    return {
      success: status === 'approved',
      status,
      verification_id: input.verification_id,
      liveness_score: livenessResult.score,
      face_match_score: faceMatchResult.score,
      overall_score: overallScore,
      requires_manual_review: requiresManualReview,
    };
  }

  /**
   * Manual review approval (admin only)
   */
  async approveManualReview(
    verificationId: string,
    adminId: string,
    notes?: string
  ): Promise<VerificationProcessResult> {
    const verification = await this.getVerification(verificationId);
    if (!verification) {
      return {
        success: false,
        status: 'rejected',
        verification_id: verificationId,
        requires_manual_review: false,
        error_code: VerificationErrorCode.INTERNAL_ERROR,
        error_message: 'Verification non trouvee',
      };
    }

    if (!verification.requires_manual_review) {
      return {
        success: false,
        status: verification.status,
        verification_id: verificationId,
        requires_manual_review: false,
        error_message: 'Cette verification ne necessite pas de review manuelle',
      };
    }

    await this.updateVerification(verificationId, {
      status: 'approved',
      requires_manual_review: false,
      reviewed_by: adminId,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Trigger trust events
    await this.onVerificationApproved(verification.user_id, verificationId);

    return {
      success: true,
      status: 'approved',
      verification_id: verificationId,
      requires_manual_review: false,
    };
  }

  /**
   * Manual review rejection (admin only)
   */
  async rejectManualReview(
    verificationId: string,
    adminId: string,
    reason: string
  ): Promise<VerificationProcessResult> {
    const verification = await this.getVerification(verificationId);
    if (!verification) {
      return {
        success: false,
        status: 'rejected',
        verification_id: verificationId,
        requires_manual_review: false,
        error_code: VerificationErrorCode.INTERNAL_ERROR,
        error_message: 'Verification non trouvee',
      };
    }

    await this.updateVerification(verificationId, {
      status: 'rejected',
      requires_manual_review: false,
      reviewed_by: adminId,
      review_notes: reason,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...verification.metadata,
        rejection_reason: 'manual_rejection',
        rejection_details: reason,
      },
    });

    // Log rejection event
    await this.trustEngine.logEventAndRecalculate(
      verification.user_id,
      'verification_rejected' as SafetyEventType,
      {
        description: 'Verification rejetee par admin',
        metadata: { verification_id: verificationId, reason },
        created_by: adminId,
      }
    );

    return {
      success: false,
      status: 'rejected',
      verification_id: verificationId,
      requires_manual_review: false,
    };
  }

  // ============================================
  // VERIFICATION STATUS
  // ============================================

  /**
   * Get public verification status for frontend
   * NEVER exposes exact scores
   */
  async getVerificationStatus(userId: string): Promise<PublicVerificationStatus> {
    const verification = await this.getLatestVerification(userId);

    if (!verification) {
      return {
        level: 'none',
        status: 'pending',
        is_verified: false,
        can_upgrade: true,
      };
    }

    return {
      level: verification.level,
      status: verification.status,
      is_verified: verification.status === 'approved',
      can_upgrade: verification.level !== 'premium' && verification.status !== 'pending',
      pending_verification_id: verification.status === 'pending' ? verification.id : undefined,
      rejection_reason: verification.metadata?.rejection_reason,
    };
  }

  // ============================================
  // LIVENESS CHECK (STUB)
  // ============================================

  /**
   * Perform liveness check on video
   *
   * STUB: In production, integrate with:
   * - AWS Rekognition Face Liveness
   * - Azure Face API Liveness
   * - FaceTec
   */
  async performLivenessCheck(videoKey: string): Promise<LivenessCheckResult> {
    // STUB: Simulate liveness check
    console.log(`[Stub] Performing liveness check on video: ${videoKey}`);

    // In production, this would call external service
    // For now, return mock result based on video key hash
    const hash = this.hashString(videoKey);
    const mockScore = 0.5 + (parseInt(hash.slice(0, 2), 16) / 512); // 0.5 - 1.0

    const isLive = mockScore >= VerificationThresholds.LIVENESS_MIN;

    return {
      success: true,
      score: mockScore,
      is_live: isLive,
      confidence: mockScore >= 0.9 ? 'high' : mockScore >= 0.7 ? 'medium' : 'low',
      checks_passed: isLive
        ? ['face_detected', 'single_face', 'eyes_open', 'natural_movement']
        : ['face_detected'],
      checks_failed: isLive ? [] : ['natural_movement', 'depth_check'],
    };
  }

  // ============================================
  // FACE MATCHING (STUB)
  // ============================================

  /**
   * Perform face matching between video and profile photo
   *
   * STUB: In production, integrate with:
   * - AWS Rekognition CompareFaces
   * - Azure Face API
   * - Jumio
   */
  async performFaceMatch(
    videoKey: string,
    profilePhotoKey?: string
  ): Promise<FaceMatchResult> {
    // STUB: Simulate face matching
    console.log(`[Stub] Performing face match: video=${videoKey}, photo=${profilePhotoKey}`);

    if (!profilePhotoKey) {
      return {
        success: false,
        score: 0,
        is_match: false,
        confidence: 'low',
      };
    }

    // In production, this would call external service
    // For now, return mock result
    const combinedHash = this.hashString(videoKey + profilePhotoKey);
    const mockScore = 0.6 + (parseInt(combinedHash.slice(0, 2), 16) / 640); // 0.6 - 1.0

    const isMatch = mockScore >= VerificationThresholds.FACE_MATCH_MIN;

    return {
      success: true,
      score: mockScore,
      is_match: isMatch,
      confidence: mockScore >= 0.95 ? 'high' : mockScore >= 0.8 ? 'medium' : 'low',
    };
  }

  // ============================================
  // SCORE CALCULATION
  // ============================================

  /**
   * Calculate overall verification score
   */
  calculateOverallScore(
    livenessResult: LivenessCheckResult,
    faceMatchResult: FaceMatchResult
  ): number {
    // Weighted average: liveness 40%, face match 60%
    const livenessWeight = 0.4;
    const faceMatchWeight = 0.6;

    return (
      livenessResult.score * livenessWeight +
      faceMatchResult.score * faceMatchWeight
    );
  }

  // ============================================
  // TRUST ENGINE INTEGRATION
  // ============================================

  /**
   * Handle verification approval
   * Creates SafetyEvent and recalculates trust score
   */
  private async onVerificationApproved(
    userId: string,
    verificationId: string
  ): Promise<void> {
    // Update user's verification level in profile
    await this.updateUserVerificationLevel(userId, 'advanced');

    // Create SafetyEvent and recalculate trust score
    // This is the ONLY way to update trust score
    await this.trustEngine.logEventAndRecalculate(
      userId,
      'verification_advanced',
      {
        description: 'Verification avancee approuvee',
        metadata: {
          verification_id: verificationId,
        },
      }
    );

    // Schedule media deletion after 30 days
    await this.scheduleMediaDeletion(verificationId);
  }

  // ============================================
  // ANTI-ABUSE CHECKS
  // ============================================

  /**
   * Check for anti-abuse violations
   */
  async checkAntiAbuse(
    userId: string,
    deviceFingerprint?: string
  ): Promise<AntiAbuseCheckResult> {
    const flags: AntiAbuseCheckResult['flags'] = [];

    // Check phone uniqueness
    const phoneUsed = await this.isPhoneAlreadyUsed(userId);
    if (phoneUsed) {
      flags.push('phone_already_used');
    }

    // Check device fingerprint limit
    if (deviceFingerprint) {
      const deviceLimitExceeded = await this.isDeviceLimitExceeded(deviceFingerprint);
      if (deviceLimitExceeded) {
        flags.push('device_limit_exceeded');
      }
    }

    // Check blacklist
    const isBlacklisted = await this.isUserBlacklisted(userId);
    if (isBlacklisted) {
      flags.push('email_blacklisted');
    }

    // Check attempt rate
    const tooManyAttempts = await this.hasTooManyAttempts(userId);
    if (tooManyAttempts) {
      flags.push('too_many_attempts');
    }

    if (flags.length > 0) {
      return {
        allowed: false,
        flags,
        error_code: flags.includes('phone_already_used')
          ? VerificationErrorCode.PHONE_ALREADY_USED
          : flags.includes('device_limit_exceeded')
          ? VerificationErrorCode.DEVICE_LIMIT_EXCEEDED
          : flags.includes('too_many_attempts')
          ? VerificationErrorCode.TOO_MANY_ATTEMPTS
          : VerificationErrorCode.BLACKLISTED,
      };
    }

    return { allowed: true, flags: [] };
  }

  /**
   * Check if phone is already used by another verified account
   */
  private async isPhoneAlreadyUsed(userId: string): Promise<boolean> {
    // STUB: Check phone uniqueness
    // In production, query profiles table for phone_hash
    console.log(`[Stub] Checking phone uniqueness for user: ${userId}`);
    return false;
  }

  /**
   * Check if device has exceeded verification limit
   */
  private async isDeviceLimitExceeded(deviceFingerprint: string): Promise<boolean> {
    // STUB: Check device verification count
    console.log(`[Stub] Checking device limit for: ${deviceFingerprint}`);
    return false;
  }

  /**
   * Check if user is blacklisted
   */
  private async isUserBlacklisted(userId: string): Promise<boolean> {
    // STUB: Check blacklist
    console.log(`[Stub] Checking blacklist for user: ${userId}`);
    return false;
  }

  /**
   * Check if user has too many recent verification attempts
   */
  private async hasTooManyAttempts(userId: string): Promise<boolean> {
    // STUB: Check attempt count in last 24h
    console.log(`[Stub] Checking attempt rate for user: ${userId}`);
    return false;
  }

  // ============================================
  // MEDIA STORAGE (ENCRYPTED)
  // ============================================

  /**
   * Generate signed upload URLs for encrypted storage
   */
  async generateUploadUrls(request: MediaUploadRequest): Promise<SignedUploadUrl> {
    // Generate encrypted storage key
    const storageKey = this.generateEncryptedStorageKey(
      request.user_id,
      request.verification_id,
      request.type
    );

    // In production, this would create a signed S3/GCS URL
    // with encryption enabled
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    console.log(`[Stub] Generated upload URL for: ${storageKey}`);

    return {
      upload_url: `https://storage.example.com/upload/${storageKey}?expires=${expiresAt}`,
      storage_key: storageKey,
      expires_at: expiresAt,
    };
  }

  /**
   * Generate encrypted storage key
   */
  private generateEncryptedStorageKey(
    userId: string,
    verificationId: string,
    type: string
  ): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `verifications/${userId}/${verificationId}/${type}_${timestamp}_${random}`;
  }

  /**
   * Schedule media deletion after retention period
   */
  private async scheduleMediaDeletion(verificationId: string): Promise<void> {
    const expiresAt = new Date(
      Date.now() + VerificationThresholds.MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    console.log(`[Stub] Scheduled media deletion for verification ${verificationId} at ${expiresAt}`);

    // In production, this would create a scheduled job or set TTL in storage
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  /**
   * Save new verification record
   */
  private async saveVerification(verification: UserVerification): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving verification:', verification.id);
      return;
    }

    try {
      const insertData = verification as unknown as Record<string, unknown>;
      await (this.supabase.from('user_verifications') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).insert(insertData);
    } catch (err) {
      console.error('Error saving verification:', err);
    }
  }

  /**
   * Get verification by ID
   */
  private async getVerification(verificationId: string): Promise<UserVerification | null> {
    if (!this.supabase) {
      console.log('[Mock] Getting verification:', verificationId);
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_verifications')
        .select('*')
        .eq('id', verificationId)
        .single();

      if (error || !data) return null;
      return data as UserVerification;
    } catch (err) {
      console.error('Error getting verification:', err);
      return null;
    }
  }

  /**
   * Get latest verification for user
   */
  private async getLatestVerification(userId: string): Promise<UserVerification | null> {
    if (!this.supabase) {
      console.log('[Mock] Getting latest verification for:', userId);
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data as UserVerification;
    } catch (err) {
      console.error('Error getting latest verification:', err);
      return null;
    }
  }

  /**
   * Update verification record
   */
  private async updateVerification(
    verificationId: string,
    updates: Partial<UserVerification>
  ): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Updating verification:', verificationId, updates);
      return;
    }

    try {
      const updateData = updates as Record<string, unknown>;
      await (this.supabase.from('user_verifications') as unknown as {
        update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
      }).update(updateData).eq('id', verificationId);
    } catch (err) {
      console.error('Error updating verification:', err);
    }
  }

  /**
   * Update verification status only
   */
  private async updateVerificationStatus(
    verificationId: string,
    status: VerificationStatus
  ): Promise<void> {
    await this.updateVerification(verificationId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Update user's verification level in profile
   */
  private async updateUserVerificationLevel(
    userId: string,
    level: VerificationLevelExtended
  ): Promise<void> {
    if (!this.supabase) {
      console.log(`[Mock] Updating user ${userId} verification level to: ${level}`);
      return;
    }

    try {
      const updateData = {
        verification_level: level,
        photo_verified: level === 'advanced' || level === 'premium',
      } as Record<string, unknown>;

      await (this.supabase.from('profiles') as unknown as {
        update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
      }).update(updateData).eq('id', userId);
    } catch (err) {
      console.error('Error updating user verification level:', err);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ver_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Hash a string (for fingerprints, etc.)
   */
  private hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let verificationServiceInstance: VerificationAdvancedService | null = null;

/**
 * Get the VerificationAdvancedService singleton instance
 */
export function getVerificationAdvancedService(): VerificationAdvancedService {
  if (!verificationServiceInstance) {
    verificationServiceInstance = new VerificationAdvancedService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return verificationServiceInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetVerificationAdvancedService(): void {
  verificationServiceInstance = null;
}
