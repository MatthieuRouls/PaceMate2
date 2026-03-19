'use client';

import { MapPin, Clock, ArrowRight, Mountain, TrendingUp } from 'lucide-react';

// SVG path for the route drawn on the dark map
const ROUTE_PATH =
  'M 38,132 C 60,110 78,118 100,98 C 122,78 140,92 165,76 C 188,62 210,72 232,58 C 254,44 278,62 302,52 C 322,42 340,56 358,48 C 368,44 376,48 384,44';

const RUN_STATS = [
  {
    icon: <Clock className="w-3.5 h-3.5" />,
    value: '07:00',
    label: 'Départ',
  },
  {
    icon: <Mountain className="w-3.5 h-3.5" />,
    value: '+240 m',
    label: 'Dénivelé',
  },
  {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    value: '5:30',
    label: 'Allure cible',
  },
];

const PARTICIPANTS = [
  { initial: 'A', hue: 142 },
  { initial: 'M', hue: 180 },
  { initial: 'L', hue: 220 },
];

export function NextRun() {
  return (
    <div
      className="rounded-2xl border border-white/5 overflow-hidden h-full flex flex-col"
      style={{
        background:
          'linear-gradient(160deg, rgba(11,18,15,0.97) 0%, rgba(20,28,24,0.92) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Dark map area ──────────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: '190px', background: '#020604' }}
      >
        <svg
          viewBox="0 0 420 190"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            {/* Map grid pattern */}
            <pattern id="mg" width="42" height="42" patternUnits="userSpaceOnUse">
              <path
                d="M 42 0 L 0 0 0 42"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
            </pattern>

            {/* Route glow filter */}
            <filter id="rg" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient for bottom fade */}
            <linearGradient id="mapFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020604" stopOpacity="0" />
              <stop offset="100%" stopColor="#0b120f" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Grid */}
          <rect width="420" height="190" fill="url(#mg)" />

          {/* Major horizontal streets */}
          <line x1="0" y1="48"  x2="420" y2="48"  stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          <line x1="0" y1="95"  x2="420" y2="95"  stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <line x1="0" y1="142" x2="420" y2="142" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />

          {/* Major vertical streets */}
          <line x1="105" y1="0" x2="105" y2="190" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="210" y1="0" x2="210" y2="190" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <line x1="315" y1="0" x2="315" y2="190" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          {/* Route glow (wide, low-opacity) */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="#22C55E"
            strokeWidth="10"
            strokeOpacity="0.12"
            strokeLinecap="round"
          />

          {/* Route line */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="#22C55E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#rg)"
          />

          {/* Animated route pulse */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="#22C55E"
            strokeWidth="5"
            strokeOpacity="0"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-opacity"
              values="0;0.3;0"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-width"
              values="5;12;5"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>

          {/* Start marker */}
          <circle cx="38" cy="132" r="5" fill="#22C55E" />
          <circle cx="38" cy="132" r="10" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.4">
            <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* End marker */}
          <circle cx="384" cy="44" r="5" fill="#F43F5E" />
          <circle cx="384" cy="44" r="10" fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.3" />

          {/* Bottom gradient fade */}
          <rect width="420" height="190" fill="url(#mapFade)" />
        </svg>

        {/* Label "Prochain Run" */}
        <div className="absolute top-3 left-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F8FAFC]"
            style={{
              background: 'rgba(5,10,8,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0"
              style={{ boxShadow: '0 0 4px #22C55E' }}
            />
            Prochain Run
          </div>
        </div>

        {/* Distance badge */}
        <div className="absolute bottom-4 right-4">
          <span className="text-[#22C55E] text-sm font-mono font-bold">12.0 km</span>
        </div>
      </div>

      {/* ── Run details ────────────────────────────────────────── */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-[#F8FAFC] text-lg font-semibold leading-tight">
                Course du Lac · Annecy
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                <span className="text-[#94A3B8] text-sm">Lac d'Annecy, Haute-Savoie</span>
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ml-3"
              style={{
                background: 'rgba(34,197,94,0.12)',
                color: '#22C55E',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              Demain
            </span>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {RUN_STATS.map(({ icon, value, label }) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-1.5 text-[#94A3B8] mb-1.5">
                  {icon}
                  <span className="text-[10px] uppercase tracking-wide leading-none">{label}</span>
                </div>
                <span className="text-[#F8FAFC] text-base font-semibold font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: participants + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {PARTICIPANTS.map(({ initial, hue }, i) => (
                <div
                  key={initial}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#050A08] border-2 border-[#0B120F]"
                  style={{
                    background: `hsl(${hue}, 65%, 50%)`,
                    zIndex: PARTICIPANTS.length - i,
                  }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <span className="text-[#94A3B8] text-sm">
              <span className="text-[#F8FAFC] font-semibold">3</span> participants
            </span>
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#050A08] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16a34a 100%)',
              boxShadow: '0 4px 18px rgba(34,197,94,0.28)',
            }}
          >
            Rejoindre
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
