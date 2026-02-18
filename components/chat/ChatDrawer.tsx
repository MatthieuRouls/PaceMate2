'use client';

import { useState } from 'react';
import { X, Search, Users, User, MessageCircle } from 'lucide-react';
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
    refreshConversations
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

  function getConversationIcon(conv: Conversation) {
    if (conv.type === 'direct') {
      return <User className="w-5 h-5" />;
    }
    return <Users className="w-5 h-5" />;
  }

  function formatTime(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'maintenant';
    if (diffMins < 60) return `${diffMins}min`;
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-dark-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-silver-300 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-dark-800" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-800 dark:text-white">Messages</h2>
              <p className="text-xs text-dark-500">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-lg hover:bg-silver-100 dark:hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5 text-dark-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-silver-200 dark:border-dark-600">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-silver-100 dark:bg-dark-700 border-0 text-sm text-dark-800 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-neon-500/50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-silver-100 dark:bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-dark-400" />
              </div>
              <p className="text-dark-500 text-sm">
                {searchQuery ? 'Aucune conversation trouvee' : 'Aucune conversation'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-silver-200 dark:divide-dark-600">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-silver-50 dark:hover:bg-dark-700 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.type === 'direct' ? 'bg-neon-100 text-neon-700' : 'bg-pink-100 text-pink-600'
                  }`}>
                    {conv.type === 'direct' && conv.other_participant?.avatar_url ? (
                      <img
                        src={conv.other_participant.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      getConversationIcon(conv)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-sm truncate ${
                        conv.unread_count && conv.unread_count > 0
                          ? 'text-dark-800 dark:text-white'
                          : 'text-dark-700 dark:text-silver-300'
                      }`}>
                        {getConversationName(conv)}
                      </span>
                      <span className="text-xs text-dark-400 flex-shrink-0 ml-2">
                        {formatTime(conv.last_message?.created_at || conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate flex-1 ${
                        conv.unread_count && conv.unread_count > 0
                          ? 'text-dark-700 dark:text-silver-300 font-medium'
                          : 'text-dark-500'
                      }`}>
                        {conv.last_message?.content || 'Aucun message'}
                      </p>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-silver-200 dark:border-dark-600">
          <a
            href="/messages"
            className="block w-full py-2.5 text-center text-sm font-medium text-neon-700 hover:bg-neon-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Voir tous les messages
          </a>
        </div>
      </div>
    </>
  );
}
