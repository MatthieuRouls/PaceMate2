'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions, getUserTeam } from '@/lib/actions';
import { Session, Team } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Zap, Trophy, TrendingUp, Target, Settings, Plus, Search, Calendar, ChevronRight } from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/lib/constants';

interface TeamWithCount extends Team {
  members_count: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<TeamWithCount | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  const level = profile?.running_level || 1;
  const levelName = LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS]?.name || 'Débutant';

  const levelGradient =
    level >= 7
      ? 'from-yellow-400 via-orange-500 to-red-500'
      : level >= 5
        ? 'from-pink-500 to-purple-600'
        : level >= 3
          ? 'from-neon-500 to-teal-500'
          : 'from-silver-400 to-silver-600';

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

        {/* Row 1 : Welcome + Level + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">

          {/* Welcome - compact */}
          <div className="md:col-span-5 card p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-dark-800">
                Salut {profile?.username || ''} !
              </h1>
              <p className="text-sm text-dark-500 mt-1">Pret pour ta prochaine sortie ?</p>
            </div>
            <Link
              href="/sessions/create"
              className="w-12 h-12 rounded-2xl bg-pink-500 hover:bg-pink-600 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <Plus className="w-6 h-6 text-white" />
            </Link>
          </div>

          {/* Level Showcase - hero card */}
          <div className="md:col-span-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 p-5">
            <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/30 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-neon-500/20 rounded-full blur-2xl" />

            <div className="relative z-10 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg bg-gradient-to-br ${levelGradient}`}>
                  {level}
                </div>
                {level >= 7 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-yellow-900" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Trophy className="w-3 h-3 text-silver-400" />
                  <span className="text-[10px] font-semibold text-silver-400 uppercase tracking-wider">Niveau</span>
                </div>
                <div className="text-lg font-bold text-white leading-tight">{levelName}</div>
                <div className="text-xs text-silver-500 mt-1">
                  {profile?.strava_connected ? (
                    <span className="flex items-center gap-1 text-neon-400">
                      <TrendingUp className="w-3 h-3" />
                      Strava sync
                    </span>
                  ) : (
                    <Link href="/settings" className="flex items-center gap-1 hover:text-white transition-colors">
                      <Target className="w-3 h-3" />
                      Connecter Strava
                    </Link>
                  )}
                </div>
              </div>
              <Link href="/settings" className="text-silver-600 hover:text-white transition-colors flex-shrink-0">
                <Settings className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative z-10 mt-3">
              <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-neon-500 rounded-full transition-all duration-500"
                  style={{ width: `${level >= 9 ? 100 : 45}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick action buttons - stacked */}
          <div className="md:col-span-3 flex flex-row md:flex-col gap-3">
            <Link
              href="/sessions/create"
              className="flex-1 card p-4 flex items-center gap-3 group hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-dark-800">Creer une sortie</span>
              <ChevronRight className="w-4 h-4 text-dark-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/sessions"
              className="flex-1 card p-4 flex items-center gap-3 group hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-neon-100 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-neon-700" />
              </div>
              <span className="text-sm font-semibold text-dark-800">Decouvrir</span>
              <ChevronRight className="w-4 h-4 text-dark-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Row 2 : Stats compactes + Equipe */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mb-6">
          {/* Stat 1 */}
          <div className="card p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-neon-600" />
              <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">A venir</span>
            </div>
            <div className="text-3xl font-bold text-dark-800">{upcomingSessions.length}</div>
            <div className="text-xs text-dark-500">sessions</div>
          </div>

          {/* Stat 2 */}
          <div className="card p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">Km/sem</span>
            </div>
            <div className="text-3xl font-bold text-pink-500">
              {profile?.calculated_weekly_km ? Math.round(profile.calculated_weekly_km) : '--'}
            </div>
            <div className="text-xs text-dark-500">km</div>
          </div>

          {/* Stat 3 */}
          <div className="card p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-neon-600" />
              <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">Allure</span>
            </div>
            <div className="text-3xl font-bold text-dark-800">
              {profile?.calculated_avg_pace || '--'}
            </div>
            <div className="text-xs text-dark-500">/km</div>
          </div>

          {/* Equipe ou CTA rejoindre */}
          {!teamLoading && (
            userTeam ? (
              <Link href="/teams" className="col-span-2 md:col-span-6 card p-4 flex items-center gap-4 group hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {userTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">Mon equipe</span>
                  </div>
                  <div className="text-lg font-bold text-dark-800 truncate">{userTeam.name}</div>
                  <div className="flex items-center gap-3 text-xs text-dark-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {userTeam.members_count}
                    </span>
                    {userTeam.city && <span>{userTeam.city}</span>}
                    {userTeam.total_distance != null && userTeam.total_distance > 0 && (
                      <span className="text-pink-500 font-semibold">{userTeam.total_distance.toFixed(0)} km</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </Link>
            ) : (
              <Link href="/teams" className="col-span-2 md:col-span-6 relative overflow-hidden rounded-3xl bg-dark-800 p-4 flex items-center gap-4 group hover:shadow-lg transition-shadow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-pink-400" />
                </div>
                <div className="relative z-10 flex-1">
                  <div className="text-base font-bold text-white">Rejoins une equipe</div>
                  <div className="text-xs text-silver-400">Progresse ensemble et grimpe au classement</div>
                </div>
                <ChevronRight className="w-5 h-5 text-silver-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0 relative z-10" />
              </Link>
            )
          )}
        </div>

        {/* Row 3 : Sessions recommandees */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-dark-800">Sessions recommandees</h2>
            <Link
              href="/sessions"
              className="text-xs font-semibold text-neon-700 hover:text-neon-600 transition-colors"
            >
              Voir tout
            </Link>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="sm" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 px-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-silver-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-dark-400" />
              </div>
              <p className="text-dark-500 text-sm mb-4">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="neu-btn inline-block px-6 py-2.5 text-dark-800 font-semibold text-sm"
              >
                Creer la premiere session
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
