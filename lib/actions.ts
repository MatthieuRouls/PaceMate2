'use server';

import { supabase } from './supabase';

export interface CreateSessionData {
  title: string;
  description?: string;
  start_time: string; // datetime-local format
  location_name: string;
  distance_km: number;
  session_type?: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
  level_required: number;
  target_pace?: string; // Format: "5:30"
  walk_breaks_ok: boolean;
  max_participants: number;
}

export interface CreateSessionResult {
  success: boolean;
  session_id?: string;
  error?: string;
}

/**
 * Convertit une allure "5:30" en interval PostgreSQL "00:05:30"
 */
function convertPaceToInterval(pace: string): string | null {
  if (!pace || !pace.trim()) return null;

  // Format attendu: "5:30" ou "5:30:45" (min:sec ou min:sec:centièmes)
  const parts = pace.split(':');
  if (parts.length < 2) return null;

  const minutes = parts[0].padStart(2, '0');
  const seconds = parts[1].padStart(2, '0');

  return `00:${minutes}:${seconds}`;
}

/**
 * Crée une nouvelle session running
 */
export async function createSession(data: CreateSessionData): Promise<CreateSessionResult> {
  try {
    // 1. Récupérer le premier profil pour creator_id (en dur pour l'instant)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profileError || !profiles) {
      console.error('Error fetching profile:', profileError);
      return {
        success: false,
        error: 'Impossible de récupérer le profil utilisateur. Veuillez créer un profil d\'abord.',
      };
    }

    const creator_id = profiles.id;

    // 2. Convertir l'allure si renseignée
    const target_pace = data.target_pace ? convertPaceToInterval(data.target_pace) : null;

    // 3. Convertir la date en format ISO
    const start_time = new Date(data.start_time).toISOString();

    // 4. Préparer les données pour l'insertion
    const sessionData = {
      title: data.title,
      description: data.description || null,
      creator_id,
      start_time,
      location_name: data.location_name,
      distance_km: data.distance_km,
      session_type: data.session_type || null,
      level_required: data.level_required,
      target_pace,
      walk_breaks_ok: data.walk_breaks_ok,
      max_participants: data.max_participants,
    };

    // 5. Insérer dans Supabase
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting session:', insertError);
      return {
        success: false,
        error: `Erreur lors de la création de la session: ${insertError.message}`,
      };
    }

    return {
      success: true,
      session_id: session.id,
    };
  } catch (error) {
    console.error('Unexpected error in createSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

// ============================================
// TEAM ACTIONS
// ============================================

export interface CreateTeamResult {
  success: boolean;
  team_id?: string;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Crée une nouvelle équipe et ajoute l'utilisateur comme capitaine
 */
export async function createTeam(
  name: string,
  description: string,
  userId: string
): Promise<CreateTeamResult> {
  try {
    // Validation
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Le nom de l\'équipe ne peut pas être vide',
      };
    }

    if (name.length > 50) {
      return {
        success: false,
        error: 'Le nom de l\'équipe ne peut pas dépasser 50 caractères',
      };
    }

    // 1. Créer l'équipe
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        total_distance: 0,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);

      // Vérifier si c'est une erreur de duplication de nom
      if (teamError.code === '23505') {
        return {
          success: false,
          error: 'Ce nom d\'équipe est déjà pris',
        };
      }

      return {
        success: false,
        error: `Erreur lors de la création de l'équipe: ${teamError.message}`,
      };
    }

    // 2. Ajouter l'utilisateur comme capitaine dans team_memberships
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'captain',
      });

    if (membershipError) {
      console.error('Error creating team membership:', membershipError);

      // Nettoyer : supprimer l'équipe créée
      await supabase.from('teams').delete().eq('id', team.id);

      return {
        success: false,
        error: 'Erreur lors de l\'ajout du capitaine à l\'équipe',
      };
    }

    // 3. Mettre à jour le team_id du profil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: team.id })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);

      // Nettoyer
      await supabase.from('team_memberships').delete().eq('team_id', team.id);
      await supabase.from('teams').delete().eq('id', team.id);

      return {
        success: false,
        error: 'Erreur lors de la mise à jour du profil',
      };
    }

    return {
      success: true,
      team_id: team.id,
    };
  } catch (error) {
    console.error('Unexpected error in createTeam:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

/**
 * Quitter une équipe
 */
export async function leaveTeam(userId: string, teamId: string): Promise<ActionResult> {
  try {
    // 1. Supprimer l'entrée dans team_memberships
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (membershipError) {
      console.error('Error deleting team membership:', membershipError);
      return {
        success: false,
        error: 'Erreur lors de la suppression de l\'appartenance à l\'équipe',
      };
    }

    // 2. Mettre team_id à NULL dans profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du profil',
      };
    }

    // 3. Vérifier si c'était le dernier membre
    const { data: remainingMembers, error: countError } = await supabase
      .from('team_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) {
      console.error('Error counting remaining members:', countError);
      // Continuer quand même, c'est pas critique
    } else if (remainingMembers && (remainingMembers as any).count === 0) {
      // Si c'était le dernier membre, supprimer l'équipe
      await supabase.from('teams').delete().eq('id', teamId);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in leaveTeam:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

/**
 * Récupérer le classement des équipes
 */
export async function getTeamsLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('total_distance', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching teams leaderboard:', error);
      throw error;
    }

    // Compter les membres de chaque équipe
    const teamsWithCounts = await Promise.all(
      (data || []).map(async (team) => {
        const { count } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        return {
          ...team,
          members_count: count || 0,
        };
      })
    );

    return teamsWithCounts;
  } catch (error) {
    console.error('Error in getTeamsLeaderboard:', error);
    throw error;
  }
}

/**
 * Récupérer l'équipe de l'utilisateur
 */
export async function getUserTeam(userId: string) {
  try {
    // 1. Récupérer le profil avec team_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.team_id) {
      return null;
    }

    // 2. Récupérer les détails de l'équipe
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', profile.team_id)
      .single();

    if (teamError || !team) {
      return null;
    }

    // 3. Compter les membres
    const { count } = await supabase
      .from('team_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    return {
      ...team,
      members_count: count || 0,
    };
  } catch (error) {
    console.error('Error in getUserTeam:', error);
    return null;
  }
}

