'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Zap } from 'lucide-react';

// --- Sparkline SVG data (weekly distances Mon→Sun in km) ---
const WEEKLY_DATA = [8.2, 0, 12.5, 5.8, 6.3, 15.4, 0];
const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const SPARK_MAX = Math.max(...WEEKLY_DATA);
const SPARK_W = 280;
const SPARK_H = 56;
const SPARK_PAD_X = 8;
const SPARK_PAD_Y = 6;

function buildSparkline() {
  const usableW = SPARK_W - 2 * SPARK_PAD_X;
  const usableH = SPARK_H - 2 * SPARK_PAD_Y;
  const xStep = usableW / (WEEKLY_DATA.length - 1);

  const pts = WEEKLY_DATA.map((v, i) => ({
    x: SPARK_PAD_X + i * xStep,
    y: SPARK_PAD_Y + (1 - v / SPARK_MAX) * usableH,
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpX = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${cpX},${prev.y.toFixed(1)} ${cpX},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, '');

  const first = pts[0];
  const last = pts[pts.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(1)},${SPARK_H} L ${first.x.toFixed(1)},${SPARK_H} Z`;

  return { linePath, areaPath };
}

const { linePath: SPARK_LINE, areaPath: SPARK_AREA } = buildSparkline();

// --- Circular ring constants ---
const RING_R = 36;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 226.2
const MONTHLY_KM = 127.4;
const MONTHLY_GOAL = 160;
const RING_PROGRESS = MONTHLY_KM / MONTHLY_GOAL;

// --- Skeleton placeholder ---
function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/5 overflow-hidden animate-pulse ${className}`}
      style={{ background: '#0B120F' }}
    >
      <div className="p-5 space-y-3">
        <div className="h-2.5 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-9 w-28 rounded-lg bg-white/[0.08]" />
        <div className="h-2 w-full rounded-full bg-white/[0.04]" />
        <div className="h-2 w-3/4 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function BentoStats() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (!loaded) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <SkeletonCard className="col-span-2" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">

      {/* ── Widget 1 : Distance semaine (wide) ─────────────────── */}
      <div
        className="col-span-2 rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-[#22C55E]/20 transition-all duration-300"
        style={{ background: '#0B120F' }}
      >
        {/* Sparkline background illustration */}
        <div className="absolute inset-0 flex items-end pointer-events-none" aria-hidden>
          <svg
            width={SPARK_W}
            height={SPARK_H}
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            className="w-full opacity-25"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={SPARK_AREA} fill="url(#sg)" />
            <path
              d={SPARK_LINE}
              fill="none"
              stroke="#22C55E"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative z-10">
          <p className="text-[#94A3B8] text-[10px] font-medium tracking-[0.18em] uppercase mb-2">
            Distance · Semaine
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[#F8FAFC] text-5xl font-bold font-mono tracking-tight leading-none">
              42.7
            </span>
            <span className="text-[#94A3B8] text-xl font-medium">km</span>
          </div>

          <div className="flex items-center gap-1.5 mt-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-[#22C55E] text-xs font-semibold">+12 %</span>
            <span className="text-[#94A3B8] text-xs">vs semaine dernière</span>
          </div>

          {/* Day bars */}
          <div className="flex items-end gap-1.5">
            {WEEKLY_DATA.map((v, i) => (
              <div key={WEEK_LABELS[i] + i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(3, (v / SPARK_MAX) * 32)}px`,
                    background:
                      v > 0
                        ? `rgba(34, 197, 94, ${0.35 + (v / SPARK_MAX) * 0.65})`
                        : 'rgba(255,255,255,0.05)',
                  }}
                />
                <span className="text-[#94A3B8] text-[9px] font-medium">{WEEK_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Widget 2 : Objectif mensuel (ring) ─────────────────── */}
      <div
        className="rounded-2xl border border-white/5 p-5 flex flex-col items-center justify-center hover:border-[#22C55E]/20 transition-all duration-300"
        style={{ background: '#0B120F' }}
      >
        <p className="text-[#94A3B8] text-[10px] font-medium tracking-[0.18em] uppercase mb-3">
          Objectif Mois
        </p>

        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
            {/* Track */}
            <circle
              cx="50" cy="50" r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
            />
            {/* Progress */}
            <circle
              cx="50" cy="50" r={RING_R}
              fill="none"
              stroke="#22C55E"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRC}`}
              strokeDashoffset={`${RING_CIRC * (1 - RING_PROGRESS)}`}
              style={{
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
                filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.6))',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[#F8FAFC] text-xl font-bold font-mono leading-none">
              {Math.round(RING_PROGRESS * 100)}%
            </span>
            <span className="text-[#94A3B8] text-[9px] mt-0.5 text-center leading-tight">
              de l'objectif
            </span>
          </div>
        </div>

        <div className="text-center mt-2 space-y-0.5">
          <p className="text-[#F8FAFC] text-sm font-semibold font-mono">
            {MONTHLY_KM} <span className="text-[#94A3B8] font-normal">/ {MONTHLY_GOAL} km</span>
          </p>
          <p className="text-[#94A3B8] text-[10px]">
            {(MONTHLY_GOAL - MONTHLY_KM).toFixed(1)} km restants
          </p>
        </div>
      </div>

      {/* ── Widget 3 : Allure moyenne + zones ──────────────────── */}
      <div
        className="rounded-2xl border border-white/5 p-5 hover:border-[#22C55E]/20 transition-all duration-300"
        style={{ background: '#0B120F' }}
      >
        <p className="text-[#94A3B8] text-[10px] font-medium tracking-[0.18em] uppercase mb-2">
          Allure Moy.
        </p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-[#F8FAFC] text-3xl font-bold font-mono tracking-tight">5:23</span>
          <span className="text-[#94A3B8] text-sm">min/km</span>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
          <span className="text-[#22C55E] text-xs font-semibold">−0:08</span>
          <span className="text-[#94A3B8] text-xs">vs mois dernier</span>
        </div>

        {/* Zones cardio */}
        <div className="space-y-2">
          {[
            { label: 'Zone 2', pct: 65, color: '#22C55E' },
            { label: 'Zone 3', pct: 25, color: '#fbbf24' },
            { label: 'Zone 4+', pct: 10, color: '#F43F5E' },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-2">
              <span className="text-[#94A3B8] text-[10px] w-11 flex-shrink-0">{z.label}</span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${z.pct}%`, background: z.color }}
                />
              </div>
              <span className="text-[#94A3B8] text-[10px] w-7 text-right flex-shrink-0">
                {z.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
