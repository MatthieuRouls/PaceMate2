'use server';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';

export interface CreateSessionData {
  title: string;
  description?: string;
  start_time: string; // datetime-local format
  location_name: string;
  latitude?: number;
  longitude?: number;
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
    // 1. Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // 2. Convertir l'allure si renseignée
    const target_pace = data.target_pace ? convertPaceToInterval(data.target_pace) : null;

    // 3. Convertir la date en format ISO
    const start_time = new Date(data.start_time).toISOString();

    // 4. Préparer les données pour l'insertion
    const sessionData: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      creator_id: user.id,
      start_time,
      location_name: data.location_name,
      distance_km: data.distance_km,
      session_type: data.session_type || null,
      level_required: data.level_required,
      target_pace,
      walk_breaks_ok: data.walk_breaks_ok,
      max_participants: data.max_participants,
    };

    if (data.latitude != null && data.longitude != null) {
      sessionData.latitude = data.latitude;
      sessionData.longitude = data.longitude;
    }

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

    // 6. Ajouter le créateur comme participant confirmé
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: user.id,
        status: 'confirmed',
      });

    if (participantError) {
      console.error('Error adding creator as participant:', participantError);
      // On ne bloque pas car la session est créée
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
  description: string
): Promise<CreateTeamResult> {
  try {
    // Récupérer l'utilisateur connecté et le client serveur
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

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
        user_id: user.id,
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
      .eq('id', user.id);

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
export async function leaveTeam(teamId: string): Promise<ActionResult> {
  try {
    // Récupérer l'utilisateur connecté et le client serveur
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // 1. Supprimer l'entrée dans team_memberships
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .delete()
      .eq('user_id', user.id)
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
      .eq('id', user.id);

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
    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('total_distance', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching teams leaderboard:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Récupérer tous les membres en une seule requête
    const teamIds = data.map(t => t.id);
    const { data: allMemberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .in('team_id', teamIds);

    // Compter les membres par équipe
    const memberCounts: Record<string, number> = {};
    (allMemberships || []).forEach(m => {
      memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1;
    });

    // Ajouter les counts aux équipes
    const teamsWithCounts = data.map(team => ({
      ...team,
      members_count: memberCounts[team.id] || 0,
    }));

    return teamsWithCounts;
  } catch (error) {
    console.error('Error in getTeamsLeaderboard:', error);
    throw error;
  }
}

/**
 * Récupérer l'équipe de l'utilisateur
 */
export async function getUserTeam() {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await getServerSupabaseClient();

    // 1. Récupérer le profil avec team_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
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
export async function getUserProfile() {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await getServerSupabaseClient();

    // 1. Récupérer le profil avec tous les champs
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // 2. Récupérer l'équipe si team_id existe
    let team = null;
    if (profile.team_id) {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();

      if (!teamError && teamData) {
        team = teamData;
      }
    }

    // 3. Compter les sessions complétées
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // 4. Retourner le profil avec l'équipe et le compteur de sessions
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
export async function getUserUpcomingSessions() {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const supabase = await getServerSupabaseClient();

    // 1. Récupérer les IDs des sessions confirmées de l'utilisateur
    const { data: participations, error: participationsError } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (participationsError) {
      console.error('Error fetching participations:', participationsError);
      return [];
    }

    if (!participations || participations.length === 0) {
      return [];
    }

    // 2. Récupérer les sessions correspondantes
    const sessionIds = participations.map((p) => p.session_id);
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .in('id', sessionIds)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('Error in getUserUpcomingSessions:', error);
    return [];
  }
}

/**
 * Récupérer l'historique des sessions complétées de l'utilisateur
 */
export async function getUserSessionHistory() {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const supabase = await getServerSupabaseClient();

    // 1. Récupérer les participations complétées
    const { data: participations, error: participationsError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .limit(5);

    if (participationsError) {
      console.error('Error fetching participations:', participationsError);
      return [];
    }

    if (!participations || participations.length === 0) {
      return [];
    }

    // 2. Récupérer les sessions correspondantes
    const sessionIds = participations.map((p) => p.session_id);
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .in('id', sessionIds)
      .lt('start_time', new Date().toISOString())
      .order('start_time', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return [];
    }

    // 3. Joindre les sessions aux participations
    const participationsWithSessions = participations
      .map((participation) => {
        const session = sessions?.find((s) => s.id === participation.session_id);
        if (!session) return null;
        return {
          ...participation,
          session,
        };
      })
      .filter((p) => p !== null);

    return participationsWithSessions;
  } catch (error) {
    console.error('Error in getUserSessionHistory:', error);
    return [];
  }
}

// ============================================
// SESSION PARTICIPATION ACTIONS
// ============================================

/**
 * Récupérer les détails complets d'une session
 */
export async function getSessionDetails(sessionId: string) {
  try {
    const supabase = await getServerSupabaseClient();

    // 1. Récupérer la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError);
      return null;
    }

    // 2. Récupérer le créateur
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, username, running_level, avatar_url')
      .eq('id', session.creator_id)
      .single();

    // 3. Récupérer les participants confirmés
    const { data: participations } = await supabase
      .from('session_participants')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed');

    const participantIds = (participations || []).map((p) => p.user_id);

    let participants: any[] = [];
    if (participantIds.length > 0) {
      const { data: participantProfiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', participantIds);

      participants = participantProfiles || [];
    }

    return {
      ...session,
      creator,
      participants,
      participants_count: participants.length,
    };
  } catch (error) {
    console.error('Error in getSessionDetails:', error);
    return null;
  }
}

/**
 * Vérifier le statut de participation de l'utilisateur à une session
 */
export async function getUserSessionStatus(sessionId: string) {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await getServerSupabaseClient();

    const { data, error } = await supabase
      .from('session_participants')
      .select('status, rating')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user session status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserSessionStatus:', error);
    return null;
  }
}

/**
 * Rejoindre une session
 */
export async function joinSession(sessionId: string): Promise<ActionResult> {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // 1. Vérifier que la session existe et n'est pas passée
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('start_time, max_participants')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Session introuvable',
      };
    }

    // Vérifier que la session n'est pas passée
    if (new Date(session.start_time) < new Date()) {
      return {
        success: false,
        error: 'Cette session est déjà passée',
      };
    }

    // 2. Vérifier que l'utilisateur n'est pas déjà inscrit
    const { data: existing } = await supabase
      .from('session_participants')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.status === 'confirmed') {
      return {
        success: false,
        error: 'Vous participez déjà à cette session',
      };
    }

    // 3. Vérifier que la session n'est pas complète
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'confirmed');

    if (count && count >= session.max_participants) {
      return {
        success: false,
        error: 'Cette session est complète',
      };
    }

    // 4. Créer ou mettre à jour la participation
    if (existing) {
      // Réactiver une participation annulée
      const { error: updateError } = await supabase
        .from('session_participants')
        .update({ status: 'confirmed' })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating participation:', updateError);
        return {
          success: false,
          error: 'Erreur lors de la mise à jour de la participation',
        };
      }
    } else {
      // Créer une nouvelle participation
      const { error: insertError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          status: 'confirmed',
        });

      if (insertError) {
        console.error('Error creating participation:', insertError);
        return {
          success: false,
          error: 'Erreur lors de l\'inscription à la session',
        };
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in joinSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

/**
 * Quitter une session
 */
export async function leaveSession(sessionId: string): Promise<ActionResult> {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // Mettre le statut à 'cancelled' au lieu de supprimer
    const { error } = await supabase
      .from('session_participants')
      .update({ status: 'cancelled' })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving session:', error);
      return {
        success: false,
        error: 'Erreur lors du désistement',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in leaveSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

/**
 * Supprimer une session (uniquement pour le créateur)
 */
export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que l'utilisateur est bien le créateur de la session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('creator_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return {
        success: false,
        error: 'Session introuvable',
      };
    }

    if (session.creator_id !== user.id) {
      return {
        success: false,
        error: 'Vous n\'êtes pas autorisé à supprimer cette session',
      };
    }

    // Supprimer d'abord tous les participants
    const { error: deleteParticipantsError } = await supabase
      .from('session_participants')
      .delete()
      .eq('session_id', sessionId);

    if (deleteParticipantsError) {
      console.error('Error deleting session participants:', deleteParticipantsError);
      return {
        success: false,
        error: 'Erreur lors de la suppression des participants',
      };
    }

    // Supprimer la session
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return {
        success: false,
        error: 'Erreur lors de la suppression de la session',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in deleteSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

/**
 * Noter une session et gagner des XP
 */
export async function rateSession(
  sessionId: string,
  rating: number,
  comment?: string
): Promise<ActionResult> {
  try {
    // Récupérer l'utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Non authentifié',
      };
    }

    const supabase = await getServerSupabaseClient();

    // 1. Mettre à jour la participation avec la note
    const { error: updateError } = await supabase
      .from('session_participants')
      .update({
        status: 'completed',
        rating,
        // Note: si vous voulez stocker le commentaire, ajoutez ce champ à la table
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error rating session:', updateError);
      return {
        success: false,
        error: 'Erreur lors de l\'enregistrement de la note',
      };
    }

    // 2. Calculer les XP à ajouter
    let xpToAdd = 10; // XP de base
    if (rating >= 4) {
      xpToAdd += 5; // Bonus pour bonne note
    }

    // 3. Récupérer les XP actuels
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for XP:', profileError);
      // Continuer quand même, la note a été enregistrée
      return {
        success: true,
      };
    }

    // 4. Mettre à jour les XP
    const newXp = (profile.xp_points || 0) + xpToAdd;
    const { error: xpError } = await supabase
      .from('profiles')
      .update({ xp_points: newXp })
      .eq('id', user.id);

    if (xpError) {
      console.error('Error updating XP:', xpError);
      // La note a été enregistrée, c'est l'essentiel
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in rateSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

// ============================================
// HOMEPAGE ACTIONS
// ============================================

/**
 * Récupérer les prochaines sessions pour la homepage
 */
export async function getUpcomingSessions(limit: number = 3) {
  try {
    const supabase = await getServerSupabaseClient();

    // Récupérer les sessions avec le créateur en une seule requête (JOIN)
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username, running_level, avatar_url)
      `)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Récupérer tous les participants confirmés en une seule requête
    const sessionIds = sessions.map(s => s.id);
    const { data: allParticipants } = await supabase
      .from('session_participants')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('status', 'confirmed');

    // Compter les participants par session
    const participantCounts: Record<string, number> = {};
    (allParticipants || []).forEach(p => {
      participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
    });

    // Ajouter les counts aux sessions
    const sessionsWithDetails = sessions.map(session => ({
      ...session,
      participants_count: participantCounts[session.id] || 0,
    }));

    return sessionsWithDetails;
  } catch (error) {
    console.error('Error in getUpcomingSessions:', error);
    return [];
  }
}

/**
 * Récupérer le top des équipes pour la homepage
 */
export async function getTopTeams(limit: number = 3) {
  try {
    const supabase = await getServerSupabaseClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('total_distance', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top teams:', error);
      return [];
    }

    // Compter les membres de chaque équipe
    const teamsWithCounts = await Promise.all(
      (teams || []).map(async (team) => {
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
    console.error('Error in getTopTeams:', error);
    return [];
  }
}

/**
 * Calcul de distance Haversine cote client (en km)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Récupérer toutes les sessions à venir (pour la page /sessions)
 * Si userLat/userLng fournis, calcule la distance et peut filtrer par rayon
 */
export async function getAllUpcomingSessions(options?: {
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
}) {
  try {
    const supabase = await getServerSupabaseClient();
    const now = new Date().toISOString();

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username)
      `)
      .gte('start_time', now)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching all sessions:', error);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Récupérer tous les participants confirmés en une seule requête
    const sessionIds = sessions.map(s => s.id);
    const { data: allParticipants } = await supabase
      .from('session_participants')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('status', 'confirmed');

    // Compter les participants par session
    const participantCounts: Record<string, number> = {};
    (allParticipants || []).forEach(p => {
      participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
    });

    // Ajouter les counts et distance aux sessions
    const userLat = options?.userLat;
    const userLng = options?.userLng;
    const radiusKm = options?.radiusKm;

    let sessionsWithDetails = sessions.map(session => {
      let distance_from_user: number | undefined;
      if (userLat != null && userLng != null && session.latitude != null && session.longitude != null) {
        distance_from_user = Math.round(haversineDistance(userLat, userLng, session.latitude, session.longitude) * 10) / 10;
      }
      return {
        ...session,
        participants_count: participantCounts[session.id] || 0,
        distance_from_user,
      };
    });

    // Filtrer par rayon si demande
    if (radiusKm != null && userLat != null && userLng != null) {
      sessionsWithDetails = sessionsWithDetails.filter(s =>
        s.distance_from_user == null || s.distance_from_user <= radiusKm
      );
    }

    return sessionsWithDetails;
  } catch (error) {
    console.error('Error in getAllUpcomingSessions:', error);
    return [];
  }
}

/**
 * Mettre a jour la localisation du profil utilisateur
 */
export async function updateProfileLocation(data: {
  home_latitude: number;
  home_longitude: number;
  home_city: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifie' };

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        home_latitude: data.home_latitude,
        home_longitude: data.home_longitude,
        home_city: data.home_city,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile location:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateProfileLocation:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Récupérer les sessions auxquelles l'utilisateur est inscrit ou qu'il a créées
 */
export async function getUserSessions() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { upcomingJoined: [], pastJoined: [], upcomingCreated: [], pastCreated: [] };
    }

    const supabase = await getServerSupabaseClient();
    const now = new Date().toISOString();

    // Récupérer les sessions créées par l'utilisateur
    const { data: createdSessions, error: createdError } = await supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username)
      `)
      .eq('creator_id', user.id)
      .order('start_time', { ascending: true });

    if (createdError) {
      console.error('Error fetching created sessions:', createdError);
    }

    // Récupérer les IDs des sessions auxquelles l'utilisateur participe
    const { data: participations, error: participationsError } = await supabase
      .from('session_participants')
      .select('session_id, status')
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (participationsError) {
      console.error('Error fetching user participations:', participationsError);
    }

    const sessionIds = participations?.map((p) => p.session_id) || [];

    // Récupérer les détails des sessions rejointes (exclure celles créées par l'utilisateur)
    let joinedSessions = [];
    if (sessionIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          creator:profiles!sessions_creator_id_fkey(id, username)
        `)
        .in('id', sessionIds)
        .neq('creator_id', user.id) // Exclure les sessions créées par l'utilisateur
        .order('start_time', { ascending: true});

      if (!sessionsError && sessions) {
        joinedSessions = sessions;
      }
    }

    // Compter les participants pour toutes les sessions en une seule requête
    const allSessions = [...(createdSessions || []), ...joinedSessions];
    const allSessionIds = allSessions.map(s => s.id);

    // Récupérer tous les participants confirmés en une seule requête
    const { data: allParticipants } = await supabase
      .from('session_participants')
      .select('session_id')
      .in('session_id', allSessionIds)
      .eq('status', 'confirmed');

    // Compter les participants par session
    const participantCounts: Record<string, number> = {};
    (allParticipants || []).forEach(p => {
      participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
    });

    // Ajouter les counts aux sessions
    const sessionsWithCounts = allSessions.map(session => ({
      ...session,
      participants_count: participantCounts[session.id] || 0,
    }));

    // Séparer par type et par date
    const createdSessionIds = new Set((createdSessions || []).map(s => s.id));

    const upcomingCreated = sessionsWithCounts.filter((s) => createdSessionIds.has(s.id) && s.start_time >= now);
    const pastCreated = sessionsWithCounts.filter((s) => createdSessionIds.has(s.id) && s.start_time < now);
    const upcomingJoined = sessionsWithCounts.filter((s) => !createdSessionIds.has(s.id) && s.start_time >= now);
    const pastJoined = sessionsWithCounts.filter((s) => !createdSessionIds.has(s.id) && s.start_time < now);

    return { upcomingJoined, pastJoined, upcomingCreated, pastCreated };
  } catch (error) {
    console.error('Error in getUserSessions:', error);
    return { upcomingJoined: [], pastJoined: [], upcomingCreated: [], pastCreated: [] };
  }
}
