/**
 * Trust Engine - Event-based trust score calculation module
 *
 * Trust score is NEVER modified directly - it's always recalculated
 * from the sum of SafetyEvents for a user.
 *
 * Algorithm:
 * - Base score = 50
 * - +1 per session_completed (max 30 bonus)
 * - +10 if account age > 90 days
 * - +10 if no active report_confirmed
 * - +10 if verificationLevel === 'advanced'
 * - -5 per no_show
 * - -10 per check_in_fail
 * - -15 per report_confirmed
 * - -20 per account_warning
 *
 * Negative events expire after 6 months.
 *
 * Tier thresholds:
 * - >= 80: green
 * - >= 60: yellow
 * - < 60: red
 */

import { createClient } from '@supabase/supabase-js';
import {
  TrustTier,
  SafetyEvent,
  SafetyEventType,
  VerificationLevel,
  EventWeights,
  NEGATIVE_EVENT_EXPIRATION_MS,
} from './types';

// ============================================
// TRUST TIER THRESHOLDS
// ============================================

/**
 * Trust score thresholds for tier assignment
 * Updated to match specification: green >= 80, yellow >= 60
 */
export const TrustTierThresholds = {
  GREEN_MIN: 80,    // >= 80 = green
  YELLOW_MIN: 60,   // >= 60 = yellow
  // < 60 = red
} as const;

// ============================================
// LEGACY WEIGHTS (for backward compatibility)
// ============================================

export const TrustScoreWeights = {
  // Positive events
  VERIFICATION_PHONE: +5,
  VERIFICATION_PHOTO: +10,
  SESSION_COMPLETED: +1,
  SESSION_CREATED_SUCCESS: +3,
  POSITIVE_RATING: +1,
  CHECK_IN_SUCCESS: +1,

  // Negative events
  NO_SHOW: -5,
  CHECK_IN_FAIL: -10,
  REPORT_CONFIRMED: -15,
  ACCOUNT_WARNING: -20,
  NEGATIVE_RATING: -2,
  SESSION_CANCELLED_LAST_MINUTE: -5,

  // Severe events (legacy)
  HARASSMENT_CONFIRMED: -50,
  SPAM_CONFIRMED: -30,
  FAKE_PROFILE_CONFIRMED: -100,
} as const;

// ============================================
// TRUST CALCULATION RESULT
// ============================================

export interface TrustCalculationResult {
  score: number;
  tier: TrustTier;
  breakdown: {
    base: number;
    sessionCompletedBonus: number;
    accountAgeBonus: number;
    noReportsBonus: number;
    verificationBonus: number;
    noShowPenalty: number;
    checkInFailPenalty: number;
    reportConfirmedPenalty: number;
    accountWarningPenalty: number;
  };
  activeEvents: number;
  expiredEventsIgnored: number;
}

// ============================================
// USER DATA FOR TRUST CALCULATION
// ============================================

interface UserTrustData {
  id: string;
  verification_level: VerificationLevel;
  created_at: string;
}

// ============================================
// TRUST ENGINE CLASS
// ============================================

export class TrustEngine {
  private supabase: ReturnType<typeof createClient> | null = null;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
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
  // MAIN RECALCULATION METHOD
  // ============================================

  /**
   * Recalculate trust score for a user based on their SafetyEvents
   *
   * This is the ONLY way to update a user's trust score.
   * The score is computed from scratch each time.
   */
  async recalculate(userId: string): Promise<TrustCalculationResult> {
    // Fetch user data and events
    const [userData, events] = await Promise.all([
      this.fetchUserData(userId),
      this.fetchUserEvents(userId),
    ]);

    // Calculate using pure function
    const result = this.calculateScore(userData, events);

    // Update user's trust score and tier in database
    await this.updateUserTrustScore(userId, result.score, result.tier);

    return result;
  }

