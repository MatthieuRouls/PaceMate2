'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUpcomingSessions, getUserTeam } from '@/lib/actions';
import { Session, Team } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Users, Zap, Trophy, TrendingUp, Target, Plus,
  MapPin, Clock, ChevronRight, Calendar, Activity,
  ArrowRight, Footprints
} from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/lib/constants';

interface TeamWithCount extends Team {
  members_count: number;
}

// Images par type de session
const SESSION_COVERS: Record<string, string> = {
  intervals: 'https://images.unsplash.com/photo-1461896836934-fffff?w=800&q=80',
  long_run: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80',
  casual: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
  recovery: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  tempo: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<TeamWithCount | null>(null);
  const [levelBarAnimated, setLevelBarAnimated] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);

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
        const [sessionsData, team] = await Promise.all([
          getUpcomingSessions(5),
          getUserTeam(),
        ]);
        setSessions(sessionsData);
        setUserTeam(team);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setTimeout(() => setLevelBarAnimated(true), 300);
      }
    }
    fetchData();
  }, []);

  const featuredSession = sessions[0];
  const secondarySessions = sessions.slice(1, 4);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSessionCover = (session: Session) => {
    return SESSION_COVERS[session.session_type || 'default'] || SESSION_COVERS.default;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neu-base pt-28 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neu-base">
      <style jsx global>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(236, 72, 153, 0.3), 0 4px 20px rgba(236, 72, 153, 0.2); }
          50% { box-shadow: 0 0 30px rgba(236, 72, 153, 0.45), 0 4px 25px rgba(236, 72, 153, 0.3); }
        }
        .animate-glow-pulse {
          animation: glowPulse 2.4s ease-in-out infinite;
        }
        .card-hover {
          transition: transform 160ms ease-out, box-shadow 160ms ease-out;
        }
        .card-hover:hover {
          transform: translateY(-4px);
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-8 pt-28 pb-24">

        {/* SECTION 1 — HERO */}
        <section className="mb-14">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-800 via-dark-700 to-dark-900 p-8 min-h-[260px]">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80')`,
                filter: 'brightness(0.55) contrast(1.1) saturate(0.8) blur(2px)',
                opacity: 0.12,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(8,12,10,0.75) 0%, rgba(8,12,10,0.95) 100%)',
              }}
            />
            <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-neon-500/15 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row gap-8">
              {/* Left — Next Run (70%) */}
              <div className="flex-[7]">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-silver-400 uppercase tracking-wider mb-3">
                  <Footprints className="w-4 h-4" />
                  Ton prochain run
                </span>

                {featuredSession ? (
                  <>
                    <h1 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
                      {featuredSession.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-silver-300 mb-6">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-pink-400" />
                        {formatDate(featuredSession.start_time)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-pink-400" />
                        {formatTime(featuredSession.start_time)}
                      </span>
                      {featuredSession.distance_km && (
                        <span className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-neon-400" />
                          {featuredSession.distance_km} km
                        </span>
                      )}
                      {featuredSession.location_name && (
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neon-400" />
                          {featuredSession.location_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex -space-x-3">
                        {[
                          { bg: 'from-pink-400 to-purple-500', letter: 'M' },
                          { bg: 'from-neon-400 to-teal-500', letter: 'T' },
                          { bg: 'from-orange-400 to-red-500', letter: 'S' },
                        ].slice(0, Math.min(featuredSession.participants_count || 3, 3)).map((avatar, i) => (
                          <div
                            key={i}
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.bg} border-2 border-dark-800 flex items-center justify-center text-xs font-bold text-white shadow-lg`}
                          >
                            {avatar.letter}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm text-silver-400">
                        {featuredSession.participants_count || 3} coureurs inscrits
                      </span>
                    </div>

                    <Link
                      href={`/sessions/${featuredSession.id}`}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl animate-glow-pulse hover:-translate-y-0.5 transition-transform"
                    >
                      Rejoindre la sortie
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl lg:text-4xl font-black text-white mb-4">
                      Aucune sortie prevue
                    </h1>
                    <p className="text-silver-400 mb-6">Cree ta premiere session ou rejoins un groupe</p>
                    <Link
                      href="/sessions/create"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl animate-glow-pulse hover:-translate-y-0.5 transition-transform"
                    >
                      Creer une sortie
                      <Plus className="w-5 h-5" />
                    </Link>
                  </>
                )}
              </div>

              {/* Right — Level Card (30%) */}
              <div className="flex-[3] flex items-start justify-end">
                <div className="bg-dark-900/60 backdrop-blur-sm rounded-2xl p-5 w-full max-w-[220px] border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-4 h-4 text-silver-500" />
                    <span className="text-[11px] font-semibold text-silver-500 uppercase tracking-wider">Niveau</span>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg bg-gradient-to-br ${levelGradient}`}>
                        {level}
                      </div>
                      {level >= 7 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-yellow-900" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{levelName}</div>
                      <div className="text-xs text-silver-500">
                        {profile?.strava_connected ? (
                          <span className="flex items-center gap-1 text-neon-400">
                            <TrendingUp className="w-3 h-3" />
                            Strava sync
                          </span>
                        ) : (
                          <Link href="/settings" className="flex items-center gap-1 hover:text-white transition-colors">
                            <Target className="w-3 h-3" />
                            Connecter
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-neon-500 rounded-full"
                      style={{
                        width: levelBarAnimated ? `${level >= 9 ? 100 : Math.min(95, level * 11)}%` : '0%',
                        transition: 'width 1.1s ease-out 0.3s',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — STAT BAR */}
        <section className="mb-14">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            <span className="text-sm font-semibold text-dark-600">Cette semaine</span>
            <span className="w-px h-5 bg-dark-200 hidden sm:block" />
            <span className="flex items-center gap-2 text-dark-800">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <strong className="text-lg font-bold">{profile?.calculated_weekly_km ? Math.round(profile.calculated_weekly_km) : 0} km</strong>
            </span>
            <span className="w-px h-5 bg-dark-200 hidden sm:block" />
            <span className="flex items-center gap-2 text-dark-800">
              <Calendar className="w-4 h-4 text-neon-600" />
              <strong className="text-lg font-bold">{sessions.length}</strong>
              <span className="text-dark-500">sorties</span>
            </span>
            <span className="w-px h-5 bg-dark-200 hidden sm:block" />
            <span className="flex items-center gap-2 text-dark-800">
              <Target className="w-4 h-4 text-purple-500" />
              <strong className="text-lg font-bold">{profile?.calculated_avg_pace || '—'}</strong>
              <span className="text-dark-500">allure</span>
            </span>
          </div>
        </section>

        {/* SECTION 3 — COURIR AUJOURD'HUI */}
        {secondarySessions.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark-800">Courir aujourd'hui</h2>
              <Link href="/sessions" className="text-sm font-semibold text-neon-700 hover:text-neon-600 transition-colors flex items-center gap-1">
                Voir tout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {secondarySessions[0] && (
                <Link href={`/sessions/${secondarySessions[0].id}`} className="flex-[6] group">
                  <div className="h-full bg-white rounded-3xl overflow-hidden shadow-sm card-hover hover:shadow-xl border border-silver-100">
                    <div className="relative h-[140px] overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                        style={{ backgroundImage: `url('${getSessionCover(secondarySessions[0])}')` }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 70%)' }} />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm text-dark-800 text-xs font-semibold rounded-full">
                          <Clock className="w-3 h-3" />
                          {formatTime(secondarySessions[0].start_time)}
                        </span>
                        <span className="text-sm text-white font-medium drop-shadow-lg">{formatDate(secondarySessions[0].start_time)}</span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-dark-800 mb-2 group-hover:text-pink-600 transition-colors">
                        {secondarySessions[0].title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-dark-500 mb-5">
                        {secondarySessions[0].distance_km && (
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-dark-400" />
                            {secondarySessions[0].distance_km} km
                          </span>
                        )}
                        {secondarySessions[0].location_name && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-dark-400" />
                            {secondarySessions[0].location_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(secondarySessions[0].participants_count || 2, 3))].map((_, i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-400 to-teal-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                                {String.fromCharCode(65 + i)}
                              </div>
                            ))}
                          </div>
                          <span className="text-sm text-dark-500">{secondarySessions[0].participants_count || 2} inscrits</span>
                        </div>
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-800 text-white font-semibold rounded-xl group-hover:bg-pink-500 transition-colors">
                          Rejoindre <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              <div className="flex-[4] flex flex-col gap-4">
                {secondarySessions.slice(1).map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm card-hover hover:shadow-lg border border-silver-100"
                  >
                    <div className="flex">
                      <div
                        className="w-20 min-h-[100px] bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url('${getSessionCover(session)}')` }}
                      />
                      <div className="p-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-dark-500">{formatDate(session.start_time)} • {formatTime(session.start_time)}</span>
                          <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-pink-500 transition-colors" />
                        </div>
                        <h4 className="font-bold text-dark-800 mb-1 group-hover:text-pink-600 transition-colors">{session.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-dark-500">
                          {session.distance_km && <span>{session.distance_km} km</span>}
                          <span>•</span>
                          <span>{session.participants_count || 1} coureurs</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {secondarySessions.length < 3 && (
                  <Link href="/sessions" className="flex-1 flex items-center justify-center gap-2 bg-silver-50 rounded-2xl p-5 text-dark-500 hover:text-dark-700 hover:bg-silver-100 transition-colors border-2 border-dashed border-silver-200">
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Voir plus de sessions</span>
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4 — SOCIAL */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-dark-800 mb-6">Ton reseau court</h2>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[6] bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-silver-100">
              <div className="divide-y divide-silver-100">
                {[
                  { user: 'Marie L.', action: 'a rejoint', target: 'Sortie matinale Paris 15e', time: 'Il y a 2h', gradient: 'from-pink-400 to-purple-500' },
                  { user: 'Thomas R.', action: 'a cree', target: 'Fractionne Vincennes', time: 'Il y a 4h', gradient: 'from-neon-400 to-teal-500' },
                  { user: 'Sophie M.', action: 'a termine', target: '10 km en 48:32', time: 'Hier', gradient: 'from-orange-400 to-red-500' },
                ].map((item, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-silver-50/80 transition-colors">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm`}>
                      {item.user.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-700">
                        <strong className="font-semibold">{item.user}</strong>{' '}
                        <span className="text-dark-500">{item.action}</span>{' '}
                        <strong className="font-semibold text-dark-800">{item.target}</strong>
                      </p>
                      <span className="text-xs text-dark-400">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/sessions" className="block px-6 py-4 text-center text-sm font-semibold text-neon-700 hover:bg-neon-50 transition-colors border-t border-silver-100">
                Voir toute l'activite
              </Link>
            </div>

            <div className="flex-[4]">
              {userTeam ? (
                <Link href="/teams" className="block h-full group">
                  <div className="h-full bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 card-hover hover:shadow-xl">
                    <div className="flex items-center gap-2 mb-5">
                      <Users className="w-4 h-4 text-silver-500" />
                      <span className="text-xs font-semibold text-silver-500 uppercase tracking-wider">Mon equipe</span>
                    </div>
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {userTeam.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">{userTeam.name}</h3>
                        <p className="text-sm text-silver-400">{userTeam.members_count} membres</p>
                      </div>
                    </div>
                    {userTeam.total_distance != null && userTeam.total_distance > 0 && (
                      <div className="bg-dark-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-silver-400">Distance totale</span>
                        <span className="text-lg font-bold text-pink-400">{userTeam.total_distance.toFixed(0)} km</span>
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <Link href="/teams" className="block h-full group">
                  <div className="h-full bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 flex flex-col justify-center items-center text-center card-hover hover:shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rejoins une equipe</h3>
                    <p className="text-sm text-white/80 mb-4">Progresse ensemble</p>
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-pink-600 font-semibold rounded-xl group-hover:bg-pink-50 transition-colors">
                      Decouvrir <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5 — DECOUVRIR */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-dark-800">Decouvrir</h2>
            <Link href="/sessions" className="text-sm font-semibold text-neon-700 hover:text-neon-600 transition-colors flex items-center gap-1">
              Explorer <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/sessions" className="group bg-white/70 rounded-2xl p-5 card-hover hover:bg-white hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-neon-100 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5 text-neon-600" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1 group-hover:text-neon-700 transition-colors">Sessions proches</h4>
              <p className="text-sm text-dark-500">Trouve des runs pres de toi</p>
            </Link>

            <Link href="/teams" className="group bg-white/70 rounded-2xl p-5 card-hover hover:bg-white hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1 group-hover:text-pink-600 transition-colors">Equipes actives</h4>
              <p className="text-sm text-dark-500">Rejoins une communaute</p>
            </Link>

            <Link href="/sessions/create" className="group bg-white/70 rounded-2xl p-5 card-hover hover:bg-white hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-bold text-dark-800 mb-1 group-hover:text-purple-600 transition-colors">Organise un run</h4>
              <p className="text-sm text-dark-500">Cree ta propre session</p>
            </Link>
          </div>
        </section>

      </div>

      {/* FAB */}
      <Link
        href="/sessions/create"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-200"
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        style={{ transform: fabHovered ? 'scale(1.06) translateY(-2px)' : 'scale(1)' }}
      >
        <Plus className="w-6 h-6 transition-transform duration-200" style={{ transform: fabHovered ? 'rotate(90deg)' : 'rotate(0)' }} />
        <span className="hidden sm:inline">Creer une sortie</span>
      </Link>
    </div>
  );
}
