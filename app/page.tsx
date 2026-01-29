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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-bold text-slate-900 mb-6">
          Trouve ton binôme de course
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Rejoins une communauté de runners, partage tes sorties et progresse ensemble
        </p>
        <div className="flex gap-4">
          <Link
            href="/sessions"
            className="px-6 py-3 font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm"
          >
            Voir les sessions
          </Link>
          <Link
            href="/sessions/create"
            className="px-6 py-3 font-semibold text-brand-600 bg-white border-2 border-brand-200 hover:bg-brand-50 rounded-lg"
          >
            Créer une sortie
          </Link>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Prochaines sorties
            </h2>
            <Link
              href="/sessions"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600 mb-4">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="inline-block px-6 py-3 font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
              >
                Créer la première session
              </Link>
            </div>
          )}
      </section>

      {/* Top Teams */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Top Équipes
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent"></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medals = ['🥇', '🥈', '🥉'];

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-lg p-6 border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-4xl">{medals[index]}</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900">{team.name}</h3>
                        <p className="text-sm text-slate-500">{position}ère place</p>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    <div className="flex gap-6 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {team.members_count || 0}
                        </div>
                        <div className="text-slate-500">Membres</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {(team.total_distance || 0).toFixed(0)}
                        </div>
                        <div className="text-slate-500">Km</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <p className="text-slate-600">Aucune équipe pour le moment</p>
            </div>
          )}
      </section>
    </div>
  );
}
