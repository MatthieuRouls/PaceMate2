'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';

export default function Home() {
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
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center">
          {/* Titre principal avec gradient */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text animate-fadeIn">
            Trouve ton binôme running
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto animate-fadeIn" style={{
            color: 'var(--text-light)',
            animationDelay: '0.1s'
          }}>
            Rejoins une communauté de coureurs de tous niveaux et progresse ensemble
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fadeIn" style={{
            animationDelay: '0.2s'
          }}>
            <Link href="/sessions" className="btn-gradient text-lg w-full sm:w-auto">
              🔍 Explorer les sessions
            </Link>
            <Link
              href="/sessions/create"
              className="btn-outline-gradient text-lg w-full sm:w-auto"
            >
              ✨ Créer une session
            </Link>
          </div>

          {/* Illustration placeholder */}
          <div className="mt-16 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="max-w-3xl mx-auto p-12 glass flex items-center justify-center" style={{
              borderRadius: 'var(--radius-xl)',
            }}>
              <div className="text-center">
                <div className="text-8xl mb-6">🏃‍♂️💨</div>
                <p className="text-lg font-semibold gradient-text">Cours ensemble, progresse plus vite</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche ? */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 gradient-text">
            Comment ça marche ?
          </h2>
          <p className="text-center mb-16 text-lg" style={{ color: 'var(--text-light)' }}>
            En 3 étapes simples, trouve ta prochaine sortie running
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Étape 1 */}
            <div className="card-modern text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl" style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: 'var(--shadow-colored)'
              }}>
                1
              </div>
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                Trouve une session
              </h3>
              <p style={{ color: 'var(--text-light)' }}>
                Explore les sessions près de chez toi et choisis celle qui correspond à ton niveau
              </p>
            </div>

            {/* Étape 2 */}
            <div className="card-modern text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl" style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: 'var(--shadow-colored)'
              }}>
                2
              </div>
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                Rejoins le groupe
              </h3>
              <p style={{ color: 'var(--text-light)' }}>
                Inscris-toi en un clic et rencontre d'autres coureurs motivés
              </p>
            </div>

            {/* Étape 3 */}
            <div className="card-modern text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl" style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: 'var(--shadow-colored)'
              }}>
                3
              </div>
              <div className="text-5xl mb-4">🏃‍♂️</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                Progresse ensemble
              </h3>
              <p style={{ color: 'var(--text-light)' }}>
                Cours, note tes sessions et gagne des XP pour débloquer de nouveaux niveaux
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions à venir */}
      <section className="py-20 px-4" style={{
        background: 'linear-gradient(135deg, rgba(255,107,157,0.05) 0%, rgba(107,163,255,0.05) 100%)',
      }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text">Sessions à venir</h2>
            <Link
              href="/sessions"
              className="link-gradient text-lg font-semibold"
            >
              Voir toutes les sessions →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner-gradient mx-auto"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card-modern text-center py-12">
              <p className="text-lg mb-6" style={{ color: 'var(--text-light)' }}>
                Aucune session disponible pour le moment
              </p>
              <Link href="/sessions/create" className="btn-gradient inline-block">
                Créer la première session
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top équipes */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="gradient-text">🏆 Top équipes</span>
            </h2>
            <Link
              href="/teams"
              className="link-gradient text-lg font-semibold"
            >
              Voir le classement complet →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner-gradient mx-auto"></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const isTopThree = position <= 3;

                return (
                  <div
                    key={team.id}
                    className={`card-modern ${isTopThree ? 'shadow-colored' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="text-4xl w-16 h-16 rounded-full flex items-center justify-center font-bold"
                        style={{
                          background: isTopThree ? 'var(--gradient-primary)' : 'rgba(255,107,157,0.1)',
                          color: isTopThree ? 'white' : 'var(--primary-pink)',
                        }}
                      >
                        {getMedalEmoji(position)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold truncate" style={{ color: 'var(--text-dark)' }}>
                          {team.name}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                          {position}ère place
                        </p>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-light)' }}>
                        {team.description}
                      </p>
                    )}

                    <div className="divider-gradient"></div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span className="font-semibold">{team.members_count || 0} membres</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🏃</span>
                        <span
                          className={`font-bold ${isTopThree ? 'gradient-text' : ''}`}
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
            <div className="card-modern text-center py-12">
              <p className="text-lg mb-6" style={{ color: 'var(--text-light)' }}>
                Aucune équipe pour le moment
              </p>
              <Link href="/teams" className="btn-gradient inline-block">
                Créer une équipe
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 glass">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="font-semibold gradient-text text-lg mb-2">PaceMate © 2026</p>
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                La plateforme de mise en relation pour runners
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="link-gradient font-medium">
                À propos
              </a>
              <a href="#" className="link-gradient font-medium">
                Contact
              </a>
              <a href="#" className="link-gradient font-medium">
                CGU
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
