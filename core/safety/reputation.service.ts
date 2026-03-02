/**
 * Dynamic Reputation Visualization Service
 *
 * Manages trust profiles, score calculation, and status determination.
 *
 * PRIVACY RULES:
 * - Public API: Only status + qualitative indicators
 * - Admin API: Full numeric scores and history
 * - Never expose exact trustScore to end users
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  TrustProfile,
  TrustStatus,
  TrustIndicator,
  TrustBadge,
  PublicTrustProfile,
  ScoreWeights,
  StatusThresholds,
  TimeDecayConfig,
  RecalculationTrigger,
  RecalculationInput,
  RecalculationResult,
  ScoreBreakdown,
  PublicTrustResponse,
  AdminTrustResponse,
  TrustHistoryEntry,
  ReputationErrorCode,
  ReputationConfig,
  DEFAULT_TRUST_PROFILE,
} from './reputation.types';

// ============================================
// REPUTATION SERVICE
// ============================================

export class ReputationService {
  private supabase: ReturnType<typeof createClient> | null = null;

  // In-memory cache for fast lookups
  private profileCache: Map<string, TrustProfile> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get public trust profile (safe for external API)
   * Returns only status and qualitative indicators
   */
  async getPublicProfile(userId: string): Promise<PublicTrustResponse> {
    const profile = await this.getProfile(userId);

    if (!profile) {
      return {
        success: false,
        error_message: 'Profil non trouve',
      };
    }

    const publicProfile = this.toPublicProfile(profile);

    return {
      success: true,
      profile: publicProfile,
    };
  }

  /**
   * Convert internal profile to public view
   * STRIPS all numeric scores
   */
  private toPublicProfile(profile: TrustProfile): PublicTrustProfile {
    const badges = this.calculateBadges(profile);

    return {
      user_id: profile.user_id,
      status: profile.status,
      indicator: profile.indicator,
      is_verified: profile.verification_level !== 'none',
      verification_level: profile.verification_level,
      has_completed_runs: profile.completed_runs > 0,
      is_active_runner: this.isActiveRunner(profile),
      account_age_category: this.getAccountAgeCategory(profile.account_age_days),
      badges,
    };
  }

  /**
   * Check if user is active (activity in last 30 days)
   */
  private isActiveRunner(profile: TrustProfile): boolean {
    const lastActivity = new Date(profile.last_activity_at);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity <= ReputationConfig.ACTIVE_DAYS;
  }

  /**
   * Get account age category
   */
  private getAccountAgeCategory(days: number): 'new' | 'established' | 'veteran' {
    if (days >= ReputationConfig.VETERAN_DAYS) return 'veteran';
    if (days >= ReputationConfig.ESTABLISHED_DAYS) return 'established';
    return 'new';
  }

  // ============================================
  // ADMIN API
  // ============================================

  /**
   * Get full trust profile (admin only)
   * Returns numeric scores and breakdown
   */
  async getAdminProfile(
    userId: string,
    adminId: string
  ): Promise<AdminTrustResponse> {
    // In production, verify admin permissions here

    const profile = await this.getProfile(userId);

    if (!profile) {
      return {
        success: false,
        error_message: 'Profil non trouve',
      };
    }

    const breakdown = this.calculateScoreBreakdown(profile);
    const history = await this.getHistory(userId, 20);

    return {
      success: true,
      profile,
      breakdown,
      history,
    };
  }

  /**
   * Admin-triggered recalculation
   */
  async adminRecalculate(
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<RecalculationResult> {
    return this.recalculate({
      user_id: userId,
      trigger: 'manual_admin',
      admin_id: adminId,
      event_data: {
        metadata: { reason },
      },
    });
  }

  // ============================================
  // TRUST RECALCULATION ENGINE
  // ============================================

  /**
   * Main recalculation method
   * Called on events or manually by admin
   */
  async recalculate(input: RecalculationInput): Promise<RecalculationResult> {
    // Get or create profile
    let profile = await this.getProfile(input.user_id);

    if (!profile) {
      profile = await this.createProfile(input.user_id);
    }

    const previousScore = profile.trust_score;
    const previousStatus = profile.status;

    // Handle specific triggers BEFORE score calculation
    // so the new data is included in the calculation
    if (input.trigger === 'run_completed') {
      profile.completed_runs++;
      profile.last_activity_at = new Date().toISOString();
    } else if (input.trigger === 'feedback_received') {
      if (input.event_data?.event_type === 'positive') {
        profile.positive_feedback_count++;
        profile.recent_positive_feedback++;
      } else if (input.event_data?.event_type === 'negative') {
        profile.negative_feedback_count++;
        profile.recent_negative_feedback++;
      }
      profile.last_activity_at = new Date().toISOString();
    } else if (input.trigger === 'incident_confirmed') {
      profile.incidents_count++;
      profile.recent_incidents++;
      profile.last_incident_at = new Date().toISOString();
    } else if (input.trigger === 'verification_completed') {
      if (input.event_data?.event_type === 'basic') {
        profile.verification_level = 'basic';
        profile.phone_verified = true;
      } else if (input.event_data?.event_type === 'advanced') {
        profile.verification_level = 'advanced';
        profile.photo_verified = true;
      }
    }

    // Calculate new score based on updated profile
    const newScore = this.calculateScore(profile, input);

    // Apply time decay
    const decayApplied = this.calculateDecay(profile);
    const scoreAfterDecay = Math.max(
      TimeDecayConfig.DECAY_FLOOR,
      newScore - decayApplied
    );

    // Cap score
    const cappedScore = Math.max(
      ReputationConfig.MIN_SCORE,
      Math.min(ReputationConfig.MAX_SCORE, scoreAfterDecay)
    );

    // Determine new status
    const newStatus = this.determineStatus(cappedScore);
    const newIndicator = this.determineIndicator(cappedScore, profile);

    // Calculate badges
    const previousBadges = this.calculateBadges(profile);
    profile.trust_score = cappedScore;
    profile.status = newStatus;
    const newBadges = this.calculateBadges(profile);

    const badgesEarned = newBadges.filter(b => !previousBadges.includes(b));
    const badgesLost = previousBadges.filter(b => !newBadges.includes(b));

    // Update profile
    profile.raw_score = newScore;
    profile.trust_score = cappedScore;
    profile.status = newStatus;
    profile.indicator = newIndicator;
    profile.decay_applied = decayApplied;
    profile.last_recalculation_at = new Date().toISOString();
    profile.updated_at = new Date().toISOString();

    // Save profile
    await this.saveProfile(profile);

    // Log history
    const result: RecalculationResult = {
      user_id: input.user_id,
      previous_score: previousScore,
      new_score: cappedScore,
      score_change: cappedScore - previousScore,
      previous_status: previousStatus,
      new_status: newStatus,
      status_changed: previousStatus !== newStatus,
      decay_applied: decayApplied,
      badges_earned: badgesEarned,
      badges_lost: badgesLost,
      recalculated_at: new Date().toISOString(),
    };

    await this.logHistory(input, result);

    // Invalidate cache
    this.profileCache.delete(input.user_id);

    return result;
  }

  /**
   * Calculate raw score from profile data
   */
  calculateScore(profile: TrustProfile, input?: RecalculationInput): number {
    let score = ReputationConfig.BASE_SCORE;

    // Run bonus (capped)
    const runBonus = Math.min(
      profile.completed_runs * ScoreWeights.COMPLETED_RUN,
      ScoreWeights.MAX_RUN_BONUS
    );
    score += runBonus;

    // Feedback bonus (capped)
    const positiveFeedbackBonus = Math.min(
      profile.positive_feedback_count * ScoreWeights.POSITIVE_FEEDBACK,
      ScoreWeights.MAX_FEEDBACK_BONUS
    );
    score += positiveFeedbackBonus;

    // Negative feedback penalty
    const negativePenalty = profile.negative_feedback_count * Math.abs(ScoreWeights.NEGATIVE_FEEDBACK);
    score -= negativePenalty;

    // Incident penalty
    const incidentPenalty = profile.incidents_count * Math.abs(ScoreWeights.CONFIRMED_INCIDENT);
    score -= incidentPenalty;

    // Verification bonus
    if (profile.verification_level === 'basic') {
      score += ScoreWeights.VERIFICATION_BASIC;
    } else if (profile.verification_level === 'advanced' || profile.verification_level === 'premium') {
      score += ScoreWeights.VERIFICATION_ADVANCED;
    }

    // Account age bonus
    if (profile.account_age_days >= ReputationConfig.VETERAN_DAYS) {
      score += ScoreWeights.ACCOUNT_AGE_1_YEAR;
    } else if (profile.account_age_days >= ReputationConfig.ESTABLISHED_DAYS) {
      score += ScoreWeights.ACCOUNT_AGE_90_DAYS;
    }

    // Host bonus
    score += Math.min(profile.runs_as_host * ScoreWeights.HOST_SUCCESS, 15);

    // Apply event-specific changes
    if (input?.event_data?.points_change) {
      score += input.event_data.points_change;
    }

    return score;
  }

  /**
   * Calculate time decay penalty
   */
  calculateDecay(profile: TrustProfile): number {
    const lastActivity = new Date(profile.last_activity_at);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity <= TimeDecayConfig.DECAY_START_DAYS) {
      return 0;
    }

    const decayDays = daysSinceActivity - TimeDecayConfig.DECAY_START_DAYS;
    const rawDecay = decayDays * TimeDecayConfig.DECAY_RATE_PER_DAY;

    // Cap decay at percentage of current score
    const maxDecay = profile.trust_score * (TimeDecayConfig.MAX_DECAY_PERCENT / 100);

    return Math.min(rawDecay, maxDecay);
  }

  /**
   * Determine status from score
   */
  determineStatus(score: number): TrustStatus {
    if (score >= StatusThresholds.VALIDATED_MIN) return 'validated';
    if (score >= StatusThresholds.NEW_MIN) return 'new';
    if (score >= StatusThresholds.OBSERVED_MIN) return 'observed';
    return 'restricted';
  }

  /**
   * Determine indicator from score and profile
   */
  determineIndicator(score: number, profile: TrustProfile): TrustIndicator {
    const status = this.determineStatus(score);

    if (status === 'validated') {
      // Check if highly trusted (veteran with good history)
      if (
        profile.account_age_days >= ReputationConfig.VETERAN_DAYS &&
        profile.incidents_count === 0 &&
        profile.completed_runs >= 20
      ) {
        return 'highly_trusted';
      }
      return 'trusted';
    }

    if (status === 'new') {
      return 'building_trust';
    }

    if (status === 'observed') {
      return 'needs_verification';
    }

    return 'limited';
  }

  /**
   * Calculate earned badges
   */
  calculateBadges(profile: TrustProfile): TrustBadge[] {
    const badges: TrustBadge[] = [];

    // Verified runner
    if (profile.verification_level !== 'none') {
      badges.push('verified_runner');
    }

    // Trusted pacer
    if (
      profile.completed_runs >= ReputationConfig.TRUSTED_PACER_RUNS &&
      profile.recent_negative_feedback === 0
    ) {
      badges.push('trusted_pacer');
    }

    // Community favorite
    const totalFeedback = profile.positive_feedback_count + profile.negative_feedback_count;
    if (
      totalFeedback >= 5 &&
      profile.positive_feedback_count / totalFeedback >= ReputationConfig.COMMUNITY_FAVORITE_RATIO
    ) {
      badges.push('community_favorite');
    }

    // Reliable host
    if (profile.runs_as_host >= ReputationConfig.RELIABLE_HOST_SESSIONS) {
      badges.push('reliable_host');
    }

    // Safety champion
    if (
      profile.verification_level === 'advanced' &&
      profile.incidents_count === 0 &&
      profile.trust_score >= 80
    ) {
      badges.push('safety_champion');
    }

    // Veteran runner
    if (
      profile.account_age_days >= ReputationConfig.VETERAN_DAYS &&
      profile.trust_score >= StatusThresholds.NEW_MIN
    ) {
      badges.push('veteran_runner');
    }

    return badges;
  }

  /**
   * Calculate score breakdown for admin view
   */
  calculateScoreBreakdown(profile: TrustProfile): ScoreBreakdown {
    const runBonus = Math.min(
      profile.completed_runs * ScoreWeights.COMPLETED_RUN,
      ScoreWeights.MAX_RUN_BONUS
    );

    const feedbackBonus = Math.min(
      profile.positive_feedback_count * ScoreWeights.POSITIVE_FEEDBACK,
      ScoreWeights.MAX_FEEDBACK_BONUS
    ) - (profile.negative_feedback_count * Math.abs(ScoreWeights.NEGATIVE_FEEDBACK));

    let verificationBonus = 0;
    if (profile.verification_level === 'basic') {
      verificationBonus = ScoreWeights.VERIFICATION_BASIC;
    } else if (profile.verification_level === 'advanced' || profile.verification_level === 'premium') {
      verificationBonus = ScoreWeights.VERIFICATION_ADVANCED;
    }

    let ageBonus = 0;
    if (profile.account_age_days >= ReputationConfig.VETERAN_DAYS) {
      ageBonus = ScoreWeights.ACCOUNT_AGE_1_YEAR;
    } else if (profile.account_age_days >= ReputationConfig.ESTABLISHED_DAYS) {
      ageBonus = ScoreWeights.ACCOUNT_AGE_90_DAYS;
    }

    const incidentPenalty = profile.incidents_count * Math.abs(ScoreWeights.CONFIRMED_INCIDENT);
    const decayPenalty = this.calculateDecay(profile);

    const totalRaw = ReputationConfig.BASE_SCORE + runBonus + feedbackBonus +
      verificationBonus + ageBonus - incidentPenalty - decayPenalty;

    return {
      base_score: ReputationConfig.BASE_SCORE,
      run_bonus: runBonus,
      feedback_bonus: feedbackBonus,
      verification_bonus: verificationBonus,
      age_bonus: ageBonus,
      incident_penalty: incidentPenalty,
      decay_penalty: decayPenalty,
      total_raw: totalRaw,
      total_capped: Math.max(0, Math.min(100, totalRaw)),
    };
  }

  // ============================================
  // EVENT TRIGGERS
  // ============================================

  /**
   * Trigger recalculation on run completion
   */
  async onRunCompleted(userId: string): Promise<RecalculationResult> {
    return this.recalculate({
      user_id: userId,
      trigger: 'run_completed',
    });
  }

  /**
   * Trigger recalculation on feedback received
   */
  async onFeedbackReceived(
    userId: string,
    feedbackType: 'positive' | 'negative'
  ): Promise<RecalculationResult> {
    return this.recalculate({
      user_id: userId,
      trigger: 'feedback_received',
      event_data: {
        event_type: feedbackType,
      },
    });
  }

  /**
   * Trigger recalculation on confirmed incident
   */
  async onIncidentConfirmed(userId: string, incidentId?: string): Promise<RecalculationResult> {
    return this.recalculate({
      user_id: userId,
      trigger: 'incident_confirmed',
      event_data: {
        metadata: { incident_id: incidentId },
      },
    });
  }

  /**
   * Trigger recalculation on verification
   */
  async onVerificationCompleted(
    userId: string,
    level: 'basic' | 'advanced'
  ): Promise<RecalculationResult> {
    return this.recalculate({
      user_id: userId,
      trigger: 'verification_completed',
      event_data: {
        event_type: level,
      },
    });
  }

  /**
   * Apply scheduled decay to all profiles
   */
  async applyScheduledDecay(): Promise<number> {
    const profiles = await this.getInactiveProfiles(TimeDecayConfig.DECAY_START_DAYS);
    let processed = 0;

    for (const profile of profiles) {
      await this.recalculate({
        user_id: profile.user_id,
        trigger: 'scheduled_decay',
      });
      processed++;
    }

    console.log(`[Reputation] Applied decay to ${processed} profiles`);
    return processed;
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  /**
   * Get profile (with caching)
   */
  async getProfile(userId: string): Promise<TrustProfile | null> {
    // Check cache
    const cached = this.profileCache.get(userId);
    const expiry = this.cacheExpiry.get(userId) || 0;

    if (cached && Date.now() < expiry) {
      return cached;
    }

    // Fetch from database
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('trust_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      const profile = data as TrustProfile;

      // Update cache
      this.profileCache.set(userId, profile);
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_TTL_MS);

      return profile;
    } catch {
      return null;
    }
  }

  /**
   * Create new profile
   */
  async createProfile(userId: string): Promise<TrustProfile> {
    const now = new Date().toISOString();

    const profile: TrustProfile = {
      ...DEFAULT_TRUST_PROFILE,
      user_id: userId,
      account_created_at: now,
      last_activity_at: now,
      last_recalculation_at: now,
      created_at: now,
      updated_at: now,
    };

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Save profile
   */
  private async saveProfile(profile: TrustProfile): Promise<void> {
    // Update cache
    this.profileCache.set(profile.user_id, profile);
    this.cacheExpiry.set(profile.user_id, Date.now() + this.CACHE_TTL_MS);

    if (!this.supabase) {
      console.log('[Mock] Saving trust profile:', profile.user_id);
      return;
    }

    try {
      const data = profile as unknown as Record<string, unknown>;
      await (this.supabase.from('trust_profiles') as unknown as {
        upsert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).upsert(data);
    } catch (err) {
      console.error('Error saving trust profile:', err);
    }
  }

  /**
   * Get inactive profiles for decay
   */
  private async getInactiveProfiles(daysSinceActivity: number): Promise<TrustProfile[]> {
    if (!this.supabase) return [];

    const cutoffDate = new Date(
      Date.now() - daysSinceActivity * 24 * 60 * 60 * 1000
    ).toISOString();

    try {
      const { data, error } = await this.supabase
        .from('trust_profiles')
        .select('*')
        .lt('last_activity_at', cutoffDate)
        .gt('trust_score', TimeDecayConfig.DECAY_FLOOR);

      if (error || !data) return [];
      return data as TrustProfile[];
    } catch {
      return [];
    }
  }

  /**
   * Log history entry
   */
  private async logHistory(
    input: RecalculationInput,
    result: RecalculationResult
  ): Promise<void> {
    const entry: TrustHistoryEntry = {
      id: this.generateId('th'),
      user_id: input.user_id,
      timestamp: result.recalculated_at,
      trigger: input.trigger,
      previous_score: result.previous_score,
      new_score: result.new_score,
      change: result.score_change,
      previous_status: result.previous_status,
      new_status: result.new_status,
      details: input.event_data?.metadata,
    };

    if (!this.supabase) {
      console.log('[Mock] Logging trust history:', entry.id);
      return;
    }

    try {
      const data = entry as unknown as Record<string, unknown>;
      await (this.supabase.from('trust_history') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).insert(data);
    } catch (err) {
      console.error('Error logging trust history:', err);
    }
  }

  /**
   * Get history entries
   */
  private async getHistory(userId: string, limit: number): Promise<TrustHistoryEntry[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('trust_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data as TrustHistoryEntry[];
    } catch {
      return [];
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }
}

// ============================================
// SINGLETON
// ============================================

let reputationServiceInstance: ReputationService | null = null;

export function getReputationService(): ReputationService {
  if (!reputationServiceInstance) {
    reputationServiceInstance = new ReputationService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return reputationServiceInstance;
}

export function resetReputationService(): void {
  reputationServiceInstance = null;
}
