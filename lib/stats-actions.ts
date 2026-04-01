'use server';
import { logger } from '@/lib/logger';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';
import type { RunnerStats, BadgeType, UserBadge } from './types';

// ============================================================
// Badge definitions
// ============================================================

interface BadgeDef {
  type: BadgeType;
  label: string;
  target: number;
  getValue: (p: ProfileStats) => number;
}

interface ProfileStats {
  runsCompleted: number;
  runsHosted: number;
  peopleMet: number;
  reliabilityScore: number;
  teamRunsContributed: number;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    type: 'first_run',
    label: 'Premier run',
    target: 1,
    getValue: (p) => p.runsCompleted,
  },
  {
    type: 'social_runner',
    label: 'Coureur social',
    target: 5,
    getValue: (p) => p.peopleMet,
  },
  {
    type: 'community_builder',
    label: 'Bâtisseur de communauté',
    target: 10,
    getValue: (p) => p.peopleMet,
  },
  {
    type: 'reliable_runner',
    label: 'Coureur fiable',
    target: 90,                           // 90% reliability AND >=5 runs
    getValue: (p) => (p.runsCompleted >= 5 ? p.reliabilityScore : 0),
  },
  {
    type: 'team_player',
    label: 'Esprit d\'équipe',
    target: 5,
    getValue: (p) => p.teamRunsContributed,
  },
];

// ============================================================
// Helpers
// ============================================================

/** Parse "00:05:30" or "5:30" → minutes per km */
function parsePaceMinutes(pace: string | null | undefined): number {
  if (!pace) return 6; // default 6 min/km
  const parts = pace.split(':').map(Number);
  if (parts.length === 3) return parts[1] + parts[2] / 60; // HH:MM:SS → take MM
  if (parts.length === 2) return parts[0] + parts[1] / 60; // MM:SS
  return 6;
}

/** Get ISO week number */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

// ============================================================
// UPDATE STATS (called on run completion)
// ============================================================

/**
 * Updates all running statistics after a user completes a run.
 * Called from completeRun() in actions.ts.
 * Non-blocking — errors are logged, not thrown.
 */
