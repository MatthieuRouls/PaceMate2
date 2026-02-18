'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserConversations } from '@/lib/chat-actions';
import { useNotificationCounts } from '@/lib/realtime';
import type { Conversation } from '@/lib/types';

interface ChatContextType {
  conversations: Conversation[];
  isDrawerOpen: boolean;
  openConversations: string[]; // IDs of open mini chat windows
  unreadTotal: number;
  loading: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openChat: (conversationId: string) => void;
  closeChat: (conversationId: string) => void;
  refreshConversations: () => Promise<void>;
  updateConversation: (conversation: Conversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openConversations, setOpenConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Realtime notification counts
  const { unreadMessages } = useNotificationCounts(profile?.id || null);

  // Fetch conversations
  const refreshConversations = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getUserConversations();
      if (result.success && result.conversations) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Load conversations when profile changes
  useEffect(() => {
    if (profile) {
      refreshConversations();
    } else {
      setConversations([]);
      setOpenConversations([]);
      setIsDrawerOpen(false);
    }
  }, [profile, refreshConversations]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen(prev => !prev), []);

  const openChat = useCallback((conversationId: string) => {
    setOpenConversations(prev => {
      if (prev.includes(conversationId)) return prev;
      // Limit to 3 open chats
      const newOpen = [...prev, conversationId];
      if (newOpen.length > 3) {
        return newOpen.slice(-3);
      }
      return newOpen;
    });
  }, []);

  const closeChat = useCallback((conversationId: string) => {
    setOpenConversations(prev => prev.filter(id => id !== conversationId));
  }, []);

  const updateConversation = useCallback((conversation: Conversation) => {
    setConversations(prev =>
      prev.map(c => c.id === conversation.id ? conversation : c)
    );
  }, []);

  const value: ChatContextType = {
    conversations,
    isDrawerOpen,
    openConversations,
    unreadTotal: unreadMessages,
    loading,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    openChat,
    closeChat,
    refreshConversations,
    updateConversation,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
