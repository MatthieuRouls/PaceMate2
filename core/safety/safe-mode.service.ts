/**
 * Safe Mode Service
 *
 * Provides enhanced safety filtering for users who opt-in to Safe Mode.
 *
 * When enabled:
 * - Only show validated users
 * - No 1-to-1 sessions
 * - Only sessions >= 3 participants
 * - Prioritize certified hosts
 */

import { createClient } from '@supabase/supabase-js';
import {
  SafeModeSettings,
  SafeModeCustomFilter,
  DEFAULT_SAFE_MODE_SETTINGS,
  SAFE_MODE_FILTERS,
  StateCapabilities,
  SafetyState,
} from './safety-state.types';
import { getSafetyStateService } from './safety-state.service';

// ============================================
// TYPES
// ============================================

export interface SessionForFiltering {
  id: string;
  host_id: string;
  host_trust_score: number;
  host_verification_level: 'none' | 'basic' | 'verified' | 'certified';
  host_safety_state: SafetyState;
  participant_count: number;
  max_participants: number;
  is_private: boolean;
  location_type: 'public' | 'private' | 'remote' | 'verified_venue';
}

export interface UserForFiltering {
  id: string;
  trust_score: number;
  verification_level: 'none' | 'basic' | 'verified' | 'certified';
  safety_state: SafetyState;
  total_runs: number;
  hosted_sessions: number;
}

export interface SafeModeFilterResult {
  passed: boolean;
  filtered_reason?: string;
  priority_boost?: number;
}

export interface SessionFilterResult {
  sessions: SessionForFiltering[];
  filtered_count: number;
  applied_filters: string[];
}

export interface UserFilterResult {
  users: UserForFiltering[];
  filtered_count: number;
  applied_filters: string[];
}

// ============================================
// SAFE MODE SERVICE
// ============================================

export class SafeModeService {
  private supabase: ReturnType<typeof createClient> | null = null;

  // In-memory settings store
  private userSettings: Map<string, SafeModeSettings> = new Map();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================

  /**
   * Get safe mode settings for a user
   */
  async getSettings(userId: string): Promise<SafeModeSettings> {
    return this.userSettings.get(userId) || { ...DEFAULT_SAFE_MODE_SETTINGS };
  }

  /**
   * Enable safe mode for a user
   */
  async enableSafeMode(userId: string): Promise<SafeModeSettings> {
    const settings: SafeModeSettings = {
      ...DEFAULT_SAFE_MODE_SETTINGS,
      enabled: true,
    };
    this.userSettings.set(userId, settings);

    console.log(`[SafeMode] Enabled for user: ${userId}`);
    return settings;
  }

  /**
   * Disable safe mode for a user
   */
  async disableSafeMode(userId: string): Promise<SafeModeSettings> {
    const settings: SafeModeSettings = {
      ...DEFAULT_SAFE_MODE_SETTINGS,
      enabled: false,
    };
    this.userSettings.set(userId, settings);

    console.log(`[SafeMode] Disabled for user: ${userId}`);
    return settings;
  }

  /**
   * Update safe mode settings
   */
  async updateSettings(
    userId: string,
    updates: Partial<SafeModeSettings>
  ): Promise<SafeModeSettings> {
    const current = await this.getSettings(userId);
    const updated = { ...current, ...updates };
    this.userSettings.set(userId, updated);
    return updated;
  }

