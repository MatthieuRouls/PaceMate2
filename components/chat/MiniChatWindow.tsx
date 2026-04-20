'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Minimize2, Maximize2, User, Users } from 'lucide-react';
import { useChat } from './ChatProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  getConversationMessages,
  sendMessage,
  markConversationAsRead
} from '@/lib/chat-actions';
import { useRealtimeMessages } from '@/lib/realtime';
import type { Conversation, Message } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface MiniChatWindowProps {
  conversationId: string;
  position: number; // 0, 1, 2 pour le positionnement
}

export default function MiniChatWindow({ conversationId, position }: MiniChatWindowProps) {
  const { profile } = useAuth();
  const { conversations, closeChat, updateConversation } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations.find(c => c.id === conversationId);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const result = await getConversationMessages(conversationId);
        if (result.success && result.messages) {
          setMessages(result.messages);
        }
        await markConversationAsRead(conversationId);
        // Update unread count
        if (conversation) {
          updateConversation({ ...conversation, unread_count: 0 });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Scroll to bottom
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Handle new realtime messages
  const handleNewMessage = useCallback((message: Message) => {
    if (message.sender_id !== profile?.id) {
      setMessages(prev => [...prev, message]);
      markConversationAsRead(conversationId);
    }
  }, [profile?.id, conversationId]);

  // Realtime subscription
  useRealtimeMessages(conversationId, handleNewMessage);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: profile?.id || '',
      content: messageContent,
      message_type: 'text',
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: profile || undefined,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const result = await sendMessage(conversationId, messageContent);
      if (result.success && result.message) {
        setMessages(prev =>
          prev.map(m => m.id === tempMessage.id ? result.message! : m)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation || !profile) return null;

  // Helpers - use conv to avoid TypeScript narrowing issues
  const conv = conversation;
  const conversationName = conv.type === 'direct' && conv.other_participant
    ? conv.other_participant.username
    : conv.type === 'team' && conv.team
    ? conv.team.name
    : conv.type === 'session' && conv.session
    ? conv.session.title
    : 'Conversation';

  // Position calculation (from right)
  const rightOffset = 24 + (position * 340); // 340px width + gap

  return (
    <div
      className="fixed bottom-0 z-30 w-80 bg-white rounded-t-xl shadow-2xl border border-silver-300 flex flex-col overflow-hidden"
      style={{ right: `${rightOffset}px`, height: isMinimized ? '52px' : '420px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-dark-800 text-white cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            conv.type === 'direct' ? 'bg-neon-500' : 'bg-pink-500'
          }`}>
            {conv.type === 'direct' && conv.other_participant?.avatar_url ? (
              <img
                src={conv.other_participant.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : conv.type === 'direct' ? (
              <User className="w-4 h-4 text-dark-800" />
            ) : (
              <Users className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-semibold text-sm truncate">{conversationName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1.5 rounded hover:bg-dark-700 transition-colors"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeChat(conversationId);
            }}
            className="p-1.5 rounded hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-silver-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-dark-400 text-sm py-8">
                Aucun message. Dis bonjour !
              </p>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === profile.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-neon-500 text-dark-800 rounded-br-md'
                          : 'bg-white text-dark-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-silver-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Aa"
                className="flex-1 px-3 py-2 rounded-full bg-silver-100 border-0 text-sm text-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-neon-500/50"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="p-2 rounded-full bg-neon-500 text-dark-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neon-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
