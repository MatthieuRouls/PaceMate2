'use client';

import { HeroSection } from '../components/dashboard/HeroSection';
import { BentoStats } from '../components/dashboard/BentoStats';
import { NextRun } from '../components/dashboard/NextRun';
import { SocialFeed } from '../components/dashboard/SocialFeed';

export default function Dashboard() {
  return (
    <main
      className="min-h-screen"
      style={{
        background: '#050A08',
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      }}
    >
      {/* Top navigation bar */}
      <nav
        className="sticky top-0 z-50 border-b border-white/[0.04]"
        style={{
          background: 'rgba(5, 10, 8, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M13 3L4 14h8l-1 7 9-11h-8l1-7z"
                fill="#22C55E"
                style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.5))' }}
              />
            </svg>
            <span className="text-[#F8FAFC] font-bold text-lg tracking-tight">
              Pace<span className="text-[#22C55E]">Mate</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {['Dashboard', 'Sessions', 'Équipes', 'Classement'].map((item, i) => (
              <button
                key={item}
                className={`text-sm font-medium transition-colors ${
                  i === 0
                    ? 'text-[#22C55E]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              aria-label="Notifications"
            >
              <svg className="w-4.5 h-4.5 text-[#94A3B8]" style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Unread dot */}
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F43F5E] border border-[#050A08]"
                style={{ boxShadow: '0 0 4px rgba(244,63,94,0.6)' }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* 1 ─ Hero */}
        <HeroSection userName="Thomas" />

        {/* 2 ─ Bento Stats */}
        <BentoStats />

        {/* 3 ─ Main content: NextRun (2/3) + SocialFeed sidebar (1/3) */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <NextRun />
          </div>
          <div className="col-span-1">
            <SocialFeed />
          </div>
        </div>

      </div>
    </main>
  );
}
