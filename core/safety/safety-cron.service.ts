/**
 * Safety Cron Service
 *
 * Daily job to:
 * - Recalculate trust scores
 * - Evaluate safety states
 * - Apply transitions
 * - Log SafetyStateHistory
 *
 * SECURITY:
 * - All decisions logged
 * - Runs as system process
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  SafetyState,
  StateTransitionRules,
  CronJobResult,
  CronJobError,
  CronJobSummary,
  DailyEvaluationInput,
  TransitionEvaluationInput,
  RecentFeedbackSummary,
  RecentIncidentSummary,
  RecentRiskSummary,
  UserSafetyProfile,
} from './safety-state.types';
import { SafetyStateService, getSafetyStateService } from './safety-state.service';

// ============================================
// CRON JOB CONFIGURATION
// ============================================

export const CronConfig = {
  BATCH_SIZE: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  JOB_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
} as const;

// ============================================
// SAFETY CRON SERVICE
// ============================================

export class SafetyCronService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private safetyStateService: SafetyStateService;

  // Mock data stores for testing
  private mockFeedbacks: Map<string, RecentFeedbackSummary> = new Map();
  private mockIncidents: Map<string, RecentIncidentSummary> = new Map();
  private mockRiskEvaluations: Map<string, RecentRiskSummary> = new Map();
  private mockTrustScores: Map<string, number> = new Map();
  private mockUserIds: string[] = [];

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.safetyStateService = getSafetyStateService();
  }

  setSafetyStateService(service: SafetyStateService): void {
    this.safetyStateService = service;
  }

  // ============================================
  // MAIN CRON JOB
  // ============================================

  /**
   * Run daily safety evaluation job
   */
  async runDailyEvaluation(): Promise<CronJobResult> {
    const jobId = this.generateId('cron');
    const startedAt = new Date().toISOString();

    console.log(`[SafetyCron] Starting daily evaluation: ${jobId}`);

    const errors: CronJobError[] = [];
    const summary: CronJobSummary = {
      normal_to_monitored: 0,
      monitored_to_restricted: 0,
      restricted_to_suspended: 0,
      restricted_to_normal: 0,
      monitored_to_normal: 0,
      no_change: 0,
    };

    let usersProcessed = 0;
    let transitionsApplied = 0;

    try {
      // Get all users to process
      const userIds = await this.getAllUserIds();

      // Process in batches
      for (let i = 0; i < userIds.length; i += CronConfig.BATCH_SIZE) {
        const batch = userIds.slice(i, i + CronConfig.BATCH_SIZE);

        for (const userId of batch) {
          try {
            const result = await this.processUser(userId);
            usersProcessed++;

            if (result.transitioned) {
              transitionsApplied++;
              this.updateSummary(summary, result.from!, result.to!);
            } else {
              summary.no_change++;
            }
          } catch (error) {
            errors.push({
              user_id: userId,
              error: error instanceof Error ? error.message : 'Unknown error',
              stage: 'evaluate',
            });
          }
        }
      }
    } catch (error) {
      console.error(`[SafetyCron] Job failed:`, error);
    }

    const completedAt = new Date().toISOString();

    const result: CronJobResult = {
      job_id: jobId,
      started_at: startedAt,
      completed_at: completedAt,
      users_processed: usersProcessed,
      transitions_applied: transitionsApplied,
      errors,
      summary,
    };

    console.log(`[SafetyCron] Completed: ${jobId}`, {
      users: usersProcessed,
      transitions: transitionsApplied,
      errors: errors.length,
    });

    return result;
  }

  // ============================================
  // USER PROCESSING
  // ============================================

  /**
   * Process a single user for safety evaluation
   */
  private async processUser(userId: string): Promise<{
    transitioned: boolean;
    from?: SafetyState;
    to?: SafetyState;
  }> {
    // Get or create profile
    const profile = await this.safetyStateService.getOrCreateProfile(userId);

    // Get recent data
    const trustScore = await this.getTrustScore(userId);
    const feedbacks = await this.getRecentFeedbacks(userId);
    const incidents = await this.getRecentIncidents(userId);
    const riskEvaluations = await this.getRecentRiskEvaluations(userId);

    // Build evaluation input
    const evaluationInput: TransitionEvaluationInput = {
      user_id: userId,
      current_state: profile.safety_state,
      trust_score: trustScore,
      negative_feedbacks_count: feedbacks.negative_count,
      incidents_count: incidents.confirmed_count,
      high_risk_evaluations_count: riskEvaluations.high_risk_count,
      has_serious_incident: incidents.serious_count > 0,
      days_since_last_incident: incidents.last_incident_at
        ? this.daysSince(incidents.last_incident_at)
        : undefined,
      consecutive_clean_days: profile.consecutive_clean_days,
    };

    // Evaluate transition
    const evaluation = this.safetyStateService.evaluateTransition(evaluationInput);

    // If no new issues, increment clean days
    if (!evaluation.should_transition && feedbacks.negative_count === 0 && incidents.confirmed_count === 0) {
      await this.safetyStateService.incrementCleanDays(userId);
    }

    // Apply transition if needed
    if (evaluation.should_transition && evaluation.new_state) {
      const transitionResult = await this.safetyStateService.applyTransition({
        user_id: userId,
        new_state: evaluation.new_state,
        reason: evaluation.reason!,
        reason_details: evaluation.reason_details,
        triggered_by: 'cron',
      });

      if (transitionResult.success) {
        return {
          transitioned: true,
          from: transitionResult.previous_state,
          to: transitionResult.new_state,
        };
      }
    }

    return { transitioned: false };
  }

  // ============================================
  // DATA FETCHING (Mock implementations)
  // ============================================

  /**
   * Get all user IDs to process
   */
  private async getAllUserIds(): Promise<string[]> {
    // In production, would query database
    // For testing, return mock user IDs
    return this.mockUserIds;
  }

  /**
   * Get trust score for a user
   */
  private async getTrustScore(userId: string): Promise<number> {
    // In production, would call TrustEngine or ReputationService
    return this.mockTrustScores.get(userId) || 70;
  }

  /**
   * Get recent feedbacks summary
   */
  private async getRecentFeedbacks(userId: string): Promise<RecentFeedbackSummary> {
    // In production, would query feedbacks from last 30 days
    return (
      this.mockFeedbacks.get(userId) || {
        negative_count: 0,
        positive_count: 0,
        total_count: 0,
      }
    );
  }

  /**
   * Get recent incidents summary
   */
  private async getRecentIncidents(userId: string): Promise<RecentIncidentSummary> {
    // In production, would query incidents from last 90 days
    return (
      this.mockIncidents.get(userId) || {
        confirmed_count: 0,
        pending_count: 0,
        serious_count: 0,
      }
    );
  }

  /**
   * Get recent risk evaluations summary
   */
  private async getRecentRiskEvaluations(userId: string): Promise<RecentRiskSummary> {
    // In production, would query evaluations from last 7 days
    return (
      this.mockRiskEvaluations.get(userId) || {
        high_risk_count: 0,
        blocked_count: 0,
      }
    );
  }

  // ============================================
  // TRUST RECALCULATION
  // ============================================

  /**
   * Run trust recalculation for all users
   */
  async runTrustRecalculation(): Promise<{
    users_processed: number;
    scores_updated: number;
    errors: number;
  }> {
    console.log('[SafetyCron] Starting trust recalculation');

    let usersProcessed = 0;
    let scoresUpdated = 0;
    let errors = 0;

    const userIds = await this.getAllUserIds();

    for (const userId of userIds) {
      try {
        // In production, would call ReputationService.recalculateTrust()
        usersProcessed++;
        // Simulate some scores being updated
        if (Math.random() > 0.7) {
          scoresUpdated++;
        }
      } catch (error) {
        errors++;
      }
    }

    console.log('[SafetyCron] Trust recalculation complete', {
      users: usersProcessed,
      updated: scoresUpdated,
      errors,
    });

    return { users_processed: usersProcessed, scores_updated: scoresUpdated, errors };
  }

  // ============================================
  // HELPERS
  // ============================================

  private updateSummary(
    summary: CronJobSummary,
    from: SafetyState,
    to: SafetyState
  ): void {
    const key = `${from}_to_${to}` as keyof CronJobSummary;
    if (key in summary && typeof summary[key] === 'number') {
      (summary as unknown as Record<string, number>)[key]++;
    }
  }

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
  // MOCK DATA SETTERS (For Testing)
  // ============================================

  setMockUserIds(userIds: string[]): void {
    this.mockUserIds = userIds;
  }

  setMockTrustScore(userId: string, score: number): void {
    this.mockTrustScores.set(userId, score);
  }

  setMockFeedbacks(userId: string, feedbacks: RecentFeedbackSummary): void {
    this.mockFeedbacks.set(userId, feedbacks);
  }

  setMockIncidents(userId: string, incidents: RecentIncidentSummary): void {
    this.mockIncidents.set(userId, incidents);
  }

  setMockRiskEvaluations(userId: string, evaluations: RecentRiskSummary): void {
    this.mockRiskEvaluations.set(userId, evaluations);
  }

  clearMockData(): void {
    this.mockUserIds = [];
    this.mockTrustScores.clear();
    this.mockFeedbacks.clear();
    this.mockIncidents.clear();
    this.mockRiskEvaluations.clear();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let serviceInstance: SafetyCronService | null = null;

export function getSafetyCronService(): SafetyCronService {
  if (!serviceInstance) {
    serviceInstance = new SafetyCronService();
  }
  return serviceInstance;
}

export function resetSafetyCronService(): void {
  serviceInstance = null;
}
