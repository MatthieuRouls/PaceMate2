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
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '4rem 0'
      }}>
        <div className="container">
          <div style={{ maxWidth: '600px' }}>
            <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem' }}>
              Trouve ton binôme de course
            </h1>
            <p style={{ fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.9 }}>
              Rejoins une communauté de runners, partage tes sorties et progresse ensemble
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/sessions" className="btn" style={{
                background: 'white',
                color: '#667eea',
                padding: '0.75rem 1.5rem',
                fontWeight: 600
              }}>
                Voir les sessions
              </Link>
              <Link href="/sessions/create" className="btn" style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid white',
                padding: '0.75rem 1.5rem',
                fontWeight: 600
              }}>
                Créer une sortie
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Prochaines sessions */}
      <section className="py-4">
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2>Prochaines sorties</h2>
            <Link href="/sessions">Voir toutes →</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Chargement...</p>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-3">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ marginBottom: '1rem' }}>Aucune session disponible</p>
              <Link href="/sessions/create" className="btn-primary">
                Créer la première session
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top équipes */}
      <section className="py-4" style={{ background: 'white' }}>
        <div className="container">
          <h2 className="mb-3">🏆 Top équipes</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Chargement...</p>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-3">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

                return (
                  <div key={team.id} className="card">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{medal}</div>
                      <h3>{team.name}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
                        {position}ère place
                      </p>
                      {team.description && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6c757d',
                          marginBottom: '1rem'
                        }}>
                          {team.description}
                        </p>
                      )}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid #dee2e6'
                      }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0066cc' }}>
                            {team.members_count || 0}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Membres</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0066cc' }}>
                            {(team.total_distance || 0).toFixed(0)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Km</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Aucune équipe pour le moment</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
