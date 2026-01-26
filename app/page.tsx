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

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{
        backgroundColor: 'white',
        borderBottom: '1px solid var(--border)',
        paddingTop: '80px'
      }}>
        <div className="container py-16">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h1 className="mb-6">
              Trouve ton binôme de course
            </h1>
            <p className="mb-8 text-secondary" style={{ fontSize: '18px' }}>
              Rejoins des runners de tous niveaux près de chez toi et progresse ensemble
            </p>

            <div className="flex gap-4 justify-center" style={{ flexWrap: 'wrap' }}>
              <Link href="/sessions" className="btn-primary" style={{ fontSize: '18px', padding: '14px 32px' }}>
                Voir les sessions
              </Link>
              <Link href="/sessions/create" className="btn-secondary" style={{ fontSize: '18px', padding: '12px 32px' }}>
                Créer une session
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-center mb-8">Comment ça marche ?</h2>

          <div className="grid grid-cols-3">
            <div className="text-center p-6">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                1
              </div>
              <h3 className="mb-3">Trouve une session</h3>
              <p className="text-secondary">
                Parcours les sessions disponibles près de chez toi
              </p>
            </div>

            <div className="text-center p-6">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                2
              </div>
              <h3 className="mb-3">Inscris-toi</h3>
              <p className="text-secondary">
                Rejoins le groupe en un clic
              </p>
            </div>

            <div className="text-center p-6">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                3
              </div>
              <h3 className="mb-3">Cours ensemble</h3>
              <p className="text-secondary">
                Profite de la sortie et gagne des XP
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions à venir */}
      <section className="py-16" style={{ backgroundColor: 'white' }}>
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2>Prochaines sessions</h2>
            <Link href="/sessions" style={{
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Voir toutes les sessions →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-3">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-secondary mb-4">
                Aucune session disponible pour le moment
              </p>
              <Link href="/sessions/create" className="btn-primary">
                Créer la première session
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top équipes */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2>🏆 Classement des équipes</h2>
            <Link href="/teams" style={{
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Voir le classement →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-3">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

                return (
                  <div key={team.id} className="card">
                    <div className="flex items-center gap-3 mb-4">
                      <div style={{
                        fontSize: '32px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {medal}
                      </div>
                      <div className="flex-1">
                        <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{team.name}</h3>
                        <p className="text-sm text-secondary">{position}ère place</p>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm text-secondary mb-4" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {team.description}
                      </p>
                    )}

                    <div className="divider"></div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">
                        {team.members_count || 0} membres
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                        {(team.total_distance || 0).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-secondary mb-4">
                Aucune équipe pour le moment
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'white',
        borderTop: '1px solid var(--border)',
        padding: '32px 0'
      }}>
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                PaceMate © 2026
              </p>
              <p className="text-sm text-secondary">
                La plateforme pour trouver ton binôme de course
              </p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-secondary">À propos</a>
              <a href="#" className="text-secondary">Contact</a>
              <a href="#" className="text-secondary">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
