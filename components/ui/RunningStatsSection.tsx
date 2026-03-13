'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getRunnerStats } from '@/lib/stats-actions';
import type { RunnerStats, BadgeType } from '@/lib/types';
import {
  Activity, Users, Shield, Calendar, Trophy, Zap,
  Star, Award, TrendingUp, Route, Clock, ChevronRight,
} from 'lucide-react';

// ─── Badge metadata ──────────────────────────────────────────────────────────

const BADGE_META: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  first_run:         { label: 'Premier run',            emoji: '🏃', description: 'Complète ton premier run' },
  social_runner:     { label: 'Coureur social',          emoji: '👥', description: 'Cours avec 5 personnes' },
  community_builder: { label: 'Bâtisseur de communauté',emoji: '🌍', description: 'Rencontre 10 coureurs' },
  reliable_runner:   { label: 'Coureur fiable',          emoji: '✅', description: 'Fiabilité ≥90 % (5 runs min.)' },
  team_player:       { label: 'Esprit d\'équipe',        emoji: '🤝', description: 'Contribue à 5 runs en équipe' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

function reliabilityColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[#C8FF00]/70">{icon}</div>
      <span className="text-white font-bold text-lg leading-none">{value}</span>
      <span className="text-gray-400 text-xs">{label}</span>
    </div>
  );
}

interface BadgeCardProps {
  type: BadgeType;
  earned: boolean;
  current: number;
  target: number;
}

function BadgeCard({ type, earned, current, target }: BadgeCardProps) {
  const meta = BADGE_META[type];
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
      earned
        ? 'border-[#C8FF00]/40 bg-[#C8FF00]/5'
        : 'border-white/10 bg-white/5 opacity-60'
    }`}>
      <span className={`text-2xl ${earned ? '' : 'grayscale opacity-50'}`}>{meta.emoji}</span>
      <span className="text-white text-xs font-semibold text-center leading-tight">{meta.label}</span>
      {!earned && (
        <>
          <span className="text-gray-400 text-[10px] text-center leading-tight">{meta.description}</span>
          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-1">
            <div
              className="bg-[#C8FF00]/70 h-1 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-gray-500 text-[10px]">{current}/{target}</span>
        </>
      )}
      {earned && (
        <span className="absolute top-1.5 right-1.5 text-[#C8FF00] text-xs">✓</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RunningStatsSection() {
  const [stats, setStats] = useState<RunnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRunnerStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/40 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const earnedTypes = new Set(stats.badges.map((b) => b.badge_type));

  return (
    <div className="space-y-6">
      {/* ── Runs card ─────────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#C8FF00]" />
          <h3 className="text-white font-semibold">Tes runs</h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatChip
            icon={<TrendingUp size={16} />}
            value={stats.runsCompleted}
            label="Complétés"
          />
          <StatChip
            icon={<Star size={16} />}
            value={stats.runsHosted}
            label="Organisés"
          />
          <StatChip
            icon={<Route size={16} />}
            value={`${stats.totalKm.toFixed(1)} km`}
            label="Distance"
          />
          <StatChip
            icon={<Clock size={16} />}
            value={formatMinutes(stats.totalRunTimeMinutes)}
            label="Temps"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Reliability */}
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <Shield size={20} className="text-[#C8FF00]/70 shrink-0" />
            <div>
              <p className="text-gray-400 text-xs">Fiabilité</p>
              <p className={`font-bold text-lg leading-none ${reliabilityColor(stats.reliabilityScore)}`}>
                {stats.reliabilityScore.toFixed(0)}%
              </p>
            </div>
          </div>
          {/* Active weeks */}
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <Calendar size={20} className="text-[#C8FF00]/70 shrink-0" />
            <div>
              <p className="text-gray-400 text-xs">Semaines actives</p>
              <p className="text-white font-bold text-lg leading-none">{stats.activeWeeks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── People card ───────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#C8FF00]" />
            <h3 className="text-white font-semibold">Ta communauté</h3>
          </div>
          <span className="text-[#C8FF00] font-bold text-lg">{stats.peopleMet}</span>
        </div>

        <p className="text-gray-400 text-sm">
          {stats.peopleMet === 0
            ? 'Rejoins une sortie pour rencontrer des coureurs !'
            : `Tu as couru avec ${stats.peopleMet} personne${stats.peopleMet > 1 ? 's' : ''} différente${stats.peopleMet > 1 ? 's' : ''}.`}
        </p>

        {stats.recentConnections.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Vos compagnons de route</p>
            {stats.recentConnections.map((conn) => (
              <div key={conn.userId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                  {conn.avatarUrl ? (
                    <Image
                      src={conn.avatarUrl}
                      alt={conn.username}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                      {conn.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-white text-sm flex-1">{conn.username}</span>
                <span className="text-gray-400 text-xs">{conn.runsTogether} run{conn.runsTogether > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Team card (only if in team) ────────────────────────────────────── */}
      {stats.teamStats && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#C8FF00]" />
            <h3 className="text-white font-semibold">{stats.teamStats.teamName}</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatChip
              icon={<Zap size={16} />}
              value={stats.teamStats.runsCompleted}
              label="Runs équipe"
            />
            <StatChip
              icon={<Route size={16} />}
              value={`${stats.teamStats.totalKm.toFixed(0)} km`}
              label="Distance"
            />
            <StatChip
              icon={<Users size={16} />}
              value={stats.teamStats.activeMembers}
              label="Actifs/30j"
            />
          </div>
        </div>
      )}

      {/* ── Badges ───────────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[#C8FF00]" />
          <h3 className="text-white font-semibold">Badges</h3>
          {stats.badges.length > 0 && (
            <span className="ml-auto text-[#C8FF00] text-sm font-bold">
              {stats.badges.length}/{Object.keys(BADGE_META).length}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(BADGE_META) as BadgeType[]).map((type) => (
            <BadgeCard
              key={type}
              type={type}
              earned={earnedTypes.has(type)}
              current={stats.badgeProgress[type]?.current ?? 0}
              target={stats.badgeProgress[type]?.target ?? 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
