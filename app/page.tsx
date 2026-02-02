'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';
import { useAuth } from '@/components/providers/AuthProvider';

export default function Home() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!authLoading && profile) {
      console.log('🔄 Homepage: User is logged in, redirecting to dashboard');
      window.location.href = '/dashboard';
    }
  }, [authLoading, profile]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessions, teams] = await Promise.all([
          getUpcomingSessions(6),
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-600/5 pointer-events-none"></div>

      {/* Decorative blurred circles */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-secondary-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1440px] mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-secondary-600 mb-6">
              Trouve ton{' '}
              <span className="text-primary-500">binôme</span>{' '}
              de course
            </h1>
            <p className="text-xl text-secondary-600/70 mb-8 max-w-2xl mx-auto">
              Rejoins une communauté de runners, partage tes sorties et progresse ensemble
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/sessions"
                className="px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold shadow-lg hover:bg-primary-600 transition-all hover:scale-105"
              >
                Voir les sessions
              </Link>
              <Link
                href="/sessions/create"
                className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-secondary-600/20 text-secondary-600 font-semibold hover:bg-white/20 transition-all hover:scale-105"
              >
                Créer une sortie
              </Link>
            </div>
          </div>
        </section>

        {/* Sessions Feed Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-secondary-600 mb-4">
                Sessions{' '}
                <span className="text-primary-500">disponibles</span>
              </h2>
              <p className="text-lg text-secondary-600/70">
                Rejoins une session ou crée la tienne
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary-500 border-t-transparent"></div>
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <p className="text-secondary-600/70 mb-4">Aucune session disponible</p>
                <Link
                  href="/sessions/create"
                  className="inline-block px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold shadow-lg hover:bg-primary-600 transition-all hover:scale-105"
                >
                  Créer la première session
                </Link>
              </div>
            )}

            <div className="text-center mt-12">
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                Voir toutes les sessions
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Top Teams Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-secondary-50/30">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-secondary-600 mb-4">
                Top{' '}
                <span className="text-primary-500">Équipes</span>
              </h2>
              <p className="text-lg text-secondary-600/70">
                Les équipes les plus actives de la communauté
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary-500 border-t-transparent"></div>
              </div>
            ) : topTeams.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {topTeams.map((team, index) => {
                  const position = index + 1;
                  const medals = ['🥇', '🥈', '🥉'];

                  return (
                    <div
                      key={team.id}
                      className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border border-gray-100"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-4xl">{medals[index]}</span>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-secondary-600">{team.name}</h3>
                          <p className="text-sm text-secondary-600/60">{position}ère place</p>
                        </div>
                      </div>

                      {team.description && (
                        <p className="text-sm text-secondary-600/70 mb-4 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      <div className="flex gap-6 text-sm">
                        <div>
                          <div className="text-2xl font-bold text-secondary-600">
                            {team.members_count || 0}
                          </div>
                          <div className="text-secondary-600/60">Membres</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary-500">
                            {(team.total_distance || 0).toFixed(0)}
                          </div>
                          <div className="text-secondary-600/60">Km</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <p className="text-secondary-600/70">Aucune équipe pour le moment</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1440px] mx-auto">
            <div className="bg-gradient-to-br from-secondary-600 to-secondary-500 rounded-3xl p-12 shadow-xl text-center space-y-6">
              <h2 className="text-4xl font-bold text-white">
                Prêt à rejoindre la{' '}
                <span className="text-primary-400">communauté</span>{' '}
                ?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Des milliers de runners t'attendent pour partager leur passion et progresser ensemble.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Link
                  href="/sessions"
                  className="px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold shadow-lg hover:bg-primary-600 transition-all hover:scale-105"
                >
                  Découvrir les sessions
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-white font-bold shadow-lg">
                  P
                </div>
                <span className="text-xl font-bold text-secondary-600">
                  PaceMate
                </span>
              </div>

              <div className="flex gap-8 text-sm text-secondary-600/70">
                <Link href="#" className="hover:text-primary-500 transition-colors">À propos</Link>
                <Link href="#" className="hover:text-primary-500 transition-colors">Contact</Link>
                <Link href="#" className="hover:text-primary-500 transition-colors">Confidentialité</Link>
                <Link href="#" className="hover:text-primary-500 transition-colors">CGU</Link>
              </div>

              <div className="text-sm text-secondary-600/60">
                © 2026 PaceMate. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
