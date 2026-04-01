'use server';
import { logger } from '@/lib/logger';

import { getCurrentUser, getServerSupabaseClient, getServiceSupabaseClient } from './supabase-auth';

export interface ActivityEvent {
  id: string;
  actor_id: string;
  event_type: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    username: string;
    avatar_url: string | null;
    running_level: number | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — use service role to bypass RLS (INSERT blocked for users)
// ─────────────────────────────────────────────────────────────────────────────
export async function logActivity(
  actorId: string,
  eventType: string,
  targetType?: string,
  targetId?: string,
  targetLabel?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from('activity_events').insert({
      actor_id: actorId,
      event_type: eventType,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      target_label: targetLabel ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Non-blocking
    logger.warn('[activity] logActivity error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-facing — fetch the activity feed for the current user
// Shows: friends' activity first, then global fallback
// ─────────────────────────────────────────────────────────────────────────────
export async function getFeedEvents(limit = 20): Promise<ActivityEvent[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const supabase = await getServerSupabaseClient();

    // Get friend IDs (accepted friendships)
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const friendIds = (friendships || []).map(f =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    // Build actor filter: friends + self, fallback to all if no friends
    const actorFilter = friendIds.length > 0
      ? [...friendIds, user.id]
      : null;

    let query = supabase
      .from('activity_events')
      .select(`
        id, actor_id, event_type, target_type, target_id, target_label, metadata, created_at,
        actor:profiles!activity_events_actor_id_fkey(username, avatar_url, running_level)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actorFilter) {
      query = query.in('actor_id', actorFilter);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[activity] getFeedEvents error:', error);
      return [];
    }

    return (data || []) as ActivityEvent[];
  } catch (err) {
    logger.error('[activity] getFeedEvents unexpected error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable label helpers (used by UI)
// ─────────────────────────────────────────────────────────────────────────────
export function getEventLabel(event: ActivityEvent): { action: string; gradient: string } {
  switch (event.event_type) {
    case 'session_joined':
      return { action: 'a rejoint une sortie', gradient: 'from-neon-400 to-teal-500' };
    case 'session_created':
      return { action: 'a créé un run', gradient: 'from-pink-400 to-purple-500' };
    case 'friend_accepted':
      return { action: 'a rejoint la communauté', gradient: 'from-blue-400 to-indigo-500' };
    case 'badge_earned':
      return { action: 'a obtenu un badge', gradient: 'from-yellow-400 to-orange-500' };
    case 'team_joined':
      return { action: 'a rejoint une équipe', gradient: 'from-purple-400 to-pink-500' };
    default:
      return { action: 'a été actif', gradient: 'from-silver-400 to-slate-500' };
  }
}

export function getEventTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1)   return 'Hier';
  return `Il y a ${days}j`;
}
