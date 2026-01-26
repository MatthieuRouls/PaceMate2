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
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName} ${day} ${month} à ${hours}h${minutes}`;
  };

  // Calculer les places restantes
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;

  return (
    <Link href={`/sessions/${session.id}`}>
      <div className="card card-clickable">
        {/* Header */}
        <div className="mb-4">
          <h3 className="mb-2">{session.title}</h3>
          {session.description && (
            <p className="text-sm text-secondary" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {session.description}
            </p>
          )}
        </div>

        {/* Infos */}
        <div className="space-y-3 mb-4">
          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <span>📅</span>
            <span className="font-semibold">{formatDate(session.start_time)}</span>
          </div>

          {/* Lieu */}
          <div className="flex items-center gap-3 text-sm">
            <span>📍</span>
            <span>{session.location_name}</span>
          </div>

          {/* Distance et allure */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>🏃</span>
              <span className="font-semibold">{session.distance_km} km</span>
            </div>
            {session.target_pace && (
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>{session.target_pace} min/km</span>
              </div>
            )}
          </div>
        </div>

        <div className="divider"></div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="badge badge-primary">
            Niveau {session.level_required}
          </span>

          <div className="text-sm font-semibold">
            {isFull ? (
              <span style={{ color: '#DC2626' }}>Complet</span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>
                {session.participants_count || 0}/{session.max_participants} places
              </span>
            )}
          </div>
        </div>

        {/* Warning si peu de places */}
        {!isFull && spotsLeft <= 2 && (
          <div className="mt-3 badge badge-warning" style={{ width: '100%', justifyContent: 'center' }}>
            Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
          </div>
        )}
      </div>
    </Link>
  );
}
