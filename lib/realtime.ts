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
  // Use refs for callbacks to avoid re-subscribing when they change
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  // Keep refs up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageUpdatedRef.current = onMessageUpdated;
    onMessageDeletedRef.current = onMessageDeleted;
  });

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
            onNewMessageRef.current(data as Message);
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
          if (payload.new.is_deleted && onMessageDeletedRef.current) {
            onMessageDeletedRef.current(payload.new.id);
          } else if (onMessageUpdatedRef.current) {
            const { data } = await supabase
              .from('messages')
              .select(`*, sender:profiles(*)`)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              onMessageUpdatedRef.current(data as Message);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]); // Only re-subscribe when conversationId changes

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
  // Use refs for callbacks to avoid re-subscribing
  const onNewRequestRef = useRef(onNewRequest);
  const onRequestUpdatedRef = useRef(onRequestUpdated);

  useEffect(() => {
    onNewRequestRef.current = onNewRequest;
    onRequestUpdatedRef.current = onRequestUpdated;
  });

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
            onNewRequestRef.current(data as Friendship);
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

          if (onRequestUpdatedRef.current) {
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
              onRequestUpdatedRef.current(data as Friendship);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]); // Only re-subscribe when userId changes
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;

    // Compter les demandes d'ami en attente (simple et rapide)
    const { count: requestsCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', userId)
      .eq('status', 'pending');

    setPendingRequests(requestsCount || 0);

    // Pour les messages non lus, on fait une requête simplifiée
    // On compte juste le nombre de participations avec des messages non lus
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .eq('is_muted', false);

    if (participations && participations.length > 0) {
      // Batch query: get all unread counts at once
      const conversationIds = participations.map(p => p.conversation_id);

      const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .eq('is_deleted', false)
        .neq('sender_id', userId);

      if (messages) {
        let total = 0;
        for (const part of participations) {
          const unread = messages.filter(m =>
            m.conversation_id === part.conversation_id &&
            (!part.last_read_at || new Date(m.created_at) > new Date(part.last_read_at))
          ).length;
          total += unread;
        }
        setUnreadMessages(total);
      }
    } else {
      setUnreadMessages(0);
    }
  }, [userId]);

  // Debounced refresh to avoid too many calls
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(refresh, 500);
  }, [refresh]);

  useEffect(() => {
    refresh();

    // Écouter les changements
    if (!userId) return;

    const messagesChannel = supabase
      .channel(`notifications:messages:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => debouncedRefresh()
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
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      friendsChannel.unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [userId, refresh, debouncedRefresh]);

  return { unreadMessages, pendingRequests, refresh };
}