  /**
   * Check if safe mode is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId);
    return settings.enabled;
  }

  // ============================================
  // SESSION FILTERING
  // ============================================

  /**
   * Filter sessions based on safe mode settings
   */
  async filterSessions(
    userId: string,
    sessions: SessionForFiltering[]
  ): Promise<SessionFilterResult> {
    const settings = await this.getSettings(userId);

    if (!settings.enabled) {
      return {
        sessions,
        filtered_count: 0,
        applied_filters: [],
      };
    }

    const appliedFilters: string[] = [];
    let filtered = [...sessions];
    const initialCount = filtered.length;

    // Filter: Only validated hosts
    if (settings.only_validated_users) {
      const before = filtered.length;
      filtered = filtered.filter(
        (s) => s.host_verification_level === 'verified' || s.host_verification_level === 'certified'
      );
      if (filtered.length < before) {
        appliedFilters.push('only_validated_hosts');
      }
    }

    // Filter: No 1-to-1 sessions
    if (settings.no_one_on_one) {
      const before = filtered.length;
      filtered = filtered.filter((s) => !s.is_private && s.max_participants > 2);
      if (filtered.length < before) {
        appliedFilters.push('no_1on1');
      }
    }

    // Filter: Minimum participants
    if (settings.min_participants > 1) {
      const before = filtered.length;
      filtered = filtered.filter(
        (s) => s.participant_count >= settings.min_participants || s.max_participants >= settings.min_participants
      );
      if (filtered.length < before) {
        appliedFilters.push(`min_${settings.min_participants}_participants`);
      }
    }

    // Filter: Host trust score
    const minTrustFilter = settings.custom_filters?.find((f) => f.type === 'min_trust_score');
    const minTrustScore = minTrustFilter
      ? (minTrustFilter.value as number)
      : SAFE_MODE_FILTERS.MIN_TRUST_SCORE;

    const beforeTrust = filtered.length;
    filtered = filtered.filter((s) => s.host_trust_score >= minTrustScore);
    if (filtered.length < beforeTrust) {
      appliedFilters.push('min_trust_score');
    }

    // Filter: Host safety state (exclude restricted/suspended)
    const beforeState = filtered.length;
    filtered = filtered.filter(
      (s) => s.host_safety_state === 'normal' || s.host_safety_state === 'monitored'
    );
    if (filtered.length < beforeState) {
      appliedFilters.push('host_safety_state');
    }

    // Sort: Prioritize certified hosts
    if (settings.prefer_certified_hosts) {
      filtered.sort((a, b) => {
        const priorityA = this.getHostPriority(a);
        const priorityB = this.getHostPriority(b);
        return priorityB - priorityA;
      });
      appliedFilters.push('prioritize_certified');
    }

    return {
      sessions: filtered,
      filtered_count: initialCount - filtered.length,
      applied_filters: appliedFilters,
    };
  }

  /**
   * Check if a single session passes safe mode filters
   */
  async checkSession(
    userId: string,
    session: SessionForFiltering
  ): Promise<SafeModeFilterResult> {
    const settings = await this.getSettings(userId);

    if (!settings.enabled) {
      return { passed: true };
    }

    // Check validated host
    if (settings.only_validated_users) {
      if (session.host_verification_level !== 'verified' && session.host_verification_level !== 'certified') {
        return {
          passed: false,
          filtered_reason: 'Host is not validated',
        };
      }
    }

    // Check 1-to-1
    if (settings.no_one_on_one) {
      if (session.is_private || session.max_participants <= 2) {
        return {
          passed: false,
          filtered_reason: 'Private sessions are filtered',
        };
      }
    }

    // Check minimum participants
    if (settings.min_participants > 1) {
      if (session.max_participants < settings.min_participants) {
        return {
          passed: false,
          filtered_reason: `Session requires at least ${settings.min_participants} participants`,
        };
      }
    }

    // Check trust score
    const minTrustFilter = settings.custom_filters?.find((f) => f.type === 'min_trust_score');
    const minTrustScore = minTrustFilter
      ? (minTrustFilter.value as number)
      : SAFE_MODE_FILTERS.MIN_TRUST_SCORE;

    if (session.host_trust_score < minTrustScore) {
      return {
        passed: false,
        filtered_reason: 'Host trust score below threshold',
      };
    }

    // Check host safety state
    if (session.host_safety_state === 'restricted' || session.host_safety_state === 'suspended') {
      return {
        passed: false,
        filtered_reason: 'Host has restricted status',
      };
    }

    // Calculate priority boost
    const priorityBoost = settings.prefer_certified_hosts
      ? this.getHostPriority(session)
      : 0;

    return {
      passed: true,
      priority_boost: priorityBoost,
    };
  }

  // ============================================
  // USER FILTERING
  // ============================================

