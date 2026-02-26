/**
 * Safety Guard - Core validation module
 *
 * Validates all critical user actions against safety rules.
 * This is the main entry point for safety checks.
 *
 * IMPORTANT: All critical actions MUST call SafetyGuard before proceeding.
 */

import { createClient } from '@supabase/supabase-js';
import {
  SafetyProfile,
  SessionSafetySettings,
  SafetyValidationResult,
  SafetyErrorCode,
  TrustTier,
  VerificationLevel,
  validationSuccess,
  validationFailure,
  DEFAULT_SAFETY_PROFILE,
  DEFAULT_SESSION_SAFETY,
} from './types';

// ============================================
// TYPES FOR INTERNAL USE
// ============================================

interface UserSafetyData {
  id: string;
  phone_verified: boolean;
  photo_verified: boolean;
  verification_level: VerificationLevel;
  trust_score: number;
  trust_tier: TrustTier;
  safety_flags: number;
  suspension_until?: string;
}

interface SessionSafetyData {
  id: string;
  creator_id: string;
  verified_only: boolean;
  min_trust_score?: number;
  allow_trust_tier_yellow: boolean;
}

// ============================================
// SAFETY GUARD CLASS
// ============================================

export class SafetyGuard {
  private supabase: ReturnType<typeof createClient> | null = null;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Initialize Supabase client if credentials provided
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Set the Supabase client (useful for dependency injection in tests)
   */
  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  // ============================================
  // MAIN VALIDATION METHODS
  // ============================================

  /**
   * Validate if a user can join a session
   *
   * Rules:
   * 1. User must have phone verified
   * 2. User trust tier must not be "red"
   * 3. If session.verifiedOnly, user must have verification_level >= "basic"
   * 4. If session.minTrustScore, user trust score must meet minimum
   * 5. User must not be suspended
   */
  async validateJoin(
    userId: string,
    sessionId: string,
    userData?: UserSafetyData,
    sessionData?: SessionSafetyData
  ): Promise<SafetyValidationResult> {
    // Fetch user data if not provided
    const user = userData || (await this.fetchUserSafetyData(userId));
    if (!user) {
      return validationFailure(
        SafetyErrorCode.USER_NOT_FOUND,
        'Utilisateur non trouve'
      );
    }

    // Fetch session data if not provided
    const session = sessionData || (await this.fetchSessionSafetyData(sessionId));
    if (!session) {
      return validationFailure(
        SafetyErrorCode.SESSION_NOT_FOUND,
        'Session non trouvee'
      );
    }

    // Rule 1: Check phone verification
    const phoneCheck = this.checkPhoneVerified(user);
    if (!phoneCheck.allowed) return phoneCheck;

    // Rule 2: Check trust tier (red = blocked)
    const tierCheck = this.checkTrustTier(user, session.allow_trust_tier_yellow);
    if (!tierCheck.allowed) return tierCheck;

    // Rule 3: Check verification level if session requires it
    if (session.verified_only) {
      const verificationCheck = this.checkVerificationLevel(user, 'basic');
      if (!verificationCheck.allowed) return verificationCheck;
    }

    // Rule 4: Check minimum trust score if session requires it
    if (session.min_trust_score !== undefined && session.min_trust_score > 0) {
      const scoreCheck = this.checkTrustScore(user, session.min_trust_score);
      if (!scoreCheck.allowed) return scoreCheck;
    }

    // Rule 5: Check suspension
    const suspensionCheck = this.checkSuspension(user);
    if (!suspensionCheck.allowed) return suspensionCheck;

    return validationSuccess();
  }

  /**
   * Validate if a user can create a session
   *
   * Rules:
   * 1. User must have phone verified
   * 2. User trust tier must not be "red"
   * 3. User must not be suspended
   */
  async validateCreateSession(
    userId: string,
    userData?: UserSafetyData
  ): Promise<SafetyValidationResult> {
    // Fetch user data if not provided
    const user = userData || (await this.fetchUserSafetyData(userId));
    if (!user) {
      return validationFailure(
        SafetyErrorCode.USER_NOT_FOUND,
        'Utilisateur non trouve'
      );
    }

    // Rule 1: Check phone verification
    const phoneCheck = this.checkPhoneVerified(user);
    if (!phoneCheck.allowed) return phoneCheck;

    // Rule 2: Check trust tier
    const tierCheck = this.checkTrustTier(user, true); // Allow yellow for creation
    if (!tierCheck.allowed) return tierCheck;

    // Rule 3: Check suspension
    const suspensionCheck = this.checkSuspension(user);
    if (!suspensionCheck.allowed) return suspensionCheck;

    return validationSuccess();
  }

