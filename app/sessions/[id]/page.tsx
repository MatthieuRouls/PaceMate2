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
} from '@/lib/actions';
import RatingModal from '@/components/ui/RatingModal';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Target, Zap } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-secondary-600 font-medium hover:border-primary-500 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          {debugTestRating && (
            <span className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-600 text-sm font-semibold border-2 border-orange-500/20">
              🧪 Mode Test Notation
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-3xl p-8 border-2 border-red-500 text-center shadow-lg">
            <p className="text-red-500 font-bold text-xl mb-2">❌ Erreur</p>
            <p className="text-secondary-600/70">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && session && (
          <div className="space-y-6">
            {/* Hero Card - Title & Creator */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100">
              <h1 className="text-4xl md:text-5xl font-bold text-secondary-600 mb-4">{session.title}</h1>

              {session.description && (
                <p className="text-lg text-secondary-600/70 leading-relaxed mb-6">{session.description}</p>
              )}

              {/* Creator Badge */}
              {session.creator && (
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary-500/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5">
                    <div className="w-full h-full rounded-full bg-secondary-600 flex items-center justify-center text-white font-bold">
                      {getInitials(session.creator.username)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-primary-600 font-medium uppercase tracking-wider">Organisé par</p>
                    <p className="text-secondary-600 font-semibold">{session.creator.username}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid - Big Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-6 text-white shadow-lg">
                <div className="text-4xl font-bold mb-1">{session.distance_km}</div>
                <div className="text-sm opacity-90 uppercase tracking-wider font-medium">Kilomètres</div>
              </div>

              <div className="bg-white rounded-3xl p-6 border-2 border-primary-500 shadow-lg">
                <div className="text-4xl font-bold text-secondary-600 mb-1">{getPaceDisplay()}</div>
                <div className="text-sm text-secondary-600/60 uppercase tracking-wider font-medium">Allure/km</div>
              </div>

              <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 shadow-lg">
                <div className="text-4xl font-bold text-secondary-600 mb-1">{estimatedDuration}</div>
                <div className="text-sm text-secondary-600/60 uppercase tracking-wider font-medium">Minutes</div>
              </div>

              <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 shadow-lg">
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i < session.level_required ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-secondary-600/60 uppercase tracking-wider font-medium">
                  {levelLabels[session.level_required - 1]}
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-secondary-600 mb-6">Informations</h2>

              <div className="space-y-5">
                {/* Date */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary-600/60 font-medium">Date et heure</p>
                    <p className="text-secondary-600 font-semibold">{formatLongDate(session.start_time)}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary-600/60 font-medium">Point de rendez-vous</p>
                    <p className="text-secondary-600 font-semibold">{session.location_name}</p>
                  </div>
                </div>

                {/* Type */}
                {session.session_type && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-600/60 font-medium">Type de sortie</p>
                      <p className="text-secondary-600 font-semibold">
                        {sessionTypeLabels[session.session_type] || session.session_type}
                      </p>
                    </div>
                  </div>
                )}

                {/* Walk breaks */}
                {session.walk_breaks_ok && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 text-primary-600 font-semibold text-sm">
                      ✓ Pauses marche autorisées
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Participants Card */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-secondary-600 mb-6">Participants</h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-secondary-600">
                    {session.participants_count || 0} / {session.max_participants}
                  </span>
                  <span className="text-sm text-secondary-600/60 font-medium">
                    {isSessionFull()
                      ? 'Session complète'
                      : `${session.max_participants - (session.participants_count || 0)} place${(session.max_participants - (session.participants_count || 0)) > 1 ? 's' : ''} restante${(session.max_participants - (session.participants_count || 0)) > 1 ? 's' : ''}`
                    }
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                    style={{
                      width: `${((session.participants_count || 0) / session.max_participants) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Participants List */}
              {session.participants && session.participants.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {session.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-secondary-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(participant.username)}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-secondary-600 truncate">
                        {participant.username}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-600/60">
                  Sois le premier à rejoindre cette session !
                </div>
              )}
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100">
              {/* Not joined yet */}
              {!userStatus && !isSessionPast() && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading || isSessionFull()}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {actionLoading
                    ? '⏳ Inscription en cours...'
                    : isSessionFull()
                    ? '❌ Session complète'
                    : '✨ Rejoindre cette session'
                  }
                </button>
              )}

              {/* Already joined */}
              {userStatus && userStatus.status === 'confirmed' && !isSessionPast() && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-primary-500/10 text-primary-600">
                    <span className="text-2xl">✓</span>
                    <span className="font-bold text-lg">Vous participez à cette session</span>
                  </div>
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="w-full py-4 rounded-2xl border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? '⏳ Chargement...' : '🚪 Se désister'}
                  </button>
                </div>
              )}

              {/* Past session - rate */}
              {userStatus && userStatus.status === 'confirmed' && isSessionPast() && !userStatus.rating && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  ⭐ Noter cette sortie
                </button>
              )}

              {/* Already rated */}
              {userStatus && userStatus.rating && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">⭐</div>
                  <p className="text-2xl font-bold text-secondary-600 mb-2">
                    Vous avez donné {userStatus.rating}/5
                  </p>
                  <p className="text-secondary-600/60">Merci pour votre retour !</p>
                </div>
              )}

              {/* Past session but not participated */}
              {!userStatus && isSessionPast() && (
                <div className="text-center py-6 text-secondary-600/60">
                  <p className="text-lg">Cette session est terminée</p>
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