// ============================================
// PROFILE ACTIONS
// ============================================

/**
 * Récupérer le profil complet de l'utilisateur avec ses statistiques
 */
export async function getUserProfile(userId: string) {
  try {
    // 1. Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // 2. Récupérer l'équipe si team_id existe
    let team = null;
    if (profile.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();

      team = teamData;
    }

    // 3. Compter les sessions complétées
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    return {
      ...profile,
      team,
      completed_sessions_count: count || 0,
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Récupérer les prochaines sessions de l'utilisateur
 */
export async function getUserUpcomingSessions(userId: string) {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .select(`
        *,
        session:sessions(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('sessions.start_time', new Date().toISOString())
      .order('sessions.start_time', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      throw error;
    }

    // Filtrer et mapper pour ne garder que les sessions
    const sessions = (data || [])
      .filter((participant) => participant.session)
      .map((participant) => participant.session);

    return sessions;
  } catch (error) {
    console.error('Error in getUserUpcomingSessions:', error);
    throw error;
  }
}

/**
 * Récupérer l'historique des sessions complétées de l'utilisateur
 */
export async function getUserSessionHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .select(`
        *,
        session:sessions(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .lt('sessions.start_time', new Date().toISOString())
      .order('sessions.start_time', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching session history:', error);
      throw error;
    }

    // Retourner les participations avec les sessions
    return (data || []).filter((participant) => participant.session);
  } catch (error) {
    console.error('Error in getUserSessionHistory:', error);
    throw error;
  }
}
