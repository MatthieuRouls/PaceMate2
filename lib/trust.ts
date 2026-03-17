/**
 * Trust & Safety utilities for PaceMate.
 *
 * All computations are pure functions operating on Profile fields that are
 * already present in the DB — no schema changes required.
 */

import type { Profile } from './types';

// ─── Trust Score ──────────────────────────────────────────────────────────────

/**
 * Compute a 0-100 trust score from available profile fields.
 *
 * Component weights:
 *   Reliability score  (0-100 → 0-40 pts): direct DB field, updated after each run
 *   Runs completed     (0-20 pts):          capped at 10 runs × 2 pts each
 *   Phone verified     (15 pts flat):       strong trust signal
 *   Runs hosted        (0-15 pts):          capped at 5 hosted × 3 pts each
 *   Account age        (0-10 pts):          months since created_at, capped at 10
 */
export function computeTrustScore(profile: Partial<Profile>): number {
  // Reliability (most important — reflects real post-run feedback)
  const rel = profile.reliability_score ?? 50;
  let score = Math.round((rel / 100) * 40);

  // Participation experience
  const runsCompleted = profile.runs_completed ?? 0;
  score += Math.min(20, Math.round(runsCompleted * 2));

  // Phone verification
  if (profile.phone_verified) score += 15;

  // Hosting experience
  const runsHosted = profile.runs_hosted ?? 0;
  score += Math.min(15, Math.round(runsHosted * 3));

  // Account age (in months, capped at 10)
  if (profile.created_at) {
    const months = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (30 * 24 * 3_600_000),
    );
    score += Math.min(10, months);
  }

  return Math.min(100, Math.max(0, score));
}

// ─── Trust Level ──────────────────────────────────────────────────────────────

export type TrustLevel = 'new' | 'building' | 'trusted' | 'verified' | 'champion';

export interface TrustInfo {
  score: number;
  level: TrustLevel;
  /** Short human-readable label */
  label: string;
  /** Tailwind text-color class */
  colorClass: string;
  /** Tailwind bg-color class (subtle) */
  bgClass: string;
  /** Tailwind border-color class */
  borderClass: string;
  emoji: string;
}

export function getTrustInfo(score: number, phoneVerified = false): TrustInfo {
  // Phone-verified users are promoted one level
  const effective = phoneVerified ? Math.min(100, score + 15) : score;

  if (effective >= 85) {
    return {
      score, level: 'champion', label: 'Champion',
      colorClass: 'text-yellow-400', bgClass: 'bg-yellow-400/10', borderClass: 'border-yellow-400/30', emoji: '🏆',
    };
  }
  if (effective >= 65) {
    return {
      score, level: 'verified', label: 'Fiable',
      colorClass: 'text-neon-400', bgClass: 'bg-neon-500/10', borderClass: 'border-neon-500/30', emoji: '✓',
    };
  }
  if (effective >= 45) {
    return {
      score, level: 'trusted', label: 'Reconnu',
      colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30', emoji: '⭐',
    };
  }
  if (effective >= 20) {
    return {
      score, level: 'building', label: 'En route',
      colorClass: 'text-white/60', bgClass: 'bg-white/5', borderClass: 'border-white/15', emoji: '🌱',
    };
  }
  return {
    score, level: 'new', label: 'Nouveau',
    colorClass: 'text-white/40', bgClass: 'bg-white/4', borderClass: 'border-white/10', emoji: '👋',
  };
}

// ─── Verification Level ───────────────────────────────────────────────────────

export type VerificationLevel = 'identity' | 'phone' | 'email' | 'none';

export interface VerificationInfo {
  level: VerificationLevel;
  label: string;
  /** Short "Vérifié" or "Non vérifié" */
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export function getVerificationInfo(profile: {
  phone_verified?: boolean;
  email?: string;
}): VerificationInfo {
  if (profile.phone_verified) {
    return {
      level: 'phone', label: 'Téléphone vérifié', shortLabel: 'Vérifié',
      colorClass: 'text-neon-400', bgClass: 'bg-neon-500/10', borderClass: 'border-neon-500/25',
    };
  }
  if (profile.email) {
    return {
      level: 'email', label: 'Email vérifié', shortLabel: 'Email',
      colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/25',
    };
  }
  return {
    level: 'none', label: 'Non vérifié', shortLabel: 'Non vérifié',
    colorClass: 'text-white/30', bgClass: 'bg-white/4', borderClass: 'border-white/10',
  };
}

// ─── Reliability display ──────────────────────────────────────────────────────

/** Convert 0-100 reliability_score to a display percentage string. */
export function reliabilityLabel(score?: number): string {
  if (score == null) return '–';
  return `${score}%`;
}

/** reliability_score → color class */
export function reliabilityColor(score?: number): string {
  if (score == null) return 'text-white/30';
  if (score >= 80) return 'text-neon-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// ─── Safety tags (session description encoding) ───────────────────────────────
//
// Safety options (women-only, verified-only) are stored as invisible prefixed
// tags inside the session description field so no DB migration is required.
// Format: "[women-only][verified-only] rest of description"

const TAG_WOMEN_ONLY     = '[pacemate:women-only]';
const TAG_VERIFIED_ONLY  = '[pacemate:verified-only]';

export interface SafetyOptions {
  women_only: boolean;
  verified_only: boolean;
}

/** Encode safety options into a description string. */
export function encodeSafetyTags(opts: SafetyOptions, description: string): string {
  const tags: string[] = [];
  if (opts.women_only)    tags.push(TAG_WOMEN_ONLY);
  if (opts.verified_only) tags.push(TAG_VERIFIED_ONLY);
  const desc = description.trim();
  return tags.length > 0
    ? `${tags.join('')}${desc ? ' ' + desc : ''}`
    : desc;
}

/** Decode safety options from a description string. */
export function decodeSafetyTags(description?: string | null): SafetyOptions & { cleanDescription: string } {
  if (!description) return { women_only: false, verified_only: false, cleanDescription: '' };
  const women_only    = description.includes(TAG_WOMEN_ONLY);
  const verified_only = description.includes(TAG_VERIFIED_ONLY);
  const cleanDescription = description
    .replace(TAG_WOMEN_ONLY, '')
    .replace(TAG_VERIFIED_ONLY, '')
    .trim();
  return { women_only, verified_only, cleanDescription };
}

// ─── Risk signals ─────────────────────────────────────────────────────────────

/**
 * Returns true when the profile has signals that indicate potential risk.
 * Used only to reduce visibility in discovery — never shown to users as a label.
 */
export function hasRiskSignals(profile: Partial<Profile>): boolean {
  const rel = profile.reliability_score ?? 50;
  const runs = profile.runs_completed ?? 0;
  // Low reliability on an active account
  return runs >= 3 && rel < 30;
}
