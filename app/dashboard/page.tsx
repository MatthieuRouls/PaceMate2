'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUpcomingSessions, getUserTeam, getUserUpcomingSessions } from '@/lib/actions';
import { getFeedEvents, type ActivityEvent } from '@/lib/activity-actions';
import { getEventLabel, getEventTimeAgo } from '@/lib/activity-utils';
import { getFriendsList, getPendingRequestsCount } from '@/lib/friend-actions';
import { Session, Team, Profile } from '@/lib/types';

interface SessionWithParticipation extends Session {
  is_participant?: boolean;
}

import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SessionPanel from '@/components/overlays/SessionPanel';
import CreateWizardModal from '@/components/overlays/CreateWizardModal';
import {
  Users, Plus, MapPin, Clock, ChevronRight, Calendar, Activity,
  ArrowRight, CheckCircle, Flame, MessageCircle, Shield, UserCheck,
  Zap, Star, UserPlus,
} from 'lucide-react';

interface TeamWithCount extends Team {
  members_count: number;
}

const SESSION_COVERS: Record<string, string[]> = {
  intervals: ['/fractionne-1.jpeg'],
  long_run: ['/long-run-1.jpeg'],
  casual: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
  recovery: ['/recovery-1.jpeg'],
  tempo: ['/tempo-1.jpg'],
  default: ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
};

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  intervals: { label: 'Fractionné', color: 'bg-orange-400/90' },
  long_run: { label: 'Sortie longue', color: 'bg-purple-400/90' },
  casual: { label: 'Détente', color: 'bg-teal-500/85' },
  recovery: { label: 'Récupération', color: 'bg-sky-400/90' },
  tempo: { label: 'Tempo', color: 'bg-pink-400/90' },
  default: { label: 'Run', color: 'bg-slate-400/90' },
};

const getSessionCover = (session: Session): string => {
  const covers = SESSION_COVERS[session.session_type || 'default'] || SESSION_COVERS.default;
  return covers[session.id.charCodeAt(0) % covers.length];
};

const getSessionTypeLabel = (sessionType: string | null | undefined) =>
  SESSION_TYPE_LABELS[sessionType || 'default'] || SESSION_TYPE_LABELS.default;

