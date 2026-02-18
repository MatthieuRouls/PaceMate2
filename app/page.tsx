'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Session, Team } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import SessionDetailsDrawer from '@/components/ui/SessionDetailsDrawer';
import { getUpcomingSessions, getTopTeams } from '@/lib/actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Cette page n'est accessible que pour les visiteurs non connectés.
// Le middleware redirige les utilisateurs connectés vers /dashboard.

export default function Home() {
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Page */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Hero Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Accueil.jpeg"
            alt="Runners"
            fill
            priority
            className="object-cover brightness-[0.6]"
            quality={100}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-dark-800/40" />
        </div>

        {/* Slogan */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <h1 className="text-center">
            <div className="text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-6 leading-tight">
              Trouve ton
              <br />
              <span className="text-pink-500">Mate</span>
            </div>
            <p className="text-xl md:text-2xl lg:text-3xl text-white/90 font-light">
              Au bon pace
            </p>
          </h1>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <span className="text-sm font-medium tracking-wider uppercase">Decouvrir</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Sessions Feed Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-silver-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 bg-white rounded-lg px-5 py-2.5 border border-silver-400">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></div>
              <span className="text-sm font-bold text-neon-700 uppercase tracking-wider">En direct</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-dark-800 mb-4">
              Sessions a venir
            </h2>
            <div className="w-24 h-1 bg-neon-700 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-dark-500 max-w-2xl mx-auto">
              Rejoins une session ou organise la tienne. La communaute t'attend.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => {
                    setSelectedSession(session);
                    setIsDrawerOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-silver-400">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-neon-700 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-lg text-dark-800 font-semibold">Aucune session disponible pour le moment</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/sessions"
              className="inline-flex items-center gap-3 px-8 py-4 bg-pink-500 text-white font-bold text-lg rounded-lg hover:bg-pink-600 transition-colors"
            >
              Toutes les sessions
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Teams Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 bg-silver-100 rounded-lg px-5 py-2.5 border border-silver-400">
              <span className="text-2xl">🏆</span>
              <span className="text-sm font-bold text-neon-700 uppercase tracking-wider">Champions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-dark-800 mb-4">
              Equipes leaders
            </h2>
            <div className="w-24 h-1 bg-neon-700 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-dark-500 max-w-2xl mx-auto">
              Les equipes les plus actives qui font vibrer la communaute
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medals = ['🥇', '🥈', '🥉'];
                const colors = ['text-pink-500', 'text-neon-400', 'text-neon-700'];
                const borderColors = ['border-pink-400', 'border-neon-300', 'border-neon-500'];

                return (
                  <div
                    key={team.id}
                    className={`bg-white rounded-xl p-6 border-2 ${borderColors[index]} hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-start justify-between mb-5">
                      <span className="text-5xl">{medals[index]}</span>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${colors[index]}`}>
                          #{position}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-dark-800 mb-2">
                      {team.name}
                    </h3>

                    {team.description && (
                      <p className="text-dark-500 mb-5 line-clamp-2 text-sm">
                        {team.description}
                      </p>
                    )}

                    <div className="flex gap-6 pt-5 border-t border-silver-300">
                      <div className="flex-1">
                        <div className={`text-2xl font-bold ${colors[index]}`}>
                          {team.members_count || 0}
                        </div>
                        <div className="text-sm text-dark-500 mt-1">Membres</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-pink-500">
                          {(team.total_distance || 0).toFixed(0)}
                        </div>
                        <div className="text-sm text-dark-500 mt-1">Km parcourus</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-silver-50 rounded-xl border border-silver-400">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-neon-700 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <p className="text-lg text-dark-800 font-semibold">Aucune equipe pour le moment</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/teams"
              className="inline-flex items-center gap-3 px-8 py-4 bg-neon-700 text-white font-bold text-lg rounded-lg hover:bg-neon-600 transition-colors"
            >
              Voir toutes les equipes
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-dark-800 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-8 bg-white/10 rounded-lg px-5 py-2.5">
            <span className="text-2xl">🚀</span>
            <span className="text-white font-bold uppercase tracking-wider">C'est parti !</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Pret a courir ?
          </h2>
          <p className="text-xl text-silver-300 mb-10 max-w-3xl mx-auto">
            Rejoins des milliers de runners qui partagent leur passion chaque jour
          </p>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-3 px-10 py-5 bg-pink-500 text-white font-bold text-xl rounded-lg hover:bg-pink-600 transition-colors"
          >
            Commencer maintenant
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-white border-t border-silver-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/PaceMateLogo_vert.svg"
                alt="PaceMate Logo"
                width={32}
                height={32}
              />
              <span className="text-xl font-bold text-dark-800">
                PaceMate
              </span>
            </div>

            <div className="flex gap-8 text-sm text-dark-500">
              <Link href="#" className="hover:text-neon-700 transition-colors">
                A propos
              </Link>
              <Link href="#" className="hover:text-neon-700 transition-colors">
                Contact
              </Link>
              <Link href="#" className="hover:text-neon-700 transition-colors">
                Confidentialite
              </Link>
              <Link href="#" className="hover:text-neon-700 transition-colors">
                CGU
              </Link>
            </div>

            <div className="text-sm text-dark-500">
              © 2026 PaceMate. Tous droits reserves.
            </div>
          </div>
        </div>
      </footer>

      {/* Session Details Drawer */}
      <SessionDetailsDrawer
        session={selectedSession}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setTimeout(() => setSelectedSession(null), 300);
        }}
      />
    </div>
  );
}
