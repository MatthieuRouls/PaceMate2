/**
 * Reporting Service - User report handling module
 *
 * PLACEHOLDER - To be implemented in the next phase.
 *
 * This module will handle:
 * - User reports (harassment, spam, fake profile, etc.)
 * - Report investigation workflow
 * - Automatic actions based on report thresholds
 * - Admin review queue
 */

import {
  SafetyEvent,
  SafetyEventType,
  SafetyEventSeverity,
  CreateSafetyEventInput,
  SafetyFlags,
  addFlag,
} from './types';

// ============================================
// REPORT TYPES
// ============================================

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'no_show'
  | 'threatening_behavior'
  | 'other';

export interface ReportInput {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  sessionId?: string; // If report is related to a specific session
  evidence?: string[]; // URLs to screenshots/evidence
}

export interface ReportResult {
  success: boolean;
  reportId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  description?: string;
  session_id?: string;
  evidence?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
}

// ============================================
// REPORT THRESHOLDS
// ============================================

/**
 * Thresholds for automatic actions
 */
export const ReportThresholds = {
  // Number of reports before automatic action
  AUTO_FLAG_THRESHOLD: 3,      // Add flag after 3 reports
  AUTO_YELLOW_THRESHOLD: 5,    // Move to yellow tier after 5 reports
  AUTO_SUSPEND_THRESHOLD: 10,  // Auto-suspend after 10 reports

  // Time windows
  REPORT_WINDOW_DAYS: 30,      // Count reports within last 30 days
  COOLDOWN_HOURS: 24,          // Can't report same user twice within 24h
} as const;

// ============================================
// REPORTING SERVICE CLASS (PLACEHOLDER)
// ============================================

export class ReportingService {
  /**
   * Submit a report against a user
   *
   * TODO: Implement full report submission
   */
  static async submitReport(input: ReportInput): Promise<ReportResult> {
    // Placeholder implementation
    console.log(`Report submitted: ${input.reporterId} -> ${input.reportedUserId}`);

    // TODO:
    // 1. Validate reporter is not reporting themselves
    // 2. Check cooldown (can't report same user twice in 24h)
    // 3. Create report record in DB
    // 4. Log safety event
    // 5. Check thresholds for automatic actions
    // 6. Notify admin if threshold reached

    return {
      success: true,
      reportId: 'placeholder-report-id',
    };
  }

  /**
   * Get reports for a user (for admin review)
   *
   * TODO: Implement database fetch
   */
  static async getReportsForUser(userId: string): Promise<Report[]> {
    // Placeholder implementation
    console.log(`Getting reports for user ${userId}`);

    // TODO: Fetch from database

    return [];
  }

  /**
   * Get pending reports for admin review
   *
   * TODO: Implement admin queue
   */
  static async getPendingReports(): Promise<Report[]> {
    // Placeholder implementation
    console.log('Getting pending reports');

    // TODO: Fetch from database

    return [];
  }

  /**
   * Resolve a report (admin action)
   *
   * TODO: Implement resolution logic
   */
  static async resolveReport(
    reportId: string,
    resolution: 'valid' | 'invalid',
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean }> {
    // Placeholder implementation
    console.log(`Resolving report ${reportId}: ${resolution}`);

    // TODO:
    // 1. Update report status
    // 2. If valid, apply consequences to reported user
    // 3. Log safety event
    // 4. Notify reporter of resolution (optional)

    return { success: true };
  }

  /**
   * Check if automatic action should be taken
   * Called after a new report is submitted
   *
   * TODO: Implement threshold checking
   */
  static async checkAutoActions(reportedUserId: string): Promise<{
    actionTaken: boolean;
    action?: 'flag_added' | 'tier_changed' | 'suspended';
  }> {
    // Placeholder implementation
    console.log(`Checking auto actions for user ${reportedUserId}`);

    // TODO:
    // 1. Count reports in last 30 days
    // 2. If >= AUTO_FLAG_THRESHOLD, add REPORTED flag
    // 3. If >= AUTO_YELLOW_THRESHOLD, change tier to yellow
    // 4. If >= AUTO_SUSPEND_THRESHOLD, suspend user
    // 5. Log safety events

    return { actionTaken: false };
  }

  /**
   * Get report count for a user in the last N days
   *
   * TODO: Implement database query
   */
  static async getReportCount(
    userId: string,
    daysBack: number = ReportThresholds.REPORT_WINDOW_DAYS
  ): Promise<number> {
    // Placeholder implementation
    console.log(`Getting report count for user ${userId}, last ${daysBack} days`);

    // TODO: Query database

    return 0;
  }

  /**
   * Log a safety event
   * Used internally when reports are processed
   *
   * TODO: Implement database insert
   */
  static async logSafetyEvent(input: CreateSafetyEventInput): Promise<SafetyEvent> {
    // Placeholder implementation
    console.log(`Logging safety event: ${input.type} for user ${input.user_id}`);

    // TODO: Insert into safety_events table

    return {
      id: 'placeholder-event-id',
      user_id: input.user_id,
      type: input.type,
      severity: input.severity,
      weight: input.weight ?? 0,
      description: input.description,
      metadata: input.metadata,
      created_by: input.created_by,
      created_at: new Date().toISOString(),
    };
  }
}
