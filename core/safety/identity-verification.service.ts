/**
 * Identity Verification & Social Proof Layer Service
 *
 * Manages verification levels and identity checks.
 *
 * SECURITY:
 * - Encrypt ID documents
 * - Never expose selfieMatchScore publicly
 * - Admin review fallback for uncertain AI
 * - Anti-multi-account detection
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import {
  IdentityVerification,
  VerificationLevelNumber,
  VerificationLevelName,
  VerificationLevelMap,
  VerificationThresholds,
  LevelRequirementsCheck,
  RequirementStatus,
  StartVerificationInput,
  StartVerificationResult,
  VerificationStep,
  SubmitDocumentInput,
  SubmitSelfieInput,
  VerificationStepResult,
  AdminReviewReason,
  AdminVerificationReview,
  AdminReviewAction,
  AdminReviewResult,
  RiskIndicator,
  SessionConstraintCheck,
  SessionType,
  SessionLevelRequirements,
  RevalidationRequirement,
  RevalidationReason,
  RevalidationResult,
  MultiAccountCheck,
  SimilarAccountMatch,
  MultiAccountFactor,
  PublicVerificationStatus,
  VerificationBadge,
  PublicBadgeLabels,
  createDefaultVerification,
  IdDocumentType,
} from './identity-verification.types';

// ============================================
// IDENTITY VERIFICATION SERVICE
// ============================================

export class IdentityVerificationService {
  private supabase: ReturnType<typeof createClient> | null = null;

  // In-memory stores
  private verifications: Map<string, IdentityVerification> = new Map();
  private pendingReviews: Map<string, AdminVerificationReview> = new Map();
  private deviceFingerprints: Map<string, string[]> = new Map(); // fingerprint -> user_ids

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // ============================================
  // VERIFICATION RETRIEVAL
  // ============================================

  async getVerification(userId: string): Promise<IdentityVerification | null> {
    return this.verifications.get(userId) || null;
  }

  async getOrCreateVerification(userId: string): Promise<IdentityVerification> {
    let verification = this.verifications.get(userId);
    if (!verification) {
      verification = createDefaultVerification(userId);
      verification.id = this.generateId('idv');
      this.verifications.set(userId, verification);
    }
    return verification;
  }

  private async saveVerification(verification: IdentityVerification): Promise<void> {
    verification.updated_at = new Date().toISOString();
    this.verifications.set(verification.user_id, verification);
  }

  // ============================================
  // LEVEL CHECKS
  // ============================================

  /**
   * Check requirements for a specific level
   */
  checkLevelRequirements(
    verification: IdentityVerification,
    targetLevel: VerificationLevelNumber
  ): LevelRequirementsCheck {
    const requirements: RequirementStatus[] = [];
    const missing: string[] = [];

    switch (targetLevel) {
      case 0:
        requirements.push({
          requirement: 'email_verified',
          met: verification.email_verified,
          value: verification.email_verified,
          required_value: true,
        });
        if (!verification.email_verified) missing.push('email_verified');
        break;

      case 1:
        requirements.push({
          requirement: 'phone_verified',
          met: verification.phone_verified,
          value: verification.phone_verified,
          required_value: true,
        });
        requirements.push({
          requirement: 'profile_photo',
          met: verification.has_profile_photo,
          value: verification.has_profile_photo,
          required_value: true,
        });
        if (!verification.phone_verified) missing.push('phone_verified');
        if (!verification.has_profile_photo) missing.push('profile_photo');
        break;

      case 2:
        requirements.push({
          requirement: 'id_verified',
          met: verification.id_verified,
          value: verification.id_verified,
          required_value: true,
        });
        requirements.push({
          requirement: 'selfie_match',
          met: verification.selfie_match_passed,
          value: verification.selfie_match_passed,
          required_value: true,
        });
        if (!verification.id_verified) missing.push('id_verified');
        if (!verification.selfie_match_passed) missing.push('selfie_match');
        break;

      case 3:
        const runsReq = verification.completed_runs >= VerificationThresholds.MIN_COMPLETED_RUNS;
        const incidentsReq = verification.incident_count <= VerificationThresholds.MAX_INCIDENTS_ALLOWED;
        const feedbackReq = verification.positive_feedback_ratio >= VerificationThresholds.MIN_POSITIVE_FEEDBACK_RATIO;

        requirements.push({
          requirement: 'completed_runs',
          met: runsReq,
          value: verification.completed_runs,
          required_value: VerificationThresholds.MIN_COMPLETED_RUNS,
        });
        requirements.push({
          requirement: 'no_incidents',
          met: incidentsReq,
          value: verification.incident_count,
          required_value: VerificationThresholds.MAX_INCIDENTS_ALLOWED,
        });
        requirements.push({
          requirement: 'positive_feedback_ratio',
          met: feedbackReq,
          value: verification.positive_feedback_ratio,
          required_value: VerificationThresholds.MIN_POSITIVE_FEEDBACK_RATIO,
        });

        if (!runsReq) missing.push('completed_runs');
        if (!incidentsReq) missing.push('no_incidents');
        if (!feedbackReq) missing.push('positive_feedback_ratio');
        break;
    }

    const allMet = requirements.every((r) => r.met);

    return {
      level: targetLevel,
      met: allMet,
      requirements,
      missing,
      blocking_reason: allMet ? undefined : `Missing: ${missing.join(', ')}`,
    };
  }

  /**
   * Calculate current effective level based on verifications
   */
  calculateCurrentLevel(verification: IdentityVerification): VerificationLevelNumber {
    // Check Level 3
    const level3Check = this.checkLevelRequirements(verification, 3);
    if (level3Check.met && verification.level >= 2) {
      return 3;
    }

    // Check Level 2
    const level2Check = this.checkLevelRequirements(verification, 2);
    if (level2Check.met && verification.level >= 1) {
      return 2;
    }

    // Check Level 1
    const level1Check = this.checkLevelRequirements(verification, 1);
    if (level1Check.met && verification.level >= 0) {
      return 1;
    }

    // Check Level 0
    const level0Check = this.checkLevelRequirements(verification, 0);
    if (level0Check.met) {
      return 0;
    }

    return 0;
  }

  // ============================================
  // VERIFICATION FLOW
  // ============================================

  /**
   * Start verification process for a target level
   */
  async startVerification(input: StartVerificationInput): Promise<StartVerificationResult> {
    const verification = await this.getOrCreateVerification(input.user_id);
    const verificationId = verification.id;

    // Check rate limiting
    if (this.isRateLimited(verification)) {
      return {
        success: false,
        verification_id: verificationId,
        current_level: verification.level,
        target_level: input.target_level,
        steps_required: [],
        error: 'Rate limited. Please try again later.',
      };
    }

    // Check if already at or above level
    if (verification.level >= input.target_level) {
      return {
        success: false,
        verification_id: verificationId,
        current_level: verification.level,
        target_level: input.target_level,
        steps_required: [],
        error: 'Already at or above requested level.',
      };
    }

    // Track device fingerprint
    if (input.device_fingerprint) {
      await this.trackDeviceFingerprint(input.user_id, input.device_fingerprint);
    }

    // Determine required steps
    const stepsRequired = this.getRequiredSteps(verification, input.target_level);

    // Update verification attempt
    verification.verification_attempts++;
    verification.last_verification_attempt_at = new Date().toISOString();
    await this.saveVerification(verification);

    console.log(`[IdentityVerification] Started verification: ${input.user_id} -> Level ${input.target_level}`);

    return {
      success: true,
      verification_id: verificationId,
      current_level: verification.level,
      target_level: input.target_level,
      steps_required: stepsRequired,
    };
  }

  /**
   * Get required steps to reach target level
   */
  private getRequiredSteps(
    verification: IdentityVerification,
    targetLevel: VerificationLevelNumber
  ): VerificationStep[] {
    const steps: VerificationStep[] = [];

    // Level 0 requirements
    if (!verification.email_verified) {
      steps.push('verify_email');
    }

    if (targetLevel >= 1) {
      // Level 1 requirements
      if (!verification.phone_verified) {
        steps.push('verify_phone');
      }
      if (!verification.has_profile_photo) {
        steps.push('upload_profile_photo');
      }
    }

    if (targetLevel >= 2) {
      // Level 2 requirements
      if (!verification.id_verified) {
        steps.push('upload_id_document');
      }
      if (!verification.selfie_match_passed) {
        steps.push('capture_selfie');
      }
    }

    if (targetLevel >= 3) {
      // Level 3 requirements
      if (verification.completed_runs < VerificationThresholds.MIN_COMPLETED_RUNS) {
        steps.push('complete_runs');
      }
      if (verification.incident_count > 0 || verification.positive_feedback_ratio < VerificationThresholds.MIN_POSITIVE_FEEDBACK_RATIO) {
        steps.push('build_reputation');
      }
    }

    return steps;
  }

  // ============================================
  // VERIFICATION STEP HANDLERS
  // ============================================

  /**
   * Mark email as verified
   */
  async verifyEmail(userId: string): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(userId);

    verification.email_verified = true;
    verification.email_verified_at = new Date().toISOString();

    const levelAchieved = await this.tryUpgradeLevel(verification, 0);
    await this.saveVerification(verification);

    return {
      success: true,
      step: 'verify_email',
      level_achieved: levelAchieved,
      requires_admin_review: false,
      next_step: this.getNextStep(verification),
    };
  }

  /**
   * Mark phone as verified
   */
  async verifyPhone(userId: string, phoneHash: string): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(userId);

    verification.phone_verified = true;
    verification.phone_verified_at = new Date().toISOString();
    verification.phone_number_hash = phoneHash;

    const levelAchieved = await this.tryUpgradeLevel(verification, 1);
    await this.saveVerification(verification);

    return {
      success: true,
      step: 'verify_phone',
      level_achieved: levelAchieved,
      requires_admin_review: false,
      next_step: this.getNextStep(verification),
    };
  }

  /**
   * Mark profile photo as uploaded
   */
  async uploadProfilePhoto(userId: string): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(userId);

    verification.has_profile_photo = true;
    verification.profile_photo_verified_at = new Date().toISOString();

    const levelAchieved = await this.tryUpgradeLevel(verification, 1);
    await this.saveVerification(verification);

    return {
      success: true,
      step: 'upload_profile_photo',
      level_achieved: levelAchieved,
      requires_admin_review: false,
      next_step: this.getNextStep(verification),
    };
  }

  /**
   * Submit ID document for verification
   */
  async submitDocument(input: SubmitDocumentInput): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(input.user_id);

    // Store document metadata (actual document would be stored encrypted elsewhere)
    verification.id_document_type = input.document_type;
    verification.id_document_country = input.document_country;

    // Simulate document verification (in production, call external service)
    const documentValid = this.validateDocument(input);

    if (documentValid) {
      verification.id_verified = true;
      verification.id_verified_at = new Date().toISOString();
    } else {
      verification.admin_review_required = true;
      verification.admin_review_reason = 'document_quality_issue';
      await this.createAdminReview(verification, 'document_quality_issue');
    }

    await this.saveVerification(verification);

    return {
      success: documentValid,
      step: 'upload_id_document',
      level_achieved: documentValid ? verification.level : undefined,
      requires_admin_review: !documentValid,
      admin_review_reason: documentValid ? undefined : 'document_quality_issue',
      next_step: documentValid ? this.getNextStep(verification) : undefined,
      error: documentValid ? undefined : 'Document verification pending review.',
    };
  }

  /**
   * Submit selfie for face matching
   */
  async submitSelfie(input: SubmitSelfieInput): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(input.user_id);

    // Simulate selfie match (in production, call external ML service)
    const matchScore = this.simulateSelfieMatch();
    verification.selfie_match_score = matchScore;
    verification.selfie_verified_at = new Date().toISOString();

    let requiresAdminReview = false;
    let adminReviewReason: AdminReviewReason | undefined;

    if (matchScore >= VerificationThresholds.SELFIE_MATCH_AUTO_PASS) {
      // Auto-pass
      verification.selfie_match_passed = true;
    } else if (matchScore <= VerificationThresholds.SELFIE_MATCH_AUTO_FAIL) {
      // Auto-fail
      verification.selfie_match_passed = false;
      return {
        success: false,
        step: 'capture_selfie',
        requires_admin_review: false,
        error: 'Selfie verification failed. Please try again with better lighting.',
      };
    } else {
      // Admin review required
      verification.selfie_match_passed = false;
      verification.admin_review_required = true;
      verification.admin_review_reason = 'low_selfie_confidence';
      requiresAdminReview = true;
      adminReviewReason = 'low_selfie_confidence';
      await this.createAdminReview(verification, 'low_selfie_confidence');
    }

    const levelAchieved = verification.selfie_match_passed
      ? await this.tryUpgradeLevel(verification, 2)
      : undefined;

    await this.saveVerification(verification);

    return {
      success: verification.selfie_match_passed,
      step: 'capture_selfie',
      level_achieved: levelAchieved,
      requires_admin_review: requiresAdminReview,
      admin_review_reason: adminReviewReason,
      next_step: verification.selfie_match_passed ? this.getNextStep(verification) : undefined,
    };
  }

  /**
   * Update social proof metrics (called after runs/feedback)
   */
  async updateSocialProof(
    userId: string,
    completedRuns: number,
    incidentCount: number,
    positiveFeedbackRatio: number
  ): Promise<VerificationStepResult> {
    const verification = await this.getOrCreateVerification(userId);

    verification.completed_runs = completedRuns;
    verification.incident_count = incidentCount;
    verification.positive_feedback_ratio = positiveFeedbackRatio;

    // Check if Level 3 is now achievable
    const level3Check = this.checkLevelRequirements(verification, 3);

    if (level3Check.met && verification.level === 2) {
      verification.level = 3;
      verification.level_name = VerificationLevelMap[3];
      verification.social_proof_achieved_at = new Date().toISOString();
      verification.verified_at = new Date().toISOString();

      console.log(`[IdentityVerification] User ${userId} achieved Level 3 (Trusted)`);
    }

    await this.saveVerification(verification);

    return {
      success: true,
      step: level3Check.met ? 'build_reputation' : 'complete_runs',
      level_achieved: level3Check.met ? 3 : verification.level,
      requires_admin_review: false,
    };
  }

  // ============================================
  // LEVEL UPGRADE LOGIC
  // ============================================

  /**
   * Try to upgrade to a specific level
   */
  private async tryUpgradeLevel(
    verification: IdentityVerification,
    targetLevel: VerificationLevelNumber
  ): Promise<VerificationLevelNumber | undefined> {
    // Must achieve levels sequentially
    if (verification.level >= targetLevel) {
      return undefined;
    }

    // Check all requirements for target level
    const check = this.checkLevelRequirements(verification, targetLevel);

    if (check.met) {
      // Also need to have achieved previous level
      if (targetLevel === 0 || verification.level === targetLevel - 1) {
        verification.level = targetLevel;
        verification.level_name = VerificationLevelMap[targetLevel];
        verification.verified_at = new Date().toISOString();

        console.log(`[IdentityVerification] User ${verification.user_id} upgraded to Level ${targetLevel}`);
        return targetLevel;
      }
    }

    return undefined;
  }

  // ============================================
  // SESSION CONSTRAINTS
  // ============================================

  /**
   * Check if user meets level requirements for a session type
   */
  async checkSessionConstraint(
    userId: string,
    sessionType: SessionType
  ): Promise<SessionConstraintCheck> {
    const verification = await this.getOrCreateVerification(userId);
    const requiredLevel = SessionLevelRequirements[sessionType];

    if (verification.level >= requiredLevel) {
      return {
        allowed: true,
        required_level: requiredLevel,
        current_level: verification.level,
      };
    }

    const upgradePath = this.getRequiredSteps(verification, requiredLevel);

    return {
      allowed: false,
      required_level: requiredLevel,
      current_level: verification.level,
      reason: `Level ${requiredLevel} required for ${sessionType} sessions.`,
      upgrade_path: upgradePath,
    };
  }

  // ============================================
  // SUSPENSION & REVALIDATION
  // ============================================

  /**
   * Check if revalidation is required after suspension lift
   */
  async checkRevalidationRequired(userId: string): Promise<RevalidationRequirement> {
    const verification = await this.getOrCreateVerification(userId);

    // Check if flagged for revalidation
    if (verification.admin_review_required && verification.admin_review_reason === 'revalidation_required') {
      return {
        required: true,
        reason: 'suspension_lifted',
        steps_required: ['upload_id_document', 'capture_selfie'],
      };
    }

    // Check document expiry (annual check)
    if (verification.id_verified_at) {
      const verifiedDate = new Date(verification.id_verified_at);
      const daysSinceVerification = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceVerification > VerificationThresholds.ID_EXPIRY_CHECK_DAYS) {
        return {
          required: true,
          reason: 'document_expired',
          steps_required: ['upload_id_document'],
        };
      }
    }

    return {
      required: false,
      reason: 'periodic_review',
      steps_required: [],
    };
  }

  /**
   * Require revalidation for a user (called after suspension reset)
   */
  async requireRevalidation(userId: string, reason: RevalidationReason): Promise<void> {
    const verification = await this.getOrCreateVerification(userId);

    verification.admin_review_required = true;
    verification.admin_review_reason = 'revalidation_required';

    // Reset ID verification status
    verification.id_verified = false;
    verification.selfie_match_passed = false;
    verification.selfie_match_score = undefined;

    // Downgrade level if was at 2 or 3
    if (verification.level >= 2) {
      verification.level = 1;
      verification.level_name = VerificationLevelMap[1];
    }

    await this.saveVerification(verification);

    console.log(`[IdentityVerification] Revalidation required for ${userId}: ${reason}`);
  }

  /**
   * Complete revalidation process
   */
  async completeRevalidation(userId: string): Promise<RevalidationResult> {
    const verification = await this.getOrCreateVerification(userId);
    const previousLevel = verification.level;

    // Check if all requirements are met
    if (verification.id_verified && verification.selfie_match_passed) {
      verification.admin_review_required = false;
      verification.admin_review_reason = undefined;

      // Restore level 2
      const newLevel = await this.tryUpgradeLevel(verification, 2);

      await this.saveVerification(verification);

      return {
        success: true,
        user_id: userId,
        previous_level: previousLevel,
        new_level: newLevel || verification.level,
        revalidation_complete: true,
      };
    }

    const pendingSteps = this.getRequiredSteps(verification, 2);

    return {
      success: false,
      user_id: userId,
      previous_level: previousLevel,
      new_level: verification.level,
      revalidation_complete: false,
      pending_steps: pendingSteps,
    };
  }

  // ============================================
  // MULTI-ACCOUNT DETECTION
  // ============================================

  /**
   * Track device fingerprint for anti-fraud
   */
  private async trackDeviceFingerprint(userId: string, fingerprint: string): Promise<void> {
    const verification = await this.getOrCreateVerification(userId);

    // Add to user's devices
    if (!verification.device_fingerprints.includes(fingerprint)) {
      verification.device_fingerprints.push(fingerprint);

      // Check max devices
      if (verification.device_fingerprints.length > VerificationThresholds.MAX_DEVICES_PER_ACCOUNT) {
        verification.flagged_for_multi_account = true;
        verification.admin_review_required = true;
        verification.admin_review_reason = 'multi_account_detected';
      }
    }

    // Track fingerprint globally
    const usersWithFingerprint = this.deviceFingerprints.get(fingerprint) || [];
    if (!usersWithFingerprint.includes(userId)) {
      usersWithFingerprint.push(userId);
      this.deviceFingerprints.set(fingerprint, usersWithFingerprint);

      // Check for multi-account
      if (usersWithFingerprint.length > 1) {
        verification.flagged_for_multi_account = true;
        verification.multi_account_check_at = new Date().toISOString();
      }
    }

    await this.saveVerification(verification);
  }

  /**
   * Run multi-account check
   */
  async checkMultiAccount(userId: string): Promise<MultiAccountCheck> {
    const verification = await this.getOrCreateVerification(userId);
    const similarAccounts: SimilarAccountMatch[] = [];
    const checkFactors: MultiAccountFactor[] = [];

    // Check device fingerprints
    for (const fingerprint of verification.device_fingerprints) {
      const usersWithFingerprint = this.deviceFingerprints.get(fingerprint) || [];
      const otherUsers = usersWithFingerprint.filter((u) => u !== userId);

      for (const otherUserId of otherUsers) {
        const existingMatch = similarAccounts.find((m) => m.other_user_id === otherUserId);
        if (existingMatch) {
          existingMatch.similarity_score += 0.3;
          existingMatch.matching_factors.push('device_fingerprint');
        } else {
          similarAccounts.push({
            other_user_id: otherUserId,
            similarity_score: 0.3,
            matching_factors: ['device_fingerprint'],
          });
        }
      }

      if (otherUsers.length > 0) {
        checkFactors.push({
          factor: 'device_fingerprint',
          value: fingerprint.substring(0, 8) + '...',
          matches_count: otherUsers.length,
          risk_level: otherUsers.length > 2 ? 'high' : 'medium',
        });
      }
    }

    // Check phone hash (if available)
    if (verification.phone_number_hash) {
      // In production, would check against all phone hashes
      checkFactors.push({
        factor: 'phone_number',
        value: 'verified',
        matches_count: 0,
        risk_level: 'low',
      });
    }

    const isFlagged = similarAccounts.some(
      (m) => m.similarity_score >= VerificationThresholds.MULTI_ACCOUNT_SIMILARITY_THRESHOLD
    );

    return {
      user_id: userId,
      is_flagged: isFlagged || verification.flagged_for_multi_account,
      confidence: isFlagged ? Math.max(...similarAccounts.map((m) => m.similarity_score)) : 0,
      similar_accounts: similarAccounts,
      check_factors: checkFactors,
    };
  }

  // ============================================
  // ADMIN REVIEW
  // ============================================

  /**
   * Create admin review request
   */
  private async createAdminReview(
    verification: IdentityVerification,
    reason: AdminReviewReason
  ): Promise<void> {
    const riskIndicators: RiskIndicator[] = [];

    if (verification.selfie_match_score !== undefined) {
      riskIndicators.push({
        type: 'selfie_confidence',
        severity: verification.selfie_match_score < 50 ? 'high' : 'medium',
        description: `Selfie match score: ${verification.selfie_match_score}%`,
      });
    }

    if (verification.flagged_for_multi_account) {
      riskIndicators.push({
        type: 'multi_account',
        severity: 'high',
        description: 'Potential multi-account detected',
      });
    }

    const review: AdminVerificationReview = {
      verification_id: verification.id,
      user_id: verification.user_id,
      review_type: reason,
      selfie_match_score: verification.selfie_match_score,
      risk_indicators: riskIndicators,
      recommendation: this.getReviewRecommendation(verification, riskIndicators),
      confidence: this.calculateReviewConfidence(riskIndicators),
    };

    this.pendingReviews.set(verification.id, review);

    console.log(`[IdentityVerification] Admin review created: ${verification.id} - ${reason}`);
  }

  /**
   * Process admin review action
   */
  async processAdminReview(action: AdminReviewAction): Promise<AdminReviewResult> {
    const verification = await this.getVerification(
      this.pendingReviews.get(action.verification_id)?.user_id || ''
    );

    if (!verification) {
      return {
        success: false,
        verification_id: action.verification_id,
        user_notified: false,
        error: 'Verification not found',
      };
    }

    verification.admin_reviewed_at = new Date().toISOString();
    verification.admin_reviewer_id = action.admin_id;

    if (action.action === 'approve') {
      verification.admin_review_required = false;
      verification.admin_review_reason = undefined;

      // Grant level if specified
      if (action.level_to_grant !== undefined && action.level_to_grant > verification.level) {
        verification.level = action.level_to_grant;
        verification.level_name = VerificationLevelMap[action.level_to_grant];
        verification.verified_at = new Date().toISOString();

        // Mark specific verifications as passed
        if (action.level_to_grant >= 2) {
          verification.selfie_match_passed = true;
          verification.id_verified = true;
        }
      }
    } else if (action.action === 'reject') {
      verification.admin_review_required = false;
      // Level stays the same or lower
    } else if (action.action === 'request_resubmission') {
      verification.admin_review_required = true;
      verification.admin_review_reason = 'manual_request';
    }

    await this.saveVerification(verification);
    this.pendingReviews.delete(action.verification_id);

    console.log(`[IdentityVerification] Admin review processed: ${action.verification_id} - ${action.action}`);

    return {
      success: true,
      verification_id: action.verification_id,
      new_level: verification.level,
      user_notified: true,
    };
  }

  /**
   * Get pending admin reviews
   */
  getPendingAdminReviews(): AdminVerificationReview[] {
    return Array.from(this.pendingReviews.values());
  }

  private getReviewRecommendation(
    verification: IdentityVerification,
    riskIndicators: RiskIndicator[]
  ): 'approve' | 'reject' | 'request_new' {
    const highRiskCount = riskIndicators.filter((r) => r.severity === 'high').length;

    if (highRiskCount >= 2) return 'reject';
    if (highRiskCount === 1) return 'request_new';

    if (verification.selfie_match_score && verification.selfie_match_score >= 60) {
      return 'approve';
    }

    return 'request_new';
  }

  private calculateReviewConfidence(riskIndicators: RiskIndicator[]): number {
    const baseConfidence = 0.7;
    const highRiskPenalty = riskIndicators.filter((r) => r.severity === 'high').length * 0.15;
    const mediumRiskPenalty = riskIndicators.filter((r) => r.severity === 'medium').length * 0.05;

    return Math.max(0.3, baseConfidence - highRiskPenalty - mediumRiskPenalty);
  }

  // ============================================
  // PUBLIC API (SAFE)
  // ============================================

  /**
   * Get public-safe verification status
   * NEVER exposes selfie scores or internal details
   */
  async getPublicStatus(userId: string): Promise<PublicVerificationStatus> {
    const verification = await this.getOrCreateVerification(userId);
    const badges: VerificationBadge[] = [];

    if (verification.email_verified) {
      badges.push({
        type: 'email',
        label: 'Email verifie',
        achieved_at: verification.email_verified_at,
      });
    }

    if (verification.level >= 1) {
      badges.push({
        type: 'phone',
        label: 'Telephone verifie',
        achieved_at: verification.phone_verified_at,
      });
    }

    if (verification.level >= 2) {
      badges.push({
        type: 'id',
        label: 'Identite verifiee',
        achieved_at: verification.id_verified_at,
      });
    }

    if (verification.level >= 3) {
      badges.push({
        type: 'trusted',
        label: 'Membre de confiance',
        achieved_at: verification.social_proof_achieved_at,
      });
    }

    const canUpgrade = verification.level < 3 && !verification.admin_review_required;
    const nextLevel = (verification.level + 1) as VerificationLevelNumber;
    const nextLevelCheck = canUpgrade ? this.checkLevelRequirements(verification, nextLevel) : null;

    return {
      level: verification.level,
      level_name: verification.level_name,
      badges,
      can_upgrade: canUpgrade,
      next_level_requirements: nextLevelCheck?.missing,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private getNextStep(verification: IdentityVerification): VerificationStep | undefined {
    if (!verification.email_verified) return 'verify_email';
    if (!verification.phone_verified) return 'verify_phone';
    if (!verification.has_profile_photo) return 'upload_profile_photo';
    if (!verification.id_verified) return 'upload_id_document';
    if (!verification.selfie_match_passed) return 'capture_selfie';
    if (verification.completed_runs < VerificationThresholds.MIN_COMPLETED_RUNS) return 'complete_runs';
    return undefined;
  }

  private isRateLimited(verification: IdentityVerification): boolean {
    if (!verification.last_verification_attempt_at) return false;

    const lastAttempt = new Date(verification.last_verification_attempt_at);
    const now = new Date();
    const hoursSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

    // Reset daily count if more than 24 hours
    if (hoursSinceLastAttempt >= 24) {
      verification.verification_attempts = 0;
      return false;
    }

    return verification.verification_attempts >= VerificationThresholds.MAX_VERIFICATION_ATTEMPTS_PER_DAY;
  }

  private validateDocument(_input: SubmitDocumentInput): boolean {
    // Simulate document validation (in production, call external service)
    return Math.random() > 0.1; // 90% success rate for simulation
  }

  private simulateSelfieMatch(): number {
    // Simulate selfie matching (in production, call ML service)
    // Returns score between 30-100
    return Math.floor(Math.random() * 70) + 30;
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  // ============================================
  // TESTING UTILITIES
  // ============================================

  clearCaches(): void {
    this.verifications.clear();
    this.pendingReviews.clear();
    this.deviceFingerprints.clear();
  }

  /**
   * Set verification directly (for testing)
   */
  async setVerification(verification: IdentityVerification): Promise<void> {
    this.verifications.set(verification.user_id, verification);
  }

  getVerificationCount(): number {
    return this.verifications.size;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let serviceInstance: IdentityVerificationService | null = null;

export function getIdentityVerificationService(): IdentityVerificationService {
  if (!serviceInstance) {
    serviceInstance = new IdentityVerificationService();
  }
  return serviceInstance;
}

export function resetIdentityVerificationService(): void {
  serviceInstance = null;
}
