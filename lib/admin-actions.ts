'use server';

import { getCurrentUser, getServerSupabaseClient, getServiceSupabaseClient } from './supabase-auth';
import type { Profile, Session, Team } from './types';

// ============================================================================
// ADMIN VALIDATION
// ============================================================================

async function validateAdmin() {
  const user = await getCurrentUser();
  if (!user) return { isValid: false, error: 'Non authentifié' as string };

  const supabase = await getServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { isValid: false, error: 'Accès refusé — compte admin requis' as string };
  }

  return { isValid: true, userId: user.id };
}

async function logAdminAction(
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getAdminStats() {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();

    const [
      profilesResult,
      sessionsResult,
      teamsResult,
      participantsResult,
      phoneVerifiedResult,
      idVerifiedResult,
      suspendedResult,
      upcomingResult,
      recentUsersResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('session_participants').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('phone_verified', true),
      supabase.from('identity_verifications').select('id', { count: 'exact', head: true }).eq('id_verified', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).gte('start_time', new Date().toISOString()),
      supabase.from('profiles').select('id, username, created_at, avatar_url').order('created_at', { ascending: false }).limit(5),
    ]);

    return {
      success: true,
      stats: {
        totalProfiles: profilesResult.count || 0,
        totalSessions: sessionsResult.count || 0,
        totalTeams: teamsResult.count || 0,
        totalParticipants: participantsResult.count || 0,
        phoneVerifiedCount: phoneVerifiedResult.count || 0,
        idVerifiedCount: idVerifiedResult.count || 0,
        suspendedCount: suspendedResult.count || 0,
        upcomingSessions: upcomingResult.count || 0,
        recentUsers: recentUsersResult.data || [],
      },
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return { success: false, error: 'Erreur statistiques' };
  }
}

export async function getAdminActivityLog(limit = 20) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*, admin:profiles(username)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, logs: data || [] };
  } catch (error) {
    return { success: false, error: 'Erreur logs' };
  }
}

// ============================================================================
// PROFILES CRUD
// ============================================================================

export async function getAllProfiles(search?: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();

    let query = supabase
      .from('profiles')
      .select(`
        *,
        team:teams(id, name)
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    // Fetch identity verifications separately (FK is to auth.users, not profiles)
    const { data: identities } = await supabase
      .from('identity_verifications')
      .select('user_id, id_verified, level, level_name, selfie_match_score, admin_review_required, id_document_type, id_verified_at, verification_attempts');

    const identityMap = new Map((identities || []).map((i: Record<string, unknown>) => [(i.user_id as string), i]));

    const profilesWithIdentity = (profiles || []).map((p: Record<string, unknown>) => ({
      ...p,
      identity_verification: identityMap.get(p.id) || null,
    }));

    return { success: true, profiles: profilesWithIdentity };
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return { success: false, error: 'Erreur récupération profils' };
  }
}

export async function updateAdminProfile(id: string, updates: Partial<Profile>) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(validation.userId!, 'update_profile', 'profile', id, { fields: Object.keys(updates) });
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: 'Erreur mise à jour profil' };
  }
}

// Rétrocompatibilité
export async function updateProfile(id: string, updates: Partial<Profile>) {
  return updateAdminProfile(id, updates);
}

export async function suspendUser(id: string, reason: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: true, suspension_reason: reason })
      .eq('id', id);

    if (error) throw error;
    await logAdminAction(validation.userId!, 'suspend_user', 'profile', id, { reason });
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur suspension' };
  }
}

export async function unsuspendUser(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: false, suspension_reason: null })
      .eq('id', id);

    if (error) throw error;
    await logAdminAction(validation.userId!, 'unsuspend_user', 'profile', id);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur réactivation' };
  }
}

export async function grantAdminRole(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', id);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'grant_admin', 'profile', id);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur attribution admin' };
  }
}

export async function revokeAdminRole(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  // Prevent self-revocation
  if (id === validation.userId) {
    return { success: false, error: 'Impossible de retirer ses propres droits admin' };
  }

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase.from('profiles').update({ is_admin: false }).eq('id', id);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'revoke_admin', 'profile', id);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur révocation admin' };
  }
}

export async function forcePhoneVerified(userId: string, phone: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ phone_number: phone, phone_verified: true })
      .eq('id', userId);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'force_phone_verified', 'profile', userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur' };
  }
}

export async function deleteProfile(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  if (id === validation.userId) {
    return { success: false, error: 'Impossible de supprimer son propre compte depuis l\'admin' };
  }

  try {
    const supabase = getServiceSupabaseClient();
    await Promise.all([
      supabase.from('session_participants').delete().eq('user_id', id),
      supabase.from('team_memberships').delete().eq('user_id', id),
      supabase.from('identity_verifications').delete().eq('user_id', id),
    ]);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'delete_profile', 'profile', id);
    return { success: true };
  } catch (error) {
    console.error('deleteProfile error:', error);
    return { success: false, error: (error as Error).message || 'Erreur suppression' };
  }
}

// ============================================================================
// IDENTITY VERIFICATION REVIEW
// ============================================================================

export async function getPendingIdentityReviews() {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('identity_verifications')
      .select(`
        *,
        user:profiles(id, username, email, avatar_url)
      `)
      .eq('admin_review_required', true)
      .eq('id_verified', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, reviews: data || [] };
  } catch {
    return { success: false, error: 'Erreur révisions' };
  }
}

export async function getAllIdentityVerifications() {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('identity_verifications')
      .select(`
        *,
        user:profiles(id, username, email, avatar_url)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { success: true, verifications: data || [] };
  } catch {
    return { success: false, error: 'Erreur vérifications' };
  }
}

