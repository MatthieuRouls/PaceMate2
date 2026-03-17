'use client';

import Image from 'next/image';
import type { DiscoverySession } from '@/lib/actions';
import { MapPin, Clock, Users, Shield, Zap, ChevronRight, Flame, Sparkles } from 'lucide-react';

// ─── Session visual config ────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  intervals: { label: 'Fractionné',    color: 'bg-orange-500/90' },
  long_run:  { label: 'Sortie longue', color: 'bg-purple-500/90' },
  casual:    { label: 'Détente',       color: 'bg-teal-500/85'   },
  recovery:  { label: 'Récup.',        color: 'bg-sky-500/90'    },
  tempo:     { label: 'Tempo',         color: 'bg-pink-500/90'   },
  default:   { label: 'Run',           color: 'bg-slate-500/90'  },
};

const COVERS: Record<string, string> = {
  intervals: '/fractionne-1.jpeg',
  long_run:  '/long-run-1.jpeg',
  casual:    '/easy-run-1.jpeg',
  recovery:  '/recovery-1.jpeg',
  tempo:     '/tempo-1.jpg',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countdown(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) label = 'Auj.';
  else if (d.toDateString() === tomorrow.toDateString()) label = 'Dem.';
  else label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${label} · ${time}`;
}

/**
 * Rough match percentage from discovery score (max ~80 points without bonuses).
 * Only displayed when meaningful (≥ 40%).
 */
function scoreToMatchPct(score: number): number | null {
  const pct = Math.min(99, Math.round((score / 80) * 100));
  return pct >= 40 ? pct : null;
}

// ─── Mini avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({ src, name, index }: { src?: string; name: string; index: number }) {
  return (
    <div
      className="w-6 h-6 rounded-full bg-white/10 ring-2 ring-dark-800 overflow-hidden flex-shrink-0 relative"
      style={{ zIndex: 10 - index, marginLeft: index === 0 ? 0 : -6 }}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="24px" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/60">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  session: DiscoverySession;
  onClick: () => void;
}

export default function DiscoveryCard({ session, onClick }: Props) {
  const type       = session.session_type || 'default';
  const typeConfig = TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
  const cover      = COVERS[type] ?? '/easy-run-1.jpeg';
  const count      = session.participants_count ?? 0;
  const spotsLeft  = session.max_participants - count;
  const fillPct    = Math.round((count / Math.max(session.max_participants, 1)) * 100);
  const cd         = countdown(session.start_time);
  const matchPct   = scoreToMatchPct(session.score);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creator      = session.creator as any;
  // Creator counts as first "participant" if present
  const displayAvatars = creator ? [creator] : [];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="group flex-shrink-0 w-[272px] text-left bg-dark-800 border border-white/10 rounded-2xl overflow-hidden hover:border-neon-500/40 hover:shadow-xl hover:shadow-neon-500/5 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-500/50 cursor-pointer"
    >
      {/* Cover image */}
      <div className="relative h-[140px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url('${cover}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/20 to-transparent" />

        {/* Top-left: type badge + urgent badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          {session.isStartingSoon && cd && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/90 rounded-full text-[10px] font-bold text-white">
              <Flame className="w-2.5 h-2.5" />
              {cd}
            </span>
          )}
          {session.isFillingUp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-500/90 rounded-full text-[10px] font-bold text-white">
              <Users className="w-2.5 h-2.5" />
              Se remplit
            </span>
          )}
        </div>

        {/* Top-right: match score (takes priority) or recommended badge */}
        <div className="absolute top-2.5 right-2.5">
          {matchPct !== null ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-500/20 border border-neon-500/50 rounded-full text-[10px] font-bold text-neon-400">
              <Sparkles className="w-2.5 h-2.5" />
              {matchPct}%
            </span>
          ) : session.score >= 55 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-500/20 border border-neon-500/50 rounded-full text-[10px] font-bold text-neon-400">
              <Zap className="w-2.5 h-2.5" />
              Pour toi
            </span>
          ) : null}
        </div>

        {/* Bottom-left: datetime */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-dark-900/80 backdrop-blur-sm rounded-full text-[11px] text-white font-medium">
            <Clock className="w-3 h-3 text-neon-400" />
            {formatTime(session.start_time)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
          {session.title}
        </h3>

        {/* Location + distance from user */}
        <div className="flex items-center gap-1.5 text-[11px] text-dark-200">
          <MapPin className="w-3 h-3 text-dark-300 shrink-0" />
          <span className="truncate flex-1">{session.location_name}</span>
          {session.distance_from_user != null && (
            <span className="text-neon-400 font-semibold shrink-0">{session.distance_from_user} km</span>
          )}
        </div>

        {/* Stats chips: distance + pace */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/8 rounded-lg text-dark-100 font-medium">
            📏 {session.distance_km} km
          </span>
          {session.target_pace && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/8 rounded-lg text-dark-100 font-medium">
              ⚡ {session.target_pace}/km
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Host row + participant avatar stack */}
        <div className="flex items-center gap-2">
          {/* Host avatar */}
          <div className="relative w-7 h-7 rounded-full bg-white/10 shrink-0 overflow-hidden">
            {creator?.avatar_url ? (
              <Image src={creator.avatar_url} alt={creator.username ?? ''} fill className="object-cover" sizes="28px" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-dark-200">
                {(creator?.username ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            {session.hostTrustLevel !== 'basic' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-neon-500 rounded-full border border-dark-800 flex items-center justify-center">
                <Shield className="w-2 h-2 text-dark-800" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white text-[11px] font-semibold truncate">
              {creator?.username ?? 'Organisateur'}
            </p>
            {session.hostTrustLevel === 'phone' && (
              <p className="text-neon-400 text-[10px] font-medium">✓ Vérifié</p>
            )}
          </div>

          {/* Participant avatars (host only, since DiscoverySession has no participant profiles) */}
          <div className="flex items-center shrink-0">
            {displayAvatars.slice(0, 3).map((a, i) => (
              <MiniAvatar key={a.id ?? i} src={a.avatar_url} name={a.username ?? '?'} index={i} />
            ))}
            {count > displayAvatars.length && (
              <div
                className="w-6 h-6 rounded-full bg-white/10 ring-2 ring-dark-800 flex items-center justify-center"
                style={{ zIndex: 0, marginLeft: -6 }}
              >
                <span className="text-[8px] font-bold text-white/50">+{count - displayAvatars.length}</span>
              </div>
            )}
          </div>

          {(session.hasCoRunner || session.isTeamRun) && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neon-500/10 border border-neon-500/30 text-neon-400 rounded-full font-medium shrink-0">
              {session.isTeamRun ? 'Équipe' : 'Connu'}
            </span>
          )}
        </div>

        {/* Participants progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-dark-200">
              <Users className="w-3 h-3" />
              {count}/{session.max_participants} ·{' '}
              <span className={spotsLeft === 0 ? 'text-red-400' : fillPct >= 70 ? 'text-orange-400' : 'text-dark-300'}>
                {spotsLeft === 0 ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
              </span>
            </span>
          </div>
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-orange-400' : 'bg-neon-500'
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            spotsLeft === 0
              ? 'bg-white/8 text-dark-400 cursor-not-allowed'
              : 'bg-neon-500 text-dark-800 group-hover:bg-neon-400 active:scale-95'
          }`}
        >
          {spotsLeft === 0 ? 'Complet' : (
            <>Rejoindre <ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </div>
      </div>
    </div>
  );
}