  /**
   * Pure function to calculate trust score from data
   * Can be called directly for testing without DB
   */
  calculateScore(
    userData: UserTrustData | null,
    events: SafetyEvent[]
  ): TrustCalculationResult {
    const now = new Date();

    // Filter active events (not expired)
    const activeEvents: SafetyEvent[] = [];
    let expiredCount = 0;

    for (const event of events) {
      if (this.isEventActive(event, now)) {
        activeEvents.push(event);
      } else {
        expiredCount++;
      }
    }

    // Initialize breakdown
    const breakdown = {
      base: 50,
      sessionCompletedBonus: 0,
      accountAgeBonus: 0,
      noReportsBonus: 0,
      verificationBonus: 0,
      noShowPenalty: 0,
      checkInFailPenalty: 0,
      reportConfirmedPenalty: 0,
      accountWarningPenalty: 0,
    };

    // Count events by type
    let sessionCompletedCount = 0;
    let noShowCount = 0;
    let checkInFailCount = 0;
    let reportConfirmedCount = 0;
    let accountWarningCount = 0;

    for (const event of activeEvents) {
      switch (event.type) {
        case 'session_completed':
          sessionCompletedCount++;
          break;
        case 'no_show':
          noShowCount++;
          break;
        case 'check_in_fail':
          checkInFailCount++;
          break;
        case 'report_confirmed':
          reportConfirmedCount++;
          break;
        case 'account_warning':
          accountWarningCount++;
          break;
      }
    }

    // Calculate bonuses
    // +1 per session_completed (max 30)
    breakdown.sessionCompletedBonus = Math.min(
      sessionCompletedCount * EventWeights.session_completed,
      30
    );

    // +10 if account age > 90 days
    if (userData?.created_at) {
      const accountAge = now.getTime() - new Date(userData.created_at).getTime();
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      if (accountAge >= ninetyDaysMs) {
        breakdown.accountAgeBonus = 10;
      }
    }

    // +10 if no active report_confirmed
    if (reportConfirmedCount === 0) {
      breakdown.noReportsBonus = 10;
    }

    // +10 if verificationLevel === 'advanced'
    if (userData?.verification_level === 'advanced') {
      breakdown.verificationBonus = 10;
    }

    // Calculate penalties
    breakdown.noShowPenalty = noShowCount * Math.abs(EventWeights.no_show);
    breakdown.checkInFailPenalty = checkInFailCount * Math.abs(EventWeights.check_in_fail);
    breakdown.reportConfirmedPenalty = reportConfirmedCount * Math.abs(EventWeights.report_confirmed);
    breakdown.accountWarningPenalty = accountWarningCount * Math.abs(EventWeights.account_warning);

    // Calculate total score
    const totalBonus =
      breakdown.sessionCompletedBonus +
      breakdown.accountAgeBonus +
      breakdown.noReportsBonus +
      breakdown.verificationBonus;

    const totalPenalty =
      breakdown.noShowPenalty +
      breakdown.checkInFailPenalty +
      breakdown.reportConfirmedPenalty +
      breakdown.accountWarningPenalty;

    // Score = base + bonuses - penalties, clamped to 0-100
    const rawScore = breakdown.base + totalBonus - totalPenalty;
    const score = Math.max(0, Math.min(100, rawScore));

    // Determine tier
    const tier = this.calculateTier(score);

    return {
      score,
      tier,
      breakdown,
      activeEvents: activeEvents.length,
      expiredEventsIgnored: expiredCount,
    };
  }

  /**
   * Check if an event is still active (not expired)
   */
  isEventActive(event: SafetyEvent, now: Date = new Date()): boolean {
    // If event has explicit expiration, use it
    if (event.expires_at) {
      return new Date(event.expires_at) > now;
    }

    // Negative events expire after 6 months by default
    const negativeTypes: SafetyEventType[] = [
      'no_show',
      'check_in_fail',
      'report_confirmed',
      'account_warning',
    ];

    if (negativeTypes.includes(event.type)) {
      const eventDate = new Date(event.created_at);
      const expirationDate = new Date(eventDate.getTime() + NEGATIVE_EVENT_EXPIRATION_MS);
      return expirationDate > now;
    }

    // Positive events never expire
    return true;
  }

  /**
   * Calculate trust tier from trust score
   */
  calculateTier(trustScore: number): TrustTier {
    if (trustScore >= TrustTierThresholds.GREEN_MIN) {
      return 'green';
    }
    if (trustScore >= TrustTierThresholds.YELLOW_MIN) {
      return 'yellow';
    }
    return 'red';
  }

  // ============================================
  // STATIC HELPER FOR TIER CALCULATION
  // ============================================

  /**
   * Static method for calculating tier (backward compatible)
   */
  static calculateTier(trustScore: number): TrustTier {
    if (trustScore >= TrustTierThresholds.GREEN_MIN) {
      return 'green';
    }
    if (trustScore >= TrustTierThresholds.YELLOW_MIN) {
      return 'yellow';
    }
    return 'red';
  }

  // ============================================
  // EVENT CREATION HELPER
  // ============================================