export async function approveIdentityVerification(verificationId: string, userId: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('identity_verifications')
      .update({
        id_verified: true,
        id_verified_at: now,
        selfie_match_passed: true,
        admin_review_required: false,
        admin_reviewer_id: validation.userId,
        admin_reviewed_at: now,
        level: 2,
        level_name: 'id_verified',
      })
      .eq('id', verificationId);

    if (error) throw error;

    await logAdminAction(validation.userId!, 'approve_identity', 'identity_verification', verificationId, { user_id: userId });
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur approbation' };
  }
}

export async function rejectIdentityVerification(verificationId: string, userId: string, reason: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('identity_verifications')
      .update({
        id_verified: false,
        selfie_match_passed: false,
        admin_review_required: false,
        admin_review_reason: reason,
        admin_reviewer_id: validation.userId,
        admin_reviewed_at: now,
      })
      .eq('id', verificationId);

    if (error) throw error;

    await logAdminAction(validation.userId!, 'reject_identity', 'identity_verification', verificationId, { reason, user_id: userId });
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur rejet' };
  }
}

export async function forceIdentityVerified(userId: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const now = new Date().toISOString();

    await supabase.from('identity_verifications').upsert({
      user_id: userId,
      level: 2,
      level_name: 'id_verified',
      id_verified: true,
      id_verified_at: now,
      selfie_match_passed: true,
      admin_review_required: false,
      admin_reviewer_id: validation.userId,
      admin_reviewed_at: now,
      verification_attempts: 1,
      last_attempt_at: now,
      selfie_match_score: 100,
      flagged_for_fraud: false,
      phone_verified: false,
      updated_at: now,
    }, { onConflict: 'user_id' });

    await logAdminAction(validation.userId!, 'force_identity_verified', 'profile', userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur' };
  }
}

export async function resetIdentityVerification(userId: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('identity_verifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    await logAdminAction(validation.userId!, 'reset_identity', 'profile', userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur réinitialisation' };
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export async function getFeatureFlags() {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return { success: true, flags: data || [] };
  } catch {
    return { success: false, error: 'Erreur chargement flags' };
  }
}

export async function updateFeatureFlag(key: string, value: boolean | number | string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(value), updated_at: new Date().toISOString(), updated_by: validation.userId })
      .eq('key', key);

    if (error) throw error;
    await logAdminAction(validation.userId!, 'update_feature_flag', 'app_settings', key, { value });
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur mise à jour flag' };
  }
}

// ============================================================================
// SESSIONS CRUD
// ============================================================================

export async function getAllSessions(filter?: 'all' | 'upcoming' | 'past') {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username, avatar_url),
        participants:session_participants(
          id, status,
          user:profiles(id, username, avatar_url)
        )
      `);

    if (filter === 'upcoming') query = query.gte('start_time', now);
    else if (filter === 'past') query = query.lt('start_time', now);

    query = query.order('start_time', { ascending: filter !== 'past' });

    const { data: sessions, error } = await query;
    if (error) throw error;
    return { success: true, sessions };
  } catch (error) {
    return { success: false, error: 'Erreur récupération sessions' };
  }
}

export async function updateSession(id: string, updates: Partial<Session>) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await logAdminAction(validation.userId!, 'update_session', 'session', id);
    return { success: true, session: data };
  } catch {
    return { success: false, error: 'Erreur mise à jour session' };
  }
}

export async function deleteSession(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from('session_participants').delete().eq('session_id', id);
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'delete_session', 'session', id);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur suppression session' };
  }
}

// ============================================================================
// TEAMS CRUD
// ============================================================================

export async function getAllTeams() {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_memberships(
          id, role,
          user:profiles(id, username, avatar_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, teams };
  } catch {
    return { success: false, error: 'Erreur récupération équipes' };
  }
}

export async function updateTeam(id: string, updates: Partial<Team>) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.from('teams').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await logAdminAction(validation.userId!, 'update_team', 'team', id);
    return { success: true, team: data };
  } catch {
    return { success: false, error: 'Erreur mise à jour équipe' };
  }
}

export async function deleteTeam(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from('profiles').update({ team_id: null }).eq('team_id', id);
    await supabase.from('team_memberships').delete().eq('team_id', id);
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
    await logAdminAction(validation.userId!, 'delete_team', 'team', id);
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur suppression équipe' };
  }
}

// ============================================================================
// SESSION PARTICIPANTS
// ============================================================================

export async function removeParticipant(participantId: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase.from('session_participants').delete().eq('id', participantId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Erreur suppression participant' };
  }
}

export async function updateParticipantStatus(
  participantId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
) {
  const validation = await validateAdmin();
  if (!validation.isValid) return { success: false, error: validation.error };

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('session_participants')
      .update({ status })
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, participant: data };
  } catch {
    return { success: false, error: 'Erreur mise à jour statut' };
  }
}
