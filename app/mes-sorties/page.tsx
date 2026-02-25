'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SessionCard from '@/components/ui/SessionCard';
import { Session } from '@/lib/types';
import { getUserSessions } from '@/lib/actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Plus, Calendar, TrendingUp, Users, Crown, Clock, MapPin, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';

// Page protegee par le middleware - l'auth est garantie

type TabType = 'upcoming' | 'history' | 'created';

export default function MesSortiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [upcomingCreated, setUpcomingCreated] = useState<Session[]>([]);
  const [upcomingJoined, setUpcomingJoined] = useState<Session[]>([]);
  const [pastCreated, setPastCreated] = useState<Session[]>([]);
  const [pastJoined, setPastJoined] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Charger immediatement - le middleware garantit l'auth
  useEffect(() => {
    async function fetchUserSessions() {
      try {
        const { upcomingJoined, pastJoined, upcomingCreated, pastCreated } = await getUserSessions();
        setUpcomingCreated(upcomingCreated);
        setUpcomingJoined(upcomingJoined);
        setPastCreated(pastCreated);
        setPastJoined(pastJoined);
      } catch (error) {
        console.error('Error fetching user sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    }

    fetchUserSessions();
  }, []);

  // Computed values
  const allUpcoming = [...upcomingCreated, ...upcomingJoined];
  const allPast = [...pastCreated, ...pastJoined];
  const nextSession = allUpcoming.length > 0
    ? allUpcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]
    : null;
  const secondaryUpcoming = allUpcoming.filter(s => s.id !== nextSession?.id);

  // Stats
  const totalKmThisMonth = allPast.reduce((sum, s) => sum + s.distance_km, 0);
  const runsThisWeek = allPast.filter(s => {
    const sessionDate = new Date(s.start_time);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo;
  }).length;

  // Format date for display
  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return `Aujourd'hui, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Demain, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get days with sessions for mini calendar
  const getSessionDays = () => {
    const days: { date: Date; count: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const count = allUpcoming.filter(s =>
        new Date(s.start_time).toDateString() === date.toDateString()
      ).length;
      days.push({ date, count });
    }
    return days;
  };

  const sessionDays = getSessionDays();

  return (
    <>
      <style jsx global>{`
        /* Card animations */
        .card-enter {
          animation: cardFadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .card-enter:nth-child(1) { animation-delay: 0ms; }
        .card-enter:nth-child(2) { animation-delay: 50ms; }
        .card-enter:nth-child(3) { animation-delay: 100ms; }
        .card-enter:nth-child(4) { animation-delay: 150ms; }

        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stat card hover */
        .stat-card {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }

        /* Hero card glow */
        .hero-card {
          position: relative;
        }
        .hero-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(135deg, rgba(185,255,102,0.3), rgba(185,255,102,0.1), transparent);
          border-radius: inherit;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .hero-card:hover::before {
          opacity: 1;
        }

        /* Sidebar card */
        .sidebar-card {
          transition: box-shadow 0.2s ease;
        }
        .sidebar-card:hover {
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06);
        }

        /* Tab indicator */
        .tab-btn {
          position: relative;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: currentColor;
          border-radius: 2px;
        }

        /* Calendar day hover */
        .calendar-day {
          transition: all 0.15s ease;
        }
        .calendar-day:hover {
          transform: scale(1.1);
        }
      `}</style>

      <div className="min-h-screen bg-neu-base pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ============================================ */}
          {/* HEADER COMPACT                              */}
          {/* ============================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-dark-800">Mes sorties</h1>
              <p className="text-sm text-dark-500">Ton planning running personnel</p>
            </div>
            <Link
              href="/sessions/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-500 hover:bg-neon-400 text-dark-900 font-semibold rounded-full transition-all hover:scale-[1.02] text-sm"
            >
              <Plus className="w-4 h-4" />
              Creer une sortie
            </Link>
          </div>

          {/* ============================================ */}
          {/* STATS STRIP                                 */}
          {/* ============================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="stat-card card-enter bg-white rounded-xl p-4 border border-silver-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-neon-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-dark-800 leading-none">{allUpcoming.length}</p>
                  <p className="text-xs text-dark-500 mt-0.5">a venir</p>
                </div>
              </div>
            </div>
            <div className="stat-card card-enter bg-white rounded-xl p-4 border border-silver-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-dark-800 leading-none">{upcomingCreated.length + pastCreated.length}</p>
                  <p className="text-xs text-dark-500 mt-0.5">organisees</p>
                </div>
              </div>
            </div>
            <div className="stat-card card-enter bg-gradient-to-br from-neon-500 to-neon-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-dark-900" />
                </div>
                <div>
                  <p className="text-2xl font-black text-dark-900 leading-none">{totalKmThisMonth}</p>
                  <p className="text-xs text-dark-700 mt-0.5">km ce mois</p>
                </div>
              </div>
            </div>
            <div className="stat-card card-enter bg-white rounded-xl p-4 border border-silver-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-dark-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-dark-800 leading-none">{runsThisWeek}</p>
                  <p className="text-xs text-dark-500 mt-0.5">runs semaine</p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* TABS STICKY                                 */}
          {/* ============================================ */}
          <div className="sticky top-20 z-10 bg-neu-base py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1.5 border border-silver-200 max-w-md">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`tab-btn flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-dark-800 text-white active'
                    : 'text-dark-500 hover:bg-silver-100'
                }`}
              >
                A venir
                {allUpcoming.length > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === 'upcoming' ? 'bg-white/20' : 'bg-neon-100 text-neon-700'
                  }`}>
                    {allUpcoming.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`tab-btn flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-dark-800 text-white active'
                    : 'text-dark-500 hover:bg-silver-100'
                }`}
              >
                Historique
              </button>
              <button
                onClick={() => setActiveTab('created')}
                className={`tab-btn flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'created'
                    ? 'bg-dark-800 text-white active'
                    : 'text-dark-500 hover:bg-silver-100'
                }`}
              >
                Mes creations
              </button>
            </div>
          </div>

          {/* ============================================ */}
          {/* MAIN CONTENT - 2 COLUMNS                    */}
          {/* ============================================ */}
          {sessionsLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ======== LEFT COLUMN (8/12) ======== */}
              <div className="lg:col-span-8 space-y-6">

                {/* TAB: A VENIR */}
                {activeTab === 'upcoming' && (
                  <>
                    {allUpcoming.length === 0 ? (
                      <div className="bg-white rounded-xl border border-silver-200 p-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-neon-100 flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-neon-600" />
                        </div>
                        <h3 className="text-lg font-bold text-dark-800 mb-2">Aucune sortie prevue</h3>
                        <p className="text-sm text-dark-500 mb-6 max-w-sm mx-auto">
                          Inscris-toi a une session ou cree la tienne pour commencer
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Link
                            href="/sessions"
                            className="px-5 py-2.5 rounded-full bg-dark-800 text-white font-semibold text-sm hover:bg-dark-700 transition-colors"
                          >
                            Decouvrir les sessions
                          </Link>
                          <Link
                            href="/sessions/create"
                            className="px-5 py-2.5 rounded-full border border-neon-500 text-neon-700 font-semibold text-sm hover:bg-neon-50 transition-colors"
                          >
                            Creer une sortie
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* HERO CARD - Prochaine sortie */}
                        {nextSession && (
                          <Link href={`/sessions/${nextSession.id}`} className="block">
                            <div className="hero-card bg-gradient-to-br from-dark-800 via-dark-900 to-black rounded-2xl p-6 text-white overflow-hidden relative">
                              {/* Decorative */}
                              <div className="absolute top-0 right-0 w-48 h-48 bg-neon-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                              <div className="relative">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neon-500 text-dark-900 rounded-full text-xs font-bold mb-4">
                                  <Sparkles className="w-3 h-3" />
                                  Prochaine sortie
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-bold mb-2">{nextSession.title}</h2>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 mb-4">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {formatSessionDate(nextSession.start_time)}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {nextSession.location_name}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4" />
                                    {nextSession.distance_km} km
                                  </span>
                                </div>

                                {/* Participants + CTA */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                      {[...Array(Math.min(4, nextSession.participants_count || 1))].map((_, i) => (
                                        <div
                                          key={i}
                                          className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-400 to-neon-600 border-2 border-dark-900 flex items-center justify-center text-xs font-bold text-dark-900"
                                        >
                                          {String.fromCharCode(65 + i)}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-sm text-white/60">
                                      {nextSession.participants_count || 1} participant{(nextSession.participants_count || 1) > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                    <span className="flex items-center gap-1 text-neon-400 font-medium text-sm">
                                      Voir details
                                      <ChevronRight className="w-4 h-4" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}

                        {/* Secondary sessions list */}
                        {secondaryUpcoming.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-dark-600 uppercase tracking-wider mb-3">
                              Autres sorties prevues
                            </h3>
                            <div className="space-y-3">
                              {secondaryUpcoming.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* TAB: HISTORIQUE */}
                {activeTab === 'history' && (
                  <>
                    {allPast.length === 0 ? (
                      <div className="bg-white rounded-xl border border-silver-200 p-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-8 h-8 text-dark-500" />
                        </div>
                        <h3 className="text-lg font-bold text-dark-800 mb-2">Aucune sortie passee</h3>
                        <p className="text-sm text-dark-500">
                          Ton historique apparaitra ici apres tes premieres sessions
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Past created */}
                        {pastCreated.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm">👑</span>
                              <h3 className="text-sm font-semibold text-dark-600">Mes creations passees</h3>
                              <span className="text-xs text-dark-400">({pastCreated.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {pastCreated.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past joined */}
                        {pastJoined.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm">🏃</span>
                              <h3 className="text-sm font-semibold text-dark-600">Mes participations</h3>
                              <span className="text-xs text-dark-400">({pastJoined.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {pastJoined.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* TAB: MES CREATIONS */}
                {activeTab === 'created' && (
                  <>
                    {upcomingCreated.length === 0 && pastCreated.length === 0 ? (
                      <div className="bg-white rounded-xl border border-silver-200 p-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto mb-4">
                          <Crown className="w-8 h-8 text-pink-600" />
                        </div>
                        <h3 className="text-lg font-bold text-dark-800 mb-2">Aucune creation</h3>
                        <p className="text-sm text-dark-500 mb-6 max-w-sm mx-auto">
                          Organise ta premiere sortie et rassemble la communaute
                        </p>
                        <Link
                          href="/sessions/create"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm hover:bg-pink-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Creer une sortie
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Upcoming created */}
                        {upcomingCreated.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="px-2 py-1 rounded-lg bg-neon-100 text-neon-700 text-xs font-bold">A venir</div>
                              <span className="text-xs text-dark-400">({upcomingCreated.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {upcomingCreated.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past created */}
                        {pastCreated.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="px-2 py-1 rounded-lg bg-dark-100 text-dark-600 text-xs font-bold">Passees</div>
                              <span className="text-xs text-dark-400">({pastCreated.length})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {pastCreated.map((session) => (
                                <SessionCard key={session.id} session={session} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ======== RIGHT COLUMN / SIDEBAR (4/12) ======== */}
              <div className="lg:col-span-4 space-y-5">

                {/* Mini Calendar */}
                <div className="sidebar-card bg-white rounded-xl border border-silver-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-silver-200">
                    <h3 className="text-sm font-bold text-dark-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neon-600" />
                      Prochains 14 jours
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-1">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                        <div key={i} className="text-[10px] text-dark-400 text-center font-medium pb-1">
                          {day}
                        </div>
                      ))}
                      {sessionDays.map(({ date, count }, i) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={i}
                            className={`calendar-day aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer ${
                              isToday
                                ? 'bg-dark-800 text-white'
                                : count > 0
                                  ? 'bg-neon-100 text-neon-700'
                                  : 'bg-silver-50 text-dark-500 hover:bg-silver-100'
                            }`}
                          >
                            <span className="font-semibold">{date.getDate()}</span>
                            {count > 0 && (
                              <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? 'bg-neon-400' : 'bg-neon-500'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="sidebar-card bg-white rounded-xl border border-silver-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-silver-200">
                    <h3 className="text-sm font-bold text-dark-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-500" />
                      Suggestions
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <Link
                      href="/sessions"
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-pink-100/50 hover:from-pink-100 hover:to-pink-100 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-800">Decouvrir des runs</p>
                        <p className="text-xs text-dark-500">Trouve des sessions pres de toi</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-dark-600 transition-colors" />
                    </Link>

                    <Link
                      href="/sessions/create"
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-neon-50 to-neon-100/50 hover:from-neon-100 hover:to-neon-100 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neon-500 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-5 h-5 text-dark-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-800">Creer une sortie</p>
                        <p className="text-xs text-dark-500">Organise et invite des runners</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-dark-600 transition-colors" />
                    </Link>

                    <Link
                      href="/teams"
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-dark-50 to-dark-100/50 hover:from-dark-100 hover:to-dark-100 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-800">Rejoindre une equipe</p>
                        <p className="text-xs text-dark-500">Cours en crew regulierement</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-dark-600 transition-colors" />
                    </Link>
                  </div>
                </div>

                {/* Quick tip */}
                <div className="sidebar-card bg-gradient-to-br from-neon-500 to-neon-400 rounded-xl p-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <p className="text-sm font-bold text-dark-900 mb-1">Astuce</p>
                    <p className="text-xs text-dark-700">
                      Cree une sortie recurrente pour fideliser tes running mates !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
