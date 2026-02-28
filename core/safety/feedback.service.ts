/**
 * Post-Run Safety Feedback Service
 *
 * Handles feedback collection, trust impact, silent reporting, and moderation.
 *
 * CRITICAL PRIVACY RULES:
 * - NEVER expose reviewer identity to reviewed user
 * - NEVER notify reported users about reports
 * - All moderation actions are logged for audit
 * - Reviewer identity only visible to admins (unless anonymous)
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  SafetyFeedback,
  CreateFeedbackInput,
  PublicFeedbackView,
  FeedbackRating,
  FeedbackFlag,
  MODERATION_TRIGGER_FLAGS,
  SilentReport,
  CreateSilentReportInput,
  UserModerationRecord,
  ModerationQueueItem,
  ModerationActionInput,
  ModerationActionResult,
  ModerationStatus,
  TrustImpactThresholds,
  TrustImpactResult,
  TrustImpactAction,
  AuditLogEntry,
  AuditLogType,
  FeedbackErrorCode,
  FeedbackConfig,
} from './feedback.types';
import { TrustEngine, getTrustEngine } from './trust-engine';
import type { SafetyEventType } from './types';

// ============================================
// FEEDBACK SERVICE
// ============================================

export class FeedbackService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private trustEngine: TrustEngine;

  // In-memory cache for rate limiting
  private feedbackCache: Map<string, SafetyFeedback> = new Map();
  private reportCooldowns: Map<string, Date> = new Map();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.trustEngine = getTrustEngine();
  }

  setSupabaseClient(client: ReturnType<typeof createClient>): void {
    this.supabase = client;
  }

  setTrustEngine(engine: TrustEngine): void {
    this.trustEngine = engine;
  }

  // ============================================
  // FEEDBACK MANAGEMENT
  // ============================================

  /**
   * Create feedback for a session participant
   * One feedback per reviewer per reviewed user per session
   */
  async createFeedback(input: CreateFeedbackInput): Promise<SafetyFeedback | { error: string; code: string }> {
    // Validate: cannot review self
    if (input.reviewer_id === input.reviewed_user_id) {
      return {
        error: 'Vous ne pouvez pas vous evaluer vous-meme',
        code: FeedbackErrorCode.CANNOT_REVIEW_SELF,
      };
    }

    // Check for existing feedback
    const existingKey = this.getFeedbackKey(input.session_id, input.reviewer_id, input.reviewed_user_id);
    if (this.feedbackCache.has(existingKey)) {
      return {
        error: 'Vous avez deja laisse un feedback pour cet utilisateur',
        code: FeedbackErrorCode.FEEDBACK_ALREADY_EXISTS,
      };
    }

    const existing = await this.getExistingFeedback(
      input.session_id,
      input.reviewer_id,
      input.reviewed_user_id
    );
    if (existing) {
      return {
        error: 'Vous avez deja laisse un feedback pour cet utilisateur',
        code: FeedbackErrorCode.FEEDBACK_ALREADY_EXISTS,
      };
    }

    // Validate flags count
    if (input.flags.length > FeedbackConfig.MAX_FLAGS_PER_FEEDBACK) {
      input.flags = input.flags.slice(0, FeedbackConfig.MAX_FLAGS_PER_FEEDBACK);
    }

    // Validate comment length
    if (input.comment && input.comment.length > FeedbackConfig.MAX_COMMENT_LENGTH) {
      input.comment = input.comment.substring(0, FeedbackConfig.MAX_COMMENT_LENGTH);
    }

    // Check if moderation should be triggered
    const shouldTriggerModeration = this.shouldTriggerModeration(input.rating, input.flags);

    // Create feedback
    const feedback: SafetyFeedback = {
      id: this.generateId('fb'),
      session_id: input.session_id,
      reviewer_id: input.reviewer_id,
      reviewed_user_id: input.reviewed_user_id,
      rating: input.rating,
      flags: input.flags,
      comment: input.comment,
      anonymous: input.anonymous ?? false,
      created_at: new Date().toISOString(),
      processed: false,
      moderation_triggered: shouldTriggerModeration,
    };

    // Save feedback
    await this.saveFeedback(feedback);
    this.feedbackCache.set(existingKey, feedback);

    // Log audit
    await this.logAudit({
      type: 'feedback_created',
      actor_id: input.reviewer_id,
      target_user_id: input.reviewed_user_id,
      details: {
        feedback_id: feedback.id,
        session_id: input.session_id,
        rating: input.rating,
        flags_count: input.flags.length,
        moderation_triggered: shouldTriggerModeration,
      },
    });

    // Process trust impact asynchronously
    this.processFeedbackTrustImpact(feedback).catch(err => {
      console.error('Error processing feedback trust impact:', err);
    });

    return feedback;
  }

  /**
   * Get feedback summary for a user (admin only)
   * NEVER expose reviewer identities
   */
  async getUserFeedbackSummary(
    userId: string,
    requesterId: string,
    isAdmin: boolean
  ): Promise<{
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    recent_flags: Record<FeedbackFlag, number>;
  } | null> {
    // Only admins can see feedback summaries
    if (!isAdmin) {
      return null;
    }

    const feedbacks = await this.getFeedbacksForUser(userId);

    const summary = {
      total: feedbacks.length,
      positive: 0,
      neutral: 0,
      negative: 0,
      recent_flags: {} as Record<FeedbackFlag, number>,
    };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const feedback of feedbacks) {
      if (feedback.rating === 'positive') summary.positive++;
      else if (feedback.rating === 'neutral') summary.neutral++;
      else if (feedback.rating === 'negative') summary.negative++;

      // Count recent flags
      if (new Date(feedback.created_at) > thirtyDaysAgo) {
        for (const flag of feedback.flags) {
          summary.recent_flags[flag] = (summary.recent_flags[flag] || 0) + 1;
        }
      }
    }

    return summary;
  }

  /**
   * Check if feedback should trigger moderation
   */
  private shouldTriggerModeration(rating: FeedbackRating, flags: FeedbackFlag[]): boolean {
    if (rating !== 'negative') return false;

    // Check for severe flags
    return flags.some(flag => MODERATION_TRIGGER_FLAGS.includes(flag));
  }

  // ============================================
  // TRUST IMPACT ENGINE
  // ============================================

  /**
   * Process feedback and apply trust impact
   */
  async processFeedbackTrustImpact(feedback: SafetyFeedback): Promise<TrustImpactResult> {
    const actions: TrustImpactAction[] = [];
    let scoreChange = 0;

    // Get current user moderation record
    const moderationRecord = await this.getUserModerationRecord(feedback.reviewed_user_id);

    if (feedback.rating === 'negative') {
      // Apply negative penalty
      scoreChange = TrustImpactThresholds.NEGATIVE_FEEDBACK_PENALTY;
      actions.push({ type: 'score_decreased', amount: Math.abs(scoreChange) });

      // Check thresholds
      const negativeCount = moderationRecord.negative_feedback_30_days + 1;

      // 2 negative in 30 days → badge removal
      if (negativeCount >= TrustImpactThresholds.BADGE_REMOVAL_THRESHOLD) {
        const badge = await this.removeBadge(feedback.reviewed_user_id, 'trusted_runner');
        if (badge) {
          actions.push({ type: 'badge_removed', badge });
        }
      }

      // 3 negative → internal review
      if (negativeCount >= TrustImpactThresholds.INTERNAL_REVIEW_THRESHOLD) {
        await this.flagForModeration(feedback.reviewed_user_id, 'multiple_negative_feedback');
        actions.push({ type: 'internal_review_triggered' });
      }

      // 5 negative → auto suspension
      if (negativeCount >= TrustImpactThresholds.AUTO_SUSPENSION_THRESHOLD) {
        await this.autoSuspendUser(feedback.reviewed_user_id, 7); // 7 days
        actions.push({ type: 'auto_suspended', days: 7 });
      }

    } else if (feedback.rating === 'positive') {
      // Apply positive bonus
      scoreChange = TrustImpactThresholds.POSITIVE_FEEDBACK_BONUS;
      actions.push({ type: 'score_increased', amount: scoreChange });
    }

    // Apply trust score change via TrustEngine
    const eventType: SafetyEventType = feedback.rating === 'negative'
      ? 'report_confirmed'  // Reuse existing negative event type
      : 'session_completed'; // Reuse existing positive event type

    // Only emit event for significant changes
    if (scoreChange !== 0) {
      await this.trustEngine.logEventAndRecalculate(
        feedback.reviewed_user_id,
        eventType,
        {
          description: `Feedback ${feedback.rating} recu`,
          metadata: {
            feedback_id: feedback.id,
            session_id: feedback.session_id,
            score_change: scoreChange,
          },
        }
      );
    }

    // Mark feedback as processed
    feedback.processed = true;
    feedback.processed_at = new Date().toISOString();
    await this.saveFeedback(feedback);

    // Log audit
    await this.logAudit({
      type: 'trust_impact_applied',
      actor_id: 'system',
      target_user_id: feedback.reviewed_user_id,
      details: {
        feedback_id: feedback.id,
        score_change: scoreChange,
        actions: actions.map(a => a.type),
      },
    });

    return {
      user_id: feedback.reviewed_user_id,
      previous_score: moderationRecord.risk_score,
      new_score: moderationRecord.risk_score + Math.abs(scoreChange),
      score_change: scoreChange,
      actions_triggered: actions,
    };
  }

  // ============================================
  // SILENT REPORTING
  // ============================================

  /**
   * Create a silent report (independent of sessions)
   * Reporter identity is NEVER exposed
   */
  async createSilentReport(input: CreateSilentReportInput): Promise<SilentReport | { error: string; code: string }> {
    // Validate: cannot report self
    if (input.reporter_id === input.reported_user_id) {
      return {
        error: 'Vous ne pouvez pas vous signaler vous-meme',
        code: FeedbackErrorCode.CANNOT_REPORT_SELF,
      };
    }

    // Check cooldown
    const cooldownKey = `${input.reporter_id}:${input.reported_user_id}`;
    const lastReport = this.reportCooldowns.get(cooldownKey);
    if (lastReport) {
      const hoursSince = (Date.now() - lastReport.getTime()) / (1000 * 60 * 60);
      if (hoursSince < FeedbackConfig.REPORT_COOLDOWN_HOURS) {
        return {
          error: `Veuillez attendre ${Math.ceil(FeedbackConfig.REPORT_COOLDOWN_HOURS - hoursSince)} heures avant de signaler a nouveau`,
          code: FeedbackErrorCode.REPORT_ALREADY_EXISTS,
        };
      }
    }

    // Create report
    const report: SilentReport = {
      id: this.generateId('sr'),
      reporter_id: input.reporter_id,
      reported_user_id: input.reported_user_id,
      type: input.type,
      description: input.description,
      evidence_urls: input.evidence_urls?.slice(0, FeedbackConfig.MAX_EVIDENCE_URLS),
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Save report
    await this.saveSilentReport(report);

    // Update cooldown
    this.reportCooldowns.set(cooldownKey, new Date());

    // Flag user for moderation
    await this.flagForModeration(input.reported_user_id, `silent_report_${input.type}`);

    // Check if auto-escalation needed
    const reportCount = await this.getSilentReportCount(input.reported_user_id);
    if (reportCount >= TrustImpactThresholds.SILENT_REPORT_SUSPENSION_THRESHOLD) {
      await this.autoSuspendUser(input.reported_user_id, 3); // 3 days pending review
    } else if (reportCount >= TrustImpactThresholds.SILENT_REPORT_REVIEW_THRESHOLD) {
      await this.escalateToReview(input.reported_user_id);
    }

    // Log audit (with masked reporter)
    await this.logAudit({
      type: 'silent_report_created',
      actor_id: 'anonymous', // Never log actual reporter
      target_user_id: input.reported_user_id,
      details: {
        report_id: report.id,
        type: input.type,
        has_evidence: (input.evidence_urls?.length ?? 0) > 0,
      },
    });

    return report;
  }

  // ============================================
  // MODERATION QUEUE
  // ============================================

  /**
   * Get moderation queue (admin only)
   */
  async getModerationQueue(
    moderatorId: string,
    options: {
      status?: ModerationStatus[];
      sort_by?: 'risk_score' | 'recency' | 'frequency';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ModerationQueueItem[]> {
    const {
      status = ['flagged', 'under_review'],
      sort_by = 'risk_score',
      limit = 50,
      offset = 0,
    } = options;

    // Get flagged users
    const flaggedUsers = await this.getFlaggedUsers(status, limit, offset);

    // Build queue items
    const queueItems: ModerationQueueItem[] = [];

    for (const user of flaggedUsers) {
      const record = await this.getUserModerationRecord(user.user_id);
      const flagsSummary = await this.getUserFlagsSummary(user.user_id);

      queueItems.push({
        user_id: user.user_id,
        user_name: user.user_name,
        status: record.status,
        risk_score: record.risk_score,
        negative_feedback_count: record.total_negative_feedback,
        silent_reports_count: record.silent_reports_count,
        most_recent_issue_at: record.last_activity_at,
        flags_summary: flagsSummary,
        requires_action: record.status === 'flagged' || record.pending_reports_count > 0,
      });
    }

    // Sort
    if (sort_by === 'risk_score') {
      queueItems.sort((a, b) => b.risk_score - a.risk_score);
    } else if (sort_by === 'recency') {
      queueItems.sort((a, b) =>
        new Date(b.most_recent_issue_at).getTime() - new Date(a.most_recent_issue_at).getTime()
      );
    } else if (sort_by === 'frequency') {
      queueItems.sort((a, b) =>
        (b.negative_feedback_count + b.silent_reports_count) -
        (a.negative_feedback_count + a.silent_reports_count)
      );
    }

    return queueItems;
  }

  /**
   * Take moderation action
   */
  async takeAction(input: ModerationActionInput): Promise<ModerationActionResult> {
    const record = await this.getUserModerationRecord(input.user_id);

    let newStatus: ModerationStatus = record.status;
    let trustScoreChange = 0;

    switch (input.action) {
      case 'warn':
        newStatus = 'warned';
        await this.issueWarning(input.user_id, input.reason, input.moderator_id);
        trustScoreChange = -10;
        break;

      case 'remove_badge':
        if (input.badge_to_remove) {
          await this.removeBadge(input.user_id, input.badge_to_remove);
        }
        break;

      case 'suspend':
        newStatus = 'suspended';
        await this.suspendUser(input.user_id, input.suspension_days || 7, input.reason, input.moderator_id);
        trustScoreChange = -20;
        break;

      case 'ban':
        newStatus = 'banned';
        await this.banUser(input.user_id, input.reason, input.moderator_id);
        trustScoreChange = -100;
        break;

      case 'clear':
        newStatus = 'clear';
        await this.clearUser(input.user_id, input.moderator_id);
        break;

      case 'dismiss':
        newStatus = 'clear';
        await this.dismissReports(input.user_id, input.moderator_id);
        break;
    }

    // Update moderation record
    await this.updateModerationStatus(input.user_id, newStatus);

    // Log audit
    await this.logAudit({
      type: 'moderation_action',
      actor_id: input.moderator_id,
      target_user_id: input.user_id,
      details: {
        action: input.action,
        reason: input.reason,
        new_status: newStatus,
        trust_score_change: trustScoreChange,
      },
    });

    return {
      success: true,
      user_id: input.user_id,
      action: input.action,
      new_status: newStatus,
      trust_score_change: trustScoreChange,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get user moderation record
   */
  async getUserModerationRecord(userId: string): Promise<UserModerationRecord> {
    // Get feedback stats
    const feedbacks = await this.getFeedbacksForUser(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let totalNegative = 0;
    let negativeInWindow = 0;
    let lastActivity = new Date(0);

    for (const feedback of feedbacks) {
      if (feedback.rating === 'negative') {
        totalNegative++;
        if (new Date(feedback.created_at) > thirtyDaysAgo) {
          negativeInWindow++;
        }
      }
      const feedbackDate = new Date(feedback.created_at);
      if (feedbackDate > lastActivity) {
        lastActivity = feedbackDate;
      }
    }

    // Get silent report count
    const silentReportCount = await this.getSilentReportCount(userId);
    const pendingReports = await this.getPendingReportCount(userId);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(totalNegative, negativeInWindow, silentReportCount);

    // Determine status
    let status: ModerationStatus = 'clear';
    if (negativeInWindow >= TrustImpactThresholds.AUTO_SUSPENSION_THRESHOLD) {
      status = 'suspended';
    } else if (negativeInWindow >= TrustImpactThresholds.INTERNAL_REVIEW_THRESHOLD || silentReportCount >= 2) {
      status = 'under_review';
    } else if (negativeInWindow > 0 || silentReportCount > 0) {
      status = 'flagged';
    }

    return {
      user_id: userId,
      status,
      total_negative_feedback: totalNegative,
      negative_feedback_30_days: negativeInWindow,
      silent_reports_count: silentReportCount,
      pending_reports_count: pendingReports,
      badges_removed: [],
      warnings_count: 0,
      last_activity_at: lastActivity.toISOString(),
      risk_score: riskScore,
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(
    totalNegative: number,
    negativeInWindow: number,
    silentReports: number
  ): number {
    // Base score from recent negatives (max 50 points)
    const recentScore = Math.min(negativeInWindow * 10, 50);

    // Historical score (max 30 points)
    const historyScore = Math.min(totalNegative * 3, 30);

    // Silent reports (max 20 points)
    const reportScore = Math.min(silentReports * 7, 20);

    return Math.min(recentScore + historyScore + reportScore, 100);
  }

  /**
   * Flag user for moderation
   */
  private async flagForModeration(userId: string, reason: string): Promise<void> {
    console.log(`[Feedback] Flagging user ${userId} for moderation: ${reason}`);
    await this.updateModerationStatus(userId, 'flagged');
  }

  /**
   * Escalate to internal review
   */
  private async escalateToReview(userId: string): Promise<void> {
    console.log(`[Feedback] Escalating user ${userId} to internal review`);
    await this.updateModerationStatus(userId, 'under_review');
  }

  /**
   * Auto-suspend user
   */
  private async autoSuspendUser(userId: string, days: number): Promise<void> {
    console.log(`[Feedback] Auto-suspending user ${userId} for ${days} days`);

    const suspensionUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.updateModerationStatus(userId, 'suspended');

    // Log audit
    await this.logAudit({
      type: 'auto_suspension',
      actor_id: 'system',
      target_user_id: userId,
      details: {
        days,
        suspension_until: suspensionUntil.toISOString(),
        reason: 'Exceeded negative feedback threshold',
      },
    });
  }

  /**
   * Remove badge from user
   */
  private async removeBadge(userId: string, badge: string): Promise<string | null> {
    console.log(`[Feedback] Removing badge ${badge} from user ${userId}`);

    // Log audit
    await this.logAudit({
      type: 'badge_removal',
      actor_id: 'system',
      target_user_id: userId,
      details: { badge },
    });

    return badge;
  }

  /**
   * Issue warning to user
   */
  private async issueWarning(userId: string, reason: string, moderatorId: string): Promise<void> {
    console.log(`[Feedback] Issuing warning to user ${userId}: ${reason}`);

    await this.logAudit({
      type: 'warning_issued',
      actor_id: moderatorId,
      target_user_id: userId,
      details: { reason },
    });
  }

  /**
   * Suspend user
   */
  private async suspendUser(
    userId: string,
    days: number,
    reason: string,
    moderatorId: string
  ): Promise<void> {
    console.log(`[Feedback] Suspending user ${userId} for ${days} days: ${reason}`);
    // In production, would update user profile
  }

  /**
   * Ban user permanently
   */
  private async banUser(userId: string, reason: string, moderatorId: string): Promise<void> {
    console.log(`[Feedback] Banning user ${userId}: ${reason}`);
    // In production, would update user profile
  }

  /**
   * Clear user from moderation
   */
  private async clearUser(userId: string, moderatorId: string): Promise<void> {
    console.log(`[Feedback] Clearing user ${userId} from moderation`);
  }

  /**
   * Dismiss all pending reports for user
   */
  private async dismissReports(userId: string, moderatorId: string): Promise<void> {
    console.log(`[Feedback] Dismissing reports for user ${userId}`);
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  private getFeedbackKey(sessionId: string, reviewerId: string, reviewedUserId: string): string {
    return `${sessionId}:${reviewerId}:${reviewedUserId}`;
  }

  private async getExistingFeedback(
    sessionId: string,
    reviewerId: string,
    reviewedUserId: string
  ): Promise<SafetyFeedback | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('safety_feedbacks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('reviewer_id', reviewerId)
        .eq('reviewed_user_id', reviewedUserId)
        .single();

      if (error || !data) return null;
      return data as SafetyFeedback;
    } catch {
      return null;
    }
  }

  private async saveFeedback(feedback: SafetyFeedback): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving feedback:', feedback.id);
      return;
    }

    try {
      const data = feedback as unknown as Record<string, unknown>;
      await (this.supabase.from('safety_feedbacks') as unknown as {
        upsert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).upsert(data);
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  }

  private async getFeedbacksForUser(userId: string): Promise<SafetyFeedback[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('safety_feedbacks')
        .select('*')
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as SafetyFeedback[];
    } catch {
      return [];
    }
  }

  private async saveSilentReport(report: SilentReport): Promise<void> {
    if (!this.supabase) {
      console.log('[Mock] Saving silent report:', report.id);
      return;
    }

    try {
      const data = report as unknown as Record<string, unknown>;
      await (this.supabase.from('silent_reports') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).insert(data);
    } catch (err) {
      console.error('Error saving silent report:', err);
    }
  }

  private async getSilentReportCount(userId: string): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const { count, error } = await this.supabase
        .from('silent_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reported_user_id', userId)
        .neq('status', 'dismissed');

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  private async getPendingReportCount(userId: string): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const { count, error } = await this.supabase
        .from('silent_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reported_user_id', userId)
        .eq('status', 'pending');

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  private async getFlaggedUsers(
    statuses: ModerationStatus[],
    limit: number,
    offset: number
  ): Promise<{ user_id: string; user_name?: string }[]> {
    if (!this.supabase) return [];

    // In production, would query moderation_records table
    return [];
  }

  private async getUserFlagsSummary(userId: string): Promise<Record<FeedbackFlag, number>> {
    const feedbacks = await this.getFeedbacksForUser(userId);
    const summary: Record<string, number> = {};

    for (const feedback of feedbacks) {
      for (const flag of feedback.flags) {
        summary[flag] = (summary[flag] || 0) + 1;
      }
    }

    return summary as Record<FeedbackFlag, number>;
  }

  private async updateModerationStatus(userId: string, status: ModerationStatus): Promise<void> {
    if (!this.supabase) {
      console.log(`[Mock] Updating moderation status for ${userId}: ${status}`);
      return;
    }

    // In production, would update moderation_records table
  }

  private async logAudit(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      id: this.generateId('audit'),
      ...entry,
      created_at: new Date().toISOString(),
    };

    if (!this.supabase) {
      console.log('[Audit]', fullEntry.type, fullEntry.target_user_id, fullEntry.details);
      return;
    }

    try {
      const data = fullEntry as unknown as Record<string, unknown>;
      await (this.supabase.from('audit_logs') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
      }).insert(data);
    } catch (err) {
      console.error('Error logging audit:', err);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }
}

// ============================================
// SINGLETON
// ============================================

let feedbackServiceInstance: FeedbackService | null = null;

export function getFeedbackService(): FeedbackService {
  if (!feedbackServiceInstance) {
    feedbackServiceInstance = new FeedbackService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return feedbackServiceInstance;
}

export function resetFeedbackService(): void {
  feedbackServiceInstance = null;
}
