'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUpcomingSessions, getUserTeam } from '@/lib/actions';
import { Session, Team } from '@/lib/types';

interface SessionWithParticipation extends Session {
  is_participant?: boolean;
}
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SessionPanel from '@/components/overlays/SessionPanel';
import CreateWizardModal from '@/components/overlays/CreateWizardModal';
import {
  Users, Zap, Trophy, TrendingUp, Target, Plus,
  MapPin, Clock, ChevronRight, Calendar, Activity,
  ArrowRight, Footprints, CheckCircle, Sun, CloudRain,
  Cloud, Timer, Flame, Star, Heart, MessageCircle,
  Award, Route, Sparkles
} from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/lib/constants';
import RunningStatsSection from '@/components/ui/RunningStatsSection';

interface TeamWithCount extends Team {
  members_count: number;
}

// Images par type de session (locales)
const SESSION_COVERS: Record<string, string[]> = {
  intervals: ['/fractionne-1.jpeg'],
  long_run: ['/long-run-1.jpeg'],
  casual: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
  recovery: ['/recovery-1.jpeg'],
  tempo: ['/tempo-1.jpg'],
  default: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
};

// Labels pour les types de session (couleurs désaturées pour ne pas dominer les titres)
const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  intervals: { label: 'Fractionné', color: 'bg-orange-400/90' },
  long_run: { label: 'Sortie longue', color: 'bg-purple-400/90' },
  casual: { label: 'Détente', color: 'bg-teal-500/85' },
  recovery: { label: 'Récupération', color: 'bg-sky-400/90' },
  tempo: { label: 'Tempo', color: 'bg-pink-400/90' },
  default: { label: 'Run', color: 'bg-slate-400/90' },
};

// Fonction pour obtenir une image basée sur l'ID de session (consistant mais varié)
const getSessionCover = (session: Session): string => {
  const covers = SESSION_COVERS[session.session_type || 'default'] || SESSION_COVERS.default;
  const index = session.id.charCodeAt(0) % covers.length;
  return covers[index];
};

