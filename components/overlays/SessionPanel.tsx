'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Session } from '@/lib/types';
import { getSessionDetails, joinSession, leaveSession } from '@/lib/actions';
import { getSessionConversation } from '@/lib/chat-actions';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChat } from '@/components/chat/ChatProvider';
import GlassOverlay from './GlassOverlay';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  MapPin, Clock, Calendar, Users, Activity,
  Share2, MessageCircle, LogOut,
  Navigation, Check, Star, Shield, Zap, ChevronRight,
  AlertCircle, Sparkles,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionPanelProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Participant {
  id: string;
  username: string;
  avatar_url?: string;
}

interface EnrichedCreator {
  id: string;
  username: string;
  running_level?: number;
  avatar_url?: string;
  runs_hosted?: number;
  reliability_score?: number;
  phone_verified?: boolean;
}

// ─── Visual config ────────────────────────────────────────────────────────────

const SESSION_COVERS: Record<string, string[]> = {
  intervals: ['/fractionne-1.jpeg'],
  long_run:  ['/long-run-1.jpeg'],
  casual:    ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
  recovery:  ['/recovery-1.jpeg'],
  tempo:     ['/tempo-1.jpg'],
  default:   ['/easy-run-1.jpeg', '/easy-run-2.jpeg'],
};

const TYPE_LABELS: Record<string, string> = {
  intervals: 'Fractionné',
  long_run:  'Sortie longue',
  casual:    'Détente',
  recovery:  'Récupération',
  tempo:     'Tempo',
};

