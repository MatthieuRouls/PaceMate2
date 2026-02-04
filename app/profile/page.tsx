'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Session, SessionParticipant } from '@/lib/types';
import { calculateLevel } from '@/lib/constants';
import ProgressBar from '@/components/ui/ProgressBar';
import SessionCard from '@/components/ui/SessionCard';
import {
  getUserUpcomingSessions,
  getUserSessionHistory,
} from '@/lib/actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const { profile, loading: authLoading } = useAuth();

  // State
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les données
  useEffect(() => {
    async function fetchData() {
      if (authLoading) return;

      if (!profile) {
        setError('Profil non trouvé');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Récupérer les sessions à venir
        const upcoming = await getUserUpcomingSessions();
        setUpcomingSessions(upcoming);

        // Récupérer l'historique
        const history = await getUserSessionHistory();
        setSessionHistory(history);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile, authLoading]);

  // Calculer le niveau
  const levelInfo = profile ? calculateLevel(profile.xp_points || 0) : null;

  // Générer les initiales pour l'avatar
  const getInitials = (username: string) => {
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Formater la date pour l'historique
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${dayName} ${day} ${month}`;
  };

  // Parser les meilleurs temps
  const parseBestTimes = (bestTimesJson?: string) => {
    if (!bestTimesJson) return null;

    try {
      const times = JSON.parse(bestTimesJson);
      const firstKey = Object.keys(times)[0];
      return firstKey ? `${firstKey} : ${times[firstKey]}` : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Mon Profil</h1>
          <p className="opacity-75">Suis ta progression et consulte tes statistiques</p>
        </div>

        {/* Loading */}
        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card border-2 border-red-500 text-center py-8">
            <p className="text-red-500 font-semibold mb-2">❌ Erreur</p>
            <p className="opacity-75">{error}</p>
          </div>
        )}

        {/* Contenu principal */}
        {!loading && !authLoading && !error && profile && (
          <div className="space-y-8">
            {/* Section Header avec avatar et niveau */}
            <div className="card">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                  style={{
                    backgroundColor: '#0066cc',
                    color: 'white',
                  }}
                >
                  {getInitials(profile.username)}
                </div>

                {/* Infos profil */}
                <div className="flex-1 w-full">
                  <h2 className="text-2xl font-bold mb-2">{profile.username}</h2>

                  {profile.bio && <p className="opacity-75 mb-4">{profile.bio}</p>}

                  {/* Niveau et progression */}
                  {levelInfo && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          Niveau {levelInfo.currentLevel} - {levelInfo.levelName}
                        </span>
                        {levelInfo.currentLevel < 5 && (
                          <span className="text-sm opacity-75">
                            Niveau {levelInfo.currentLevel + 1} à {levelInfo.nextLevelXP} XP
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        current={levelInfo.currentXP}
                        max={levelInfo.nextLevelXP}
                        level={levelInfo.currentLevel}
                      />
                    </div>
                  )}

                  {/* Badge équipe */}
                  {profile.team && (
                    <Link
                      href="/teams"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all hover:scale-105"
                      style={{
                        borderColor: '#0066cc',
                        backgroundColor: '#f0f7ff',
                      }}
                    >
                      <span>🏆</span>
                      <span className="font-semibold">{profile.team.name}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Section Statistiques */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Statistiques</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Distance totale */}
                <div className="card">
                  <div className="text-3xl mb-2">🏃‍♂️</div>
                  <div
                    className="text-3xl font-mono font-bold mb-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {(profile.total_distance_km || 0).toFixed(1)}
                  </div>
                  <div className="text-sm opacity-75">km parcourus</div>
                </div>

                {/* Sessions complétées */}
                <div className="card">
                  <div className="text-3xl mb-2">✅</div>
                  <div
                    className="text-3xl font-mono font-bold mb-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {profile.completed_sessions_count || 0}
                  </div>
                  <div className="text-sm opacity-75">sorties</div>
                </div>

                {/* XP Points */}
                <div className="card">
                  <div className="text-3xl mb-2">⭐</div>
                  <div
                    className="text-3xl font-mono font-bold mb-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {profile.xp_points || 0}
                  </div>
                  <div className="text-sm opacity-75">points</div>
                </div>

                {/* Meilleur temps */}
                <div className="card">
                  <div className="text-3xl mb-2">⚡</div>
                  <div
                    className="text-xl font-mono font-bold mb-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {parseBestTimes(profile.best_times) || '--'}
                  </div>
                  <div className="text-sm opacity-75">meilleur temps</div>
                </div>
              </div>
            </div>

            {/* Section Prochaines sessions */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Mes prochaines sessions</h2>

              {upcomingSessions.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-2xl mb-4">🏃‍♂️</p>
                  <h3 className="text-xl font-semibold mb-2">Aucune sortie prévue</h3>
                  <p className="opacity-75 mb-6">Rejoins une session pour courir avec la communauté !</p>
                  <Link href="/sessions" className="btn-primary">
                    Voir les sessions
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </div>

            {/* Section Historique */}
            {sessionHistory.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Historique</h2>
                <div className="card space-y-3">
                  {sessionHistory.map((participant) => {
                    const session = participant.session;
                    if (!session) return null;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-gray-50"
                        style={{
                          borderColor: '#dee2e6',
                        }}
                      >
                        <div className="flex-1">
                          <div className="font-semibold mb-1">{session.title}</div>
                          <div className="text-sm opacity-75">
                            {formatDate(session.start_time)} · {session.distance_km} km
                          </div>
                        </div>
                        {participant.rating && (
                          <div className="flex items-center gap-1 ml-4">
                            {'⭐'.repeat(participant.rating)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