// Fonction pour obtenir le label du type de session
const getSessionTypeLabel = (sessionType: string | null | undefined) => {
  return SESSION_TYPE_LABELS[sessionType || 'default'] || SESSION_TYPE_LABELS.default;
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<TeamWithCount | null>(null);
  const [levelBarAnimated, setLevelBarAnimated] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

  // Level filter: 'accessible' = ≤ my level +1 | 'near' = ±1 | 'below' = ≤ my level
  const [levelFilter, setLevelFilter] = useState<'accessible' | 'near' | 'below'>('accessible');

  // Overlay states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openSessionPanel = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsSessionPanelOpen(true);
    window.history.pushState({}, '', `/dashboard?session=${sessionId}`);
  };

  const closeSessionPanel = () => {
    setIsSessionPanelOpen(false);
    setSelectedSessionId(null);
    window.history.pushState({}, '', '/dashboard');
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    window.history.pushState({}, '', '/dashboard?create=true');
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    window.history.pushState({}, '', '/dashboard');
  };

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
        // Fetch up to 20 sessions accessible to the user (≤ level + 1) for client-side filtering
        const userLevel = profile?.running_level || 1;
        const [sessionsData, team] = await Promise.all([
          getUpcomingSessions(20, userLevel + 1),
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
    if (profile !== undefined) fetchData(); // wait until auth context resolves
  }, [profile?.running_level]); // re-fetch if level changes (e.g. after Strava sync)

  // Apply client-side level filter on top of the pre-filtered sessions
  const filteredSessions = useMemo(() => {
    const userLevel = profile?.running_level || 1;
    if (levelFilter === 'near') {
      return sessions.filter(s => s.level_required >= userLevel - 1 && s.level_required <= userLevel + 1);
    }
    if (levelFilter === 'below') {
      return sessions.filter(s => s.level_required <= userLevel);
    }
    // 'accessible': already pre-filtered server-side (≤ userLevel + 1)
    return sessions;
  }, [sessions, levelFilter, profile?.running_level]);

  const featuredSession = filteredSessions[0];
  const secondarySessions = filteredSessions.slice(1, 4);

  // Calcul du countdown pour la prochaine session
  const countdown = useMemo(() => {
    if (!featuredSession) return null;
    const now = new Date();
    const sessionDate = new Date(featuredSession.start_time);
    const diff = sessionDate.getTime() - now.getTime();
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }, [featuredSession]);

  // Météo simulée (en prod, on utiliserait une vraie API)
  const weather = useMemo(() => {
    const weathers = [
      { icon: Sun, temp: 14, text: 'Parfait pour courir' },
      { icon: Cloud, temp: 12, text: 'Idéal pour un run' },
      { icon: Sun, temp: 18, text: 'Conditions optimales' },
    ];
    return weathers[Math.floor(Math.random() * weathers.length)];
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 pt-28 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Données sociales simulées
  const socialFeed = [
    { user: 'Marie L.', action: 'a rejoint', target: 'Sortie matinale Paris 15e', time: 'Il y a 2h', gradient: 'from-pink-400 to-purple-500', reactions: ['🔥', '👏'] },
    { user: 'Thomas R.', action: 'a créé', target: 'Fractionné Vincennes', time: 'Il y a 4h', gradient: 'from-neon-400 to-teal-500', reactions: ['💪'] },
    { user: 'Sophie M.', action: 'a terminé', target: '10 km en 48:32', time: 'Hier', gradient: 'from-orange-400 to-red-500', reactions: ['🔥', '👏', '❤️'] },
  ];

  const friendsRunningToday = 3;

  return (
    <div className="min-h-screen bg-dark-900">
      <style jsx global>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(236, 72, 153, 0.3), 0 4px 20px rgba(236, 72, 153, 0.2); }
          50% { box-shadow: 0 0 30px rgba(236, 72, 153, 0.45), 0 4px 25px rgba(236, 72, 153, 0.3); }
        }
        @keyframes glowBreathing {
          0%, 100% { box-shadow: 0 0 15px rgba(236, 72, 153, 0.4), 0 4px 15px rgba(236, 72, 153, 0.25); }
          50% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.55), 0 4px 20px rgba(236, 72, 153, 0.35); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-glow-pulse {
          animation: glowPulse 2.4s ease-in-out infinite;
        }
        .animate-glow-breathing {
          animation: glowBreathing 3s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .card-hover {
          transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
        }
        .section-reveal {
          opacity: 0;
          animation: fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .section-reveal:nth-child(1) { animation-delay: 0.05s; }
        .section-reveal:nth-child(2) { animation-delay: 0.1s; }
        .section-reveal:nth-child(3) { animation-delay: 0.15s; }
        .section-reveal:nth-child(4) { animation-delay: 0.2s; }
        .section-reveal:nth-child(5) { animation-delay: 0.25s; }
      `}</style>

      {/* ============================================ */}
      {/* SECTION 1 — HERO FULL-BLEED */}
      {/* ============================================ */}
      <section className="relative w-full pt-20">
        {/* Background Image - Full Width */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${featuredSession ? getSessionCover(featuredSession) : '/easy-run-1.jpeg'}')`,
          }}
        />
        {/* Gradient overlay — same depth as Sessions */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,26,21,0.55) 0%, rgba(5,26,21,0.88) 100%)' }} />
        {/* Ambient glows — Sessions style */}
        <div className="absolute top-0 left-1/4 w-96 h-56 bg-neon-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Inner Container - Centered Content */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-8 lg:px-8 md:px-5 py-8 pb-6">
          <div>
            {/* Next Run */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-silver-400 uppercase tracking-wider mb-3">
                <Footprints className="w-4 h-4" />
                Ton prochain run
              </span>

              {featuredSession ? (
                <>
                  <h1 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
                    {featuredSession.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-silver-300 mb-4">
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

                  {/* Live elements row */}
                  <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-silver-200">
                      <weather.icon className="w-4 h-4 text-yellow-400" />
                      {weather.temp}°C — {weather.text}
                    </span>
                    {countdown && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-silver-200">
                        <Timer className="w-4 h-4 text-neon-400" />
                        Départ dans {countdown}
                      </span>
                    )}
                    {(featuredSession.participants_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-silver-200">
                        <Flame className="w-4 h-4 text-orange-400" />
                        {featuredSession.participants_count} déjà inscrits
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-6">
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
                      {(featuredSession.participants_count || 0) > 3 && (
                        <div className="w-10 h-10 rounded-full bg-dark-700 border-2 border-dark-800 flex items-center justify-center text-xs font-bold text-silver-300">
                          +{(featuredSession.participants_count || 0) - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-silver-400">
                      {featuredSession.participants_count || 0} coureurs inscrits
                    </span>
                  </div>

                  {/* Dual CTAs */}
                  <div className="flex flex-wrap items-center gap-4">
                    {featuredSession.is_participant ? (
                      <button
                        onClick={() => openSessionPanel(featuredSession.id)}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-neon-500 to-neon-600 hover:from-neon-600 hover:to-neon-700 text-white font-bold text-lg rounded-2xl hover:-translate-y-0.5 transition-transform"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Inscrit — Voir les détails
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openSessionPanel(featuredSession.id)}
                          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl animate-glow-pulse hover:-translate-y-0.5 transition-transform"
                        >
                          Rejoindre la sortie
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openSessionPanel(featuredSession.id)}
                          className="text-silver-400 hover:text-white text-sm font-medium transition-colors underline-offset-4 hover:underline"
                        >
                          Voir les détails
                        </button>
                      </>
                    )}
                  </div>

                  {/* Level inline chip — near CTA */}
                  <div className="mt-5 inline-flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 max-w-sm">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white bg-gradient-to-br ${levelGradient}`}>
                        {level}
                      </div>
                      {level >= 7 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Zap className="w-2 h-2 text-yellow-900" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Niveau {level}</span>
                        <span className="text-xs text-silver-400">— {levelName}</span>
                      </div>
                      <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-1.5 w-full">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-neon-500 rounded-full"
                          style={{
                            width: levelBarAnimated ? `${level >= 9 ? 100 : Math.min(95, level * 11)}%` : '0%',
                            transition: 'width 1.1s ease-out 0.3s',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-silver-400">Encore {Math.max(10, 50 - (profile?.calculated_weekly_km || 0)).toFixed(0)} km pour niv. {level + 1}</span>
                        {profile?.strava_connected ? (
                          <span className="text-[10px] text-neon-400 flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Strava
                          </span>
                        ) : (
                          <Link href="/settings" className="text-[10px] text-silver-500 hover:text-white transition-colors flex items-center gap-0.5">
                            <Target className="w-2.5 h-2.5" />
                            Sync
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Urgence douce */}
                  {!featuredSession.is_participant && featuredSession.max_participants && (
                    <p className="mt-4 text-sm text-silver-500">
                      <Sparkles className="w-3.5 h-3.5 inline mr-1 text-yellow-500" />
                      Plus que {featuredSession.max_participants - (featuredSession.participants_count || 0)} places disponibles
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-3xl lg:text-4xl font-black text-white mb-4">
                    Aucune sortie prévue
                  </h1>
                  <p className="text-silver-400 mb-6">Crée ta première session ou rejoins un groupe</p>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl animate-glow-pulse hover:-translate-y-0.5 transition-transform"
                  >
                    Créer une sortie
                    <Plus className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 2 — STAT BAR */}
      {/* ============================================ */}
      <div className="relative z-20 -mt-8 mb-0 px-4 sm:px-8">
        <section className="max-w-[900px] mx-auto section-reveal">
          <div className="bg-dark-800/90 backdrop-blur-sm border border-white/8 rounded-2xl px-6 sm:px-9 py-4 sm:py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
                <Route className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <div className="text-xl font-black text-white">
                  {profile?.calculated_weekly_km ? Math.round(profile.calculated_weekly_km) : 0} <span className="text-sm font-semibold text-dark-300">km</span>
                </div>
                <div className="text-xs text-dark-300">cette semaine</div>
              </div>
            </div>

            <div className="w-px h-10 bg-white/10 hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-neon-400" />
              </div>
              <div>
                <div className="text-xl font-black text-white">
                  {sessions.length} <span className="text-sm font-semibold text-dark-300">sorties</span>
                </div>
                <div className="text-xs text-dark-300">à venir</div>
              </div>
            </div>

            <div className="w-px h-10 bg-white/10 hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xl font-black text-white">
                  {profile?.calculated_avg_pace || '—'} <span className="text-sm font-semibold text-dark-300">/km</span>
                </div>
                <div className="text-xs text-dark-300">allure moyenne</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Centered sections container */}
      <div className="max-w-[1280px] mx-auto px-8 pb-24 pt-14">

        {/* ============================================ */}
        {/* SECTION 2.5 — ACTIVITÉ RÉCENTE */}
        {/* ============================================ */}
        <section className="mb-12 section-reveal">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-1.5 rounded-lg bg-pink-500/15">
              <Activity className="w-4 h-4 text-pink-400" />
            </span>
            <h2 className="text-base font-bold text-white">Ton activité récente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dernière sortie */}
            <div className="bg-dark-800/60 border border-white/8 rounded-2xl p-5 card-hover hover:border-white/12 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Footprints className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-semibold text-dark-300 uppercase tracking-wide">Dernière sortie</span>
              </div>
              <p className="text-lg font-bold text-white">
                {profile?.calculated_weekly_km ? `${(profile.calculated_weekly_km / 2).toFixed(1)} km` : 'Aucune'}
              </p>
              <p className="text-sm text-dark-300 mt-0.5">Il y a 2 jours</p>
            </div>

            {/* Progression — Sparkline */}
            <div className="bg-dark-800/60 border border-white/8 rounded-2xl p-5 card-hover hover:border-neon-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neon-400" />
                  <span className="text-xs font-semibold text-dark-300 uppercase tracking-wide">Progression</span>
                </div>
                <span className="text-sm font-black text-neon-400">+12%</span>
              </div>
              <svg width="100%" height="36" viewBox="0 0 120 36" preserveAspectRatio="none" className="my-1.5">
                <defs>
                  <linearGradient id="dash-spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F57A" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00F57A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,30 L20,34 L40,22 L60,26 L80,14 L100,7 L120,2" stroke="#00F57A" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M0,30 L20,34 L40,22 L60,26 L80,14 L100,7 L120,2 L120,36 L0,36 Z" fill="url(#dash-spark)" />
              </svg>
              <p className="text-xs text-dark-300">vs semaine dernière</p>
            </div>

            {/* Prochain objectif */}
            <div className="bg-dark-800/60 border border-white/8 rounded-2xl p-5 card-hover hover:border-white/12 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-dark-300 uppercase tracking-wide">Prochain objectif</span>
              </div>
              <p className="text-lg font-bold text-white">Niveau {level + 1}</p>
              <p className="text-sm text-dark-300 mt-0.5">Encore {Math.max(10, 50 - (profile?.calculated_weekly_km || 0)).toFixed(0)} km</p>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 3 — COURIR AUJOURD'HUI (Élargi) */}
        {/* ============================================ */}
        {(filteredSessions.length > 0 || sessions.length > 0) && (
          <section className="mb-14 section-reveal">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Courir aujourd'hui</h2>
                <Link href="/sessions" className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1">
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Level filter tabs */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'accessible', label: 'Accessible', desc: 'Mon niveau et au-dessus' },
                  { key: 'near',       label: 'Mon niveau', desc: 'Niveau ± 1' },
                  { key: 'below',      label: 'En dessous',  desc: 'Tous niveaux inférieurs' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLevelFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      levelFilter === key
                        ? 'bg-neon-500 text-dark-800'
                        : 'bg-white/8 text-dark-200 border border-white/10 hover:bg-white/12'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredSessions.length === 0 && (
                <p className="text-sm text-dark-300">Aucune sortie disponible pour ce filtre.</p>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Featured Run Card */}
              {secondarySessions[0] && (
                <button onClick={() => openSessionPanel(secondarySessions[0].id)} className="flex-[6] group text-left">
                  <div className="h-full bg-dark-800/60 rounded-2xl overflow-hidden card-hover hover:shadow-xl hover:shadow-neon-500/5 border border-white/8 hover:border-neon-500/30 transition-colors">
                    <div className="relative h-[160px] overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                        style={{ backgroundImage: `url('${getSessionCover(secondarySessions[0])}')` }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%)' }} />

                      {/* Badge Recommandé */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                          <Star className="w-3 h-3" />
                          Recommandé
                        </span>
                      </div>

                      {/* Badge Type */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center px-2.5 py-1 ${getSessionTypeLabel(secondarySessions[0].session_type).color} text-white text-xs font-semibold rounded-full`}>
                          {getSessionTypeLabel(secondarySessions[0].session_type).label}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full shadow">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(secondarySessions[0].start_time)}
                        </span>
                        <span className="text-sm text-white font-medium drop-shadow-lg">{formatDate(secondarySessions[0].start_time)}</span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-neon-400 transition-colors">
                        {secondarySessions[0].title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-dark-300 mb-5">
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
                          {/* Avatars avec + nombre */}
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(secondarySessions[0].participants_count || 2, 4))].map((_, i) => (
                              <div key={i} className={`w-9 h-9 rounded-full bg-gradient-to-br ${['from-pink-400 to-purple-500', 'from-neon-400 to-teal-500', 'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500'][i]} border-2 border-dark-800 flex items-center justify-center text-xs font-bold text-white`}>
                                {String.fromCharCode(65 + i)}
                              </div>
                            ))}
                          </div>
                          <span className="text-sm text-dark-300 font-medium">{secondarySessions[0].participants_count || 2} inscrits</span>
                        </div>
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-500 text-dark-800 font-semibold rounded-xl group-hover:bg-neon-400 transition-colors">
                          Rejoindre <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Secondary Runs */}
              <div className="flex-[4] flex flex-col gap-4">
                {secondarySessions.slice(1).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openSessionPanel(session.id)}
                    className="group bg-dark-800/60 rounded-2xl overflow-hidden card-hover hover:shadow-lg border border-white/8 hover:border-white/12 transition-colors text-left"
                  >
                    <div className="flex">
                      <div className="relative w-24 min-h-[110px] flex-shrink-0">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url('${getSessionCover(session)}')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                        {/* Badge Type petit */}
                        <div className="absolute bottom-2 left-2">
                          <span className={`inline-flex items-center px-2 py-0.5 ${getSessionTypeLabel(session.session_type).color} text-white text-[10px] font-semibold rounded`}>
                            {getSessionTypeLabel(session.session_type).label}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-dark-300">{formatDate(session.start_time)} • {formatTime(session.start_time)}</span>
                          <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-pink-400 transition-colors" />
                        </div>
                        <h4 className="font-bold text-white mb-2 group-hover:text-neon-400 transition-colors">{session.title}</h4>
                        <div className="flex items-center gap-3">
                          {/* Avatar organisateur */}
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white">
                            O
                          </div>
                          <span className="text-sm text-dark-300">
                            {session.distance_km && `${session.distance_km} km • `}
                            {session.participants_count || 1} coureurs
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {secondarySessions.length < 3 && (
                  <Link href="/sessions" className="flex-1 flex items-center justify-center gap-2 bg-white/5 rounded-2xl p-5 text-dark-300 hover:text-white hover:bg-white/8 transition-colors border-2 border-dashed border-white/10">
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Voir plus de sessions</span>
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 4 — SOCIAL (Vivant) */}
        {/* ============================================ */}
        <section className="mb-14 section-reveal">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Ton réseau court</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neon-500/10 text-neon-400 text-xs font-semibold rounded-full">
                <Flame className="w-3 h-3" />
                {friendsRunningToday} amis courent aujourd'hui
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[6] bg-dark-800/60 rounded-2xl overflow-hidden border border-white/8">
              <div className="divide-y divide-white/8">
                {socialFeed.map((item, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-sm`}>
                      {item.user.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-200">
                        <strong className="font-semibold text-white">{item.user}</strong>{' '}
                        <span className="text-dark-300">{item.action}</span>{' '}
                        <strong className="font-semibold text-white">{item.target}</strong>
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-dark-400">{item.time}</span>
                        <div className="flex items-center gap-1">
                          {item.reactions.map((reaction, j) => (
                            <span key={j} className="text-sm">{reaction}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-white/8 rounded-lg transition-colors">
                      <Heart className="w-4 h-4 text-dark-400 hover:text-pink-500 transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
              <Link href="/sessions" className="block px-6 py-4 text-center text-sm font-semibold text-neon-400 hover:bg-white/5 transition-colors border-t border-white/8">
                Voir toute l'activité
              </Link>
            </div>

            {/* Team Card avec Stats */}
            <div className="flex-[4]">
              {userTeam ? (
                <Link href="/teams" className="block h-full group">
                  <div className="h-full bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 card-hover hover:shadow-xl">
                    <div className="flex items-center gap-2 mb-5">
                      <Users className="w-4 h-4 text-silver-500" />
                      <span className="text-xs font-semibold text-silver-500 uppercase tracking-wider">Mon équipe</span>
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

                    {/* Stats équipe */}
                    <div className="space-y-3">
                      <div className="bg-dark-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-silver-400 flex items-center gap-2">
                          <Route className="w-4 h-4" />
                          Distance totale
                        </span>
                        <span className="text-lg font-bold text-pink-400">{userTeam.total_distance?.toFixed(0) || 0} km</span>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-silver-400 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Cette semaine
                        </span>
                        <span className="text-lg font-bold text-neon-400">5 sorties</span>
                      </div>
                    </div>

                    {/* Avatars membres */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-700">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(userTeam.members_count || 3, 5))].map((_, i) => (
                          <div key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${['from-pink-400 to-purple-500', 'from-neon-400 to-teal-500', 'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500', 'from-yellow-400 to-orange-500'][i]} border-2 border-dark-800 flex items-center justify-center text-[9px] font-bold text-white`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-silver-500">Membres actifs</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link href="/teams" className="block h-full group">
                  <div className="h-full bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 flex flex-col justify-center items-center text-center card-hover hover:shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rejoins une équipe</h3>
                    <p className="text-sm text-white/80 mb-4">Progresse ensemble et partage tes runs</p>
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-pink-600 font-semibold rounded-xl group-hover:bg-pink-50 transition-colors">
                      Découvrir <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 5 — DÉCOUVRIR (Microcopy amélioré) */}
        {/* ============================================ */}
        <section className="section-reveal">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Découvrir</h2>
            <Link href="/sessions" className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1">
              Explorer <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/sessions" className="group bg-dark-800/60 rounded-2xl p-5 card-hover hover:shadow-lg border border-white/8 hover:border-neon-500/30 transition-colors overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-500/15 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-neon-500/20">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-1 group-hover:text-neon-400 transition-colors">Sessions proches</h4>
                <p className="text-sm text-dark-300">Trouve des runs autour de toi aujourd'hui</p>
              </div>
            </Link>

            <Link href="/teams" className="group bg-dark-800/60 rounded-2xl p-5 card-hover hover:shadow-lg border border-white/8 hover:border-pink-500/30 transition-colors overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/15 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">Équipes actives</h4>
                <p className="text-sm text-dark-300">Rejoins une communauté de coureurs</p>
              </div>
            </Link>

            <button onClick={openCreateModal} className="group bg-dark-800/60 rounded-2xl p-5 card-hover hover:shadow-lg border border-white/8 hover:border-purple-500/30 transition-colors text-left overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/15 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">Organise un run</h4>
                <p className="text-sm text-dark-300">Crée ta propre session et invite tes amis</p>
              </div>
            </button>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 6 — TA VIE DE COUREUR (Stats) */}
        {/* ============================================ */}
        <section className="section-reveal mt-14">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[#C8FF00]" />
            <h2 className="text-xl font-bold text-white">Ta vie de coureur</h2>
          </div>
          <RunningStatsSection />
        </section>

      </div>

      {/* ============================================ */}
      {/* FAB avec Tooltip et Glow Breathing */}
      {/* ============================================ */}
      <div className="fixed bottom-6 right-6 z-30">
        {/* Tooltip */}
        {showFabTooltip && (
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-dark-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap animate-fade-in-up">
            Créer une sortie
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-dark-800 rotate-45" />
          </div>
        )}
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl animate-glow-breathing transition-all duration-200"
          onMouseEnter={() => { setFabHovered(true); setShowFabTooltip(true); }}
          onMouseLeave={() => { setFabHovered(false); setShowFabTooltip(false); }}
          style={{ transform: fabHovered ? 'scale(1.06) translateY(-2px)' : 'scale(1)' }}
        >
          <Plus className="w-6 h-6 transition-transform duration-200" style={{ transform: fabHovered ? 'rotate(90deg)' : 'rotate(0)' }} />
          <span className="hidden sm:inline">Créer une sortie</span>
        </button>
      </div>

      {/* Session Details Panel - Glass overlay with dashboard visible behind */}
      <SessionPanel
        sessionId={selectedSessionId}
        isOpen={isSessionPanelOpen}
        onClose={closeSessionPanel}
      />

      {/* Create Session Modal - Centered glass overlay */}
      <CreateWizardModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
      />
    </div>
  );
}
