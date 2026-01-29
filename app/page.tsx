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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-hero py-20 lg:py-32 px-6 lg:px-8 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
              Trouve ton binôme de course
            </h1>
            <p className="text-xl lg:text-2xl text-white/90 mb-8 animate-slide-up">
              Rejoins une communauté de runners passionnés, partage tes sorties et progresse ensemble 🏃‍♂️
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Link href="/sessions" className="btn bg-white hover:bg-gray-50 text-primary-600 shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorer les sessions
              </Link>
              <Link href="/sessions/create" className="btn bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/30">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer une sortie
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-gradient mb-2">
                {upcomingSessions.length}+
              </div>
              <div className="text-gray-600 font-medium">Sessions actives</div>
            </div>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-gradient mb-2">
                {topTeams.length}+
              </div>
              <div className="text-gray-600 font-medium">Équipes</div>
            </div>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-gradient mb-2">
                100%
              </div>
              <div className="text-gray-600 font-medium">Gratuit</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-16 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Prochaines sorties
              </h2>
              <p className="text-gray-600">
                Découvre les sessions à venir et rejoins la communauté
              </p>
            </div>
            <Link
              href="/sessions"
              className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-2 group"
            >
              Voir tout
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune session pour le moment
              </h3>
              <p className="text-gray-600 mb-6">
                Sois le premier à créer une sortie !
              </p>
              <Link href="/sessions/create" className="btn-primary">
                Créer la première session
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top Teams */}
      <section className="py-16 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              🏆 Top Équipes
            </h2>
            <p className="text-gray-600">
              Les équipes les plus actives de la communauté
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medals = ['🥇', '🥈', '🥉'];
                const gradients = [
                  'from-yellow-400 to-yellow-600',
                  'from-gray-300 to-gray-500',
                  'from-orange-400 to-orange-600'
                ];

                return (
                  <div
                    key={team.id}
                    className="card-interactive relative overflow-hidden"
                  >
                    {/* Medal ribbon */}
                    <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${gradients[index]} opacity-10 rounded-full`} />

                    <div className="relative">
                      <div className="text-5xl mb-4">{medals[index]}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {team.name}
                      </h3>
                      <p className="text-sm text-primary-600 font-medium mb-4">
                        {position}ère place
                      </p>

                      {team.description && (
                        <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-primary-600">
                            {team.members_count || 0}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Membres</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary-600">
                            {(team.total_distance || 0).toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Km parcourus</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600">Aucune équipe pour le moment</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