  /**
   * Filter users for safe mode user
   */
  async filterUsers(userId: string, users: UserForFiltering[]): Promise<UserFilterResult> {
    const settings = await this.getSettings(userId);

    if (!settings.enabled) {
      return {
        users,
        filtered_count: 0,
        applied_filters: [],
      };
    }

    const appliedFilters: string[] = [];
    let filtered = [...users];
    const initialCount = filtered.length;

    // Filter: Only validated users
    if (settings.only_validated_users) {
      const before = filtered.length;
      filtered = filtered.filter(
        (u) => u.verification_level === 'verified' || u.verification_level === 'certified'
      );
      if (filtered.length < before) {
        appliedFilters.push('only_validated_users');
      }
    }

    // Filter: Minimum trust score
    const minTrustFilter = settings.custom_filters?.find((f) => f.type === 'min_trust_score');
    const minTrustScore = minTrustFilter
      ? (minTrustFilter.value as number)
      : SAFE_MODE_FILTERS.MIN_TRUST_SCORE;

    const beforeTrust = filtered.length;
    filtered = filtered.filter((u) => u.trust_score >= minTrustScore);
    if (filtered.length < beforeTrust) {
      appliedFilters.push('min_trust_score');
    }

    // Filter: Safety state
    const beforeState = filtered.length;
    filtered = filtered.filter((u) => {
      const capabilities = StateCapabilities[u.safety_state];
      return capabilities.visible_to_safe_mode_users;
    });
    if (filtered.length < beforeState) {
      appliedFilters.push('safety_state');
    }

    return {
      users: filtered,
      filtered_count: initialCount - filtered.length,
      applied_filters: appliedFilters,
    };
  }

  /**
   * Check if a user is visible to safe mode users
   */
  async isUserVisible(viewerId: string, targetUser: UserForFiltering): Promise<boolean> {
    const settings = await this.getSettings(viewerId);

    if (!settings.enabled) {
      return true;
    }

    // Check validation level
    if (settings.only_validated_users) {
      if (targetUser.verification_level !== 'verified' && targetUser.verification_level !== 'certified') {
        return false;
      }
    }

    // Check trust score
    const minTrustFilter = settings.custom_filters?.find((f) => f.type === 'min_trust_score');
    const minTrustScore = minTrustFilter
      ? (minTrustFilter.value as number)
      : SAFE_MODE_FILTERS.MIN_TRUST_SCORE;

    if (targetUser.trust_score < minTrustScore) {
      return false;
    }

    // Check safety state
    const capabilities = StateCapabilities[targetUser.safety_state];
    if (!capabilities.visible_to_safe_mode_users) {
      return false;
    }

    return true;
  }

  // ============================================
  // MATCHING INTEGRATION
  // ============================================

  /**
   * Get additional risk weight for safe mode context
   */
  getSafeModeRiskAdjustment(
    requesterSafeModeEnabled: boolean,
    sessionContext: {
      is_private: boolean;
      participant_count: number;
      host_verified: boolean;
    }
  ): number {
    if (!requesterSafeModeEnabled) {
      return 0;
    }

    let adjustment = 0;

    // Private session = higher risk for safe mode user
    if (sessionContext.is_private) {
      adjustment += 15;
    }

    // Small group = moderate risk
    if (sessionContext.participant_count < 3) {
      adjustment += 10;
    }

    // Unverified host = higher risk
    if (!sessionContext.host_verified) {
      adjustment += 10;
    }

    return adjustment;
  }

  // ============================================
  // HELPERS
  // ============================================

  private getHostPriority(session: SessionForFiltering): number {
    let priority = 0;

    switch (session.host_verification_level) {
      case 'certified':
        priority += 30;
        break;
      case 'verified':
        priority += 20;
        break;
      case 'basic':
        priority += 10;
        break;
      default:
        priority += 0;
    }

    // Bonus for verified venues
    if (session.location_type === 'verified_venue') {
      priority += 10;
    }

    // Bonus for higher trust score
    priority += Math.floor(session.host_trust_score / 10);

    // Bonus for larger groups (safer)
    if (session.participant_count >= 4) {
      priority += 5;
    }

    return priority;
  }

  // ============================================
  // TESTING UTILITIES
  // ============================================

  clearCaches(): void {
    this.userSettings.clear();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let serviceInstance: SafeModeService | null = null;

export function getSafeModeService(): SafeModeService {
  if (!serviceInstance) {
    serviceInstance = new SafeModeService();
  }
  return serviceInstance;
}

export function resetSafeModeService(): void {
  serviceInstance = null;
}