const getSessionCover = (session: Session): string => {
  const covers = SESSION_COVERS[session.session_type || 'default'] || SESSION_COVERS.default;
  return covers[session.id.charCodeAt(0) % covers.length];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePaceSec(pace: string): number {
  const [m, s] = pace.split(':').map(Number);
  return m * 60 + (s || 0);
}

/** 0-100 match score based on pace delta */
function computeMatchScore(userPace?: string | null, sessionPace?: string | null): number | null {
  if (!userPace || !sessionPace) return null;
  const delta = Math.abs(parsePaceSec(userPace) - parsePaceSec(sessionPace));
  if (delta <= 15)  return 97;
  if (delta <= 30)  return 92;
  if (delta <= 60)  return 82;
  if (delta <= 90)  return 68;
  if (delta <= 120) return 52;
  return 30;
}

/** reliability_score (0-100) → "4.8" style string */
function reliabilityToRating(score?: number): string | null {
  if (!score || score < 10) return null;
  return (3 + (score / 100) * 2).toFixed(1);
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let dayLabel: string;
  if (d.toDateString() === today.toDateString()) dayLabel = "Aujourd'hui";
  else if (d.toDateString() === tomorrow.toDateString()) dayLabel = 'Demain';
  else dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return { day: dayLabel, time };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  src, name, size = 8, ring = false,
}: { src?: string; name: string; size?: number; ring?: boolean }) {
  const cls = `w-${size} h-${size} rounded-full bg-white/10 overflow-hidden flex-shrink-0 ${ring ? 'ring-2 ring-dark-800' : ''}`;
  return (
    <div className={cls}>
      {src ? (
        <Image src={src} alt={name} width={size * 4} height={size * 4} className="object-cover w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/60 font-bold" style={{ fontSize: size * 1.5 }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-white/40">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="font-bold text-white text-sm leading-tight">{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SessionPanel({ sessionId, isOpen, onClose }: SessionPanelProps) {
  const { user, profile } = useAuth();
  const { openChat } = useChat();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [localIsParticipant, setLocalIsParticipant] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Load session data
  useEffect(() => {
    if (!sessionId || !isOpen) return;
    setLoading(true);
    setJoinSuccess(false);
    setJoinError(null);
    getSessionDetails(sessionId).then((data: any) => {
      if (data) {
        setSession(data);
        const parts: Participant[] = data.participants || [];
        setParticipants(parts);
        setLocalCount(parts.length);
        setLocalIsParticipant(parts.some((p: any) => p.id === user?.id));
      }
    }).finally(() => setLoading(false));
  }, [sessionId, isOpen, user?.id]);

  const handleJoin = useCallback(async () => {
    if (!sessionId || localIsParticipant || joining) return;
    setJoining(true);
    setJoinError(null);

    // Optimistic update
    setLocalIsParticipant(true);
    setLocalCount(c => c + 1);
    setJoinSuccess(true);

    try {
      const result = await joinSession(sessionId);
      if (!result.success) {
        // Revert
        setLocalIsParticipant(false);
        setLocalCount(c => c - 1);
        setJoinSuccess(false);
        setJoinError(result.error || "Impossible de rejoindre cette sortie");
      } else {
        // Silently refresh in background for avatars
        getSessionDetails(sessionId).then((data: any) => {
          if (data) {
            setSession(data);
            setParticipants(data.participants || []);
          }
        });
      }
    } catch {
      setLocalIsParticipant(false);
      setLocalCount(c => c - 1);
      setJoinSuccess(false);
      setJoinError("Erreur de connexion");
    } finally {
      setJoining(false);
    }
  }, [sessionId, localIsParticipant, joining]);

  const handleLeave = useCallback(async () => {
    if (!sessionId || !localIsParticipant || joining) return;
    setJoining(true);

    // Optimistic
    setLocalIsParticipant(false);
    setLocalCount(c => Math.max(0, c - 1));
    setJoinSuccess(false);

    try {
      await leaveSession(sessionId);
      const data: any = await getSessionDetails(sessionId);
      if (data) {
        setSession(data);
        setParticipants(data.participants || []);
      }
    } catch {
      // Revert on error
      setLocalIsParticipant(true);
      setLocalCount(c => c + 1);
    } finally {
      setJoining(false);
    }
  }, [sessionId, localIsParticipant, joining]);

  const handleOpenChat = useCallback(async () => {
    if (!sessionId) return;
    setChatLoading(true);
    try {
      const result = await getSessionConversation(sessionId);
      if (result.success && result.conversation) {
        openChat(result.conversation.id);
        onClose();
      }
    } finally {
      setChatLoading(false);
    }
  }, [sessionId, openChat, onClose]);

  const handleShare = useCallback(async () => {
    if (!session) return;
    const url = `${window.location.origin}/sessions/${session.id}`;
    if (navigator.share) {
      await navigator.share({ title: session.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [session]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const creator = session ? (session as any).creator as EnrichedCreator : null;
  const spotsLeft = session ? session.max_participants - localCount : 0;
  const fillPct   = session ? Math.round((localCount / Math.max(session.max_participants, 1)) * 100) : 0;
  const isFull    = spotsLeft <= 0;
  const matchScore = computeMatchScore(profile?.calculated_avg_pace, session?.target_pace);
  const hostRating = reliabilityToRating(creator?.reliability_score);

  const safetyTags: string[] = [];
  if (creator?.phone_verified)                     safetyTags.push('✓ Vérifié');
  if (session && session.max_participants <= 6)     safetyTags.push('👥 Petit groupe');
  if ((creator?.reliability_score ?? 0) >= 80)     safetyTags.push('🛡️ Fiable');
  if (!session?.walk_breaks_ok)                    safetyTags.push('🏃 Run continu');

  const displayedAvatars = participants.slice(0, 3);
  const extraCount = Math.max(0, localCount - 3);
  const { day: dayLabel, time: timeLabel } = session
    ? formatDateTime(session.start_time)
    : { day: '', time: '' };

  return (
    <GlassOverlay
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      width="max-w-md"
      showBackButton
      showCloseButton={false}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : session ? (
        <div className="flex flex-col h-full bg-dark-800">

          {/* ── Hero ── */}
          <div className="relative h-44 flex-shrink-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center scale-105"
              style={{ backgroundImage: `url('${getSessionCover(session)}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/40 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-900/70 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/15">
                <Activity className="w-3 h-3 text-neon-400" />
                {TYPE_LABELS[session.session_type || ''] || 'Course'}
              </span>
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-dark-900/70 backdrop-blur-sm rounded-full border border-white/15 text-white/70 hover:text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Title */}
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-xl font-black text-white drop-shadow-lg leading-tight">{session.title}</h1>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Compatibility score banner ── */}
            {matchScore !== null && matchScore >= 50 && (
              <div className={`mx-4 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 border ${
                matchScore >= 85
                  ? 'bg-neon-500/10 border-neon-500/25 text-neon-400'
                  : 'bg-white/5 border-white/10 text-white/70'
              }`}>
                <Sparkles className={`w-4 h-4 flex-shrink-0 ${matchScore >= 85 ? 'text-neon-400' : 'text-white/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">
                    {matchScore}% de compatibilité avec ton allure
                  </p>
                  <p className="text-[11px] opacity-60 mt-0.5">Basé sur ta vitesse moyenne</p>
                </div>
                <span className={`text-xl font-black tabular-nums ${matchScore >= 85 ? 'text-neon-400' : 'text-white/60'}`}>
                  {matchScore}%
                </span>
              </div>
            )}

            <div className="px-4 pb-6 space-y-5 mt-4">

              {/* ── Quick stats 2×2 grid ── */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Date"
                  value={dayLabel}
                />
                <StatCard
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Heure"
                  value={timeLabel}
                />
                <StatCard
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="Distance"
                  value={`${session.distance_km} km`}
                />
                <StatCard
                  icon={<Zap className="w-3.5 h-3.5" />}
                  label="Allure"
                  value={session.target_pace ? `${session.target_pace}/km` : '–'}
                />
              </div>

              {/* ── Location ── */}
              {session.location_name && (
                <div className="flex items-center gap-3 p-3.5 bg-white/5 border border-white/8 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-neon-500/15 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-neon-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{session.location_name}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neon-400 font-medium flex items-center gap-1 hover:text-neon-300 transition-colors w-fit"
                    >
                      <Navigation className="w-3 h-3" />
                      Itinéraire
                    </a>
                  </div>
                </div>
              )}

              {/* ── Host section ── */}
              {creator && (
                <div className="p-4 bg-white/5 border border-white/8 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Organisateur</p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar src={creator.avatar_url} name={creator.username ?? '?'} size={12} />
                      {creator.phone_verified && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-neon-500 rounded-full border-2 border-dark-800 flex items-center justify-center">
                          <Shield className="w-2.5 h-2.5 text-dark-800" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{creator.username}</p>
                      {creator.phone_verified && (
                        <p className="text-xs text-neon-400 font-medium">Téléphone vérifié</p>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-3 shrink-0">
                      {hostRating && (
                        <div className="text-center">
                          <div className="flex items-center gap-0.5 text-yellow-400">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            <span className="text-sm font-bold text-white">{hostRating}</span>
                          </div>
                          <p className="text-[10px] text-white/40">Note</p>
                        </div>
                      )}
                      {(creator.runs_hosted ?? 0) > 0 && (
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{creator.runs_hosted}</p>
                          <p className="text-[10px] text-white/40">Sorties</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Participants ── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Participants</p>
                  <span className={`text-xs font-bold ${isFull ? 'text-red-400' : fillPct >= 70 ? 'text-orange-400' : 'text-neon-400'}`}>
                    {isFull ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Avatar stack */}
                  <div className="flex items-center">
                    {displayedAvatars.map((p, i) => (
                      <div
                        key={p.id}
                        className="ring-2 ring-dark-800 rounded-full"
                        style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                      >
                        <Avatar src={p.avatar_url} name={p.username} size={8} />
                      </div>
                    ))}
                    {/* Extra count */}
                    {extraCount > 0 && (
                      <div
                        className="w-8 h-8 rounded-full bg-white/10 border-2 border-dark-800 flex items-center justify-center"
                        style={{ marginLeft: -8 }}
                      >
                        <span className="text-[10px] font-bold text-white/60">+{extraCount}</span>
                      </div>
                    )}
                    {localCount === 0 && (
                      <div className="w-8 h-8 rounded-full bg-white/8 border border-dashed border-white/20 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-white/30" />
                      </div>
                    )}
                  </div>

                  {/* Progress + count */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/50">{localCount}/{session.max_participants} inscrits</span>
                      <span className={`font-bold ${fillPct >= 70 ? 'text-orange-400' : 'text-white/40'}`}>{fillPct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-orange-400' : 'bg-neon-500'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Safety tags ── */}
              {safetyTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {safetyTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 bg-white/6 border border-white/10 rounded-full text-xs text-white/60 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Description ── */}
              {session.description && (
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-white/70 text-sm leading-relaxed">{session.description}</p>
                </div>
              )}

              {/* ── Error state ── */}
              {joinError && (
                <div className="flex items-center gap-2.5 p-3 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fadeUp">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {joinError}
                </div>
              )}

              {/* ── Post-join confirmation panel ── */}
              {joinSuccess && localIsParticipant && (
                <div className="p-4 bg-neon-500/10 border border-neon-500/25 rounded-2xl space-y-3 animate-fadeUp">
                  <div className="flex items-center gap-2 text-neon-400">
                    <span className="text-xl">🎉</span>
                    <div>
                      <p className="font-bold text-white">T'es dans la course !</p>
                      <p className="text-xs text-neon-400/80">Tu es bien inscrit à cette sortie</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleOpenChat}
                      disabled={chatLoading}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4 text-neon-400" />
                      {chatLoading ? '...' : 'Chat du run'}
                    </button>
                    <a
                      href={`/sessions/${session.id}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-white text-sm font-semibold transition-colors"
                    >
                      <Users className="w-4 h-4 text-neon-400" />
                      Participants
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    </a>
                  </div>
                </div>
              )}

              {/* Bottom padding for footer */}
              <div className="h-2" />
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="flex-shrink-0 p-4 border-t border-white/8 bg-dark-800/95 backdrop-blur-sm space-y-2.5">
            {localIsParticipant ? (
              <div className="flex gap-2.5">
                {/* Joined state */}
                <button
                  disabled
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-neon-500/15 border border-neon-500/30 rounded-xl text-neon-400 font-bold text-sm"
                >
                  <Check className="w-4 h-4" />
                  Inscrit
                </button>
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-white/5 hover:bg-red-900/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl text-white/50 font-semibold text-sm transition-all disabled:opacity-40"
                >
                  <LogOut className="w-4 h-4" />
                  Quitter
                </button>
              </div>
            ) : isFull ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 py-4 bg-white/8 rounded-xl text-white/30 font-bold text-base cursor-not-allowed"
              >
                <Users className="w-5 h-5" />
                Complet
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-4 bg-neon-500 hover:bg-neon-400 active:scale-[0.98] rounded-xl text-dark-800 font-black text-base transition-all shadow-[0_4px_24px_rgba(0,245,122,0.3)] hover:shadow-[0_4px_32px_rgba(0,245,122,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-dark-800/30 border-t-dark-800 rounded-full animate-spin" />
                    En cours...
                  </span>
                ) : (
                  <>Rejoindre cette sortie</>
                )}
              </button>
            )}

            {/* Spots left hint */}
            {!localIsParticipant && !isFull && spotsLeft <= 3 && (
              <p className="text-center text-xs text-orange-400 font-medium animate-fadeUp">
                ⚡ Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} disponible{spotsLeft > 1 ? 's' : ''}
              </p>
            )}
          </div>

        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-white/40">
          Session non trouvée
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp { animation: fadeUp 0.2s ease-out both; }
      `}</style>
    </GlassOverlay>
  );
}
