'use client';

import { useState } from 'react';
import { X, Search, Users, User, MessageCircle, ChevronRight } from 'lucide-react';
import { useChat } from './ChatProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Conversation } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ChatDrawer() {
  const { profile } = useAuth();
  const {
    conversations,
    isDrawerOpen,
    closeDrawer,
    openChat,
    loading,
  } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  if (!profile || !isDrawerOpen) return null;

  // Filtrer les conversations
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = getConversationName(conv);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  function getConversationName(conv: Conversation): string {
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
  }

  function formatTime(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  const handleConversationClick = (conv: Conversation) => {
    openChat(conv.id);
    closeDrawer();
  };

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={closeDrawer}
      />

      {/* Floating Panel */}
      <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-silver-200/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-silver-200/50">
          <h2 className="text-base font-semibold text-dark-800">Messages</h2>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-full hover:bg-silver-100:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4 text-dark-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-silver-100/80 border-0 text-sm text-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-silver-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-dark-400" />
              </div>
              <p className="text-dark-500 text-sm">
                {searchQuery ? 'Aucun resultat' : 'Aucune conversation'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-silver-100/80:bg-dark-700/80 transition-colors text-left group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      conv.type === 'direct' ? 'bg-gradient-to-br from-neon-400 to-neon-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'
                    }`}>
                      {conv.type === 'direct' && conv.other_participant?.avatar_url ? (
                        <img
                          src={conv.other_participant.avatar_url}
                          alt=""
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : conv.type === 'direct' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                    {/* Online indicator - for future use */}
                    {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" /> */}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium text-sm truncate ${
                        conv.unread_count && conv.unread_count > 0
                          ? 'text-dark-800'
                          : 'text-dark-700'
                      }`}>
                        {getConversationName(conv)}
                      </span>
                      <span className="text-[11px] text-dark-400 flex-shrink-0">
                        {formatTime(conv.last_message?.created_at || conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-[13px] truncate flex-1 ${
                        conv.unread_count && conv.unread_count > 0
                          ? 'text-dark-700 font-medium'
                          : 'text-dark-500'
                      }`}>
                        {conv.last_message?.content || 'Aucun message'}
                      </p>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-neon-500 text-dark-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-4 h-4 text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-silver-200/50">
          <a
            href="/messages"
            onClick={closeDrawer}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-neon-600 hover:text-neon-700 hover:bg-neon-50/50:bg-dark-700 rounded-xl transition-colors"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  );
}