export async function updateStatsOnRunComplete(sessionId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const supabase = await getServerSupabaseClient();

    // --- Get session details ---
    const { data: session } = await supabase
      .from('sessions')
      .select('id, distance_km, target_pace, creator_id, start_time')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    // --- Get current profile ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('runs_completed, runs_hosted, total_run_time_minutes, people_met, team_id, team_runs_contributed, xp_points, total_distance_km')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    // --- Compute run time ---
    const paceMin = parsePaceMinutes(session.target_pace);
    const runTimeMinutes = Math.round((Number(session.distance_km) || 0) * paceMin);

    // --- Increment run counters ---
    const newRunsCompleted = (profile.runs_completed || 0) + 1;
    const newRunsHosted = session.creator_id === user.id
      ? (profile.runs_hosted || 0) + 1
      : (profile.runs_hosted || 0);
    const newTotalRunTime = (profile.total_run_time_minutes || 0) + runTimeMinutes;
    const newTeamRuns = profile.team_id
      ? (profile.team_runs_contributed || 0) + 1
      : (profile.team_runs_contributed || 0);

    // --- Reliability score from DB ---
    // Get all past sessions the user committed to (confirmed/completed/cancelled)
    const { data: allPastSessionRows } = await supabase
      .from('sessions')
      .select('id')
      .lt('start_time', new Date().toISOString());

    const pastSessionIds = (allPastSessionRows || []).map((s) => s.id);
    let reliabilityScore = 100;

    if (pastSessionIds.length > 0) {
      const { data: pastParticipations } = await supabase
        .from('session_participants')
        .select('status')
        .eq('user_id', user.id)
        .in('session_id', pastSessionIds)
        .in('status', ['completed', 'cancelled']);

      const total = (pastParticipations || []).length;
      const completed = (pastParticipations || []).filter((p) => p.status === 'completed').length;
      reliabilityScore = total === 0 ? 100 : Math.round((completed / total) * 1000) / 10;
    }

    // --- Active weeks from DB (distinct ISO weeks with a completed run) ---
    const { data: completedParts } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    let activeWeeks = 0;
    if ((completedParts || []).length > 0) {
      const completedSessionIds = completedParts!.map((p) => p.session_id);
      const { data: completedSessions } = await supabase
        .from('sessions')
        .select('start_time')
        .in('id', completedSessionIds);

      const weekSet = new Set(
        (completedSessions || []).map((s) => isoWeek(new Date(s.start_time)))
      );
      activeWeeks = weekSet.size;
    }

    // --- Runner connections (upsert bidirectionally) ---
    const { data: coParticipants } = await supabase
      .from('session_participants')
      .select('user_id')
      .eq('session_id', sessionId)
      .in('status', ['confirmed', 'completed'])
      .neq('user_id', user.id);

    const coUserIds = (coParticipants || []).map((p) => p.user_id);
    const sessionDate = new Date(session.start_time).toISOString();

    // Upsert from current user's perspective
    if (coUserIds.length > 0) {
      const connectionRows = coUserIds.map((otherId) => ({
        user_id: user.id,
        other_user_id: otherId,
        runs_together: 1,
        last_run_date: sessionDate,
      }));

      try {
        // Batch SELECT — one round-trip instead of N
        const { data: existingRows } = await supabase
          .from('runner_connections')
          .select('id, other_user_id, runs_together')
          .eq('user_id', user.id)
          .in('other_user_id', coUserIds);

        const existingMap = new Map(
          (existingRows || []).map((c) => [c.other_user_id as string, c as { id: string; runs_together: number }])
        );

        const toInsert = connectionRows.filter((r) => !existingMap.has(r.other_user_id));

        // Batch INSERT new connections
        if (toInsert.length > 0) {
          await supabase.from('runner_connections').insert(toInsert);
        }

        // UPDATE existing connections (increment counter)
        await Promise.all(
          connectionRows
            .filter((r) => existingMap.has(r.other_user_id))
            .map((r) => {
              const existing = existingMap.get(r.other_user_id)!;
              return supabase
                .from('runner_connections')
                .update({ runs_together: existing.runs_together + 1, last_run_date: r.last_run_date })
                .eq('id', existing.id);
            })
        );
      } catch (connErr) {
        logger.warn('[stats] runner_connections table may not exist yet:', connErr);
      }
    }

    // --- Recalculate people_met from connections count ---
    let peopleMet = profile.people_met || 0;
    try {
      const { count } = await supabase
        .from('runner_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      peopleMet = count || peopleMet;
    } catch {
      peopleMet = Math.max(peopleMet, coUserIds.length);
    }

    // --- Update profile with all new stats ---
    await supabase
      .from('profiles')
      .update({
        runs_completed: newRunsCompleted,
        runs_hosted: newRunsHosted,
        total_run_time_minutes: newTotalRunTime,
        people_met: peopleMet,
        reliability_score: reliabilityScore,
        active_weeks: activeWeeks,
        team_runs_contributed: newTeamRuns,
      })
      .eq('id', user.id);

    // --- Update team stats ---
    if (profile.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('runs_completed')
        .eq('id', profile.team_id)
        .single();
      if (team) {
        await supabase
          .from('teams')
          .update({ runs_completed: (team.runs_completed || 0) + 1 })
          .eq('id', profile.team_id);
      }
    }

    // --- Evaluate and award badges ---
    const statsForBadges: ProfileStats = {
      runsCompleted: newRunsCompleted,
      runsHosted: newRunsHosted,
      peopleMet,
      reliabilityScore,
      teamRunsContributed: newTeamRuns,
    };

    await evaluateAndAwardBadges(user.id, statsForBadges);
  } catch (err) {
    // Non-blocking — never crash completeRun
    logger.error('[stats] updateStatsOnRunComplete error:', err);
  }
}

async function evaluateAndAwardBadges(userId: string, stats: ProfileStats): Promise<void> {
  try {
    const supabase = await getServerSupabaseClient();

    // Get existing badges
    const { data: existingBadges } = await supabase
      .from('user_badges')
      .select('badge_type')
      .eq('user_id', userId);

    const earned = new Set((existingBadges || []).map((b) => b.badge_type));

    for (const def of BADGE_DEFS) {
      if (earned.has(def.type)) continue;
      if (def.getValue(stats) >= def.target) {
        await supabase.from('user_badges').insert({
          user_id: userId,
          badge_type: def.type,
        });
      }
    }
  } catch (err) {
    logger.warn('[stats] badge evaluation error:', err);
  }
}

