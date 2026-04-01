'use server';
import { logger } from '@/lib/logger';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';
import type { Friendship, Profile } from './types';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface FriendshipResult extends ActionResult {
  friendship?: Friendship;
}

export interface FriendsListResult extends ActionResult {
  friends?: Profile[];
}

export interface FriendRequestsResult extends ActionResult {
  requests?: Friendship[];
}

export interface SearchUsersResult extends ActionResult {
  users?: Profile[];
}

export interface FriendshipStatusResult extends ActionResult {
  status?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';
  friendship?: Friendship;
}

/**
 * Envoyer une demande d'ami
 */
export async function sendFriendRequest(targetUserId: string): Promise<FriendshipResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (user.id === targetUserId) {
      return { success: false, error: 'Vous ne pouvez pas vous ajouter vous-même' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier si une relation existe déjà
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Vous êtes déjà amis' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Une demande est déjà en attente' };
      }
      if (existing.status === 'blocked') {
        return { success: false, error: 'Cette action n\'est pas possible' };
      }
    }

    // Créer la demande d'ami
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: targetUserId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error sending friend request:', error);
      return { success: false, error: 'Erreur lors de l\'envoi de la demande' };
    }

    return { success: true, friendship: data };
  } catch (error) {
    logger.error('Error in sendFriendRequest:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Accepter une demande d'ami
 */
export async function acceptFriendRequest(friendshipId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que c'est bien une demande reçue par l'utilisateur
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!friendship) {
      return { success: false, error: 'Demande non trouvée' };
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      logger.error('Error accepting friend request:', error);
      return { success: false, error: 'Erreur lors de l\'acceptation' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in acceptFriendRequest:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Refuser une demande d'ami
 */
export async function rejectFriendRequest(friendshipId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que c'est bien une demande reçue par l'utilisateur
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!friendship) {
      return { success: false, error: 'Demande non trouvée' };
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      logger.error('Error rejecting friend request:', error);
      return { success: false, error: 'Erreur lors du refus' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in rejectFriendRequest:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Annuler une demande d'ami envoyée
 */
export async function cancelFriendRequest(friendshipId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      logger.error('Error canceling friend request:', error);
      return { success: false, error: 'Erreur lors de l\'annulation' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in cancelFriendRequest:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Supprimer un ami
 */
export async function removeFriend(friendshipId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que l'utilisateur fait partie de cette amitié
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .single();

    if (!friendship) {
      return { success: false, error: 'Amitié non trouvée' };
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      logger.error('Error removing friend:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in removeFriend:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Bloquer un utilisateur
 */
export async function blockUser(targetUserId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Supprimer toute relation existante
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);

    // Créer un blocage
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: targetUserId,
        status: 'blocked'
      });

    if (error) {
      logger.error('Error blocking user:', error);
      return { success: false, error: 'Erreur lors du blocage' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in blockUser:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Débloquer un utilisateur
 */
export async function unblockUser(targetUserId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', targetUserId)
      .eq('status', 'blocked');

    if (error) {
      logger.error('Error unblocking user:', error);
      return { success: false, error: 'Erreur lors du déblocage' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in unblockUser:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer la liste des amis
 */
export async function getFriendsList(): Promise<FriendsListResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Récupérer les amitiés acceptées
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        user:profiles!friendships_user_id_fkey(*),
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      logger.error('Error fetching friends:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Extraire les profils des amis
    const friends: Profile[] = friendships.map(f => {
      if (f.user_id === user.id) {
        return f.friend as unknown as Profile;
      }
      return f.user as unknown as Profile;
    });

    return { success: true, friends };
  } catch (error) {
    logger.error('Error in getFriendsList:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer les demandes d'ami reçues (en attente)
 */
export async function getPendingRequests(): Promise<FriendRequestsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user:profiles!friendships_user_id_fkey(*)
      `)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pending requests:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, requests };
  } catch (error) {
    logger.error('Error in getPendingRequests:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer les demandes d'ami envoyées
 */
export async function getSentRequests(): Promise<FriendRequestsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching sent requests:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, requests };
  } catch (error) {
    logger.error('Error in getSentRequests:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Compter les demandes d'ami en attente
 */
export async function getPendingRequestsCount(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, count: 0, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { count, error } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (error) {
      logger.error('Error counting pending requests:', error);
      return { success: false, count: 0, error: 'Erreur' };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    logger.error('Error in getPendingRequestsCount:', error);
    return { success: false, count: 0, error: 'Une erreur est survenue' };
  }
}

/**
 * Rechercher des utilisateurs par nom
 */
export async function searchUsers(query: string): Promise<SearchUsersResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (!query || query.length < 2) {
      return { success: true, users: [] };
    }

    const supabase = await getServerSupabaseClient();

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) {
      logger.error('Error searching users:', error);
      return { success: false, error: 'Erreur lors de la recherche' };
    }

    return { success: true, users };
  } catch (error) {
    logger.error('Error in searchUsers:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export interface BatchFriendshipStatusResult extends ActionResult {
  statuses?: Record<string, 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked'>;
}

/**
 * Vérifier le statut d'amitié avec plusieurs utilisateurs en une seule requête
 */
export async function checkFriendshipStatusBatch(targetUserIds: string[]): Promise<BatchFriendshipStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (targetUserIds.length === 0) {
      return { success: true, statuses: {} };
    }

    const supabase = await getServerSupabaseClient();

    // Get all friendships involving the current user and any of the target users
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      logger.error('Error fetching friendships:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Build a map of statuses
    const statuses: Record<string, 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked'> = {};

    for (const targetId of targetUserIds) {
      if (targetId === user.id) {
        statuses[targetId] = 'none';
        continue;
      }

      // Find friendship with this user
      const friendship = friendships?.find(f =>
        (f.user_id === user.id && f.friend_id === targetId) ||
        (f.user_id === targetId && f.friend_id === user.id)
      );

      if (!friendship) {
        statuses[targetId] = 'none';
      } else if (friendship.status === 'accepted') {
        statuses[targetId] = 'accepted';
      } else if (friendship.status === 'blocked') {
        statuses[targetId] = 'blocked';
      } else if (friendship.status === 'pending') {
        if (friendship.user_id === user.id) {
          statuses[targetId] = 'pending_sent';
        } else {
          statuses[targetId] = 'pending_received';
        }
      } else {
        statuses[targetId] = 'none';
      }
    }

    return { success: true, statuses };
  } catch (error) {
    logger.error('Error in checkFriendshipStatusBatch:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Vérifier le statut d'amitié avec un utilisateur
 */
export async function checkFriendshipStatus(targetUserId: string): Promise<FriendshipStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (user.id === targetUserId) {
      return { success: true, status: 'none' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
      .single();

    if (!friendship) {
      return { success: true, status: 'none' };
    }

    let status: FriendshipStatusResult['status'];

    if (friendship.status === 'accepted') {
      status = 'accepted';
    } else if (friendship.status === 'blocked') {
      status = 'blocked';
    } else if (friendship.status === 'pending') {
      if (friendship.user_id === user.id) {
        status = 'pending_sent';
      } else {
        status = 'pending_received';
      }
    } else {
      status = 'none';
    }

    return { success: true, status, friendship };
  } catch (error) {
    logger.error('Error in checkFriendshipStatus:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}
