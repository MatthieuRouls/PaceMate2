'use client';

import { Plus } from 'lucide-react';

interface HeroSectionProps {
  userName?: string;
}

export function HeroSection({ userName = 'Thomas' }: HeroSectionProps) {
  return (
    <section className="flex items-center justify-between py-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block"
            style={{ boxShadow: '0 0 6px #22C55E' }}
          />
          <span className="text-[#94A3B8] text-xs font-medium tracking-[0.18em] uppercase">
            Tableau de bord
          </span>
        </div>
        <h1 className="text-[#F8FAFC] text-2xl font-semibold leading-tight">
          Salut{' '}
          <span className="text-[#22C55E] font-bold">{userName}</span>
          <span className="text-[#94A3B8] font-normal">, prêt pour ta sortie&nbsp;?</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 select-none"
          style={{
            background: '#F43F5E',
            boxShadow: '0 4px 20px rgba(244, 63, 94, 0.3)',
          }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Créer une sortie
        </button>

        <button
          className="relative group"
          aria-label="Profil utilisateur"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#050A08] transition-all duration-200 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16a34a 100%)' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050A08] bg-[#22C55E] block"
            title="En ligne"
          />
        </button>
      </div>
    </section>
  );
}
