/**
 * Intelligent Matching & Risk-Aware Join Logic Service
 *
 * Evaluates join requests using multi-factor risk scoring.
 *
 * PRIVACY RULES:
 * - Never expose numeric risk scores to users
 * - Use neutral rejection messages
 * - Log all evaluations for audit
 * - Trigger internal review after repeated high-risk attempts
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  JoinRiskEvaluation,
  JoinDecision,
  RiskLevel,
  ReviewTrigger,
  RiskThresholds,
  RiskWeights,
  IncidentWeights,
  ContextualRiskFactors,
  ReviewConfig,
  RiskEvaluationInput,
  RiskEvaluationResult,
  PublicJoinResponse,
  NeutralMessages,
  RiskBreakdown,
  AdminEvaluationView,
  InternalReviewRequest,
  HighRiskAttemptLog,
  IncidentData,
  SessionContext,
  DEFAULT_INCIDENT_DATA,
  DEFAULT_SESSION_CONTEXT,
} from './matching.types';

// ============================================
// RISK EVALUATION SERVICE
// ============================================

export class RiskEvaluationService {
  private supabase: ReturnType<typeof createClient> | null = null;

  // In-memory stores for testing/caching
  private evaluationCache: Map<string, JoinRiskEvaluation> = new Map();
  private highRiskAttempts: Map<string, HighRiskAttemptLog> = new Map();
  private reviewQueue: Map<string, InternalReviewRequest> = new Map();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  // ============================================
  // MAIN EVALUATION METHOD
  // ============================================

  /**
   * Evaluate a join request and return decision
   * This is the main entry point for risk evaluation
   */
  async evaluateJoinRequest(input: RiskEvaluationInput): Promise<RiskEvaluationResult> {
    const evaluationId = this.generateId('eval');

    try {
      // Calculate risk components
      const hostTrustComponent = this.calculateHostTrustRisk(input.host_trust_score);
      const requesterTrustComponent = this.calculateRequesterTrustRisk(input.requester_trust_score);
      const incidentComponent = this.calculateIncidentRisk(
        input.requester_incidents,
        input.host_incidents
      );
      const contextualComponent = this.calculateContextualRisk(input.session_context);

      // Calculate total risk score
      const riskScore = this.calculateTotalRisk(
        hostTrustComponent,
        requesterTrustComponent,
        incidentComponent,
        contextualComponent
      );

      // Determine decision based on thresholds
      const decision = this.determineDecision(riskScore);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Check for restricted status override
      const finalDecision = this.applyStatusOverrides(
        decision,
        input.host_trust_score,
        input.requester_trust_score
      );

      // Build factors list
      const factors = this.buildFactorsList(input, riskScore);

      // Check if internal review should be triggered
      const reviewInfo = await this.checkReviewTrigger(
        input.requester_id,
        riskScore,
        finalDecision
      );

      // Create evaluation record
      const evaluation: JoinRiskEvaluation = {
        id: evaluationId,
        session_id: input.session_id,
        requester_id: input.requester_id,
        host_id: input.host_id,
        risk_score: riskScore,
        decision: finalDecision,
        risk_level: riskLevel,
        created_at: new Date().toISOString(),
        host_trust_score: input.host_trust_score,
        requester_trust_score: input.requester_trust_score,
        recent_incidents_weight: incidentComponent,
        contextual_risk: contextualComponent,
        factors_applied: factors,
        review_triggered: reviewInfo.triggered,
        review_reason: reviewInfo.reason,
      };

      // Save evaluation
      await this.saveEvaluation(evaluation);

      // Log for audit
      this.logEvaluation(evaluation);

      // Track high-risk attempts
      if (finalDecision === 'blocked' || finalDecision === 'verification_required') {
        await this.trackHighRiskAttempt(input.requester_id, evaluation);
      }

      // Return result
      return this.buildResult(evaluation);
    } catch (error) {
      console.error('[RiskEvaluation] Evaluation failed:', error);
      return {
        success: false,
        evaluation_id: evaluationId,
        decision: 'blocked',
        can_join: false,
        requires_action: false,
        message: NeutralMessages.GENERIC_UNAVAILABLE,
      };
    }
  }

  // ============================================
  // RISK CALCULATION METHODS
  // ============================================

  /**
   * Calculate host trust risk component
   * Higher trust = lower risk
   */
  calculateHostTrustRisk(hostTrustScore: number): number {
    const clampedScore = Math.max(0, Math.min(100, hostTrustScore));
    return (100 - clampedScore) * RiskWeights.HOST_TRUST;
  }

  /**
   * Calculate requester trust risk component
   * Higher trust = lower risk
   */
  calculateRequesterTrustRisk(requesterTrustScore: number): number {
    const clampedScore = Math.max(0, Math.min(100, requesterTrustScore));
    return (100 - clampedScore) * RiskWeights.REQUESTER_TRUST;
  }

  /**
   * Calculate incident-based risk component
   * Combines incidents from both requester and host
   */
  calculateIncidentRisk(
    requesterIncidents: IncidentData,
    hostIncidents: IncidentData
  ): number {
    // Weight requester incidents more heavily
    const requesterWeight = 0.7;
    const hostWeight = 0.3;

    const requesterScore = this.calculateIncidentScore(requesterIncidents);
    const hostScore = this.calculateIncidentScore(hostIncidents);

    const combinedScore = (requesterScore * requesterWeight) + (hostScore * hostWeight);
    const cappedScore = Math.min(combinedScore, IncidentWeights.MAX_INCIDENT_SCORE);

    return cappedScore * RiskWeights.RECENT_INCIDENTS;
  }

  /**
   * Calculate incident score for a single user
   */
  private calculateIncidentScore(incidents: IncidentData): number {
    let score = 0;

    score += incidents.confirmed_incidents * IncidentWeights.CONFIRMED_INCIDENT;
    score += incidents.pending_reports * IncidentWeights.PENDING_REPORT;
    score += incidents.recent_negative_feedback * IncidentWeights.RECENT_NEGATIVE_FEEDBACK;

    // Recent incidents are weighted more heavily
    if (incidents.last_incident_at) {
      const daysSinceIncident = this.daysSince(incidents.last_incident_at);
      if (daysSinceIncident < 7) {
        score *= 1.5; // 50% penalty for recent incidents
      } else if (daysSinceIncident < 30) {
        score *= 1.2; // 20% penalty for somewhat recent
      }
    }

    return Math.min(score, IncidentWeights.MAX_INCIDENT_SCORE);
  }

  /**
   * Calculate contextual risk based on session details
   */
  calculateContextualRisk(context: SessionContext): number {
    let score = 0;
    const factors: string[] = [];

    // Time-based risk
    if (context.is_night_session || this.isNightSession(context.scheduled_time)) {
      score += ContextualRiskFactors.NIGHT_SESSION;
      factors.push('night_session');
    }

    // First-time pair risk
    if (context.is_first_time_pair) {
      score += ContextualRiskFactors.FIRST_TIME_PAIR;
      factors.push('first_time_pair');
    }

    // Location-based risk
    if (context.location_type === 'remote') {
      score += ContextualRiskFactors.REMOTE_LOCATION;
      factors.push('remote_location');
    } else if (context.location_type === 'verified_venue') {
      score += ContextualRiskFactors.VERIFIED_VENUE; // Negative = reduces risk
      factors.push('verified_venue');
    }

    // Group size (larger groups are safer)
    if (context.group_size >= 4) {
      score += ContextualRiskFactors.LARGE_GROUP; // Negative = reduces risk
      factors.push('large_group');
    }

    // Workout intensity
    if (context.workout_intensity === 'high') {
      score += ContextualRiskFactors.HIGH_INTENSITY;
      factors.push('high_intensity');
    }

    // Clamp to 0-100 range
    const clampedScore = Math.max(0, Math.min(100, score));

    return clampedScore * RiskWeights.CONTEXTUAL_RISK;
  }

  /**
   * Calculate total risk score from all components
   */
  calculateTotalRisk(
    hostTrust: number,
    requesterTrust: number,
    incidents: number,
    contextual: number
  ): number {
    const total = hostTrust + requesterTrust + incidents + contextual;
    // Clamp to 0-100
    return Math.max(0, Math.min(100, total));
  }

  // ============================================
  // DECISION LOGIC
  // ============================================

  /**
   * Determine decision based on risk score
   */
  determineDecision(riskScore: number): JoinDecision {
    if (riskScore < RiskThresholds.AUTO_ACCEPT_MAX) {
      return 'auto_accept';
    }
    if (riskScore < RiskThresholds.MANUAL_REVIEW_MAX) {
      return 'manual_review';
    }
    if (riskScore < RiskThresholds.VERIFICATION_REQUIRED_MAX) {
      return 'verification_required';
    }
    return 'blocked';
  }

  /**
   * Determine risk level for categorization
   */
  determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 30) return 'low';
    if (riskScore < 60) return 'medium';
    if (riskScore < 80) return 'high';
    return 'critical';
  }

  /**
   * Apply status-based overrides
   * Restricted users are always blocked
   */
  applyStatusOverrides(
    decision: JoinDecision,
    hostTrustScore: number,
    requesterTrustScore: number
  ): JoinDecision {
    // Restricted status threshold (score < 20)
    const RESTRICTED_THRESHOLD = 20;

    // If requester is restricted, always block
    if (requesterTrustScore < RESTRICTED_THRESHOLD) {
      return 'blocked';
    }

    // If host is restricted, require verification at minimum
    if (hostTrustScore < RESTRICTED_THRESHOLD) {
      if (decision === 'auto_accept' || decision === 'manual_review') {
        return 'verification_required';
      }
    }

    return decision;
  }

  // ============================================
  // REVIEW TRIGGER LOGIC
  // ============================================

  /**
   * Check if internal review should be triggered
   */
  private async checkReviewTrigger(
    userId: string,
    riskScore: number,
    decision: JoinDecision
  ): Promise<{ triggered: boolean; reason?: ReviewTrigger }> {
    // High risk evaluation
    if (riskScore >= 70) {
      const attempts = this.highRiskAttempts.get(userId);
      if (attempts && attempts.attempts.length >= ReviewConfig.HIGH_RISK_ATTEMPTS_THRESHOLD - 1) {
        await this.createReviewRequest(userId, 'repeated_blocks');
        return { triggered: true, reason: 'repeated_blocks' };
      }
      return { triggered: true, reason: 'high_risk_evaluation' };
    }

    // Blocked decision
    if (decision === 'blocked') {
      return { triggered: true, reason: 'high_risk_evaluation' };
    }

    return { triggered: false };
  }

  /**
   * Track high-risk attempts for a user
   */
  private async trackHighRiskAttempt(
    userId: string,
    evaluation: JoinRiskEvaluation
  ): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - ReviewConfig.HIGH_RISK_WINDOW_HOURS * 60 * 60 * 1000
    );

    let log = this.highRiskAttempts.get(userId);

    if (!log) {
      log = {
        user_id: userId,
        attempts: [],
        last_attempt_at: now.toISOString(),
      };
    }

    // Filter to only recent attempts
    log.attempts = log.attempts.filter(
      (a) => new Date(a.timestamp) > windowStart
    );

    // Add new attempt
    log.attempts.push({
      evaluation_id: evaluation.id,
      risk_score: evaluation.risk_score,
      decision: evaluation.decision,
      timestamp: now.toISOString(),
    });

    log.last_attempt_at = now.toISOString();

    this.highRiskAttempts.set(userId, log);

    // Check if threshold reached
    if (log.attempts.length >= ReviewConfig.HIGH_RISK_ATTEMPTS_THRESHOLD) {
      await this.createReviewRequest(userId, 'repeated_blocks');
    }

    console.log(`[RiskEvaluation] High-risk attempt tracked: ${userId} (${log.attempts.length} attempts)`);
  }

  /**
   * Create internal review request
   */
  private async createReviewRequest(
    userId: string,
    trigger: ReviewTrigger
  ): Promise<void> {
    const attempts = this.highRiskAttempts.get(userId);

    const request: InternalReviewRequest = {
      evaluation_id: attempts?.attempts[attempts.attempts.length - 1]?.evaluation_id || '',
      requester_id: userId,
      trigger,
      high_risk_count: attempts?.attempts.length || 1,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const reviewId = this.generateId('review');
    this.reviewQueue.set(reviewId, request);

    console.log(`[RiskEvaluation] Internal review triggered: ${userId} - ${trigger}`);

    // In production, would notify admins here
  }

  // ============================================
  // PUBLIC API (SAFE RESPONSES)
  // ============================================

  /**
   * Get public-safe join response
   * NEVER exposes risk scores
   */
  toPublicResponse(result: RiskEvaluationResult): PublicJoinResponse {
    let status: PublicJoinResponse['status'];
    let actionRequired: PublicJoinResponse['action_required'];

    switch (result.decision) {
      case 'auto_accept':
        status = 'accepted';
        break;
      case 'manual_review':
        status = 'pending';
        actionRequired = 'wait_for_approval';
        break;
      case 'verification_required':
        status = 'action_required';
        actionRequired = 'verify_identity';
        break;
      case 'blocked':
      default:
        status = 'unavailable';
        break;
    }

    return {
      can_join: result.can_join,
      status,
      message: result.message,
      action_required: actionRequired,
    };
  }

  // ============================================
  // ADMIN API
  // ============================================

  /**
   * Get detailed evaluation for admin view
   */
  async getAdminEvaluationView(evaluationId: string): Promise<AdminEvaluationView | null> {
    const evaluation = this.evaluationCache.get(evaluationId);

    if (!evaluation) {
      return null;
    }

    const breakdown = this.calculateBreakdown(evaluation);

    return {
      evaluation,
      requester_profile: {
        user_id: evaluation.requester_id,
        trust_status: this.getTrustStatus(evaluation.requester_trust_score),
        verification_level: 'unknown', // Would fetch from user service
        total_runs: 0,
      },
      host_profile: {
        user_id: evaluation.host_id,
        trust_status: this.getTrustStatus(evaluation.host_trust_score),
        verification_level: 'unknown',
        hosted_sessions: 0,
      },
      risk_breakdown: breakdown,
      review_history: [],
    };
  }

  /**
   * Calculate detailed risk breakdown
   */
  private calculateBreakdown(evaluation: JoinRiskEvaluation): RiskBreakdown {
    const hostComponent = this.calculateHostTrustRisk(evaluation.host_trust_score);
    const requesterComponent = this.calculateRequesterTrustRisk(evaluation.requester_trust_score);

    return {
      host_trust_component: hostComponent,
      requester_trust_component: requesterComponent,
      incident_component: evaluation.recent_incidents_weight,
      contextual_component: evaluation.contextual_risk,
      total_raw: hostComponent + requesterComponent + evaluation.recent_incidents_weight + evaluation.contextual_risk,
      total_capped: evaluation.risk_score,
      decision_reason: this.getDecisionReason(evaluation.decision, evaluation.risk_score),
    };
  }

  /**
   * Get pending review requests
   */
  getPendingReviews(): InternalReviewRequest[] {
    return Array.from(this.reviewQueue.values()).filter(
      (r) => r.status === 'pending'
    );
  }

  /**
   * Get high-risk attempts for a user
   */
  getHighRiskAttempts(userId: string): HighRiskAttemptLog | null {
    return this.highRiskAttempts.get(userId) || null;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private buildFactorsList(input: RiskEvaluationInput, riskScore: number): string[] {
    const factors: string[] = [];

    if (input.host_trust_score < 50) factors.push('low_host_trust');
    if (input.requester_trust_score < 50) factors.push('low_requester_trust');
    if (input.requester_incidents.confirmed_incidents > 0) factors.push('requester_incidents');
    if (input.host_incidents.confirmed_incidents > 0) factors.push('host_incidents');
    if (input.session_context.is_first_time_pair) factors.push('first_meeting');
    if (input.session_context.location_type === 'remote') factors.push('remote_location');
    if (this.isNightSession(input.session_context.scheduled_time)) factors.push('night_session');
    if (riskScore >= 70) factors.push('high_overall_risk');

    return factors;
  }

  private buildResult(evaluation: JoinRiskEvaluation): RiskEvaluationResult {
    const canJoin = evaluation.decision === 'auto_accept';
    const requiresAction = evaluation.decision === 'manual_review' ||
                           evaluation.decision === 'verification_required';

    let actionRequired: RiskEvaluationResult['action_required'];
    if (evaluation.decision === 'verification_required') {
      actionRequired = 'verify_identity';
    } else if (evaluation.decision === 'manual_review') {
      actionRequired = 'wait_for_approval';
    } else if (evaluation.decision === 'blocked') {
      actionRequired = 'contact_support';
    }

    return {
      success: true,
      evaluation_id: evaluation.id,
      decision: evaluation.decision,
      can_join: canJoin,
      requires_action: requiresAction,
      action_required: actionRequired,
      message: this.getPublicMessage(evaluation.decision),
      _internal: {
        risk_score: evaluation.risk_score,
        risk_level: evaluation.risk_level,
        factors: evaluation.factors_applied,
        review_triggered: evaluation.review_triggered,
      },
    };
  }

  private getPublicMessage(decision: JoinDecision): string {
    switch (decision) {
      case 'auto_accept':
        return NeutralMessages.AUTO_ACCEPT;
      case 'manual_review':
        return NeutralMessages.MANUAL_REVIEW;
      case 'verification_required':
        return NeutralMessages.VERIFICATION_REQUIRED;
      case 'blocked':
        return NeutralMessages.BLOCKED;
      default:
        return NeutralMessages.GENERIC_UNAVAILABLE;
    }
  }

  private getDecisionReason(decision: JoinDecision, riskScore: number): string {
    switch (decision) {
      case 'auto_accept':
        return `Risk score ${riskScore.toFixed(1)} below auto-accept threshold (${RiskThresholds.AUTO_ACCEPT_MAX})`;
      case 'manual_review':
        return `Risk score ${riskScore.toFixed(1)} requires manual review (${RiskThresholds.AUTO_ACCEPT_MAX}-${RiskThresholds.MANUAL_REVIEW_MAX})`;
      case 'verification_required':
        return `Risk score ${riskScore.toFixed(1)} requires verification (${RiskThresholds.MANUAL_REVIEW_MAX}-${RiskThresholds.VERIFICATION_REQUIRED_MAX})`;
      case 'blocked':
        return `Risk score ${riskScore.toFixed(1)} exceeds block threshold (>${RiskThresholds.VERIFICATION_REQUIRED_MAX})`;
      default:
        return 'Unknown decision';
    }
  }

  private getTrustStatus(score: number): string {
    if (score >= 80) return 'validated';
    if (score >= 50) return 'new';
    if (score >= 20) return 'observed';
    return 'restricted';
  }

  private isNightSession(scheduledTime: string): boolean {
    const hour = new Date(scheduledTime).getHours();
    return hour >= 22 || hour < 6; // 10pm to 6am
  }

  private daysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  // ============================================
  // PERSISTENCE (Mock for now)
  // ============================================

  private async saveEvaluation(evaluation: JoinRiskEvaluation): Promise<void> {
    this.evaluationCache.set(evaluation.id, evaluation);

    if (this.supabase) {
      // Would save to database
      console.log(`[Mock] Saving evaluation: ${evaluation.id}`);
    }
  }

  async getEvaluation(evaluationId: string): Promise<JoinRiskEvaluation | null> {
    return this.evaluationCache.get(evaluationId) || null;
  }

  private logEvaluation(evaluation: JoinRiskEvaluation): void {
    console.log(`[Audit] join_evaluation ${evaluation.requester_id} -> ${evaluation.host_id}`, {
      evaluation_id: evaluation.id,
      decision: evaluation.decision,
      risk_level: evaluation.risk_level,
      factors: evaluation.factors_applied,
    });
  }

  // ============================================
  // UTILITY METHODS FOR TESTING
  // ============================================

  /**
   * Clear all caches (for testing)
   */
  clearCaches(): void {
    this.evaluationCache.clear();
    this.highRiskAttempts.clear();
    this.reviewQueue.clear();
  }

  /**
   * Get evaluation count (for testing)
   */
  getEvaluationCount(): number {
    return this.evaluationCache.size;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let serviceInstance: RiskEvaluationService | null = null;

export function getRiskEvaluationService(): RiskEvaluationService {
  if (!serviceInstance) {
    serviceInstance = new RiskEvaluationService();
  }
  return serviceInstance;
}

export function resetRiskEvaluationService(): void {
  serviceInstance = null;
}
