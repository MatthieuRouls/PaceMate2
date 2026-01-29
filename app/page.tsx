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
      {/* Hero Section - Simple et épuré */}
      <section className="bg-gray-50 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Trouve ton binôme de course
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Rejoins une communauté de runners, partage tes sorties et progresse ensemble
            </p>
            <div className="flex gap-3">
              <Link href="/sessions" className="btn-primary">
                Voir les sessions
              </Link>
              <Link href="/sessions/create" className="btn-secondary">
                Créer une sortie
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Prochaines sorties
            </h2>
            <Link href="/sessions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">Aucune session disponible</p>
              <Link href="/sessions/create" className="btn-primary">
                Créer la première session
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Top Teams */}
      <section className="py-12 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Top Équipes
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : topTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topTeams.map((team, index) => {
                const position = index + 1;
                const medals = ['🥇', '🥈', '🥉'];

                return (
                  <div key={team.id} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-3xl">{medals[index]}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{team.name}</h3>
                        <p className="text-sm text-gray-500">{position}ère place</p>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    <div className="flex gap-4 text-sm">
                      <div>
                        <div className="font-bold text-gray-900">
                          {team.members_count || 0}
                        </div>
                        <div className="text-gray-500">Membres</div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {(team.total_distance || 0).toFixed(0)}
                        </div>
                        <div className="text-gray-500">Km</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-600">Aucune équipe pour le moment</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
