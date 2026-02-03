'use server';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';
import type { Profile, Session, Team } from './types';

// ============================================================================
// ADMIN VALIDATION
// ============================================================================

async function validateAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { isValid: false, error: 'Non authentifié' };
  }
  // Pour l'instant, tous les utilisateurs authentifiés peuvent accéder à l'admin
  // Vous pouvez ajouter une vérification de rôle ici plus tard
  return { isValid: true, userId: user.id };
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getAdminStats() {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    // Get counts for each entity
    const [profilesResult, sessionsResult, teamsResult, participantsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('session_participants').select('id', { count: 'exact', head: true }),
    ]);

    return {
      success: true,
      stats: {
        totalProfiles: profilesResult.count || 0,
        totalSessions: sessionsResult.count || 0,
        totalTeams: teamsResult.count || 0,
        totalParticipants: participantsResult.count || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques',
    };
  }
}

// ============================================================================
// PROFILES CRUD
// ============================================================================

export async function getAllProfiles() {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        *,
        team:teams(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, profiles };
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des profils',
    };
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, profile: data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil',
    };
  }
}

export async function deleteProfile(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    // Delete related records first
    await supabase.from('session_participants').delete().eq('user_id', id);
    await supabase.from('team_memberships').delete().eq('user_id', id);

    // Delete the profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression du profil',
    };
  }
}

// ============================================================================
// SESSIONS CRUD
// ============================================================================

export async function getAllSessions() {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username, avatar_url),
        participants:session_participants(
          id,
          status,
          user:profiles(id, username, avatar_url)
        )
      `)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return { success: true, sessions };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des sessions',
    };
  }
}

export async function updateSession(id: string, updates: Partial<Session>) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, session: data };
  } catch (error) {
    console.error('Error updating session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la session',
    };
  }
}

export async function deleteSession(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    // Delete participants first
    await supabase.from('session_participants').delete().eq('session_id', id);

    // Delete the session
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression de la session',
    };
  }
}

// ============================================================================
// TEAMS CRUD
// ============================================================================

export async function getAllTeams() {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_memberships(
          id,
          role,
          user:profiles(id, username, avatar_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, teams };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des équipes',
    };
  }
}

export async function updateTeam(id: string, updates: Partial<Team>) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, team: data };
  } catch (error) {
    console.error('Error updating team:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'équipe',
    };
  }
}

export async function deleteTeam(id: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    // Update profiles to remove team reference
    await supabase.from('profiles').update({ team_id: null }).eq('team_id', id);

    // Delete memberships
    await supabase.from('team_memberships').delete().eq('team_id', id);

    // Delete the team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting team:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'équipe',
    };
  }
}

// ============================================================================
// SESSION PARTICIPANTS MANAGEMENT
// ============================================================================

export async function removeParticipant(participantId: string) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('session_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing participant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression du participant',
    };
  }
}

export async function updateParticipantStatus(
  participantId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
) {
  const validation = await validateAdmin();
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('session_participants')
      .update({ status })
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, participant: data };
  } catch (error) {
    console.error('Error updating participant status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut',
    };
  }
}
