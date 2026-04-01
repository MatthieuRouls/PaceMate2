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
