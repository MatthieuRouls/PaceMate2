'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { MessageCircle, Send, ArrowLeft, Users, Calendar, User, MoreVertical } from 'lucide-react';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead
} from '@/lib/chat-actions';
import { useRealtimeMessages, useConversationPresence } from '@/lib/realtime';
import type { Conversation, Message } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/');
    }
  }, [authLoading, profile, router]);

  // Fetch conversations
  useEffect(() => {
    if (!profile) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        const result = await getUserConversations();
        if (result.success && result.conversations) {
          setConversations(result.conversations);

          // Check for conversation ID in URL
          const convId = searchParams.get('conv');
          if (convId) {
            const conv = result.conversations.find(c => c.id === convId);
            if (conv) {
              setSelectedConversation(conv);
              setShowMobileChat(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [profile, searchParams]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const result = await getConversationMessages(selectedConversation.id);
        if (result.success && result.messages) {
          setMessages(result.messages);
        }

        // Mark as read
        await markConversationAsRead(selectedConversation.id);

        // Update unread count in conversations list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id
              ? { ...c, unread_count: 0 }
              : c
          )
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle new messages from realtime
  const handleNewMessage = useCallback((message: Message) => {
    if (message.sender_id !== profile?.id) {
      setMessages(prev => [...prev, message]);

      // Update last message in conversations list
      setConversations(prev =>
        prev.map(c =>
          c.id === message.conversation_id
            ? {
                ...c,
                last_message: message,
                updated_at: message.created_at,
                unread_count: c.id === selectedConversation?.id ? 0 : (c.unread_count || 0) + 1
              }
            : c
        )
      );

      // Mark as read if this conversation is open
      if (selectedConversation?.id === message.conversation_id) {
        markConversationAsRead(message.conversation_id);
      }
    }
  }, [profile?.id, selectedConversation?.id]);

  // Realtime subscription
  useRealtimeMessages(
    selectedConversation?.id || null,
    handleNewMessage
  );

  // Presence
  const { typingUsers, setTyping } = useConversationPresence(
    selectedConversation?.id || null,
    profile?.id || null,
    profile?.username || null
  );

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    setTyping(false);

    try {
      const result = await sendMessage(selectedConversation.id, newMessage.trim());
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message!]);
        setNewMessage('');

        // Update last message in conversations list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id
              ? { ...c, last_message: result.message, updated_at: result.message!.created_at }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  // Select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    router.replace(`/messages?conv=${conv.id}`, { scroll: false });
  };

  // Back to list (mobile)
  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConversation(null);
    router.replace('/messages', { scroll: false });
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-neu-base flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Get conversation display name
  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'direct' && conv.other_participant) {
      return conv.other_participant.username;
    }
    if (conv.type === 'team' && conv.team) {
      return conv.team.name;
    }
    if (conv.type === 'session' && conv.session) {
      return conv.session.title;
    }
    return 'Conversation';
  };

  // Get conversation icon
  const getConversationIcon = (conv: Conversation) => {
    if (conv.type === 'direct') return User;
    if (conv.type === 'team') return Users;
    return Calendar;
  };

  return (
    <div className="min-h-screen bg-neu-base pt-16">
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Conversations List */}
        <div className={`w-full md:w-96 bg-white dark:bg-dark-700 border-r border-silver-300 flex flex-col ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-silver-300">
            <h1 className="text-xl font-bold text-dark-800">Messages</h1>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-12 h-12 text-silver-400 mx-auto mb-4" />
                <p className="text-dark-500">Aucune conversation</p>
                <p className="text-sm text-dark-400 mt-2">
                  Rejoins une équipe ou une session pour discuter
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const Icon = getConversationIcon(conv);
                const isSelected = selectedConversation?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-silver-50 dark:hover:bg-dark-600 transition-colors text-left ${
                      isSelected ? 'bg-neon-50 dark:bg-neon-900/20' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      conv.type === 'direct' ? 'bg-neon-400' :
                      conv.type === 'team' ? 'bg-pink-400' :
                      'bg-dark-600'
                    }`}>
                      {conv.type === 'direct' && conv.other_participant ? (
                        <span className="text-white font-bold">
                          {conv.other_participant.username.substring(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <Icon className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-dark-800 truncate">
                          {getConversationName(conv)}
                        </span>
                        {conv.last_message && (
                          <span className="text-xs text-dark-400 flex-shrink-0">
                            {formatTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-sm text-dark-500 truncate">
                          {conv.last_message?.is_deleted
                            ? 'Message supprimé'
                            : conv.last_message?.content || 'Aucun message'}
                        </p>
                        {(conv.unread_count || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white text-xs font-bold flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          conv.type === 'direct' ? 'bg-neon-100 text-neon-700' :
                          conv.type === 'team' ? 'bg-pink-100 text-pink-600' :
                          'bg-silver-200 text-dark-600'
                        }`}>
                          {conv.type === 'direct' ? 'Direct' :
                           conv.type === 'team' ? 'Équipe' : 'Session'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-silver-50 dark:bg-dark-800 ${
          showMobileChat ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white dark:bg-dark-700 border-b border-silver-300 flex items-center gap-3">
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-2 hover:bg-silver-100 dark:hover:bg-dark-600 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-dark-800" />
                </button>

                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedConversation.type === 'direct' ? 'bg-neon-400' :
                  selectedConversation.type === 'team' ? 'bg-pink-400' :
                  'bg-dark-600'
                }`}>
                  {selectedConversation.type === 'direct' && selectedConversation.other_participant ? (
                    <span className="text-white font-bold text-sm">
                      {selectedConversation.other_participant.username.substring(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    (() => {
                      const Icon = getConversationIcon(selectedConversation);
                      return <Icon className="w-5 h-5 text-white" />;
                    })()
                  )}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-dark-800">
                    {getConversationName(selectedConversation)}
                  </div>
                  {typingUsers.length > 0 && (
                    <div className="text-sm text-neon-600">
                      {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
                    </div>
                  )}
                </div>

                <button className="p-2 hover:bg-silver-100 dark:hover:bg-dark-600 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-dark-600" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-silver-400 mx-auto mb-4" />
                    <p className="text-dark-500">Aucun message</p>
                    <p className="text-sm text-dark-400">Envoie le premier message !</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === profile.id;
                    const showAvatar = !isOwn && (
                      index === 0 ||
                      messages[index - 1]?.sender_id !== message.sender_id
                    );

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {!isOwn && (
                          <div className={`w-8 h-8 rounded-full bg-neon-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                            showAvatar ? 'visible' : 'invisible'
                          }`}>
                            {message.sender?.username?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                        )}

                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          {showAvatar && !isOwn && (
                            <div className="text-xs text-dark-500 mb-1 ml-1">
                              {message.sender?.username}
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            message.is_deleted
                              ? 'bg-silver-200 text-dark-400 italic'
                              : isOwn
                              ? 'bg-neon-500 text-dark-800'
                              : 'bg-white dark:bg-dark-600 text-dark-800'
                          }`}>
                            {message.is_deleted ? 'Message supprimé' : message.content}
                          </div>
                          <div className={`text-xs text-dark-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(message.created_at)}
                            {message.is_edited && ' (modifié)'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white dark:bg-dark-700 border-t border-silver-300">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onBlur={() => setTyping(false)}
                    placeholder="Écris ton message..."
                    className="flex-1 px-4 py-3 rounded-full border border-silver-400 focus:border-neon-500 focus:ring-2 focus:ring-neon-500/20 outline-none transition-all bg-silver-50 dark:bg-dark-600"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-3 rounded-full bg-neon-500 text-dark-800 hover:bg-neon-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-silver-400 mx-auto mb-4" />
                <p className="text-dark-500 text-lg">Sélectionne une conversation</p>
                <p className="text-sm text-dark-400 mt-2">
                  Choisis une conversation pour commencer à discuter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatTime(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Hier';
  } else if (days < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}
