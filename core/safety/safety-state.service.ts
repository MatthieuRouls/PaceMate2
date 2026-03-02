/**
 * Safety State Service - State Machine Implementation
 *
 * Manages user safety state transitions with strict rules.
 *
 * SECURITY:
 * - All transitions logged
 * - No public exposure of state details
 * - Neutral messaging to users
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  SafetyState,
  SafetyStateHistory,
  StateChangeReason,
  UserSafetyProfile,
  StateTransitionRules,
  StateCapabilities,
  StateCapabilitySet,
  TransitionEvaluationInput,
  TransitionEvaluationResult,
  ApplyTransitionInput,
  ApplyTransitionResult,
  PublicUserSafetyStatus,
  SafetyStateMessages,
  AdminSafetyView,
  SafetyMetrics,
  AdminRecommendation,
  AdminTransitionInput,
  createDefaultSafetyProfile,
} from './safety-state.types';

// ============================================
// VALID TRANSITIONS MAP
// ============================================

const VALID_TRANSITIONS: Record<SafetyState, SafetyState[]> = {
  normal: ['monitored'],
  monitored: ['normal', 'restricted'],
  restricted: ['normal', 'suspended'],
  suspended: ['restricted'], // Admin only
};

// ============================================
// SAFETY STATE SERVICE
// ============================================

export class SafetyStateService {
  private supabase: ReturnType<typeof createClient> | null = null;

  // In-memory stores
  private profiles: Map<string, UserSafetyProfile> = new Map();
  private history: Map<string, SafetyStateHistory[]> = new Map();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  async getProfile(userId: string): Promise<UserSafetyProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async getOrCreateProfile(userId: string): Promise<UserSafetyProfile> {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = createDefaultSafetyProfile(userId);
      this.profiles.set(userId, profile);
      await this.logHistoryEntry(userId, 'normal', 'normal', 'initial_state', 'system');
    }
    return profile;
  }

  async updateProfile(profile: UserSafetyProfile): Promise<void> {
    profile.updated_at = new Date().toISOString();
    this.profiles.set(profile.user_id, profile);
  }

  // ============================================
  // STATE TRANSITION EVALUATION
  // ============================================

  /**
   * Evaluate if a user should transition to a new state
   * Called by cron job or after significant events
   */
  evaluateTransition(input: TransitionEvaluationInput): TransitionEvaluationResult {
    const { current_state } = input;

    // Check escalations first
    const escalation = this.checkEscalation(input);
    if (escalation.should_transition) {
      return escalation;
    }

    // Then check de-escalations (rehabilitation)
    const deescalation = this.checkDeescalation(input);
    if (deescalation.should_transition) {
      return deescalation;
    }

    return {
      should_transition: false,
      confidence: 1.0,
    };
  }

  /**
   * Check if user should be escalated to higher risk state
   */
  private checkEscalation(input: TransitionEvaluationInput): TransitionEvaluationResult {
    const {
      current_state,
      negative_feedbacks_count,
      incidents_count,
      high_risk_evaluations_count,
      has_serious_incident,
    } = input;

    // NORMAL → MONITORED
    if (current_state === 'normal') {
      if (negative_feedbacks_count >= StateTransitionRules.NEGATIVE_FEEDBACKS_FOR_MONITORING) {
        return {
          should_transition: true,
          new_state: 'monitored',
          reason: 'multiple_negative_feedbacks',
          reason_details: `${negative_feedbacks_count} negative feedbacks in the last ${StateTransitionRules.FEEDBACK_WINDOW_DAYS} days`,
          confidence: 0.9,
        };
      }
    }

    // MONITORED → RESTRICTED
    if (current_state === 'monitored') {
      if (incidents_count >= StateTransitionRules.INCIDENTS_FOR_RESTRICTION) {
        return {
          should_transition: true,
          new_state: 'restricted',
          reason: 'repeated_incidents',
          reason_details: `${incidents_count} incidents in the last ${StateTransitionRules.INCIDENT_WINDOW_DAYS} days`,
          confidence: 0.95,
        };
      }

      if (high_risk_evaluations_count >= StateTransitionRules.HIGH_RISK_EVALUATIONS_FOR_RESTRICTION) {
        return {
          should_transition: true,
          new_state: 'restricted',
          reason: 'high_risk_score_repeated',
          reason_details: `${high_risk_evaluations_count} high-risk evaluations in the last ${StateTransitionRules.HIGH_RISK_WINDOW_DAYS} days`,
          confidence: 0.85,
        };
      }
    }

    // RESTRICTED → SUSPENDED
    if (current_state === 'restricted') {
      if (has_serious_incident) {
        return {
          should_transition: true,
          new_state: 'suspended',
          reason: 'confirmed_serious_incident',
          reason_details: 'Confirmed serious safety incident',
          confidence: 1.0,
        };
      }
    }

    return { should_transition: false, confidence: 1.0 };
  }

  /**
   * Check if user is eligible for de-escalation (rehabilitation)
   */
  private checkDeescalation(input: TransitionEvaluationInput): TransitionEvaluationResult {
    const {
      current_state,
      consecutive_clean_days,
      incidents_count,
      negative_feedbacks_count,
    } = input;

    // RESTRICTED → NORMAL (30 days without issue)
    if (current_state === 'restricted') {
      if (
        consecutive_clean_days >= StateTransitionRules.REHABILITATION_DAYS &&
        incidents_count === 0 &&
        negative_feedbacks_count === 0
      ) {
        return {
          should_transition: true,
          new_state: 'normal',
          reason: 'rehabilitation_period_complete',
          reason_details: `${consecutive_clean_days} consecutive days without issues`,
          confidence: 0.9,
        };
      }
    }

    // MONITORED → NORMAL (14 days without issue)
    if (current_state === 'monitored') {
      if (
        consecutive_clean_days >= StateTransitionRules.CLEAN_DAYS_FOR_MONITORED_TO_NORMAL &&
        incidents_count === 0 &&
        negative_feedbacks_count === 0
      ) {
        return {
          should_transition: true,
          new_state: 'normal',
          reason: 'rehabilitation_period_complete',
          reason_details: `${consecutive_clean_days} consecutive days without issues`,
          confidence: 0.85,
        };
      }
    }

    return { should_transition: false, confidence: 1.0 };
  }

  // ============================================
  // TRANSITION APPLICATION
  // ============================================

  /**
   * Validate if a transition is allowed
   */
  isValidTransition(fromState: SafetyState, toState: SafetyState): boolean {
    const validTargets = VALID_TRANSITIONS[fromState];
    return validTargets.includes(toState);
  }

  /**
   * Apply a state transition
   */
  async applyTransition(input: ApplyTransitionInput): Promise<ApplyTransitionResult> {
    const profile = await this.getOrCreateProfile(input.user_id);
    const previousState = profile.safety_state;

    // Validate transition
    if (previousState === input.new_state) {
      return {
        success: false,
        previous_state: previousState,
        new_state: input.new_state,
        capabilities: StateCapabilities[previousState],
        error: 'User is already in this state',
      };
    }

    // Admin can force any transition, others must follow rules
    if (input.triggered_by !== 'admin' && !this.isValidTransition(previousState, input.new_state)) {
      return {
        success: false,
        previous_state: previousState,
        new_state: input.new_state,
        capabilities: StateCapabilities[previousState],
        error: `Invalid transition from ${previousState} to ${input.new_state}`,
      };
    }

    // Update profile
    const now = new Date().toISOString();
    profile.safety_state = input.new_state;
    profile.state_changed_at = now;
    profile.updated_at = now;

    // Set state-specific timestamps
    switch (input.new_state) {
      case 'monitored':
        profile.monitoring_start_at = now;
        break;
      case 'restricted':
        profile.restriction_start_at = now;
        profile.rehabilitation_eligible_at = new Date(
          Date.now() + StateTransitionRules.REHABILITATION_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
        break;
      case 'suspended':
        profile.suspension_start_at = now;
        break;
      case 'normal':
        profile.consecutive_clean_days = 0;
        profile.monitoring_start_at = undefined;
        profile.restriction_start_at = undefined;
        profile.rehabilitation_eligible_at = undefined;
        break;
    }

    await this.updateProfile(profile);

    // Log history
    const historyId = await this.logHistoryEntry(
      input.user_id,
      previousState,
      input.new_state,
      input.reason,
      input.triggered_by,
      input.reason_details,
      input.related_entity_id
    );

    console.log(`[SafetyState] Transition: ${input.user_id} ${previousState} -> ${input.new_state} (${input.reason})`);

    return {
      success: true,
      history_id: historyId,
      previous_state: previousState,
      new_state: input.new_state,
      capabilities: StateCapabilities[input.new_state],
    };
  }

  // ============================================
  // CAPABILITY CHECKS
  // ============================================

  /**
   * Get capabilities for a user's current state
   */
  async getCapabilities(userId: string): Promise<StateCapabilitySet> {
    const profile = await this.getOrCreateProfile(userId);
    return StateCapabilities[profile.safety_state];
  }

  /**
   * Check if user can perform a specific action
   */
  async canPerformAction(
    userId: string,
    action: 'join_session' | 'host_session' | 'create_1on1' | 'message_first'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const capabilities = await this.getCapabilities(userId);

    switch (action) {
      case 'join_session':
        return {
          allowed: capabilities.can_join_sessions,
          reason: capabilities.can_join_sessions ? undefined : 'Action non disponible pour votre compte.',
        };
      case 'host_session':
        return {
          allowed: capabilities.can_host_sessions,
          reason: capabilities.can_host_sessions ? undefined : 'L\'organisation de sessions n\'est pas disponible.',
        };
      case 'create_1on1':
        return {
          allowed: capabilities.can_create_1on1,
          reason: capabilities.can_create_1on1 ? undefined : 'Les sessions privees ne sont pas disponibles.',
        };
      case 'message_first':
        return {
          allowed: capabilities.can_message_first,
          reason: capabilities.can_message_first ? undefined : 'Envoi de messages limite.',
        };
      default:
        return { allowed: false, reason: 'Action inconnue.' };
    }
  }

  // ============================================
  // PUBLIC API (SAFE)
  // ============================================

  /**
   * Get public-safe status for a user
   * NEVER reveals internal state
   */
  async getPublicStatus(userId: string): Promise<PublicUserSafetyStatus> {
    const profile = await this.getOrCreateProfile(userId);
    return SafetyStateMessages[profile.safety_state];
  }

  // ============================================
  // ADMIN API
  // ============================================

  /**
   * Get full safety view for admins
   */
  async getAdminView(userId: string): Promise<AdminSafetyView | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const userHistory = this.history.get(userId) || [];
    const capabilities = StateCapabilities[profile.safety_state];

    // Mock metrics - would be calculated from actual data
    const metrics: SafetyMetrics = {
      total_sessions: 0,
      sessions_as_host: 0,
      positive_feedbacks: 0,
      negative_feedbacks: 0,
      incidents_total: 0,
      incidents_confirmed: 0,
      high_risk_evaluations: 0,
      days_in_current_state: this.daysSince(profile.state_changed_at),
    };

    const recommendations = this.generateRecommendations(profile, metrics);

    return {
      user_id: userId,
      profile,
      history: userHistory,
      capabilities,
      metrics,
      recommendations,
    };
  }

  /**
   * Admin-triggered state transition
   */
  async adminTransition(input: AdminTransitionInput): Promise<ApplyTransitionResult> {
    return this.applyTransition({
      user_id: input.user_id,
      new_state: input.new_state,
      reason: 'admin_action',
      reason_details: `Admin ${input.admin_id}: ${input.reason}`,
      triggered_by: 'admin',
    });
  }

  /**
   * Generate recommendations for admin review
   */
  private generateRecommendations(
    profile: UserSafetyProfile,
    metrics: SafetyMetrics
  ): AdminRecommendation[] {
    const recommendations: AdminRecommendation[] = [];

    // Check for escalation
    if (profile.safety_state === 'normal' && metrics.negative_feedbacks >= 2) {
      recommendations.push({
        action: 'escalate',
        reason: 'Approaching negative feedback threshold',
        confidence: 0.7,
      });
    }

    // Check for de-escalation eligibility
    if (profile.safety_state === 'restricted') {
      const daysInState = this.daysSince(profile.state_changed_at);
      if (daysInState >= StateTransitionRules.REHABILITATION_DAYS - 5) {
        recommendations.push({
          action: 'review',
          reason: 'Approaching rehabilitation eligibility',
          confidence: 0.8,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        action: 'no_action',
        reason: 'No concerns at this time',
        confidence: 0.9,
      });
    }

    return recommendations;
  }

  // ============================================
  // HISTORY LOGGING
  // ============================================

  private async logHistoryEntry(
    userId: string,
    previousState: SafetyState,
    newState: SafetyState,
    reason: StateChangeReason,
    triggeredBy: 'system' | 'cron' | 'admin' | 'incident',
    reasonDetails?: string,
    relatedEntityId?: string
  ): Promise<string> {
    const entry: SafetyStateHistory = {
      id: this.generateId('ssh'),
      user_id: userId,
      previous_state: previousState,
      new_state: newState,
      reason,
      reason_details: reasonDetails,
      triggered_by: triggeredBy,
      related_entity_id: relatedEntityId,
      created_at: new Date().toISOString(),
    };

    const userHistory = this.history.get(userId) || [];
    userHistory.push(entry);
    this.history.set(userId, userHistory);

    console.log(`[Audit] safety_state_change ${userId}`, {
      history_id: entry.id,
      from: previousState,
      to: newState,
      reason,
      triggered_by: triggeredBy,
    });

    return entry.id;
  }

  /**
   * Get history for a user
   */
  async getHistory(userId: string): Promise<SafetyStateHistory[]> {
    return this.history.get(userId) || [];
  }

  // ============================================
  // CLEAN DAYS TRACKING
  // ============================================

  /**
   * Increment clean days counter (called daily)
   */
  async incrementCleanDays(userId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.safety_state === 'monitored' || profile.safety_state === 'restricted') {
      profile.consecutive_clean_days++;
      await this.updateProfile(profile);
    }
  }

  /**
   * Reset clean days counter (called on incident/negative feedback)
   */
  async resetCleanDays(userId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    profile.consecutive_clean_days = 0;
    await this.updateProfile(profile);
  }

  // ============================================
  // HELPERS
  // ============================================

  private daysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
    this.profiles.clear();
    this.history.clear();
  }

  getProfileCount(): number {
    return this.profiles.size;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let serviceInstance: SafetyStateService | null = null;

export function getSafetyStateService(): SafetyStateService {
  if (!serviceInstance) {
    serviceInstance = new SafetyStateService();
  }
  return serviceInstance;
}

export function resetSafetyStateService(): void {
  serviceInstance = null;
}