  /**
   * Validate if a user can send a message to a target
   *
   * Rules:
   * 1. User must have phone verified
   * 2. User trust tier must not be "red"
   * 3. User must not be suspended
   * 4. (Future) Check if target has blocked sender
   */
  async validateMessage(
    userId: string,
    targetId: string,
    userData?: UserSafetyData
  ): Promise<SafetyValidationResult> {
    // Fetch user data if not provided
    const user = userData || (await this.fetchUserSafetyData(userId));
    if (!user) {
      return validationFailure(
        SafetyErrorCode.USER_NOT_FOUND,
        'Utilisateur non trouve'
      );
    }

    // Rule 1: Check phone verification
    const phoneCheck = this.checkPhoneVerified(user);
    if (!phoneCheck.allowed) return phoneCheck;

    // Rule 2: Check trust tier
    const tierCheck = this.checkTrustTier(user, true);
    if (!tierCheck.allowed) return tierCheck;

    // Rule 3: Check suspension
    const suspensionCheck = this.checkSuspension(user);
    if (!suspensionCheck.allowed) return suspensionCheck;

    // Rule 4: Check block status (future implementation)
    // const blockCheck = await this.checkBlockStatus(userId, targetId);
    // if (!blockCheck.allowed) return blockCheck;

    return validationSuccess();
  }

  // ============================================
  // INDIVIDUAL CHECK METHODS
  // ============================================

  /**
   * Check if user has phone verified
   */
  checkPhoneVerified(user: UserSafetyData): SafetyValidationResult {
    if (!user.phone_verified) {
      return validationFailure(
        SafetyErrorCode.PHONE_REQUIRED,
        'La verification du telephone est requise pour cette action',
        { userId: user.id }
      );
    }
    return validationSuccess();
  }

  /**
   * Check user trust tier
   */
  checkTrustTier(
    user: UserSafetyData,
    allowYellow: boolean = true
  ): SafetyValidationResult {
    if (user.trust_tier === 'red') {
      return validationFailure(
        SafetyErrorCode.TRUST_TIER_RED,
        'Votre compte est temporairement restreint',
        { userId: user.id, tier: user.trust_tier }
      );
    }

    if (user.trust_tier === 'yellow' && !allowYellow) {
      return validationFailure(
        SafetyErrorCode.TRUST_TIER_YELLOW_NOT_ALLOWED,
        'Cette session requiert un niveau de confiance plus eleve',
        { userId: user.id, tier: user.trust_tier }
      );
    }

    return validationSuccess();
  }

  /**
   * Check user verification level
   */
  checkVerificationLevel(
    user: UserSafetyData,
    required: VerificationLevel
  ): SafetyValidationResult {
    const levels: VerificationLevel[] = ['none', 'basic', 'advanced'];
    const userLevelIndex = levels.indexOf(user.verification_level);
    const requiredLevelIndex = levels.indexOf(required);

    if (userLevelIndex < requiredLevelIndex) {
      return validationFailure(
        SafetyErrorCode.VERIFICATION_REQUIRED,
        `Verification "${required}" requise pour cette action`,
        {
          userId: user.id,
          currentLevel: user.verification_level,
          requiredLevel: required,
        }
      );
    }

    return validationSuccess();
  }

  /**
   * Check user trust score against minimum
   */
  checkTrustScore(
    user: UserSafetyData,
    minScore: number
  ): SafetyValidationResult {
    if (user.trust_score < minScore) {
      return validationFailure(
        SafetyErrorCode.TRUST_SCORE_TOO_LOW,
        'Votre score de confiance est insuffisant pour cette session',
        {
          userId: user.id,
          currentScore: user.trust_score,
          requiredScore: minScore,
        }
      );
    }

    return validationSuccess();
  }