// ============================================================
// READ STATS (called by the dashboard component)
// ============================================================

export async function getRunnerStats(): Promise<RunnerStats | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await getServerSupabaseClient();

    // --- Profile ---
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        runs_completed, runs_hosted, total_run_time_minutes,
        people_met, reliability_score, active_weeks,
        team_runs_contributed, total_distance_km, team_id
      `)
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // --- Team stats ---
    let teamStats: RunnerStats['teamStats'] = null;
    if (profile.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name, runs_completed, total_distance')
        .eq('id', profile.team_id)
        .single();

      if (team) {
        // Count members active in last 30 days via recent completions
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentSessions } = await supabase
          .from('sessions')
          .select('id')
          .gte('start_time', thirtyDaysAgo)
          .lt('start_time', new Date().toISOString());

        const recentSessionIds = (recentSessions || []).map((s) => s.id);
        let activeMembers = 0;

        if (recentSessionIds.length > 0) {
          const { data: teamMembers } = await supabase
            .from('profiles')
            .select('id')
            .eq('team_id', profile.team_id);

          const memberIds = (teamMembers || []).map((m) => m.id);

          if (memberIds.length > 0) {
            const { data: activeParticipants } = await supabase
              .from('session_participants')
              .select('user_id')
              .in('session_id', recentSessionIds)
              .in('user_id', memberIds)
              .eq('status', 'completed');

            activeMembers = new Set((activeParticipants || []).map((p) => p.user_id)).size;
          }
        }

        teamStats = {
          teamName: team.name,
          runsCompleted: team.runs_completed || 0,
          totalKm: Number(team.total_distance) || 0,
          activeMembers,
        };
      }
    }

    // --- Recent connections (top 5 by runs_together) ---
    let recentConnections: RunnerStats['recentConnections'] = [];
    try {
      const { data: connections } = await supabase
        .from('runner_connections')
        .select('other_user_id, runs_together')
        .eq('user_id', user.id)
        .order('runs_together', { ascending: false })
        .limit(5);

      if ((connections || []).length > 0) {
        const otherIds = connections!.map((c) => c.other_user_id);
        const { data: otherProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', otherIds);

        recentConnections = connections!.map((c) => {
          const p = (otherProfiles || []).find((x) => x.id === c.other_user_id);
          return {
            userId: c.other_user_id,
            username: p?.username ?? 'Inconnu',
            avatarUrl: p?.avatar_url,
            runsTogether: c.runs_together,
          };
        });
      }
    } catch {
      // Table may not exist yet
    }

    // --- Badges ---
    let badges: UserBadge[] = [];
    try {
      const { data: rawBadges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: true });
      badges = (rawBadges || []) as UserBadge[];
    } catch {
      // Table may not exist yet
    }

    // --- Badge progress ---
    const statsForBadges: ProfileStats = {
      runsCompleted: profile.runs_completed || 0,
      runsHosted: profile.runs_hosted || 0,
      peopleMet: profile.people_met || 0,
      reliabilityScore: Number(profile.reliability_score) || 100,
      teamRunsContributed: profile.team_runs_contributed || 0,
    };

    const badgeProgress = {} as Record<BadgeType, { current: number; target: number }>;
    for (const def of BADGE_DEFS) {
      badgeProgress[def.type] = {
        current: Math.min(def.getValue(statsForBadges), def.target),
        target: def.target,
      };
    }

    return {
      runsCompleted: profile.runs_completed || 0,
      runsHosted: profile.runs_hosted || 0,
      totalKm: Number(profile.total_distance_km) || 0,
      totalRunTimeMinutes: profile.total_run_time_minutes || 0,
      peopleMet: profile.people_met || 0,
      reliabilityScore: Number(profile.reliability_score) ?? 100,
      activeWeeks: profile.active_weeks || 0,
      teamStats,
      recentConnections,
      badges,
      badgeProgress,
    };
  } catch (err) {
    logger.error('[stats] getRunnerStats error:', err);
    return null;
  }
}
