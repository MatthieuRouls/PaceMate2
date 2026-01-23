'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/providers/ThemeProvider';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';

export default function Home() {
  const { theme } = useTheme();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessions, teams] = await Promise.all([
          getUpcomingSessions(3),
          getTopTeams(3),
        ]);
        setUpcomingSessions(sessions);
        setTopTeams(teams);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative py-20 px-4 overflow-hidden"
        style={{
          background:
            theme === 'discovery'
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(252, 211, 77, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(167, 139, 250, 0.15) 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto text-center">
          {/* Titre principal */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Trouve ton binôme running
          </h1>
          <p className="text-xl md:text-2xl opacity-75 mb-8 max-w-2xl mx-auto">
            Rejoins une communauté de coureurs de tous niveaux et progresse ensemble
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sessions" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
              🔍 Explorer les sorties
            </Link>
            <Link
              href="/sessions/create"
              className="px-8 py-4 rounded-lg text-lg font-medium border-2 w-full sm:w-auto transition-all hover:scale-105"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
              }}
            >
              ✨ Créer une sortie
            </Link>
          </div>

          {/* Illustration placeholder */}
          <div className="mt-12">
            <div
              className="max-w-2xl mx-auto h-64 rounded-2xl flex items-center justify-center"
              style={{
                borderRadius: 'var(--radius)',
                background:
                  theme === 'discovery'
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(252, 211, 77, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)',
              }}
            >
              <span className="text-6xl">🏃‍♂️💨</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche ? */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Comment ça marche ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Étape 1 */}
            <div className="card text-center">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-3">Trouve une sortie</h3>
              <p className="opacity-75">
                Explore les sessions près de chez toi et choisis celle qui correspond à ton niveau et tes envies
              </p>
            </div>

            {/* Étape 2 */}
            <div className="card text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-3">Rejoins un groupe</h3>
              <p className="opacity-75">
                Inscris-toi en un clic et rencontre d'autres coureurs motivés de ton niveau
              </p>
            </div>

            {/* Étape 3 */}
            <div className="card text-center">
              <div className="text-5xl mb-4">🏃‍♂️</div>
              <h3 className="text-xl font-bold mb-3">Progresse ensemble</h3>
              <p className="opacity-75">
                Cours, note tes sessions et gagne des XP pour débloquer de nouveaux niveaux !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions à venir */}
      <section
        className="py-16 px-4"
        style={{
          background:
            theme === 'discovery'
              ? 'rgba(34, 197, 94, 0.03)'
              : 'rgba(167, 139, 250, 0.03)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Sessions à venir</h2>
            <Link
              href="/sessions"
              className="text-lg font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Voir toutes les sessions →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: 'var(--color-primary)' }}
              ></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-lg opacity-75 mb-4">Aucune session disponible pour le moment</p>
              <Link href="/sessions/create" className="btn-primary inline-block">
                Créer la première sortie
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top équipes */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">🏆 Top équipes</h2>
            <Link
              href="/teams"
              className="text-lg font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Voir le classement complet →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: 'var(--color-primary)' }}
              ></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const isTopThree = position <= 3;

                return (
                  <div
                    key={team.id}
                    className={`card ${isTopThree ? 'border-2' : ''}`}
                    style={
                      isTopThree
                        ? {
                            borderColor: 'var(--color-primary)',
                            backgroundColor:
                              theme === 'elite'
                                ? 'rgba(167, 139, 250, 0.05)'
                                : 'rgba(34, 197, 94, 0.05)',
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="text-4xl w-16 h-16 rounded-full flex items-center justify-center font-bold"
                        style={{
                          backgroundColor:
                            theme === 'elite'
                              ? 'rgba(167, 139, 250, 0.2)'
                              : 'rgba(34, 197, 94, 0.2)',
                        }}
                      >
                        {getMedalEmoji(position)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold truncate">{team.name}</h3>
                        <p className="text-sm opacity-75">{position}ère place</p>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm opacity-75 mb-4 line-clamp-2">{team.description}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span className="font-semibold">{team.members_count || 0} membres</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🏃</span>
                        <span
                          className="font-bold"
                          style={{ color: isTopThree ? 'var(--color-primary)' : 'inherit' }}
                        >
                          {(team.total_distance || 0).toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-lg opacity-75 mb-4">Aucune équipe pour le moment</p>
              <Link href="/teams" className="btn-primary inline-block">
                Créer une équipe
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 px-4 border-t"
        style={{
          borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold">PaceMate © 2026</p>
              <p className="text-sm opacity-75">
                La plateforme de mise en relation pour runners
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="opacity-75 hover:opacity-100 transition-opacity">
                À propos
              </a>
              <a href="#" className="opacity-75 hover:opacity-100 transition-opacity">
                Contact
              </a>
              <a href="#" className="opacity-75 hover:opacity-100 transition-opacity">
                CGU
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