  /**
   * Check if user is currently suspended
   */
  checkSuspension(user: UserSafetyData): SafetyValidationResult {
    if (user.suspension_until) {
      const suspensionDate = new Date(user.suspension_until);
      const now = new Date();

      if (suspensionDate > now) {
        return validationFailure(
          SafetyErrorCode.USER_SUSPENDED,
          `Votre compte est suspendu jusqu'au ${suspensionDate.toLocaleDateString('fr-FR')}`,
          {
            userId: user.id,
            suspensionUntil: user.suspension_until,
          }
        );
      }
    }

    return validationSuccess();
  }

  // ============================================
  // DATA FETCHING (MOCK FOR NOW)
  // ============================================

  /**
   * Fetch user safety data from database
   * Returns default values if safety fields don't exist yet
   */
  async fetchUserSafetyData(userId: string): Promise<UserSafetyData | null> {
    if (!this.supabase) {
      // Return mock data for testing without DB
      return {
        id: userId,
        ...DEFAULT_SAFETY_PROFILE,
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select(`
          id,
          phone_verified,
          photo_verified,
          verification_level,
          trust_score,
          trust_tier,
          safety_flags,
          suspension_until
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching user safety data:', error);
        return null;
      }

      // Cast to record type for safe property access
      const record = data as Record<string, unknown>;

      // Return data with defaults for missing fields
      return {
        id: record.id as string,
        phone_verified: (record.phone_verified as boolean | null) ?? DEFAULT_SAFETY_PROFILE.phone_verified,
        photo_verified: (record.photo_verified as boolean | null) ?? DEFAULT_SAFETY_PROFILE.photo_verified,
        verification_level: (record.verification_level as VerificationLevel | null) ?? DEFAULT_SAFETY_PROFILE.verification_level,
        trust_score: (record.trust_score as number | null) ?? DEFAULT_SAFETY_PROFILE.trust_score,
        trust_tier: (record.trust_tier as TrustTier | null) ?? DEFAULT_SAFETY_PROFILE.trust_tier,
        safety_flags: (record.safety_flags as number | null) ?? DEFAULT_SAFETY_PROFILE.safety_flags,
        suspension_until: record.suspension_until as string | undefined,
      };
    } catch (err) {
      console.error('Error in fetchUserSafetyData:', err);
      return null;
    }
  }

  /**
   * Fetch session safety data from database
   * Returns default values if safety fields don't exist yet
   */
  async fetchSessionSafetyData(sessionId: string): Promise<SessionSafetyData | null> {
    if (!this.supabase) {
      // Return mock data for testing without DB
      return {
        id: sessionId,
        creator_id: 'mock-creator',
        ...DEFAULT_SESSION_SAFETY,
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select(`
          id,
          creator_id,
          verified_only,
          min_trust_score,
          allow_trust_tier_yellow
        `)
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        console.error('Error fetching session safety data:', error);
        return null;
      }

      // Cast to record type for safe property access
      const record = data as Record<string, unknown>;

      // Return data with defaults for missing fields
      return {
        id: record.id as string,
        creator_id: record.creator_id as string,
        verified_only: (record.verified_only as boolean | null) ?? DEFAULT_SESSION_SAFETY.verified_only,
        min_trust_score: (record.min_trust_score as number | null | undefined) ?? DEFAULT_SESSION_SAFETY.min_trust_score,
        allow_trust_tier_yellow: (record.allow_trust_tier_yellow as boolean | null) ?? DEFAULT_SESSION_SAFETY.allow_trust_tier_yellow,
      };
    } catch (err) {
      console.error('Error in fetchSessionSafetyData:', err);
      return null;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let safetyGuardInstance: SafetyGuard | null = null;

/**
 * Get the SafetyGuard singleton instance
 */
export function getSafetyGuard(): SafetyGuard {
  if (!safetyGuardInstance) {
    safetyGuardInstance = new SafetyGuard(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return safetyGuardInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetSafetyGuard(): void {
  safetyGuardInstance = null;
}
