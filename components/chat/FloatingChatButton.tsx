'use client';

import { MessageCircle } from 'lucide-react';
import { useChat } from './ChatProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function FloatingChatButton() {
  const { profile } = useAuth();
  const { toggleDrawer, unreadTotal, isDrawerOpen } = useChat();

  // Ne pas afficher si pas connecté
  if (!profile) return null;

  return (
    <button
      onClick={toggleDrawer}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
        isDrawerOpen
          ? 'bg-dark-800 text-white scale-95'
          : 'bg-neon-500 text-dark-800 hover:bg-neon-400 hover:scale-105'
      }`}
      aria-label="Ouvrir les messages"
    >
      <MessageCircle className="w-6 h-6" />

      {/* Badge notifications */}
      {unreadTotal > 0 && !isDrawerOpen && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">
          {unreadTotal > 99 ? '99+' : unreadTotal}
        </span>
      )}
    </button>
  );
}
