'use server';

import { getCurrentUser, getServerSupabaseClient } from './supabase-auth';
import type { Conversation, Message, ConversationParticipant } from './types';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ConversationsResult extends ActionResult {
  conversations?: Conversation[];
}

export interface ConversationResult extends ActionResult {
  conversation?: Conversation;
}

export interface MessagesResult extends ActionResult {
  messages?: Message[];
  hasMore?: boolean;
}

export interface MessageResult extends ActionResult {
  message?: Message;
}

export interface UnreadCountResult extends ActionResult {
  count: number;
}

/**
 * Récupérer toutes les conversations de l'utilisateur
 */
export async function getUserConversations(): Promise<ConversationsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Récupérer les conversations où l'utilisateur est participant
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, is_muted')
      .eq('user_id', user.id);

    if (partError || !participations?.length) {
      return { success: true, conversations: [] };
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Récupérer les détails des conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        team:teams(*),
        session:sessions(*)
      `)
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Pour chaque conversation, récupérer le dernier message et le nombre de non-lus
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participation = participations.find(p => p.conversation_id === conv.id);

        // Dernier message
        const { data: lastMessages } = await supabase
          .from('messages')
          .select(`*, sender:profiles(*)`)
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        // Nombre de messages non lus
        let unreadQuery = supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .neq('sender_id', user.id);

        if (participation?.last_read_at) {
          unreadQuery = unreadQuery.gt('created_at', participation.last_read_at);
        }

        const { count: unreadCount } = await unreadQuery;

        // Pour les conversations directes, récupérer l'autre participant
        let otherParticipant = null;
        if (conv.type === 'direct') {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user:profiles(*)')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .limit(1);

          if (participants?.[0]) {
            otherParticipant = participants[0].user;
          }
        }

        return {
          ...conv,
          last_message: lastMessages?.[0] || null,
          unread_count: unreadCount || 0,
          other_participant: otherParticipant
        };
      })
    );

    return { success: true, conversations: enrichedConversations };
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer les messages d'une conversation (paginés)
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  beforeId?: string
): Promise<MessagesResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que l'utilisateur participe à cette conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participation) {
      return { success: false, error: 'Accès non autorisé' };
    }

    // Construire la requête de messages
    let query = supabase
      .from('messages')
      .select(`*, sender:profiles(*)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (beforeId) {
      const { data: beforeMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', beforeId)
        .single();

      if (beforeMsg) {
        query = query.lt('created_at', beforeMsg.created_at);
      }
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Vérifier s'il y a plus de messages
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Inverser pour avoir l'ordre chronologique
    resultMessages.reverse();

    return { success: true, messages: resultMessages, hasMore };
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Envoyer un message
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: 'text' | 'image' | 'system' = 'text'
): Promise<MessageResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Le message ne peut pas être vide' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que l'utilisateur participe à cette conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participation) {
      return { success: false, error: 'Accès non autorisé' };
    }

    // Créer le message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: messageType
      })
      .select(`*, sender:profiles(*)`)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Erreur lors de l\'envoi' };
    }

    // Mettre à jour last_read_at pour l'expéditeur
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    return { success: true, message };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Modifier un message
 */
