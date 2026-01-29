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

  // Duration calculation (simple mock - you can replace with actual calculation)
  const estimatedDuration = Math.round((session.distance_km * parseFloat(session.target_pace?.split(':')[0] || '5')) / 60);

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <div className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border border-gray-100">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-secondary-600">{session.title}</h3>
              <div className="flex items-center gap-1 text-secondary-600/60 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDate(session.start_time)} à {formatTime(session.start_time)}</span>
              </div>
            </div>
            {/* Difficulty indicator */}
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < session.level_required
                      ? 'bg-primary-500'
                      : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary-500">
                {session.distance_km}km
              </div>
              <div className="text-xs text-secondary-600/60">Distance</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-secondary-600">{session.target_pace || '5\'30"'}</div>
              <div className="text-xs text-secondary-600/60">Allure</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-secondary-600">{estimatedDuration}min</div>
              <div className="text-xs text-secondary-600/60">Durée</div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-secondary-600/70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{session.location_name}</span>
          </div>

          {/* Description */}
          {session.description && (
            <p className="text-sm text-secondary-600/70 line-clamp-2">
              {session.description}
            </p>
          )}

          {/* Participants & CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex -space-x-3">
              {session.creator && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5">
                  <div className="w-full h-full rounded-full bg-secondary-600 flex items-center justify-center border-2 border-white">
                    <span className="text-white text-xs font-bold">
                      {session.creator.username.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              {/* Mock additional participants */}
              {Array.from({ length: Math.min(2, (session.participants_count || 1) - 1) }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5"
                >
                  <div className="w-full h-full rounded-full bg-secondary-400 flex items-center justify-center border-2 border-white" />
                </div>
              ))}
              {spotsLeft > 0 && (
                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-secondary-600">
                    +{spotsLeft}
                  </span>
                </div>
              )}
            </div>

            {isFull ? (
              <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                Complet
              </span>
            ) : (
              <button className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium shadow-md hover:bg-primary-600 transition-all group-hover:scale-105">
                Rejoindre
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