const AVATAR_GRADIENTS = [
  'from-pink-400 to-purple-500',
  'from-neon-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-blue-400 to-indigo-500',
  'from-yellow-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SessionWithParticipation[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<TeamWithCount | null>(null);
  const [feedEvents, setFeedEvents] = useState<ActivityEvent[]>([]);
  const [fabHovered, setFabHovered] = useState(false);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

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

  useEffect(() => {
    async function fetchData() {
      try {
        const userLevel = profile?.running_level || 1;
        const [sessionsData, team, feed, mySess, friendsRes, pendingRes] = await Promise.all([
          getUpcomingSessions(20, userLevel + 1),
          getUserTeam(),
          getFeedEvents(8),
          getUserUpcomingSessions(),
          getFriendsList(),
          getPendingRequestsCount(),
        ]);
        setSessions(sessionsData);
        setUserTeam(team);
        setFeedEvents(feed);
        setMySessions(mySess);
        if (friendsRes.success) setFriends(friendsRes.friends ?? []);
        if (pendingRes.success) setPendingCount(pendingRes.count);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (profile) fetchData();
  }, [profile?.running_level]);

  const nearbyRuns = sessions.slice(0, 5);
  const verifiedCount = Math.max(1, Math.floor(sessions.length * 0.8));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 pt-28 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <style jsx global>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(236,72,153,0.3), 0 4px 20px rgba(236,72,153,0.2); }
          50%       { box-shadow: 0 0 30px rgba(236,72,153,0.45), 0 4px 25px rgba(236,72,153,0.3); }
        }
        @keyframes glowBreathing {
          0%, 100% { box-shadow: 0 0 15px rgba(236,72,153,0.4), 0 4px 15px rgba(236,72,153,0.25); }
          50%       { box-shadow: 0 0 25px rgba(236,72,153,0.55), 0 4px 20px rgba(236,72,153,0.35); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
        .animate-glow-pulse     { animation: glowPulse 2.4s ease-in-out infinite; }
        .animate-glow-breathing { animation: glowBreathing 3s ease-in-out infinite; }
        .animate-fade-in-up     { animation: fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .animate-live-dot       { animation: liveDot 2s ease-in-out infinite; }
        .card-hover { transition: transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms; }
        .card-hover:hover { transform: translateY(-3px); }
        .section-reveal { opacity: 0; animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .section-reveal:nth-child(1) { animation-delay: 0.05s; }
        .section-reveal:nth-child(2) { animation-delay: 0.10s; }
        .section-reveal:nth-child(3) { animation-delay: 0.15s; }
        .section-reveal:nth-child(4) { animation-delay: 0.20s; }
        .section-reveal:nth-child(5) { animation-delay: 0.25s; }
        .section-reveal:nth-child(6) { animation-delay: 0.30s; }
        .section-reveal:nth-child(7) { animation-delay: 0.35s; }
      `}</style>

      {/* ================================================ */}
      {/* HERO                                            */}
      {/* ================================================ */}
      <section className="relative w-full pt-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/easy-run-2.jpeg')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(5,26,21,0.58) 0%, rgba(5,26,21,0.94) 100%)' }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-56 bg-neon-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-8 md:px-5 py-16 pb-12">
          <p className="text-sm font-semibold text-silver-400 mb-3">
            Bonjour {profile?.username?.split(' ')[0] || 'coureur'} 👋
          </p>

          <h1 className="text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
            Trouve un run<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-neon-400">
              maintenant
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-silver-200 border border-white/10">
              <span className="w-2 h-2 bg-neon-400 rounded-full animate-live-dot flex-shrink-0" />
              {sessions.length > 0
                ? `${sessions.length} runs aujourd'hui autour de toi`
                : 'Runs disponibles près de toi'}
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-silver-200 border border-white/10">
              <Flame className="w-4 h-4 text-orange-400" />
              {Math.max(2, Math.floor(sessions.length * 0.3))} personnes courent maintenant
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/sessions"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl animate-glow-pulse hover:-translate-y-0.5 transition-transform"
            >
              Rejoindre une sortie
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/16 backdrop-blur-sm border border-white/20 hover:border-white/30 text-white font-bold text-lg rounded-2xl hover:-translate-y-0.5 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Créer une sortie
            </button>
          </div>
        </div>
      </section>

      {/* ================================================ */}
      {/* MAIN CONTENT                                     */}
      {/* ================================================ */}
      <div className="max-w-[1280px] mx-auto px-8 pb-28 pt-10">

        {/* ============================================ */}
        {/* RUNS NEAR YOU                               */}
        {/* ============================================ */}
        {nearbyRuns.length > 0 && (
          <section className="mb-14 section-reveal">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="p-1.5 rounded-lg bg-neon-500/15">
                  <MapPin className="w-4 h-4 text-neon-400" />
                </span>
                <h2 className="text-xl font-bold text-white">Runs près de toi</h2>
              </div>
              <Link
                href="/sessions"
                className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {nearbyRuns.map((session) => (
                <button
                  key={session.id}
                  onClick={() => openSessionPanel(session.id)}
                  className="group bg-dark-800/60 rounded-2xl overflow-hidden card-hover hover:shadow-lg border border-white/8 hover:border-neon-500/25 transition-colors text-left"
                >
                  <div className="flex items-stretch">
                    <div className="relative w-20 flex-shrink-0">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${getSessionCover(session)}')` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-dark-800/40" />
                      <div className="absolute bottom-2 left-2">
                        <span className={`inline-flex items-center px-2 py-0.5 ${getSessionTypeLabel(session.session_type).color} text-white text-[10px] font-semibold rounded`}>
                          {getSessionTypeLabel(session.session_type).label}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 px-5 py-4 flex items-center gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-dark-300">{formatDate(session.start_time)}</span>
                          <span className="text-xs text-dark-500">•</span>
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(session.start_time)}
                          </span>
                        </div>
                        <h3 className="font-bold text-white mb-1.5 group-hover:text-neon-400 transition-colors truncate">
                          {session.title}
                        </h3>
                        <div className="flex items-center flex-wrap gap-3 text-xs text-dark-300">
                          {session.distance_km && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {session.distance_km} km
                            </span>
                          )}
                          {session.target_pace && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-neon-400" />
                              {session.target_pace}/km
                            </span>
                          )}
                          {session.location_name && (
                            <span className="flex items-center gap-1 max-w-[160px] truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {session.location_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(session.participants_count || 2, 3))].map((_, i) => (
                              <div
                                key={i}
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i]} border-2 border-dark-800 flex items-center justify-center text-[10px] font-bold text-white`}
                              >
                                {String.fromCharCode(65 + i)}
                              </div>
                            ))}
                            {(session.participants_count || 0) > 3 && (
                              <div className="w-7 h-7 rounded-full bg-dark-700 border-2 border-dark-800 flex items-center justify-center text-[10px] font-semibold text-silver-300">
                                +{(session.participants_count || 0) - 3}
                              </div>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-signal-primary/12 text-signal-primary text-[10px] font-semibold rounded-full border border-signal-primary/25">
                            <Shield className="w-2.5 h-2.5" />
                            Vérifié
                          </span>
                        </div>

                        {(session as SessionWithParticipation).is_participant ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-neon-500/12 text-neon-400 text-sm font-semibold rounded-xl border border-neon-500/25">
                            <CheckCircle className="w-4 h-4" />
                            Inscrit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-neon-500 text-dark-800 text-sm font-semibold rounded-xl group-hover:bg-neon-400 transition-colors">
                            Rejoindre
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* MES SORTIES                                 */}
        {/* ============================================ */}
        <section className="mb-14 section-reveal">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-pink-500/15">
                <Calendar className="w-4 h-4 text-pink-400" />
              </span>
              <h2 className="text-xl font-bold text-white">Mes sorties</h2>
            </div>
            <Link
              href="/mes-sorties"
              className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {mySessions.length === 0 ? (
            <div className="bg-dark-800/60 rounded-2xl border border-white/8 p-8 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Pas encore de sortie prévue</p>
                <p className="text-xs text-dark-400">Rejoins un run ou crée le tien pour voir tes sorties ici</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/sessions"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neon-500/10 hover:bg-neon-500/20 text-neon-400 text-sm font-semibold rounded-xl border border-neon-500/25 transition-colors"
                >
                  Rejoindre un run
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/6 hover:bg-white/10 text-silver-300 text-sm font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => openSessionPanel(session.id)}
                  className="group bg-dark-800/60 rounded-2xl overflow-hidden border border-white/8 hover:border-pink-500/25 card-hover transition-colors text-left"
                >
                  {/* Cover strip */}
                  <div className="relative h-24 w-full">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${getSessionCover(session)}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neon-500/15 text-neon-400 text-[10px] font-semibold rounded-full border border-neon-500/25">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Inscrit
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-3">
                      <span className={`inline-flex px-2 py-0.5 ${getSessionTypeLabel(session.session_type).color} text-white text-[10px] font-semibold rounded`}>
                        {getSessionTypeLabel(session.session_type).label}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="mb-2">
                      <p className="text-[11px] font-semibold text-dark-300 mb-0.5">{formatDate(session.start_time)}</p>
                      <h3 className="font-bold text-white leading-tight truncate group-hover:text-pink-300 transition-colors">
                        {session.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-dark-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.participants_count || 1}
                      </span>
                      {session.distance_km && (
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {session.distance_km} km
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/6 group-hover:bg-white/10 rounded-xl text-xs font-medium text-silver-300 transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </span>
                      <span className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/6 group-hover:bg-pink-500/10 rounded-xl text-xs font-medium text-silver-300 group-hover:text-pink-300 transition-colors">
                        Détails
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* COMMUNITY ACTIVITY + ÉQUIPES                */}
        {/* ============================================ */}
        <div className="flex flex-col lg:flex-row gap-8 mb-14">

          {/* Community Activity */}
          <section className="flex-[6] section-reveal">
            <div className="flex items-center gap-3 mb-6">
              <span className="p-1.5 rounded-lg bg-orange-500/15">
                <Flame className="w-4 h-4 text-orange-400" />
              </span>
              <h2 className="text-xl font-bold text-white">Activité de la communauté</h2>
            </div>

            <div className="bg-dark-800/60 rounded-2xl overflow-hidden border border-white/8">
              <div className="divide-y divide-white/6">
                {feedEvents.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-dark-400">
                    Soyez le premier à créer une sortie !
                  </div>
                ) : feedEvents.map((event) => {
                  const { action, gradient } = getEventLabel(event);
                  const actor = event.actor;
                  const name = actor?.username ?? 'Coureur';
                  return (
                    <div key={event.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/4 transition-colors">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden`}
                      >
                        {actor?.avatar_url
                          ? <img src={actor.avatar_url} alt={name} className="w-full h-full object-cover" />
                          : name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-200 truncate">
                          <strong className="font-semibold text-white">{name}</strong>{' '}
                          <span className="text-dark-300">{action}</span>
                          {event.target_label && (
                            <> <strong className="font-semibold text-silver-300">{event.target_label}</strong></>
                          )}
                        </p>
                        <span className="text-xs text-dark-400">{getEventTimeAgo(event.created_at)}</span>
                      </div>
                      <span className="w-1.5 h-1.5 bg-neon-400/40 rounded-full flex-shrink-0 animate-live-dot" />
                    </div>
                  );
                })}
              </div>
              <Link
                href="/sessions"
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-neon-400 hover:bg-white/4 transition-colors border-t border-white/8"
              >
                Voir toute l'activité
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* Équipes */}
          <section className="flex-[4] section-reveal">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="p-1.5 rounded-lg bg-purple-500/15">
                  <Users className="w-4 h-4 text-purple-400" />
                </span>
                <h2 className="text-xl font-bold text-white">Équipes</h2>
              </div>
              <Link
                href="/teams"
                className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {userTeam ? (
              <Link href="/teams" className="block group h-full">
                <div className="bg-dark-800/60 rounded-2xl p-6 border border-white/8 hover:border-purple-500/25 card-hover transition-colors">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                      {userTeam.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                        {userTeam.name}
                      </h3>
                      <p className="text-sm text-silver-400">{userTeam.members_count} membres</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(userTeam.members_count || 3, 5))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i]} border-2 border-dark-800 flex items-center justify-center text-[9px] font-bold text-white`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-silver-500 ml-1">Membres actifs</span>
                  </div>

                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
                    Voir l'activité <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ) : (
              <Link href="/teams" className="block group">
                <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 flex flex-col justify-center items-center text-center card-hover hover:shadow-xl hover:shadow-pink-500/20">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Rejoins une équipe</h3>
                  <p className="text-sm text-white/80 mb-4">Progresse et partage tes runs en groupe</p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-pink-600 font-semibold rounded-xl group-hover:bg-pink-50 transition-colors">
                    Découvrir <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            )}
          </section>
        </div>

        {/* ============================================ */}
        {/* AMIS                                        */}
        {/* ============================================ */}
        <section className="mb-14 section-reveal">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-blue-500/15">
                <UserCheck className="w-4 h-4 text-blue-400" />
              </span>
              <h2 className="text-xl font-bold text-white">
                Amis
                {friends.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-dark-400">{friends.length}</span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Link
                  href="/friends"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/15 text-pink-400 text-xs font-semibold rounded-full border border-pink-500/25 hover:bg-pink-500/25 transition-colors"
                >
                  <span className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                  demande{pendingCount > 1 ? 's' : ''}
                </Link>
              )}
              <Link
                href="/friends"
                className="text-sm font-semibold text-neon-400 hover:text-neon-300 transition-colors flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {friends.length === 0 ? (
            <div className="bg-dark-800/60 rounded-2xl border border-white/8 p-8 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Pas encore d'amis</p>
                <p className="text-xs text-dark-400">Trouve des coureurs compatibles avec ton niveau et cours ensemble</p>
              </div>
              <Link
                href="/friends"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-xl border border-blue-500/25 transition-colors"
              >
                Trouver des coureurs
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {friends.slice(0, 8).map((friend, i) => (
                <Link
                  key={friend.id}
                  href={`/profil/${friend.username}`}
                  className="group bg-dark-800/60 rounded-2xl p-4 border border-white/8 hover:border-blue-500/25 card-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.username}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}
                      >
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
                        {friend.username}
                      </p>
                      {friend.home_city && (
                        <p className="text-[10px] text-dark-400 truncate flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          {friend.home_city}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/6 text-silver-400 text-[10px] rounded-lg">
                      <Zap className="w-2.5 h-2.5 text-neon-400" />
                      Niv. {friend.running_level}
                    </span>
                    {friend.phone_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-signal-primary/10 text-signal-primary text-[10px] rounded-lg border border-signal-primary/20">
                        <Shield className="w-2.5 h-2.5" />
                        Vérifié
                      </span>
                    )}
                  </div>
                </Link>
              ))}

              {/* "Voir plus" card if more than 8 */}
              {friends.length > 8 && (
                <Link
                  href="/friends"
                  className="group bg-dark-800/40 rounded-2xl p-4 border border-white/6 hover:border-blue-500/25 card-hover transition-colors flex flex-col items-center justify-center gap-2 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
                    <span className="text-sm font-bold text-silver-300">+{friends.length - 8}</span>
                  </div>
                  <p className="text-xs text-dark-400 group-hover:text-blue-400 transition-colors">Voir tous</p>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* SAFETY STRIP                                */}
        {/* ============================================ */}
        <section className="section-reveal">
          <div className="flex items-center gap-4 px-6 py-4 bg-signal-primary/6 border border-signal-primary/20 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-signal-primary/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-signal-primary" />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="text-sm font-semibold text-signal-primary">Mode sécurité actif</span>
              <span className="text-sm text-dark-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-signal-primary/60" />
                {verifiedCount} profil{verifiedCount > 1 ? 's' : ''} vérifié{verifiedCount > 1 ? 's' : ''} dans tes runs
              </span>
            </div>
          </div>
        </section>

      </div>

      {/* ============================================ */}
      {/* FAB                                         */}
      {/* ============================================ */}
      <div className="fixed bottom-6 right-6 z-30">
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
          <Plus
            className="w-6 h-6 transition-transform duration-200"
            style={{ transform: fabHovered ? 'rotate(90deg)' : 'rotate(0)' }}
          />
          <span className="hidden sm:inline">Créer une sortie</span>
        </button>
      </div>

      {/* Overlays */}
      <SessionPanel
        sessionId={selectedSessionId}
        isOpen={isSessionPanelOpen}
        onClose={closeSessionPanel}
      />
      <CreateWizardModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
      />
    </div>
  );
}
