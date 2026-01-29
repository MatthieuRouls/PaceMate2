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

  // Level badge colors
  const levelColors = [
    'bg-green-100 text-green-700',
    'bg-green-100 text-green-700',
    'bg-blue-100 text-blue-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
  ];

  return (
    <Link href={`/sessions/${session.id}`} className="group block">
      <div className="card-interactive h-full relative overflow-hidden">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className={`badge ${levelColors[session.level_required - 1]} text-xs font-bold`}>
            {'⭐'.repeat(session.level_required)}
          </span>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(session.start_time)}
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(session.start_time)}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {session.title}
        </h3>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Location */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-700 truncate font-medium">{session.location_name}</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">{session.distance_km} km</span>
          </div>

          {/* Pace */}
          {session.target_pace && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 font-medium">{session.target_pace} min/km</span>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isFull ? 'bg-red-50' : almostFull ? 'bg-yellow-50' : 'bg-gray-50'
            }`}>
              <svg className={`w-4 h-4 ${
                isFull ? 'text-red-600' : almostFull ? 'text-yellow-600' : 'text-gray-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className={`text-sm font-bold ${
              isFull ? 'text-red-600' : almostFull ? 'text-yellow-600' : 'text-gray-900'
            }`}>
              {session.participants_count || 0}/{session.max_participants}
            </span>
          </div>
        </div>

        {/* Status badges */}
        {(almostFull || isFull) && (
          <div className="mb-4">
            {almostFull && (
              <span className="badge-warning">
                ⚡ Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
              </span>
            )}
            {isFull && (
              <span className="badge-danger">
                ❌ Complet
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          {/* Creator + Action */}
          <div className="flex items-center justify-between">
            {session.creator && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {session.creator.username.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  @{session.creator.username}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-primary-600 font-semibold text-sm group-hover:gap-2 transition-all">
              <span>{isFull ? 'Voir' : 'Rejoindre'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
