'use server';
import { logger } from '@/lib/logger';

import { getCurrentUser, getServerSupabaseClient, getServiceSupabaseClient } from './supabase-auth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResult {
  success: boolean;
  notifications?: Notification[];
  unread_count?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — called by other server actions (not exposed to client RPC)
// Uses service role to bypass RLS (INSERT is blocked for normal users)
// ─────────────────────────────────────────────────────────────────────────────
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      data: data ?? null,
    });
  } catch (err) {
    // Non-blocking — never crash the parent action
    logger.warn('[notifications] createNotification error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-facing actions
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotifications(limit = 30): Promise<NotificationsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const supabase = await getServerSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[notifications] getNotifications error:', error);
      return { success: false, error: error.message };
    }

    const unread_count = (data || []).filter(n => !n.is_read).length;
    return { success: true, notifications: (data as Notification[]) || [], unread_count };
  } catch (err) {
    logger.error('[notifications] getNotifications unexpected error:', err);
    return { success: false, error: 'Erreur inattendue' };
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const supabase = await getServerSupabaseClient();
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const supabase = await getServerSupabaseClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
  } catch (err) {
    logger.warn('[notifications] markNotificationRead error:', err);
  }
}

export async function markAllRead(): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const supabase = await getServerSupabaseClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return { success: true };
  } catch (err) {
    logger.error('[notifications] markAllRead error:', err);
    return { success: false };
  }
}