export async function editMessage(messageId: string, newContent: string): Promise<MessageResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    if (!newContent.trim()) {
      return { success: false, error: 'Le message ne peut pas être vide' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: message, error } = await supabase
      .from('messages')
      .update({
        content: newContent.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)
      .select(`*, sender:profiles(*)`)
      .single();

    if (error) {
      console.error('Error editing message:', error);
      return { success: false, error: 'Erreur lors de la modification' };
    }

    return { success: true, message };
  } catch (error) {
    console.error('Error in editMessage:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Supprimer un message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Marquer une conversation comme lue
 */
export async function markConversationAsRead(conversationId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking as read:', error);
      return { success: false, error: 'Erreur' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markConversationAsRead:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Obtenir ou créer une conversation directe avec un ami
 */
export async function getOrCreateDirectConversation(friendId: string): Promise<ConversationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que c'est bien un ami
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .single();

    if (!friendship) {
      return { success: false, error: 'Vous devez être amis pour envoyer un message direct' };
    }

    // Utiliser la fonction RPC pour créer ou récupérer la conversation
    // Cette fonction utilise SECURITY DEFINER pour bypasser les restrictions RLS
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('create_direct_conversation', { friend_id: friendId });

    if (rpcError) {
      console.error('Error in create_direct_conversation RPC:', rpcError);

      // Fallback: essayer de trouver une conversation existante
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(user_id)
        `)
        .eq('type', 'direct');

      let existingConv = null;
      if (existingConvs) {
        for (const conv of existingConvs) {
          const participantIds = conv.participants?.map((p: { user_id: string }) => p.user_id) || [];
          if (
            participantIds.length === 2 &&
            participantIds.includes(user.id) &&
            participantIds.includes(friendId)
          ) {
            existingConv = conv;
            break;
          }
        }
      }

      if (existingConv) {
        const { data: otherUser } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', friendId)
          .single();

        return {
          success: true,
          conversation: {
            ...existingConv,
            other_participant: otherUser
          }
        };
      }

      return { success: false, error: 'Erreur lors de la création de la conversation' };
    }

    // Récupérer la conversation complète
    const conversationId = rpcResult?.[0]?.conversation_id;

    if (!conversationId) {
      return { success: false, error: 'Erreur lors de la création' };
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Récupérer l'autre participant
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();

    return {
      success: true,
      conversation: {
        ...conversation,
        other_participant: otherUser
      }
    };
  } catch (error) {
    console.error('Error in getOrCreateDirectConversation:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer la conversation d'une équipe
 */
export async function getTeamConversation(teamId: string): Promise<ConversationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`*, team:teams(*)`)
      .eq('team_id', teamId)
      .eq('type', 'team')
      .single();

    if (error) {
      console.error('Error fetching team conversation:', error);
      return { success: false, error: 'Conversation non trouvée' };
    }

    // Vérifier que l'utilisateur est membre de l'équipe
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return { success: false, error: 'Vous n\'êtes pas membre de cette équipe' };
    }

    return { success: true, conversation };
  } catch (error) {
    console.error('Error in getTeamConversation:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer la conversation d'une session
 */
export async function getSessionConversation(sessionId: string): Promise<ConversationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`*, session:sessions(*)`)
      .eq('session_id', sessionId)
      .eq('type', 'session')
      .single();

    if (error) {
      console.error('Error fetching session conversation:', error);
      return { success: false, error: 'Conversation non trouvée' };
    }

    // Vérifier que l'utilisateur est participant ou créateur
    const { data: session } = await supabase
      .from('sessions')
      .select('creator_id')
      .eq('id', sessionId)
      .single();

    const isCreator = session?.creator_id === user.id;

    if (!isCreator) {
      const { data: participation } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .single();

      if (!participation) {
        return { success: false, error: 'Vous n\'êtes pas participant de cette session' };
      }
    }

    return { success: true, conversation };
  } catch (error) {
    console.error('Error in getSessionConversation:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Compter le nombre total de messages non lus
 */
export async function getTotalUnreadCount(): Promise<UnreadCountResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, count: 0, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Récupérer toutes les participations
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
      .eq('is_muted', false);

    if (!participations?.length) {
      return { success: true, count: 0 };
    }

    // Compter les messages non lus pour chaque conversation
    let totalUnread = 0;

    for (const part of participations) {
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', part.conversation_id)
        .eq('is_deleted', false)
        .neq('sender_id', user.id);

      if (part.last_read_at) {
        query = query.gt('created_at', part.last_read_at);
      }

      const { count } = await query;
      totalUnread += count || 0;
    }

    return { success: true, count: totalUnread };
  } catch (error) {
    console.error('Error in getTotalUnreadCount:', error);
    return { success: false, count: 0, error: 'Une erreur est survenue' };
  }
}

/**
 * Activer/désactiver les notifications pour une conversation
 */
export async function toggleMuteConversation(conversationId: string, muted: boolean): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_muted: muted })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error toggling mute:', error);
      return { success: false, error: 'Erreur' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in toggleMuteConversation:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Récupérer les participants d'une conversation
 */
export async function getConversationParticipants(
  conversationId: string
): Promise<{ success: boolean; participants?: ConversationParticipant[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const supabase = await getServerSupabaseClient();

    // Vérifier que l'utilisateur participe
    const { data: userPart } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!userPart) {
      return { success: false, error: 'Accès non autorisé' };
    }

    const { data: participants, error } = await supabase
      .from('conversation_participants')
      .select(`*, user:profiles(*)`)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching participants:', error);
      return { success: false, error: 'Erreur' };
    }

    return { success: true, participants };
  } catch (error) {
    console.error('Error in getConversationParticipants:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}
