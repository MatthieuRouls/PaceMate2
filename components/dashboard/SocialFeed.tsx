'use client';

import { ChevronRight, Users, MapPin, Flame } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
interface ActivityChipData {
  avatar: string;
  avatarHue: number;
  name: string;
  action: string;
  distance: string;
  pace: string;
  timeAgo: string;
}

interface TeamData {
  name: string;
  members: number;
  isActive: boolean;
}

interface NearbySessionData {
  name: string;
  date: string;
  spots: number;
}

// ── Mock data ─────────────────────────────────────────────────────
const ACTIVITIES: ActivityChipData[] = [
  { avatar: 'S', avatarHue: 142, name: 'Sophie M.', action: 'a couru', distance: '18.2 km', pace: '5:10/km', timeAgo: '2h' },
  { avatar: 'R', avatarHue: 200, name: 'Romain D.', action: 'a terminé', distance: '10.0 km', pace: '5:45/km', timeAgo: '5h' },
  { avatar: 'J', avatarHue: 270, name: 'Julie T.', action: 'a couru', distance: '22.5 km', pace: '5:02/km', timeAgo: 'Hier' },
  { avatar: 'K', avatarHue: 32, name: 'Kevin B.', action: 'a complété', distance: '5.0 km', pace: '6:20/km', timeAgo: 'Hier' },
];

const TEAMS: TeamData[] = [
  { name: 'Running Club Paris', members: 128, isActive: true },
  { name: 'Marathon Squad', members: 24, isActive: true },
  { name: 'Trail Alpins', members: 45, isActive: false },
];

const NEARBY: NearbySessionData[] = [
  { name: 'Bois de Boulogne', date: 'Demain · 7h00', spots: 3 },
  { name: 'Trail du Dimanche', date: 'Sam. · 8h30', spots: 5 },
];

// ── Sub-components ────────────────────────────────────────────────
function ActivityChip({ avatar, avatarHue, name, action, distance, pace, timeAgo }: ActivityChipData) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#141C18] transition-colors duration-150 cursor-pointer group">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#050A08]"
        style={{ background: `hsl(${avatarHue}, 65%, 48%)` }}
      >
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#F8FAFC] text-xs leading-tight truncate">
          <span className="font-semibold">{name}</span>
          {' '}
          <span className="text-[#94A3B8] font-normal">{action}</span>
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[#22C55E] text-[11px] font-mono font-semibold">{distance}</span>
          <span className="text-[#94A3B8] text-[11px]">·</span>
          <span className="text-[#94A3B8] text-[11px]">{pace}</span>
        </div>
      </div>
      <span className="text-[#94A3B8] text-[10px] flex-shrink-0 group-hover:text-[#F8FAFC] transition-colors">
        {timeAgo}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export function SocialFeed() {
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Streak banner ──────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3"
        style={{ background: '#0B120F' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <Flame className="w-4.5 h-4.5 text-[#fbbf24]" style={{ width: '18px', height: '18px' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#F8FAFC] text-sm font-semibold leading-none">
            8 jours de streak
          </p>
          <p className="text-[#94A3B8] text-xs mt-0.5">Continue sur ta lancée !</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i < 6 ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                boxShadow: i < 6 ? '0 0 4px rgba(251,191,36,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Activity feed ──────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-white/5 overflow-hidden flex-1"
        style={{ background: '#0B120F' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <h3 className="text-[#F8FAFC] text-sm font-semibold">Activité réseau</h3>
          <button className="text-[#94A3B8] hover:text-[#22C55E] text-xs transition-colors">
            Voir tout
          </button>
        </div>
        <div className="px-1 pb-2">
          {ACTIVITIES.map((a, i) => (
            <ActivityChip key={i} {...a} />
          ))}
        </div>
      </div>

      {/* ── Exploration ────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-white/5 overflow-hidden"
        style={{ background: '#0B120F' }}
      >
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[#F8FAFC] text-sm font-semibold">Explorer</h3>
        </div>

        {/* Teams */}
        <div className="px-4 pb-3">
          <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-[0.15em] mb-2">
            Équipes actives
          </p>
          <div className="space-y-1">
            {TEAMS.map((team) => (
              <div
                key={team.name}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#141C18] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.18)',
                    }}
                  >
                    <Users className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#F8FAFC] text-xs font-medium truncate">{team.name}</p>
                    <p className="text-[#94A3B8] text-[10px]">{team.members} membres</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {team.isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
                      style={{ boxShadow: '0 0 4px #22C55E' }}
                    />
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby sessions */}
        <div
          className="px-4 pb-4 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-[0.15em] mb-2">
            Sessions proches
          </p>
          <div className="space-y-1">
            {NEARBY.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#141C18] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(244,63,94,0.1)',
                      border: '1px solid rgba(244,63,94,0.18)',
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#F43F5E]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#F8FAFC] text-xs font-medium truncate">{s.name}</p>
                    <p className="text-[#94A3B8] text-[10px]">{s.date}</p>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0 ml-2"
                  style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E' }}
                >
                  {s.spots} places
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
