'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getUserTeam } from '@/lib/actions';
import { Session, Team } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Zap, Trophy, TrendingUp, Target, Settings } from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/lib/constants';

// Cette page est protégée par le middleware.
// Seuls les utilisateurs connectés y accèdent.

interface TeamWithCount extends Team {
  members_count: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<TeamWithCount | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  // Charger les sessions et l'équipe
  useEffect(() => {
    async function fetchData() {
      try {
        const [sessions, team] = await Promise.all([
          getUpcomingSessions(3),
          getUserTeam(),
        ]);
        setUpcomingSessions(sessions);
        setUserTeam(team);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setSessionsLoading(false);
        setTeamLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header with Level Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Welcome Card */}
          <div className="lg:col-span-2 card p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-dark-800 mb-2">
                  Salut {profile?.username || ''} !
                </h1>
                <p className="text-dark-500">
                  Pret pour ta prochaine sortie ?
                </p>
              </div>
              <Link
                href="/sessions/create"
                className="neu-btn-white inline-flex items-center justify-center gap-2 px-8 py-4 text-dark-800 font-bold text-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Creer une sortie
              </Link>
            </div>
          </div>

          {/* Level Showcase Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 p-6">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/30 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-neon-500/20 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-silver-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Ton niveau
                </span>
                <Link href="/settings" className="text-silver-500 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex items-center gap-4">
                {/* Level Badge */}
                <div className="relative">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg ${
                    (profile?.running_level || 1) >= 7
                      ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500'
                      : (profile?.running_level || 1) >= 5
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                        : (profile?.running_level || 1) >= 3
                          ? 'bg-gradient-to-br from-neon-500 to-teal-500'
                          : 'bg-gradient-to-br from-silver-400 to-silver-600'
                  }`}>
                    {profile?.running_level || 1}
                  </div>
                  {(profile?.running_level || 1) >= 7 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Zap className="w-3 h-3 text-yellow-900" />
                    </div>
                  )}
                </div>

                {/* Level Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-white mb-1">
                    {LEVEL_THRESHOLDS[profile?.running_level as keyof typeof LEVEL_THRESHOLDS]?.name || 'Débutant'}
                  </div>
                  <div className="text-sm text-silver-400">
                    {profile?.strava_connected ? (
                      <span className="flex items-center gap-1 text-neon-400">
                        <TrendingUp className="w-3 h-3" />
                        Synchro Strava
                      </span>
                    ) : (
                      <Link href="/settings" className="flex items-center gap-1 hover:text-white transition-colors">
                        <Target className="w-3 h-3" />
                        Connecter Strava
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Level Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-silver-500 mb-1">
                  <span>Niveau {profile?.running_level || 1}</span>
                  <span>Niveau {Math.min((profile?.running_level || 1) + 1, 9)}</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-neon-500 rounded-full transition-all duration-500"
                    style={{ width: `${(profile?.running_level || 1) >= 9 ? 100 : 45}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-neon-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Ce mois</span>
            </div>
            <div className="text-4xl font-bold text-dark-800 mb-1">3</div>
            <div className="text-sm text-dark-500">Sessions a venir</div>
            {/* Mini sparkline placeholder */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-neon-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Total</span>
            </div>
            <div className="text-4xl font-bold text-pink-500 mb-1">42 km</div>
            <div className="text-sm text-dark-500">Ce mois-ci</div>
            {/* Mini sparkline */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[30, 50, 70, 45, 85, 60, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-pink-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-neon-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Completees</span>
            </div>
            <div className="text-4xl font-bold text-dark-800 mb-1">12</div>
            <div className="text-sm text-dark-500">Sessions terminees</div>
            {/* Mini sparkline */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[55, 40, 75, 50, 65, 80, 60].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-neon-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link
            href="/sessions/create"
            className="neu-btn group p-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-pink-500 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-dark-800 mb-1">Creer une sortie</h3>
                <p className="text-sm text-dark-500">Organise ta prochaine session</p>
              </div>
              <svg className="w-6 h-6 text-dark-400 group-hover:translate-x-1 group-hover:text-pink-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="neu-btn group p-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-neon-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-neon-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-dark-800 mb-1">Decouvrir</h3>
                <p className="text-sm text-dark-500">Trouve des sessions pres de toi</p>
              </div>
              <svg className="w-6 h-6 text-dark-400 group-hover:translate-x-1 group-hover:text-neon-700 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* My Team Section */}
        {!teamLoading && userTeam && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-dark-800">Mon equipe</h2>
              <Link
                href="/teams"
                className="text-sm font-semibold text-neon-700 hover:text-neon-600 transition-colors"
              >
                Voir les equipes
              </Link>
            </div>
            <Link href="/teams" className="card p-6 block hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white text-2xl font-bold">
                  {userTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-dark-800 mb-1">{userTeam.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-dark-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {userTeam.members_count} membre{userTeam.members_count > 1 ? 's' : ''}
                    </span>
                    {userTeam.city && (
                      <span>{userTeam.city}</span>
                    )}
                  </div>
                  {userTeam.total_distance != null && userTeam.total_distance > 0 && (
                    <div className="mt-2 text-sm font-semibold text-pink-500">
                      {userTeam.total_distance.toFixed(1)} km parcourus
                    </div>
                  )}
                </div>
                <svg className="w-6 h-6 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Upcoming Sessions */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark-800">
              Sessions recommandees
            </h2>
            <Link
              href="/sessions"
              className="text-sm font-semibold text-neon-700 hover:text-neon-600 transition-colors"
            >
              Voir tout
            </Link>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="sm" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 px-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-silver-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-dark-500 mb-6">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="neu-btn inline-block px-8 py-3 text-dark-800 font-semibold"
              >
                Creer la premiere session
              </Link>
            </div>
          )}
        </div>

        {/* CTA Section - Only show if user has no team */}
        {!teamLoading && !userTeam && (
          <div className="relative overflow-hidden rounded-3xl bg-dark-800 p-10">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                Rejoins une <span className="text-pink-500">equipe</span>
              </h3>
              <p className="text-silver-400 mb-8 max-w-xl mx-auto">
                Cours en equipe, progresse ensemble et grimpe dans le classement !
              </p>
              <Link
                href="/teams"
                className="neu-btn inline-block px-10 py-4 text-dark-800 font-bold text-lg"
              >
                Decouvrir les equipes
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
