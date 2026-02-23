'use client';

import { useEffect, useState, useCallback } from 'react';
import { Session, Profile } from '@/lib/types';
import {
  getSessionDetails,
  getUserSessionStatus,
  joinSession,
  leaveSession,
  rateSession,
  deleteSession,
} from '@/lib/actions';
import RatingModal from '@/components/ui/RatingModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Calendar, MapPin, Users, Target, MessageCircle, Share2, Trash2,
  Route, Clock, Zap, Crown
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getSessionConversation } from '@/lib/chat-actions';
import { useChat } from '@/components/chat';

interface SessionWithDetails extends Session {
  creator?: Profile;
  participants?: Profile[];
}

interface SessionDetailsContentProps {
  sessionId: string;
  onClose?: () => void;
  onShare?: () => void;
  onLeaveConfirm?: (onConfirm: () => void) => void;
  onDeleteConfirm?: (onConfirm: () => void) => void;
  onOpenChat?: () => void;
  compact?: boolean;
}

// Session type images
const SESSION_TYPE_IMAGES: Record<string, string> = {
  intervals: 'https://images.unsplash.com/photo-1461896836934-fffff?w=800&q=80',
  long_run: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80',
  casual: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
  recovery: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  tempo: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
};

const sessionTypeLabels: Record<string, string> = {
  casual: 'Sortie detente',
  recovery: 'Recuperation',
  tempo: 'Allure soutenue',
  long_run: 'Sortie longue',
  intervals: 'Fractionne',
};

const levelLabels = ['Debutant', 'Intermediaire', 'Confirme', 'Avance', 'Expert'];

