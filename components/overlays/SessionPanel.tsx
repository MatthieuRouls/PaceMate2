'use client';

import { useEffect, useState } from 'react';
import { Session } from '@/lib/types';
import { getSessionDetails, joinSession, leaveSession } from '@/lib/actions';
import { useAuth } from '@/components/providers/AuthProvider';
import GlassOverlay from './GlassOverlay';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MapPin, Clock, Calendar, Users, Activity,
  Share2, MessageCircle, UserPlus, LogOut,
  Navigation, ChevronRight
} from 'lucide-react';

interface SessionPanelProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Images par type de session (locales)
const SESSION_COVERS: Record<string, string[]> = {
  intervals: ['/fractionne-1.jpeg'],
  long_run: ['/long-run-1.jpeg'],
  casual: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
  recovery: ['/recovery-1.jpeg'],
  tempo: ['/tempo-1.jpg'],
  default: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
};

const getSessionCover = (session: Session): string => {
  const covers = SESSION_COVERS[session.session_type || 'default'] || SESSION_COVERS.default;
  const index = session.id.charCodeAt(0) % covers.length;
  return covers[index];
};

export default function SessionPanel({ sessionId, isOpen, onClose }: SessionPanelProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    if (sessionId && isOpen) {
      setLoading(true);
      getSessionDetails(sessionId)
        .then((data) => {
          setSession(data);
          // Check if user is participant
          const participants = (data as any).participants || [];
          setIsParticipant(participants.some((p: any) => p.user_id === user?.id));
        })
        .finally(() => setLoading(false));
    }
  }, [sessionId, isOpen, user?.id]);

  const handleJoin = async () => {
    if (!sessionId) return;
    setJoining(true);
    try {
      await joinSession(sessionId);
      setIsParticipant(true);
      // Refresh session data
      const data = await getSessionDetails(sessionId);
      setSession(data);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!sessionId) return;
    setJoining(true);
    try {
      await leaveSession(sessionId);
      setIsParticipant(false);
      const data = await getSessionDetails(sessionId);
      setSession(data);
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    if (!session) return;
    const url = `${window.location.origin}/sessions/${session.id}`;
    if (navigator.share) {
      await navigator.share({ title: session.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Lien copié !');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <GlassOverlay
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      width="max-w-md"
      showBackButton
      showCloseButton={false}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : session ? (
        <div className="flex flex-col h-full">
          {/* Hero Image */}
          <div className="relative h-48 bg-gradient-to-br from-pink-500 to-purple-600">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-80"
              style={{
                backgroundImage: `url('${getSessionCover(session)}')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 text-dark-800 text-xs font-semibold rounded-full mb-2">
                <Activity className="w-3 h-3" />
                {session.session_type || 'Course'}
              </span>
              <h1 className="text-2xl font-black text-white drop-shadow-lg">{session.title}</h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-silver-50 dark:bg-dark-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-dark-500 dark:text-silver-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Date</span>
                </div>
                <p className="font-bold text-dark-800 dark:text-white text-sm capitalize">
                  {formatDate(session.start_time)}
                </p>
              </div>
              <div className="bg-silver-50 dark:bg-dark-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-dark-500 dark:text-silver-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Heure</span>
                </div>
                <p className="font-bold text-dark-800 dark:text-white text-sm">
                  {formatTime(session.start_time)}
                </p>
              </div>
              {session.distance_km && (
                <div className="bg-silver-50 dark:bg-dark-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-dark-500 dark:text-silver-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">Distance</span>
                  </div>
                  <p className="font-bold text-dark-800 dark:text-white text-sm">
                    {session.distance_km} km
                  </p>
                </div>
              )}
              <div className="bg-silver-50 dark:bg-dark-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-dark-500 dark:text-silver-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">Participants</span>
                </div>
                <p className="font-bold text-dark-800 dark:text-white text-sm">
                  {session.participants_count || 0} inscrits
                </p>
              </div>
            </div>

            {/* Location */}
            {session.location_name && (
              <div className="bg-neon-50 dark:bg-neon-900/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-100 dark:bg-neon-800/30 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-neon-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-dark-800 dark:text-white">{session.location_name}</p>
                    <button className="text-sm text-neon-600 font-medium flex items-center gap-1 hover:text-neon-700">
                      <Navigation className="w-3 h-3" />
                      Itinéraire
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {session.description && (
              <div>
                <h3 className="text-sm font-semibold text-dark-500 dark:text-silver-400 mb-2">Description</h3>
                <p className="text-dark-700 dark:text-silver-300 text-sm leading-relaxed">
                  {session.description}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-silver-100 dark:bg-dark-700 rounded-xl text-dark-600 dark:text-silver-300 font-semibold hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-silver-100 dark:bg-dark-700 rounded-xl text-dark-600 dark:text-silver-300 font-semibold hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors">
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="sticky bottom-0 p-5 border-t border-silver-200 dark:border-dark-700 bg-white dark:bg-dark-800">
            {isParticipant ? (
              <div className="flex gap-3">
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-silver-100 dark:bg-dark-700 rounded-xl text-dark-600 dark:text-silver-300 font-semibold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {joining ? 'En cours...' : 'Quitter'}
                </button>
                <button className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-neon-600 hover:bg-neon-700 rounded-xl text-white font-bold transition-colors">
                  <ChevronRight className="w-5 h-5" />
                  Voir les détails
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-xl text-white font-bold text-lg transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50"
              >
                <UserPlus className="w-5 h-5" />
                {joining ? 'En cours...' : 'Rejoindre cette sortie'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-dark-500">
          Session non trouvée
        </div>
      )}
    </GlassOverlay>
  );
}
