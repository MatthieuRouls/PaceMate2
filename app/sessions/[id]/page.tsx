'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { ArrowLeft, Calendar, MapPin, Users, Clock, Target, Zap, Trash2, MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getSessionConversation } from '@/lib/chat-actions';
import { useChat } from '@/components/chat';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

interface SessionWithDetails extends Session {
  creator?: Profile;
  participants?: Profile[];
}

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const { profile } = useAuth();
  const { openChat } = useChat();

  // Mode debug pour tester la notation (ajoutez ?testRating=true à l'URL)
  const debugTestRating = searchParams.get('testRating') === 'true';

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Charger les données
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les détails de la session
        const sessionData = await getSessionDetails(sessionId);
        if (!sessionData) {
          throw new Error('Session introuvable');
        }
        setSession(sessionData);

        // Récupérer le statut de l'utilisateur
        const status = await getUserSessionStatus(sessionId);
        setUserStatus(status);
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la session');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId]);

  // Formater la date en format long
  const formatLongDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName} ${day} ${month} ${year} à ${hours}h${minutes}`;
  };

  // Formater l'allure
  const getPaceDisplay = () => {
    if (!session) return '';
    return session.target_pace ? `${session.target_pace}` : 'Allure libre';
  };

  // Labels des types de session
  const sessionTypeLabels: Record<string, string> = {
    casual: 'Sortie détente',
    recovery: 'Récupération',
    tempo: 'Allure soutenue',
    long_run: 'Sortie longue',
    intervals: 'Fractionné',
  };

  const levelLabels = ['Débutant', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert'];

  // Générer les initiales pour l'avatar
  const getInitials = (username: string) => {
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Vérifier si la session est passée
  const isSessionPast = () => {
    if (!session) return false;
    if (debugTestRating) return true;
    return new Date(session.start_time) < new Date();
  };

  // Vérifier si la session est complète
  const isSessionFull = () => {
    if (!session) return false;
    return (session.participants_count || 0) >= session.max_participants;
  };

  // Duration calculation
  const estimatedDuration = session
    ? Math.round((session.distance_km * parseFloat(session.target_pace?.split(':')[0] || '5')) / 60)
    : 0;

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

    const confirmed = window.confirm('Êtes-vous sûr de vouloir vous désister de cette session ?');
    if (!confirmed) return;

    setActionLoading(true);
    const result = await leaveSession(sessionId);

    if (result.success) {
      const updatedSession = await getSessionDetails(sessionId);
      setSession(updatedSession);
      const status = await getUserSessionStatus(sessionId);
      setUserStatus(status);
    } else {
      alert(result.error || 'Erreur lors du désistement');
    }

    setActionLoading(false);
  };

  const handleRating = async (rating: number, comment: string) => {
    const result = await rateSession(sessionId, rating, comment);

    if (result.success) {
      const status = await getUserSessionStatus(sessionId);
      setUserStatus(status);
      alert('Merci pour votre note ! Vous avez gagné des XP 🎉');
    } else {
      alert(result.error || 'Erreur lors de l\'envoi de la note');
    }
  };

  const handleDelete = async () => {
    if (!session) return;

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible et tous les participants seront désincrits.'
    );
    if (!confirmed) return;

    setActionLoading(true);
    const result = await deleteSession(sessionId);

    if (result.success) {
      alert('Session supprimée avec succès');
      router.push('/sessions');
    } else {
      alert(result.error || 'Erreur lors de la suppression de la session');
    }

    setActionLoading(false);
  };

  // Check if current user is the creator
  const isCreator = profile && session && session.creator_id === profile.id;

  // Check if current user is a participant (confirmed or creator)
  const isParticipant = userStatus?.status === 'confirmed' || isCreator;

  // Open session chat (popup)
  const handleOpenChat = async () => {
    if (!session) return;

    try {
      const result = await getSessionConversation(sessionId);
      if (result.success && result.conversation) {
        openChat(result.conversation.id);
      }
    } catch (err) {
      console.error('Error opening session chat:', err);
    }
  };

  return (
    <div className="min-h-screen bg-silver-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-silver-400 text-dark-800 font-medium hover:border-neon-500 hover:bg-silver-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          {debugTestRating && (
            <span className="px-4 py-2 rounded-lg bg-pink-500/10 text-pink-500 text-sm font-semibold border border-pink-500/20">
              Mode Test Notation
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-xl p-8 border border-pink-500 text-center">
            <p className="text-pink-500 font-bold text-xl mb-2">Erreur</p>
            <p className="text-dark-500">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && session && (
          <div className="space-y-6">
            {/* Hero Card - Title & Creator */}
            <div className="bg-white rounded-xl p-6 border border-silver-400">
              <h1 className="text-3xl md:text-4xl font-bold text-dark-800 mb-4">{session.title}</h1>

              {session.description && (
                <p className="text-lg text-dark-500 leading-relaxed mb-6">{session.description}</p>
              )}

              {/* Creator Badge */}
              {session.creator && (
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-neon-50">
                  <div className="w-11 h-11 rounded-full bg-neon-400 flex items-center justify-center text-white font-bold">
                    {getInitials(session.creator.username)}
                  </div>
                  <div>
                    <p className="text-xs text-neon-700 font-medium uppercase tracking-wider">Organise par</p>
                    <p className="text-dark-800 font-semibold">{session.creator.username}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid - Big Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-pink-500 rounded-lg p-5 text-white">
                <div className="text-3xl font-bold mb-1">{session.distance_km}</div>
                <div className="text-sm opacity-90 uppercase tracking-wider font-medium">Kilometres</div>
              </div>

              <div className="bg-white rounded-lg p-5 border-2 border-neon-500">
                <div className="text-3xl font-bold text-dark-800 mb-1">{getPaceDisplay()}</div>
                <div className="text-sm text-dark-500 uppercase tracking-wider font-medium">Allure/km</div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-silver-400">
                <div className="text-3xl font-bold text-dark-800 mb-1">{estimatedDuration}</div>
                <div className="text-sm text-dark-500 uppercase tracking-wider font-medium">Minutes</div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-silver-400">
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i < session.level_required ? 'bg-pink-500' : 'bg-silver-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-dark-500 uppercase tracking-wider font-medium">
                  {levelLabels[session.level_required - 1]}
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-xl p-6 border border-silver-400">
              <h2 className="text-xl font-bold text-dark-800 mb-5">Informations</h2>

              <div className="space-y-4">
                {/* Date */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-neon-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-neon-700" />
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 font-medium">Date et heure</p>
                    <p className="text-dark-800 font-semibold">{formatLongDate(session.start_time)}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-neon-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-neon-700" />
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 font-medium">Point de rendez-vous</p>
                    <p className="text-dark-800 font-semibold">{session.location_name}</p>
                  </div>
                </div>

                {/* Type */}
                {session.session_type && (
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-neon-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-neon-700" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-500 font-medium">Type de sortie</p>
                      <p className="text-dark-800 font-semibold">
                        {sessionTypeLabels[session.session_type] || session.session_type}
                      </p>
                    </div>
                  </div>
                )}

                {/* Walk breaks */}
                {session.walk_breaks_ok && (
                  <div className="pt-4 border-t border-silver-300">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-100 text-neon-700 font-semibold text-sm">
                      Pauses marche autorisees
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Participants Card */}
            <div className="bg-white rounded-xl p-6 border border-silver-400">
              <h2 className="text-xl font-bold text-dark-800 mb-5">Participants</h2>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-dark-800">
                    {session.participants_count || 0} / {session.max_participants}
                  </span>
                  <span className="text-sm text-dark-500 font-medium">
                    {isSessionFull()
                      ? 'Session complete'
                      : `${session.max_participants - (session.participants_count || 0)} place${(session.max_participants - (session.participants_count || 0)) > 1 ? 's' : ''} restante${(session.max_participants - (session.participants_count || 0)) > 1 ? 's' : ''}`
                    }
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-silver-200 overflow-hidden">
                  <div
                    className="h-full bg-neon-700 transition-all duration-500"
                    style={{
                      width: `${((session.participants_count || 0) / session.max_participants) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Participants List */}
              {session.participants && session.participants.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {session.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg bg-silver-100">
                      <div className="w-9 h-9 rounded-full bg-neon-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(participant.username)}
                      </div>
                      <span className="text-sm font-medium text-dark-800 truncate">
                        {participant.username}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-dark-500">
                  Sois le premier a rejoindre cette session !
                </div>
              )}

              {/* Chat Button - Only for participants */}
              {isParticipant && (
                <div className="mt-6 pt-5 border-t border-silver-300">
                  <button
                    onClick={handleOpenChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-500 hover:bg-neon-400 text-dark-800 font-semibold rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat de la session
                  </button>
                </div>
              )}
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-xl p-6 border border-silver-400">
              {/* Creator actions */}
              {isCreator && !isSessionPast() && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-silver-100 text-dark-800">
                    <span className="text-xl">👑</span>
                    <span className="font-bold">Vous etes l'organisateur de cette session</span>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-lg border-2 border-pink-500 text-pink-500 font-bold hover:bg-pink-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    {actionLoading ? 'Suppression...' : 'Supprimer la session'}
                  </button>
                </div>
              )}

              {/* Not joined yet */}
              {!userStatus && !isSessionPast() && !isCreator && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading || isSessionFull()}
                  className="w-full py-4 rounded-lg bg-pink-500 text-white text-lg font-bold hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading
                    ? 'Inscription en cours...'
                    : isSessionFull()
                    ? 'Session complete'
                    : 'Rejoindre cette session'
                  }
                </button>
              )}

              {/* Already joined */}
              {userStatus && userStatus.status === 'confirmed' && !isSessionPast() && !isCreator && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-neon-100 text-neon-700">
                    <span className="text-xl">✓</span>
                    <span className="font-bold">Vous participez a cette session</span>
                  </div>
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-lg border-2 border-pink-500 text-pink-500 font-bold hover:bg-pink-50 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Chargement...' : 'Se desister'}
                  </button>
                </div>
              )}

              {/* Past session - rate */}
              {userStatus && userStatus.status === 'confirmed' && isSessionPast() && !userStatus.rating && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full py-4 rounded-lg bg-pink-500 text-white text-lg font-bold hover:bg-pink-600 transition-colors"
                >
                  Noter cette sortie
                </button>
              )}

              {/* Already rated */}
              {userStatus && userStatus.rating && (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-xl font-bold text-dark-800 mb-2">
                    Vous avez donne {userStatus.rating}/5
                  </p>
                  <p className="text-dark-500">Merci pour votre retour !</p>
                </div>
              )}

              {/* Past session but not participated */}
              {!userStatus && isSessionPast() && (
                <div className="text-center py-6 text-dark-500">
                  <p className="text-lg">Cette session est terminee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {session && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            onSubmit={handleRating}
            sessionTitle={session.title}
          />
        )}
      </div>
    </div>
  );
}
