'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
  onClick?: () => void;
  showJoinButton?: boolean;
}

export default function SessionCard({ session, onClick, showJoinButton = true }: SessionCardProps) {
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

  // Duration calculation
  const estimatedDuration = Math.round((session.distance_km * parseFloat(session.target_pace?.split(':')[0] || '5')) / 60);

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Will navigate via Link
  };

  const levelLabels = ['Débutant', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert'];

  const cardContent = (
    <div
      className="group card p-6 hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-5">
        {/* Header with Date Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-dark-800 mb-2 line-clamp-2">{session.title}</h3>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-petrol-100 text-petrol-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">{formatDate(session.start_time)}</span>
            </div>
          </div>

          {/* Difficulty indicator */}
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs text-dark-500 font-medium uppercase tracking-wider">Niveau</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < session.level_required
                      ? 'bg-rust-500'
                      : 'bg-silver-300'
                  }`}
                ></div>
              ))}
            </div>
            <span className="text-xs text-dark-500 font-medium">{levelLabels[session.level_required - 1]}</span>
          </div>
        </div>

        {/* Stats - Large and prominent */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-silver-300">
          <div className="text-center">
            <div className="text-2xl font-bold text-rust-500 mb-1">
              {session.distance_km}
            </div>
            <div className="text-xs text-dark-500 uppercase tracking-wider font-medium">Km</div>
          </div>
          <div className="text-center border-x border-silver-300">
            <div className="text-2xl font-bold text-dark-800 mb-1">{session.target_pace || '5\'30"'}</div>
            <div className="text-xs text-dark-500 uppercase tracking-wider font-medium">Allure</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-dark-800 mb-1">{estimatedDuration}</div>
            <div className="text-xs text-dark-500 uppercase tracking-wider font-medium">Min</div>
          </div>
        </div>

        {/* Time & Location */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-dark-600">
            <div className="w-9 h-9 rounded-lg bg-petrol-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-petrol-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-medium text-sm">{formatTime(session.start_time)}</span>
          </div>

          <div className="flex items-center gap-3 text-dark-600">
            <div className="w-9 h-9 rounded-lg bg-petrol-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-petrol-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium text-sm line-clamp-1">{session.location_name}</span>
          </div>
        </div>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-dark-500 line-clamp-2 leading-relaxed">
            {session.description}
          </p>
        )}

        {/* Participants & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-silver-300">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {session.creator && (
                <div className="w-9 h-9 rounded-full bg-terra-400 flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs font-bold">
                    {session.creator.username.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {Array.from({ length: Math.min(2, (session.participants_count || 1) - 1) }).map((_, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-sand-400 border-2 border-white"
                />
              ))}
            </div>
            <div className="text-sm">
              <div className="font-semibold text-dark-800">
                {session.participants_count || 1}/{session.max_participants}
              </div>
              <div className="text-xs text-dark-500">
                {spotsLeft > 0 ? `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}` : 'Complet'}
              </div>
            </div>
          </div>

          {isFull ? (
            <span className="px-5 py-2.5 rounded-full bg-silver-200 text-dark-600 text-sm font-semibold">
              Complet
            </span>
          ) : showJoinButton && onClick ? (
            <Link
              href={`/sessions/${session.id}`}
              onClick={handleJoinClick}
              className="neu-btn-white px-5 py-2.5 text-dark-800 text-sm font-semibold"
            >
              Rejoindre
            </Link>
          ) : showJoinButton && !onClick ? (
            <span className="neu-btn-white px-5 py-2.5 text-dark-800 text-sm font-semibold">
              Voir details
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      {cardContent}
    </Link>
  );
}