export default function SessionDetailsContent({
  sessionId,
  onClose,
  onShare,
  onLeaveConfirm,
  onDeleteConfirm,
  onOpenChat,
  compact = false
}: SessionDetailsContentProps) {
  const { profile } = useAuth();
  const { openChat } = useChat();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Load data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getSessionDetails(sessionId);
        if (!sessionData) {
          throw new Error('Session introuvable');
        }
        setSession(sessionData);

        const status = await getUserSessionStatus(sessionId);
        setUserStatus(status);
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getInitials = (username: string) => {
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const isSessionPast = () => {
    if (!session) return false;
    return new Date(session.start_time) < new Date();
  };

  const isSessionFull = () => {
    if (!session) return false;
    return (session.participants_count || 0) >= session.max_participants;
  };

  const isCreator = profile && session && session.creator_id === profile.id;
  const isParticipant = userStatus?.status === 'confirmed' || isCreator;

  // Actions
  const handleJoin = async () => {
    if (!session) return;
    setActionLoading(true);
    const result = await joinSession(sessionId);

    if (result.success) {
      const updatedSession = await getSessionDetails(sessionId);
      setSession(updatedSession);
      const status = await getUserSessionStatus(sessionId);
      setUserStatus(status);
    } else {
      alert(result.error || 'Erreur lors de l\'inscription');
    }
    setActionLoading(false);
  };

  const handleLeave = async () => {
    if (!session) return;

    const doLeave = async () => {
      setActionLoading(true);
      const result = await leaveSession(sessionId);

      if (result.success) {
        const updatedSession = await getSessionDetails(sessionId);
        setSession(updatedSession);
        const status = await getUserSessionStatus(sessionId);
        setUserStatus(status);
      } else {
        alert(result.error || 'Erreur lors du desistement');
      }
      setActionLoading(false);
    };

    if (onLeaveConfirm) {
      onLeaveConfirm(doLeave);
    } else {
      if (window.confirm('Etes-vous sur de vouloir vous desister ?')) {
        doLeave();
      }
    }
  };

  const handleDelete = async () => {
    if (!session) return;

    const doDelete = async () => {
      setActionLoading(true);
      const result = await deleteSession(sessionId);

      if (result.success) {
        onClose?.();
      } else {
        alert(result.error || 'Erreur lors de la suppression');
      }
      setActionLoading(false);
    };

    if (onDeleteConfirm) {
      onDeleteConfirm(doDelete);
    } else {
      if (window.confirm('Supprimer cette session ?')) {
        doDelete();
      }
    }
  };

  const handleRating = async (rating: number, comment: string) => {
    const result = await rateSession(sessionId, rating, comment);

    if (result.success) {
      const status = await getUserSessionStatus(sessionId);
      setUserStatus(status);
    } else {
      alert(result.error || 'Erreur');
    }
  };

  const handleOpenChatInternal = async () => {
    if (onOpenChat) {
      onOpenChat();
      return;
    }

    try {
      const result = await getSessionConversation(sessionId);
      if (result.success && result.conversation) {
        openChat(result.conversation.id);
      }
    } catch (err) {
      console.error('Error opening chat:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 text-center">
        <p className="text-pink-500 font-bold mb-2">Erreur</p>
        <p className="text-dark-500">{error || 'Session introuvable'}</p>
      </div>
    );
  }

  const dateInfo = formatDate(session.start_time);
  const heroImage = SESSION_TYPE_IMAGES[session.session_type || 'casual'] || SESSION_TYPE_IMAGES.casual;

  return (
    <div className="flex flex-col h-full">
      {/* Hero Image */}
      <div className="relative h-48 shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/40 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-neon-700/90 text-white text-xs font-bold uppercase tracking-wider">
            {sessionTypeLabels[session.session_type || 'casual']}
          </span>
        </div>

        {/* Date badge */}
        <div className="absolute top-4 right-4 text-right">
          <div className="text-white font-bold text-sm">{dateInfo.day}</div>
          <div className="text-neon-400 font-bold text-lg">{dateInfo.time}</div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-bold text-white leading-tight">{session.title}</h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-pink-500 text-white text-center">
              <Route className="w-5 h-5 mx-auto mb-1" />
              <div className="text-2xl font-bold">{session.distance_km}</div>
              <div className="text-xs opacity-90">km</div>
            </div>
            <div className="p-3 rounded-xl bg-silver-100 dark:bg-dark-700 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-neon-700" />
              <div className="text-xl font-bold text-dark-800 dark:text-white">
                {session.target_pace || '--'}
              </div>
              <div className="text-xs text-dark-500">/km</div>
            </div>
            <div className="p-3 rounded-xl bg-silver-100 dark:bg-dark-700 text-center">
              <Zap className="w-5 h-5 mx-auto mb-1 text-pink-500" />
              <div className="flex gap-0.5 justify-center mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < session.level_required ? 'bg-pink-500' : 'bg-silver-300 dark:bg-dark-500'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-dark-500">{levelLabels[session.level_required - 1]}</div>
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div className="p-4 rounded-xl bg-silver-50 dark:bg-dark-700">
              <p className="text-sm text-dark-600 dark:text-silver-300 leading-relaxed">
                {session.description}
              </p>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-silver-50 dark:bg-dark-700">
            <div className="w-10 h-10 rounded-lg bg-neon-100 dark:bg-neon-900/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-neon-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark-400 font-medium uppercase tracking-wider mb-0.5">Lieu</p>
              <p className="text-dark-800 dark:text-white font-semibold">{session.location_name}</p>
            </div>
          </div>

          {/* Mini map placeholder if coordinates exist */}
          {session.latitude && session.longitude && (
            <div className="rounded-xl overflow-hidden h-32 bg-silver-200 dark:bg-dark-700">
              <img
                src={`https://staticmap.thismoment.cloud/staticmap?center=${session.latitude},${session.longitude}&zoom=15&size=600x200&markers=${session.latitude},${session.longitude},red-pushpin`}
                alt="Carte"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Organizer */}
          {session.creator && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-neon-50 dark:bg-neon-900/20">
              <div className="w-11 h-11 rounded-full bg-neon-500 flex items-center justify-center text-white font-bold shrink-0">
                {getInitials(session.creator.username)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-neon-700 font-medium uppercase tracking-wider">Organise par</p>
                <p className="text-dark-800 dark:text-white font-semibold">{session.creator.username}</p>
              </div>
              {isCreator && <Crown className="w-5 h-5 text-neon-600" />}
            </div>
          )}

          {/* Participants */}
          <div className="p-4 rounded-xl bg-silver-50 dark:bg-dark-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-dark-500" />
                <span className="font-semibold text-dark-800 dark:text-white">
                  {session.participants_count || 0} / {session.max_participants}
                </span>
              </div>
              <span className="text-xs text-dark-400">
                {isSessionFull() ? 'Complet' : `${session.max_participants - (session.participants_count || 0)} places`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-silver-200 dark:bg-dark-600 mb-4">
              <div
                className="h-full rounded-full bg-neon-700 transition-all duration-300"
                style={{ width: `${((session.participants_count || 0) / session.max_participants) * 100}%` }}
              />
            </div>

            {/* Avatar list */}
            {session.participants && session.participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {session.participants.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="w-9 h-9 rounded-full bg-neon-400 flex items-center justify-center text-white text-xs font-bold"
                    title={p.username}
                  >
                    {getInitials(p.username)}
                  </div>
                ))}
                {session.participants.length > 8 && (
                  <div className="w-9 h-9 rounded-full bg-silver-300 dark:bg-dark-600 flex items-center justify-center text-dark-500 text-xs font-bold">
                    +{session.participants.length - 8}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Walk breaks badge */}
          {session.walk_breaks_ok && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-100 dark:bg-neon-900/30 text-neon-700 text-sm font-medium">
              Pauses marche autorisees
            </div>
          )}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="shrink-0 p-4 border-t border-silver-200 dark:border-dark-600 bg-white dark:bg-dark-800">
        {/* Not joined yet */}
        {!userStatus && !isSessionPast() && !isCreator && (
          <button
            onClick={handleJoin}
            disabled={actionLoading || isSessionFull()}
            className="w-full py-3.5 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Inscription...' : isSessionFull() ? 'Session complete' : 'Rejoindre'}
          </button>
        )}

        {/* Already joined - show action buttons */}
        {userStatus?.status === 'confirmed' && !isSessionPast() && !isCreator && (
          <div className="flex gap-3">
            <button
              onClick={handleOpenChatInternal}
              className="flex-1 py-3 rounded-xl bg-neon-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-neon-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </button>
            {onShare && (
              <button
                onClick={onShare}
                className="w-12 h-12 rounded-xl bg-silver-100 dark:bg-dark-700 flex items-center justify-center hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors"
                aria-label="Partager"
              >
                <Share2 className="w-5 h-5 text-dark-500" />
              </button>
            )}
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="px-4 py-3 rounded-xl border-2 border-pink-500 text-pink-500 font-semibold hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors disabled:opacity-50"
            >
              Quitter
            </button>
          </div>
        )}

        {/* Creator actions */}
        {isCreator && !isSessionPast() && (
          <div className="flex gap-3">
            <button
              onClick={handleOpenChatInternal}
              className="flex-1 py-3 rounded-xl bg-neon-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-neon-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </button>
            {onShare && (
              <button
                onClick={onShare}
                className="w-12 h-12 rounded-xl bg-silver-100 dark:bg-dark-700 flex items-center justify-center hover:bg-silver-200 dark:hover:bg-dark-600 transition-colors"
                aria-label="Partager"
              >
                <Share2 className="w-5 h-5 text-dark-500" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="w-12 h-12 rounded-xl border-2 border-pink-500 text-pink-500 flex items-center justify-center hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors disabled:opacity-50"
              aria-label="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Past session - rate */}
        {userStatus?.status === 'confirmed' && isSessionPast() && !userStatus.rating && (
          <button
            onClick={() => setShowRatingModal(true)}
            className="w-full py-3.5 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors"
          >
            Noter cette sortie
          </button>
        )}

        {/* Already rated */}
        {userStatus?.rating && (
          <div className="text-center py-2">
            <span className="text-dark-500">Note donnee: {userStatus.rating}/5 ⭐</span>
          </div>
        )}

        {/* Past and not joined */}
        {!userStatus && isSessionPast() && !isCreator && (
          <div className="text-center py-2 text-dark-500">
            Cette session est terminee
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRating}
        sessionTitle={session.title}
      />
    </div>
  );
}