  /**
   * Create a safety event and trigger recalculation
   * Returns the new trust calculation result
   */
  async logEventAndRecalculate(
    userId: string,
    type: SafetyEventType,
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      created_by?: string;
    }
  ): Promise<TrustCalculationResult> {
    // Create the event
    await this.createSafetyEvent(userId, type, options);

    // Recalculate trust score
    return this.recalculate(userId);
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  /**
   * Fetch user data for trust calculation
   */
  private async fetchUserData(userId: string): Promise<UserTrustData | null> {
    if (!this.supabase) {
      // Mock data for testing
      return {
        id: userId,
        verification_level: 'basic',
        created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, verification_level, created_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching user data:', error);
        return null;
      }

      const record = data as Record<string, unknown>;
      return {
        id: record.id as string,
        verification_level: (record.verification_level as VerificationLevel) || 'none',
        created_at: record.created_at as string,
      };
    } catch (err) {
      console.error('Error in fetchUserData:', err);
      return null;
    }
  }

  /**
   * Fetch all safety events for a user
   */
  private async fetchUserEvents(userId: string): Promise<SafetyEvent[]> {
    if (!this.supabase) {
      // Return empty for testing (tests will provide mock events)
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('safety_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching safety events:', error);
        return [];
      }

      return (data || []) as SafetyEvent[];
    } catch (err) {
      console.error('Error in fetchUserEvents:', err);
      return [];
    }
  }

  /**
   * Update user's trust score and tier in database
   */
  private async updateUserTrustScore(
    userId: string,
    score: number,
    tier: TrustTier
  ): Promise<void> {
    if (!this.supabase) {
      console.log(`[Mock] Updating user ${userId} trust: score=${score}, tier=${tier}`);
      return;
    }

    try {
      // Note: Using 'as unknown as' to work around Supabase generated types
      // The actual table may not have these columns yet until migration runs
      const { error } = await (this.supabase
        .from('profiles') as unknown as {
          update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> }
        })
        .update({
          trust_score: score,
          trust_tier: tier,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating trust score:', error);
      }
    } catch (err) {
      console.error('Error in updateUserTrustScore:', err);
    }
  }

  /**
   * Create a new safety event
   */
  private async createSafetyEvent(
    userId: string,
    type: SafetyEventType,
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      created_by?: string;
    }
  ): Promise<SafetyEvent | null> {
    // Determine weight
    const weight = this.getEventWeight(type);

    // Determine expiration for negative events
    let expires_at: string | undefined;
    const negativeTypes: SafetyEventType[] = [
      'no_show',
      'check_in_fail',
      'report_confirmed',
      'account_warning',
    ];
    if (negativeTypes.includes(type)) {
      expires_at = new Date(Date.now() + NEGATIVE_EVENT_EXPIRATION_MS).toISOString();
    }

    // Determine severity based on weight
    const severity = this.getEventSeverity(type);

    const eventData = {
      user_id: userId,
      type,
      severity,
      weight,
      description: options?.description,
      metadata: options?.metadata,
      created_by: options?.created_by,
      created_at: new Date().toISOString(),
      expires_at,
    };

    if (!this.supabase) {
      console.log(`[Mock] Creating safety event:`, eventData);
      return {
        id: `mock-event-${Date.now()}`,
        ...eventData,
      } as SafetyEvent;
    }

    try {
      // Note: Using 'as unknown as' to work around Supabase generated types
      // The safety_events table may not exist until migration runs
      const { data, error } = await (this.supabase
        .from('safety_events') as unknown as {
          insert: (data: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } }
        })
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error('Error creating safety event:', error);
        return null;
      }

      return data as SafetyEvent;
    } catch (err) {
      console.error('Error in createSafetyEvent:', err);
      return null;
    }
  }

  /**
   * Get the weight for an event type
   */
  private getEventWeight(type: SafetyEventType): number {
    switch (type) {
      case 'session_completed':
        return EventWeights.session_completed;
      case 'no_show':
        return EventWeights.no_show;
      case 'check_in_fail':
        return EventWeights.check_in_fail;
      case 'report_confirmed':
        return EventWeights.report_confirmed;
      case 'account_warning':
        return EventWeights.account_warning;
      case 'verification_advanced':
        return EventWeights.verification_advanced;
      default:
        return 0;
    }
  }

  /**
   * Get severity for an event type
   */
  private getEventSeverity(type: SafetyEventType): 1 | 2 | 3 | 4 | 5 {
    switch (type) {
      case 'session_completed':
        return 1;
      case 'verification_advanced':
        return 1;
      case 'no_show':
        return 2;
      case 'check_in_fail':
        return 3;
      case 'report_confirmed':
        return 4;
      case 'account_warning':
        return 5;
      default:
        return 1;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let trustEngineInstance: TrustEngine | null = null;

/**
 * Get the TrustEngine singleton instance
 */
export function getTrustEngine(): TrustEngine {
  if (!trustEngineInstance) {
    trustEngineInstance = new TrustEngine(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return trustEngineInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetTrustEngine(): void {
  trustEngineInstance = null;
}
