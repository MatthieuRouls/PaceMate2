'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  // Format date et heure
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${dayName} ${day} ${month}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}h${minutes}`;
  };

  // Calculer les places restantes
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;
  const almostFull = !isFull && spotsLeft <= 2;

  return (
    <Link href={`/sessions/${session.id}`} className="block group">
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
            {'⭐'.repeat(session.level_required)}
          </span>
          <div className="text-right text-sm">
            <div className="font-medium text-gray-900">{formatDate(session.start_time)}</div>
            <div className="text-gray-500 text-xs">{formatTime(session.start_time)}</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {session.title}
        </h3>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Stats */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">📍 {session.location_name}</span>
            <span className="font-medium text-gray-900">{session.distance_km} km</span>
          </div>
          {session.target_pace && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">⚡ Allure</span>
              <span className="font-medium text-gray-900">{session.target_pace} min/km</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">👥 Places</span>
            <span className={`font-medium ${
              isFull ? 'text-red-600' : almostFull ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {session.participants_count || 0}/{session.max_participants}
            </span>
          </div>
        </div>

        {/* Status */}
        {(almostFull || isFull) && (
          <div className="mb-3">
            {almostFull && (
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700">
                Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
              </span>
            )}
            {isFull && (
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">
                Complet
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {session.creator && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {session.creator.username.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-600">
                @{session.creator.username}
              </span>
            </div>
          )}

          <span className="text-xs text-blue-600 font-medium">
            {isFull ? 'Voir →' : 'Rejoindre →'}
          </span>
        </div>
      </div>
    </Link>
  );
}
