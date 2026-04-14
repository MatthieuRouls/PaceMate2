'use server';
import { logger } from '@/lib/logger';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';
import { updateStatsOnRunComplete } from './stats-actions';
import { logActivity } from './activity-actions';
import { createNotification } from './notification-actions';
import { sendSessionJoinEmail } from './email';
import type { Session } from './types';
import type { ManualLevelAnswers } from './level-manual';

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
      logger.error('Error inserting session:', insertError);
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
      logger.error('Error adding creator as participant:', participantError);
      // On ne bloque pas car la session est créée
    }

    // Log activity (non-blocking)
    logActivity(user.id, 'session_created', 'session', session.id, sessionData.title as string);

    return {
      success: true,
      session_id: session.id,
    };
  } catch (error) {
    logger.error('Unexpected error in createSession:', error);
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
      logger.error('Error creating team:', teamError);

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
      logger.error('Error creating team membership:', membershipError);

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
      logger.error('Error updating profile:', profileError);

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
    logger.error('Unexpected error in createTeam:', error);
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
      logger.error('Error deleting team membership:', membershipError);
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
      logger.error('Error updating profile:', profileError);
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
      logger.error('Error counting remaining members:', countError);
      // Continuer quand même, c'est pas critique
    } else if (remainingMembers && (remainingMembers as any).count === 0) {
      // Si c'était le dernier membre, supprimer l'équipe
      await supabase.from('teams').delete().eq('id', teamId);
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Unexpected error in leaveTeam:', error);
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
      logger.error('Error fetching teams leaderboard:', error);
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
    logger.error('Error in getTeamsLeaderboard:', error);
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
    logger.error('Error in getUserTeam:', error);
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
      logger.error('Error fetching profile:', profileError);
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
    logger.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Récupérer les prochaines sessions de l'utilisateur
 * Inclut les sessions où l'utilisateur est participant OU créateur
 */
export async function getUserUpcomingSessions() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const supabase = await getServerSupabaseClient();
    const now = new Date().toISOString();

    // 1. Récupérer les IDs des sessions où l'utilisateur est participant confirmé
    const { data: participations } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    const participationIds = (participations || []).map((p) => p.session_id);

    // 2. Récupérer les sessions créées par l'utilisateur OU où il est participant
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .gte('start_time', now)
      .or(`creator_id.eq.${user.id},id.in.(${participationIds.length > 0 ? participationIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('start_time', { ascending: true })
      .limit(3);

    if (sessionsError) {
      logger.error('Error fetching sessions:', sessionsError);
      return [];
    }

    return sessions || [];
  } catch (error) {
    logger.error('Error in getUserUpcomingSessions:', error);
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
      logger.error('Error fetching participations:', participationsError);
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
      logger.error('Error fetching sessions:', sessionsError);
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
    logger.error('Error in getUserSessionHistory:', error);
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
      logger.error('Error fetching session:', sessionError);
      return null;
    }

    // 2. Récupérer le créateur
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, username, running_level, avatar_url, runs_hosted, reliability_score, phone_verified')
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
    logger.error('Error in getSessionDetails:', error);
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
      logger.error('Error fetching user session status:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getUserSessionStatus:', error);
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
        logger.error('Error updating participation:', updateError);
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
        logger.error('Error creating participation:', insertError);
        return {
          success: false,
          error: 'Erreur lors de l\'inscription à la session',
        };
      }
    }

    // Notify creator + log activity (non-blocking)
    const { data: sessionInfo } = await supabase
      .from('sessions')
      .select('title, creator_id, creator:profiles!sessions_creator_id_fkey(email, username)')
      .eq('id', sessionId)
      .single();

    const joinerProfile = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (sessionInfo) {
      const joinerName = joinerProfile.data?.username ?? 'Quelqu\'un';
      const creatorId = sessionInfo.creator_id as string;
      const creatorRaw = sessionInfo.creator as unknown;
      const creator = (Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw) as { email: string; username: string } | null;

      // Only notify if joiner ≠ creator
      if (creatorId !== user.id) {
        createNotification(
          creatorId,
          'session_join',
          `${joinerName} rejoint votre run`,
          `"${sessionInfo.title}"`,
          { session_id: sessionId, joiner_id: user.id }
        );
        if (creator?.email) {
          sendSessionJoinEmail({
            creatorEmail: creator.email,
            joinerName,
            sessionTitle: sessionInfo.title as string,
            sessionDate: session.start_time as string,
            sessionId,
          });
        }
      }

      logActivity(user.id, 'session_joined', 'session', sessionId, sessionInfo.title as string);
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Unexpected error in joinSession:', error);
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
      logger.error('Error leaving session:', error);
      return {
        success: false,
        error: 'Erreur lors du désistement',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Unexpected error in leaveSession:', error);
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
      logger.error('Error deleting session participants:', deleteParticipantsError);
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
      logger.error('Error deleting session:', deleteError);
      return {
        success: false,
        error: 'Erreur lors de la suppression de la session',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Unexpected error in deleteSession:', error);
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
      logger.error('Error rating session:', updateError);
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
      logger.error('Error fetching profile for XP:', profileError);
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
      logger.error('Error updating XP:', xpError);
      // La note a été enregistrée, c'est l'essentiel
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Unexpected error in rateSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}

// ============================================
// POST-RUN FLOW
// ============================================

export interface PeerFeedbackInput {
  userId: string;
  rating: 'positive' | 'neutral' | 'negative';
  flags?: string[];
}

export interface CompleteRunResult {
  success: boolean;
  xpGained?: number;
  kmAdded?: number;
  totalKm?: number;
  totalXp?: number;
  teamKmAdded?: number;
  error?: string;
}

/**
 * Valider la participation à une sortie terminée.
 * - Si participated=true : marque completed, met à jour les stats, enregistre les peer feedbacks.
 * - Si participated=false : marque cancelled.
 */
export async function completeRun(
  sessionId: string,
  data: {
    participated: boolean;
    sessionRating?: number;      // 1-5
    sessionComment?: string;
    peerFeedbacks?: PeerFeedbackInput[];
  }
): Promise<CompleteRunResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const supabase = await getServerSupabaseClient();

    // --- Cas : l'utilisateur n'a pas participé ---
    if (!data.participated) {
      await supabase
        .from('session_participants')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
      return { success: true };
    }

    // --- Récupérer les infos de la session ---
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('distance_km')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'Session introuvable' };
    }

    const distanceKm = Number(session.distance_km) || 0;

    // --- 1. Mettre à jour la participation ---
    const { error: partError } = await supabase
      .from('session_participants')
      .update({
        status: 'completed',
        ...(data.sessionRating ? { rating: data.sessionRating } : {}),
        ...(data.sessionComment ? { comment: data.sessionComment } : {}),
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (partError) {
      logger.error('Error completing participation:', partError);
      return { success: false, error: 'Erreur lors de la validation de la sortie' };
    }

    // --- 2. Calculer les XP ---
    // Base : 50 XP pour avoir participé
    // +10 si note laissée
    // +5 par co-coureur évalué (max 3)
    // +5 bonus si note >= 4
    let xpGained = 50;
    if (data.sessionRating) {
      xpGained += 10;
      if (data.sessionRating >= 4) xpGained += 5;
    }
    const peersReviewed = (data.peerFeedbacks ?? []).length;
    xpGained += Math.min(peersReviewed, 3) * 5;

    // --- 3. Mettre à jour le profil (distance + XP) ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp_points, total_distance_km, team_id')
      .eq('id', user.id)
      .single();

    let totalKm = distanceKm;
    let totalXp = xpGained;
    let teamKmAdded = 0;

    if (!profileError && profile) {
      totalKm = (Number(profile.total_distance_km) || 0) + distanceKm;
      totalXp = (Number(profile.xp_points) || 0) + xpGained;

      await supabase
        .from('profiles')
        .update({
          total_distance_km: totalKm,
          xp_points: totalXp,
        })
        .eq('id', user.id);

      // --- 4. Mettre à jour le total de l'équipe ---
      if (profile.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('total_distance')
          .eq('id', profile.team_id)
          .single();

        if (team) {
          teamKmAdded = distanceKm;
          await supabase
            .from('teams')
            .update({ total_distance: (Number(team.total_distance) || 0) + distanceKm })
            .eq('id', profile.team_id);
        }
      }
    }

    // --- 5. Enregistrer les peer feedbacks (safety) ---
    if ((data.peerFeedbacks ?? []).length > 0) {
      const feedbackRows = (data.peerFeedbacks ?? []).map((pf) => ({
        id: `fb_${Date.now()}_${pf.userId.slice(0, 8)}_${Math.random().toString(36).slice(2, 7)}`,
        session_id: sessionId,
        reviewer_id: user.id,
        reviewed_user_id: pf.userId,
        rating: pf.rating,
        flags: pf.flags ?? [],
        anonymous: false,
        processed: false,
        moderation_triggered: (pf.flags ?? []).some((f) =>
          ['inappropriate_behavior', 'harassment', 'unsafe_behavior', 'aggressive', 'uncomfortable'].includes(f)
        ),
        created_at: new Date().toISOString(),
      }));

      try {
        await supabase.from('safety_feedbacks').upsert(feedbackRows, {
          onConflict: 'session_id,reviewer_id,reviewed_user_id',
          ignoreDuplicates: true,
        });
      } catch (feedbackErr) {
        // Table might not exist yet — non-blocking
        logger.warn('Could not save peer feedbacks (table may not exist yet):', feedbackErr);
      }
    }

    // Non-blocking stats update (badges, connections, reliability score, etc.)
    updateStatsOnRunComplete(sessionId).catch((err) =>
      logger.error('[completeRun] stats update error:', err)
    );

    return {
      success: true,
      xpGained,
      kmAdded: distanceKm,
      totalKm,
      totalXp,
      teamKmAdded,
    };
  } catch (error) {
    logger.error('Unexpected error in completeRun:', error);
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
export async function getUpcomingSessions(limit: number = 3, maxLevel?: number) {
  try {
    const supabase = await getServerSupabaseClient();
    const user = await getCurrentUser();

    // Récupérer les sessions avec le créateur en une seule requête (JOIN)
    let query = supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(id, username, running_level, avatar_url)
      `)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(limit);

    // Filtrer par niveau max si fourni (niveau utilisateur + 1)
    if (maxLevel !== undefined) {
      query = query.lte('level_required', maxLevel);
    }

    const { data: sessions, error } = await query;

    if (error) {
      logger.error('Error fetching upcoming sessions:', error);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Récupérer tous les participants confirmés en une seule requête
    const sessionIds = sessions.map(s => s.id);
    const { data: allParticipants } = await supabase
      .from('session_participants')
      .select('session_id, user_id')
      .in('session_id', sessionIds)
      .eq('status', 'confirmed');

    // Compter les participants par session et vérifier si l'utilisateur est inscrit
    const participantCounts: Record<string, number> = {};
    const userParticipations: Record<string, boolean> = {};
    (allParticipants || []).forEach(p => {
      participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
      if (user && p.user_id === user.id) {
        userParticipations[p.session_id] = true;
      }
    });

    // Ajouter les counts et le statut de participation aux sessions
    const sessionsWithDetails = sessions.map(session => ({
      ...session,
      participants_count: participantCounts[session.id] || 0,
      is_participant: userParticipations[session.id] || false,
    }));

    return sessionsWithDetails;
  } catch (error) {
    logger.error('Error in getUpcomingSessions:', error);
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
      logger.error('Error fetching top teams:', error);
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
    logger.error('Error in getTopTeams:', error);
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
      logger.error('Error fetching all sessions:', error);
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
    logger.error('Error in getAllUpcomingSessions:', error);
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
      logger.error('Error updating profile location:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in updateProfileLocation:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Mettre a jour le profil utilisateur (username, bio)
 */
export async function updateProfile(data: {
  username?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  avatar_url?: string;
  phone_number?: string;
  phone_verified?: boolean;
  safety_enhanced_mode?: boolean;
  trusted_contact_name?: string;
  trusted_contact_phone?: string;
  trusted_contact_relation?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifie' };

    const supabase = await getServerSupabaseClient();

    const updateData: Record<string, string | boolean | null> = {};
    if (data.username !== undefined) updateData.username = data.username.trim();
    if (data.bio !== undefined) updateData.bio = data.bio.trim();
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.phone_verified !== undefined) updateData.phone_verified = data.phone_verified;
    if (data.safety_enhanced_mode !== undefined) updateData.safety_enhanced_mode = data.safety_enhanced_mode;
    if (data.trusted_contact_name !== undefined) updateData.trusted_contact_name = data.trusted_contact_name;
    if (data.trusted_contact_phone !== undefined) updateData.trusted_contact_phone = data.trusted_contact_phone;
    if (data.trusted_contact_relation !== undefined) updateData.trusted_contact_relation = data.trusted_contact_relation;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'Aucune donnee a mettre a jour' };
    }

    // Validation username
    if (updateData.username !== undefined) {
      if ((updateData.username as string).length < 2) {
        return { success: false, error: 'Le nom doit faire au moins 2 caracteres' };
      }
      if ((updateData.username as string).length > 30) {
        return { success: false, error: 'Le nom ne peut pas depasser 30 caracteres' };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      logger.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in updateProfile:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Envoyer un OTP SMS de vérification de téléphone via Supabase Phone Auth
 */
export async function sendPhoneOtp(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.updateUser({ phone: phoneNumber });

    if (error) {
      logger.error('Error sending phone OTP:', error);
      if (error.message.includes('not enabled') || error.message.includes('Phone provider')) {
        return { success: false, error: 'phone_provider_disabled' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in sendPhoneOtp:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Vérifier le code OTP et marquer le téléphone comme vérifié
 */
export async function verifyPhoneOtp(
  phoneNumber: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'phone_change',
    });

    if (error) {
      logger.error('Error verifying phone OTP:', error);
      return { success: false, error: 'Code incorrect ou expiré' };
    }

    // Marquer comme vérifié dans le profil
    const serverSupabase = await getServerSupabaseClient();
    const user = await getCurrentUser();
    if (user) {
      await serverSupabase
        .from('profiles')
        .update({ phone_number: phoneNumber, phone_verified: true })
        .eq('id', user.id);
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in verifyPhoneOtp:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Récupérer le statut de vérification d'identité de l'utilisateur connecté
 */
export async function getIdentityVerification(): Promise<{
  data: {
    level: number;
    level_name: string;
    id_verified: boolean;
    selfie_match_passed: boolean;
    admin_review_required: boolean;
    phone_verified: boolean;
  } | null;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { data: null, error: 'Non authentifie' };

    const supabase = await getServerSupabaseClient();
    const { data, error } = await supabase
      .from('identity_verifications')
      .select('level, level_name, id_verified, selfie_match_passed, admin_review_required, phone_verified')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: error.message };
    }

    return { data: data || null };
  } catch (error) {
    logger.error('Error in getIdentityVerification:', error);
    return { data: null, error: 'Erreur inattendue' };
  }
}

/**
 * Supprimer le compte utilisateur
 * Supprime le profil (les autres donnees sont supprimees en cascade ou via RLS)
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifie' };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return { success: false, error: 'Configuration serveur manquante' };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Supprimer le profil explicitement (pas de CASCADE automatique)
    await adminClient.from('profiles').delete().eq('id', user.id);

    // 2. Supprimer l'utilisateur auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authError) {
      logger.error('Error deleting auth user:', authError);
      return { success: false, error: 'Erreur lors de la suppression du compte' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in deleteAccount:', error);
    return { success: false, error: `Erreur inattendue: ${error instanceof Error ? error.message : String(error)}` };
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
      logger.error('Error fetching created sessions:', createdError);
    }

    // Récupérer les IDs des sessions auxquelles l'utilisateur participe
    const { data: participations, error: participationsError } = await supabase
      .from('session_participants')
      .select('session_id, status')
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (participationsError) {
      logger.error('Error fetching user participations:', participationsError);
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
    logger.error('Error in getUserSessions:', error);
    return { upcomingJoined: [], pastJoined: [], upcomingCreated: [], pastCreated: [] };
  }
}

// ============================================
// STRAVA INTEGRATION ACTIONS
// ============================================

import {
  refreshStravaToken,
  fetchStravaActivities,
  calculateStravaStats,
  calculateRunningLevel,
  getStravaAuthUrl,
} from './strava';

/**
 * Genere l'URL de connexion Strava
 */
export async function getStravaConnectUrl(): Promise<{ url: string } | { error: string }> {
  try {
    // Vérifier que les variables d'environnement Strava sont configurées
    if (!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID) {
      logger.error('NEXT_PUBLIC_STRAVA_CLIENT_ID manquant dans .env.local');
      return { error: 'Strava non configuré — variable NEXT_PUBLIC_STRAVA_CLIENT_ID manquante dans .env.local' };
    }
    if (!process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI) {
      logger.error('NEXT_PUBLIC_STRAVA_REDIRECT_URI manquant dans .env.local');
      return { error: 'Strava non configuré — variable NEXT_PUBLIC_STRAVA_REDIRECT_URI manquante dans .env.local' };
    }

    const user = await getCurrentUser();
    if (!user) return { error: 'Non authentifie' };

    // Utiliser l'ID utilisateur comme state pour la securite
    const url = getStravaAuthUrl(user.id);
    return { url };
  } catch (error) {
    logger.error('Error generating Strava URL:', error);
    return { error: 'Erreur inattendue' };
  }
}

/**
 * Genere l'URL de connexion Strava depuis l'onboarding
 * State encode le contexte ":onboarding" pour que le callback redirige vers /onboarding
 */
export async function getStravaConnectUrlForOnboarding(): Promise<{ url: string } | { error: string }> {
  try {
    // Vérifier que les variables d'environnement Strava sont configurées
    if (!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID) {
      logger.error('NEXT_PUBLIC_STRAVA_CLIENT_ID manquant dans .env.local');
      return { error: 'Strava non configuré — variable NEXT_PUBLIC_STRAVA_CLIENT_ID manquante dans .env.local' };
    }
    if (!process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI) {
      logger.error('NEXT_PUBLIC_STRAVA_REDIRECT_URI manquant dans .env.local');
      return { error: 'Strava non configuré — variable NEXT_PUBLIC_STRAVA_REDIRECT_URI manquante dans .env.local' };
    }

    const user = await getCurrentUser();
    if (!user) return { error: 'Non authentifie' };

    const url = getStravaAuthUrl(`${user.id}:onboarding`);
    return { url };
  } catch (error) {
    logger.error('Error generating Strava URL for onboarding:', error);
    return { error: 'Erreur inattendue' };
  }
}

/**
 * Synchronise les donnees Strava et recalcule le niveau
 */
export async function syncStravaData(): Promise<{ success: boolean; level?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifie' };

    const supabase = await getServerSupabaseClient();

    // 1. Récupérer les tokens depuis la table dédiée (plus sécurisée que profiles)
    const { data: stravaToken, error: tokenError } = await supabase
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !stravaToken) {
      return { success: false, error: 'Strava non connecte' };
    }

    let accessToken = stravaToken.access_token;

    // 2. Rafraichir le token si expire
    const expiresAt = new Date(stravaToken.expires_at).getTime();
    if (Date.now() >= expiresAt - 60_000) { // 1 minute de marge
      try {
        const newTokens = await refreshStravaToken(stravaToken.refresh_token);
        accessToken = newTokens.access_token;

        // Mettre a jour les tokens dans la table dédiée
        await supabase
          .from('strava_tokens')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
          })
          .eq('user_id', user.id);
      } catch {
        return { success: false, error: 'Erreur de rafraichissement du token' };
      }
    }

    // 3. Recuperer les activites
    const activities = await fetchStravaActivities(accessToken);
    const stats = calculateStravaStats(activities);
    const calculatedLevel = calculateRunningLevel(stats);

    // 4. Convertir l'allure en format interval
    const avgPaceMinutes = Math.floor(stats.avgPaceSeconds / 60);
    const avgPaceSeconds = Math.round(stats.avgPaceSeconds % 60);
    const paceInterval = `00:${avgPaceMinutes.toString().padStart(2, '0')}:${avgPaceSeconds.toString().padStart(2, '0')}`;

    // 5. Mettre a jour le profil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_last_sync: new Date().toISOString(),
        running_level: calculatedLevel,
        calculated_avg_pace: paceInterval,
        calculated_weekly_km: Math.round(stats.weeklyKm * 10) / 10,
        calculated_longest_run: Math.round(stats.longestRunKm * 10) / 10,
        calculated_total_runs: stats.totalRuns,
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: 'Erreur de mise a jour' };
    }

    return { success: true, level: calculatedLevel };
  } catch (error) {
    logger.error('Error syncing Strava data:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Deconnecte le compte Strava
 */
export async function disconnectStrava(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Non authentifie' };

    const supabase = await getServerSupabaseClient();

    // Supprimer les tokens de la table dédiée
    await supabase.from('strava_tokens').delete().eq('user_id', user.id);

    const { error } = await supabase
      .from('profiles')
      .update({
        strava_athlete_id: null,
        strava_connected: false,
        strava_last_sync: null,
        // Remettre le niveau a 1 (debutant) par defaut
        running_level: 1,
        calculated_avg_pace: null,
        calculated_weekly_km: 0,
        calculated_longest_run: 0,
        calculated_total_runs: 0,
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: 'Erreur de deconnexion' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error disconnecting Strava:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

// ============================================
// DISCOVERY ACTIONS
// ============================================

/**
 * Session enriched with discovery metadata: score, flags, host trust level.
 * Returned by getDiscoverySessions() for the /sessions discovery page.
 */
export interface DiscoverySession extends Session {
  score: number;
  isStartingSoon: boolean;  // starts within 2 h
  isFillingUp: boolean;     // 70–99 % full
  hasCoRunner: boolean;     // creator is someone user has run with
  isTeamRun: boolean;       // creator belongs to user's team
  hostTrustLevel: 'phone' | 'reliable' | 'basic';
}

/**
 * Fetches all upcoming sessions enriched with personalised scoring.
 * Scoring components:
 *   distanceScore  (0–20): proximity to user
 *   paceScore      (0–20): pace match with user's avg pace
 *   participantScore (5–30): sweet-spot 2–4 runners
 *   hostTrustScore (0–10): phone verification
 *   coRunnerBonus  (+15):  host is a known running partner
 *   teamRunBonus   (+10):  host is in user's team
 */
export async function getDiscoverySessions(options?: {
  userLat?: number;
  userLng?: number;
}): Promise<DiscoverySession[]> {
  try {
    const supabase = await getServerSupabaseClient();
    const user = await getCurrentUser();
    const now = new Date();

    // 1. Sessions + creator profile (includes trust fields for scoring)
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        creator:profiles!sessions_creator_id_fkey(
          id, username, avatar_url, running_level,
          phone_verified, team_id,
          runs_completed, runs_hosted, reliability_score
        )
      `)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true });

    if (error || !sessions?.length) return [];

    // 2. Confirmed participant counts
    const sessionIds = sessions.map((s) => s.id);
    const { data: allParticipants } = await supabase
      .from('session_participants')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('status', 'confirmed');

    const participantCounts: Record<string, number> = {};
    (allParticipants || []).forEach((p) => {
      participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
    });

    // 3. User context for scoring (only if authenticated)
    let userAvgPace: string | null = null;
    let userTeamId: string | null = null;
    const coRunnerIds = new Set<string>();

    if (user) {
      const [profileRes, connectionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('calculated_avg_pace, team_id')
          .eq('id', user.id)
          .single(),
        supabase
          .from('runner_connections')
          .select('other_user_id')
          .eq('user_id', user.id),
      ]);
      if (profileRes.data) {
        userAvgPace = profileRes.data.calculated_avg_pace ?? null;
        userTeamId = profileRes.data.team_id ?? null;
      }
      (connectionsRes.data || []).forEach((c) => coRunnerIds.add(c.other_user_id));
    }

    const parsePaceSec = (pace: string): number => {
      const [min, sec] = pace.split(':');
      return parseInt(min) * 60 + parseInt(sec || '0');
    };

    const userPaceSec = userAvgPace ? parsePaceSec(userAvgPace) : null;
    const userLat = options?.userLat;
    const userLng = options?.userLng;

    // 4. Enrich + score each session
    const enriched: DiscoverySession[] = sessions.map((session) => {
      const count = participantCounts[session.id] || 0;
      const fillPct = count / Math.max(session.max_participants, 1);
      const hoursUntil =
        (new Date(session.start_time).getTime() - now.getTime()) / 3_600_000;

      let distance_from_user: number | undefined;
      if (
        userLat != null &&
        userLng != null &&
        session.latitude != null &&
        session.longitude != null
      ) {
        distance_from_user =
          Math.round(
            haversineDistance(userLat, userLng, session.latitude, session.longitude) * 10,
          ) / 10;
      }

      // Distance score (0–20)
      let distanceScore = userLat == null ? 10 : 0; // neutral if no location
      if (distance_from_user != null) {
        if (distance_from_user < 5) distanceScore = 20;
        else if (distance_from_user < 10) distanceScore = 15;
        else if (distance_from_user < 25) distanceScore = 10;
        else if (distance_from_user < 50) distanceScore = 5;
      }

      // Pace score (0–20)
      let paceScore = 0;
      if (userPaceSec && session.target_pace) {
        const diff = Math.abs(userPaceSec - parsePaceSec(session.target_pace));
        if (diff < 30) paceScore = 20;
        else if (diff < 60) paceScore = 15;
        else if (diff < 90) paceScore = 10;
        else if (diff < 120) paceScore = 5;
      }

      // Participant score — sweet-spot 2–4
      const participantScore =
        count === 0 ? 10
        : count <= 4 ? 30
        : count <= 7 ? 20
        : 5;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creator = session.creator as any;
      let hostTrustLevel: 'phone' | 'reliable' | 'basic' = 'basic';
      let hostTrustScore = 0;

      // Phone verification: strong trust signal (+10)
      if (creator?.phone_verified) {
        hostTrustLevel = 'phone';
        hostTrustScore += 10;
      }
      // Experienced host: reliability_score >= 70 (+8)
      if ((creator?.reliability_score ?? 0) >= 70) {
        if (hostTrustLevel === 'basic') hostTrustLevel = 'reliable';
        hostTrustScore += 8;
      }
      // Active participant: runs_completed >= 5 (+5)
      if ((creator?.runs_completed ?? 0) >= 5) hostTrustScore += 5;
      // Experienced organizer: runs_hosted >= 3 (+3)
      if ((creator?.runs_hosted ?? 0) >= 3) hostTrustScore += 3;
      // Low-reliability penalty (reliability < 30 and active user)
      if ((creator?.reliability_score ?? 50) < 30 && (creator?.runs_completed ?? 0) >= 3) {
        hostTrustScore -= 10;
      }

      const isCoRunner = coRunnerIds.has(session.creator_id);
      const isTeamRun = !!(userTeamId && creator?.team_id === userTeamId);

      const score =
        distanceScore +
        paceScore +
        participantScore +
        Math.max(0, hostTrustScore) +
        (isCoRunner ? 15 : 0) +
        (isTeamRun ? 10 : 0);

      return {
        ...session,
        participants_count: count,
        distance_from_user,
        score,
        isStartingSoon: hoursUntil >= 0 && hoursUntil < 2,
        isFillingUp: fillPct >= 0.7 && fillPct < 1,
        hasCoRunner: isCoRunner,
        isTeamRun,
        hostTrustLevel,
      } as DiscoverySession;
    });

    // Highest score first
    return enriched.sort((a, b) => b.score - a.score);
  } catch (error) {
    logger.error('Error in getDiscoverySessions:', error);
    return [];
  }
}

// ─── Niveau manuel ────────────────────────────────────────────────────────────

/**
 * Sauvegarde les réponses au questionnaire de niveau et met à jour running_level.
 */
export async function saveManualLevel(
  answers: ManualLevelAnswers
): Promise<{ success: boolean; level: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, level: 1, error: 'Non connecté' };

  const { calculateManualScore, scoreToLevel } = await import('./level-manual');
  const score = calculateManualScore(answers);
  const level = scoreToLevel(score);

  const supabase = await getServerSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      running_level: level,
      level_source: 'manual',
      level_score: score,
      manual_level_data: answers,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    logger.error('saveManualLevel error:', error);
    return { success: false, level: 1, error: error.message };
  }

  return { success: true, level };
}

/**
 * Marque l'onboarding comme terminé (pour les débutants sans données de niveau).
 */
export async function completeOnboarding(): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await getServerSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      running_level: 1,
      level_source: 'manual',
      level_score: 0,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) logger.error('completeOnboarding error:', error);
  return { success: !error };
}
