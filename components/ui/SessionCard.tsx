'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';
import Card from './Card';
import Badge from './Badge';

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

  // Get level variant for badge
  const getLevelVariant = (level: number) => {
    return `level-${level}` as 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5';
  };

  return (
    <Link href={`/sessions/${session.id}`}>
      <Card variant="glass" padding="lg" hover className="h-full">
        {/* Header: Badge niveau + Date/Heure */}
        <div className="flex items-start justify-between mb-4">
          <Badge variant={getLevelVariant(session.level_required)} size="md">
            Niveau {session.level_required}
          </Badge>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(session.start_time)}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {formatTime(session.start_time)}
            </div>
          </div>
        </div>

        {/* Titre et description */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
            {session.title}
          </h3>
          {session.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {session.description}
            </p>
          )}
        </div>

        {/* Infos grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Lieu */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-700 truncate">{session.location_name}</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">{session.distance_km} km</span>
          </div>

          {/* Allure */}
          {session.target_pace && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">{session.target_pace} min/km</span>
            </div>
          )}

          {/* Places */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className={`text-sm font-semibold ${
              isFull ? 'text-red-600' : almostFull ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {session.participants_count || 0}/{session.max_participants}
            </span>
          </div>
        </div>

        {/* Warning badge si presque complet ou complet */}
        {almostFull && (
          <div className="mb-4">
            <Badge variant="warning" size="sm">
              ⚠️ Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
            </Badge>
          </div>
        )}
        {isFull && (
          <div className="mb-4">
            <Badge variant="danger" size="sm">
              ❌ Complet
            </Badge>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200/50 my-4" />

        {/* Footer: Créateur + Bouton */}
        <div className="flex items-center justify-between">
          {session.creator && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                {session.creator.username.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700">@{session.creator.username}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all">
            <span>{isFull ? 'Voir' : 'Rejoindre'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Card>
    </Link>
  );
}
