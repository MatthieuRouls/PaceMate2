'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import type { Message, Friendship } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook pour écouter les nouveaux messages d'une conversation en temps réel
 */
export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage: (message: Message) => void,
  onMessageUpdated?: (message: Message) => void,
  onMessageDeleted?: (messageId: string) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Créer un channel unique pour cette conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Récupérer le message complet avec le profil de l'expéditeur
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:profiles(*)`)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onNewMessage(data as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (payload.new.is_deleted && onMessageDeleted) {
            onMessageDeleted(payload.new.id);
          } else if (onMessageUpdated) {
            const { data } = await supabase
              .from('messages')
              .select(`*, sender:profiles(*)`)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              onMessageUpdated(data as Message);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, onNewMessage, onMessageUpdated, onMessageDeleted]);

  return channelRef.current;
}

/**
 * Hook pour écouter les nouvelles demandes d'amis
 */
export function useFriendRequestNotifications(
  userId: string | null,
  onNewRequest: (friendship: Friendship) => void,
  onRequestUpdated?: (friendship: Friendship) => void
) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`
        },
        async (payload) => {
          // Récupérer la demande avec le profil de l'expéditeur
          const { data } = await supabase
            .from('friendships')
            .select(`*, user:profiles!friendships_user_id_fkey(*)`)
            .eq('id', payload.new.id)
            .single();

          if (data && data.status === 'pending') {
            onNewRequest(data as Friendship);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships'
        },
        async (payload) => {
          // Vérifier si l'utilisateur est concerné
          if (payload.new.user_id !== userId && payload.new.friend_id !== userId) {
            return;
          }

          if (onRequestUpdated) {
            const { data } = await supabase
              .from('friendships')
              .select(`
                *,
                user:profiles!friendships_user_id_fkey(*),
                friend:profiles!friendships_friend_id_fkey(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              onRequestUpdated(data as Friendship);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, onNewRequest, onRequestUpdated]);
}

/**
 * Hook pour la présence dans une conversation (qui est en ligne, qui tape)
 */
export function useConversationPresence(
  conversationId: string | null,
  userId: string | null,
  username: string | null
) {
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string }[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ id: string; username: string }[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !userId || !username) return;

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: { presence: { key: userId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: { id: string; username: string }[] = [];

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== userId) {
              users.push({
                id: presence.user_id,
                username: presence.username
              });
            }
          });
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Un utilisateur rejoint
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Un utilisateur quitte
        leftPresences.forEach((presence: any) => {
          setTypingUsers(prev => prev.filter(u => u.id !== presence.user_id));
        });
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          setTypingUsers(prev => {
            const exists = prev.some(u => u.id === payload.user_id);
            if (payload.is_typing && !exists) {
              return [...prev, { id: payload.user_id, username: payload.username }];
            } else if (!payload.is_typing) {
              return prev.filter(u => u.id !== payload.user_id);
            }
            return prev;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            username: username,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, userId, username]);

  // Fonction pour signaler qu'on tape
  const setTyping = useCallback((isTyping: boolean) => {
    if (channelRef.current && userId && username) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          username: username,
          is_typing: isTyping
        }
      });
    }
  }, [userId, username]);

  return { onlineUsers, typingUsers, setTyping };
}

/**
 * Hook pour écouter les mises à jour de compteurs (messages non lus, demandes d'amis)
 */
export function useNotificationCounts(userId: string | null) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;

    // Compter les messages non lus
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .eq('is_muted', false);

    if (participations) {
      let total = 0;
      for (const part of participations) {
        let query = supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', part.conversation_id)
          .eq('is_deleted', false)
          .neq('sender_id', userId);

        if (part.last_read_at) {
          query = query.gt('created_at', part.last_read_at);
        }

        const { count } = await query;
        total += count || 0;
      }
      setUnreadMessages(total);
    }

    // Compter les demandes d'ami en attente
    const { count: requestsCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', userId)
      .eq('status', 'pending');

    setPendingRequests(requestsCount || 0);
  }, [userId]);

  useEffect(() => {
    refresh();

    // Écouter les changements
    if (!userId) return;

    const messagesChannel = supabase
      .channel(`notifications:messages:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => refresh()
      )
      .subscribe();

    const friendsChannel = supabase
      .channel(`notifications:friends:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      friendsChannel.unsubscribe();
    };
  }, [userId, refresh]);

  return { unreadMessages, pendingRequests, refresh };
}
