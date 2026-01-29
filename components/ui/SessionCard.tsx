'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${dayName} ${day} ${month}`;
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Calculate spots
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-brand-400 hover:shadow-md transition-all">
        {/* Header: Date & Level */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <div className="font-semibold text-slate-900">{formatDate(session.start_time)}</div>
            <div className="text-slate-500">{formatTime(session.start_time)}</div>
          </div>
          <div className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
            Niveau {session.level_required}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {session.title}
        </h3>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Info Grid */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">📍 Lieu</span>
            <span className="font-medium text-slate-900">{session.location_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">📏 Distance</span>
            <span className="font-medium text-slate-900">{session.distance_km} km</span>
          </div>
          {session.target_pace && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">⏱️ Allure</span>
              <span className="font-medium text-brand-600">{session.target_pace} min/km</span>
            </div>
          )}
        </div>

        {/* Footer: Creator & Spots */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {session.creator && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {session.creator.username.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-slate-600">
                {session.creator.username}
              </span>
            </div>
          )}

          <div className="text-sm">
            {isFull ? (
              <span className="font-medium text-red-600">Complet</span>
            ) : (
              <span className="font-medium text-slate-900">
                {session.participants_count || 0}/{session.max_participants} places
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
