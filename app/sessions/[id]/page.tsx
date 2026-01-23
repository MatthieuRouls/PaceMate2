'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Session, Profile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
  getSessionDetails,
  getUserSessionStatus,
  joinSession,
  leaveSession,
  rateSession,
} from '@/lib/actions';
import RatingModal from '@/components/ui/RatingModal';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

interface SessionWithDetails extends Session {
  creator?: Profile;
  participants?: Profile[];
}

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const sessionId = params.id as string;

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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

        // Récupérer le user ID
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .single();

        if (profileError || !profiles) {
          throw new Error('Impossible de récupérer le profil utilisateur');
        }

        const currentUserId = profiles.id;
        setUserId(currentUserId);

        // Récupérer les détails de la session
        const sessionData = await getSessionDetails(sessionId);
        if (!sessionData) {
          throw new Error('Session introuvable');
        }
        setSession(sessionData);

        // Récupérer le statut de l'utilisateur
        const status = await getUserSessionStatus(sessionId, currentUserId);
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
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
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

    if (theme === 'discovery') {
      if (session.walk_breaks_ok) return 'Tranquille avec pauses';
      if (session.target_pace) {
        const [min, sec] = session.target_pace.split(':').map(Number);
        const totalMinutes = min + sec / 60;
        if (totalMinutes <= 5) return 'Rapide';
        if (totalMinutes <= 6) return 'Allure modérée';
        return 'Tranquille';
      }
      return 'Allure modérée';
    } else {
      return session.target_pace ? `${session.target_pace} min/km` : 'Allure libre';
    }
  };

  // Labels des types de session
  const sessionTypeLabels: Record<string, string> = {
    casual: 'Sortie détente',
    recovery: 'Récupération',
    tempo: 'Allure soutenue',
    long_run: 'Sortie longue',
    intervals: 'Fractionné',
  };

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
    return new Date(session.start_time) < new Date();
  };

  // Vérifier si la session est complète
  const isSessionFull = () => {
    if (!session) return false;
    return (session.participants_count || 0) >= session.max_participants;
  };

  // Actions
  const handleJoin = async () => {
    if (!userId || !session) return;

    setActionLoading(true);
    const result = await joinSession(sessionId, userId);

    if (result.success) {
      // Recharger les données
      const updatedSession = await getSessionDetails(sessionId);
      setSession(updatedSession);
      const status = await getUserSessionStatus(sessionId, userId);
      setUserStatus(status);
    } else {
      alert(result.error || 'Erreur lors de l\'inscription');
    }

    setActionLoading(false);
  };

  const handleLeave = async () => {
    if (!userId || !session) return;

    const confirmed = window.confirm('Êtes-vous sûr de vouloir vous désister de cette session ?');
    if (!confirmed) return;

    setActionLoading(true);
    const result = await leaveSession(sessionId, userId);

    if (result.success) {
      // Recharger les données
      const updatedSession = await getSessionDetails(sessionId);
      setSession(updatedSession);
      const status = await getUserSessionStatus(sessionId, userId);
      setUserStatus(status);
    } else {
      alert(result.error || 'Erreur lors du désistement');
    }

    setActionLoading(false);
  };

  const handleRating = async (rating: number, comment: string) => {
    if (!userId) return;

    const result = await rateSession(sessionId, userId, rating, comment);

    if (result.success) {
      // Recharger le statut
      const status = await getUserSessionStatus(sessionId, userId);
      setUserStatus(status);
      alert('Merci pour votre note ! Vous avez gagné des XP 🎉');
    } else {
      alert(result.error || 'Erreur lors de l\'envoi de la note');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Bouton retour */}
        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 mb-6 opacity-75 hover:opacity-100 transition-opacity"
        >
          ← Retour aux sessions
        </Link>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: 'var(--color-primary)' }}
            ></div>
            <p className="mt-4 opacity-75">Chargement...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card border-2 border-red-500 text-center py-8">
            <p className="text-red-500 font-semibold mb-2">❌ Erreur</p>
            <p className="opacity-75">{error}</p>
          </div>
        )}

        {/* Contenu */}
        {!loading && !error && session && (
          <div className="space-y-6">
            {/* Header */}
            <div className="card">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{session.title}</h1>
              {session.description && <p className="text-lg opacity-75 mb-6">{session.description}</p>}

              {/* Créateur */}
              {session.creator && (
                <div className="flex items-center gap-3 mb-6 pb-6 border-b"
                     style={{ borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: theme === 'elite'
                        ? 'rgba(167, 139, 250, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {getInitials(session.creator.username)}
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Organisé par</p>
                    <p className="font-semibold">{session.creator.username}</p>
                  </div>
                </div>
              )}

              {/* Informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm opacity-75">Date et heure</p>
                    <p className="font-semibold">{formatLongDate(session.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="text-sm opacity-75">Lieu</p>
                    <p className="font-semibold">{session.location_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏃‍♂️</span>
                  <div>
                    <p className="text-sm opacity-75">Distance</p>
                    <p className="font-semibold">{session.distance_km} km</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-sm opacity-75">Allure</p>
                    <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {getPaceDisplay()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-sm opacity-75">Niveau requis</p>
                    <p className="font-semibold">{'⭐'.repeat(session.level_required)}</p>
                  </div>
                </div>

                {session.session_type && (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="text-sm opacity-75">Type</p>
                      <p className="font-semibold">{sessionTypeLabels[session.session_type] || session.session_type}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badge pauses marche */}
              {session.walk_breaks_ok && (
                <div className="mt-4">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      borderRadius: 'var(--radius)',
                      backgroundColor: theme === 'elite'
                        ? 'rgba(167, 139, 250, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    ✓ Pauses marche autorisées
                  </span>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Participants</h2>

              {/* Barre de progression */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">
                    {session.participants_count || 0} / {session.max_participants} places
                  </span>
                  <span className="text-sm opacity-75">
                    {isSessionFull() ? 'Complet' : `${session.max_participants - (session.participants_count || 0)} places restantes`}
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderRadius: theme === 'discovery' ? '999px' : '4px',
                  }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${((session.participants_count || 0) / session.max_participants) * 100}%`,
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: theme === 'discovery' ? '999px' : '4px',
                    }}
                  />
                </div>
              </div>

              {/* Liste des participants */}
              {session.participants && session.participants.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {session.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          backgroundColor: theme === 'elite'
                            ? 'rgba(167, 139, 250, 0.2)'
                            : 'rgba(34, 197, 94, 0.2)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {getInitials(participant.username)}
                      </div>
                      <span className="text-sm truncate">{participant.username}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center opacity-75 py-4">Aucun participant pour l'instant</p>
              )}
            </div>

            {/* Actions */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Actions</h2>

              {/* Pas encore participant */}
              {!userStatus && !isSessionPast() && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading || isSessionFull()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '⏳ Inscription...' : isSessionFull() ? '❌ Session complète' : '✨ Rejoindre cette sortie'}
                </button>
              )}

              {/* Participant confirmé */}
              {userStatus && userStatus.status === 'confirmed' && !isSessionPast() && (
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="w-full px-6 py-3 rounded-lg border-2 border-red-500 text-red-500 font-medium hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {actionLoading ? '⏳ Chargement...' : '🚪 Se désister'}
                </button>
              )}

              {/* Session passée - noter */}
              {userStatus && userStatus.status === 'confirmed' && isSessionPast() && !userStatus.rating && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="btn-primary w-full"
                >
                  ⭐ Noter cette sortie
                </button>
              )}

              {/* Déjà noté */}
              {userStatus && userStatus.rating && (
                <div className="text-center py-4">
                  <p className="text-lg font-semibold mb-2">Vous avez donné {userStatus.rating}/5 ⭐</p>
                  <p className="text-sm opacity-75">Merci pour votre retour !</p>
                </div>
              )}

              {/* Session passée mais pas participant */}
              {!userStatus && isSessionPast() && (
                <div className="text-center py-4 opacity-75">
                  <p>Cette session est terminée</p>
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
