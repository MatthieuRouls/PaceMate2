'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  // Format date et heure en français
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

  // Formater l'allure
  const getPaceDisplay = () => {
    if (session.walk_breaks_ok) {
      return 'Tranquille avec pauses';
    }
    if (session.target_pace) {
      return `${session.target_pace} min/km`;
    }
    return 'Allure libre';
  };

  // Afficher les étoiles selon le niveau
  const renderLevel = () => {
    return session.level_required;
  };

  // Calculer les places restantes
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const spotsText = `${session.participants_count || 0}/${session.max_participants}`;

  // Emoji pour le type de session
  const getSessionTypeEmoji = () => {
    switch (session.session_type) {
      case 'casual':
        return '🚶';
      case 'recovery':
        return '💆';
      case 'tempo':
        return '⚡';
      case 'long_run':
        return '🏃‍♂️';
      case 'intervals':
        return '⏱️';
      default:
        return '🏃';
    }
  };

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <div className="card-modern cursor-pointer group">
        {/* Header avec badge type */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1 group-hover:gradient-text transition-all" style={{
              color: 'var(--text-dark)'
            }}>
              {session.title}
            </h3>
            {session.description && (
              <p className="text-sm line-clamp-2" style={{ color: 'var(--text-light)' }}>
                {session.description}
              </p>
            )}
          </div>
          {session.session_type && (
            <div className="ml-2">
              <span className="text-2xl">{getSessionTypeEmoji()}</span>
            </div>
          )}
        </div>

        {/* Informations principales */}
        <div className="space-y-3 mb-4">
          {/* Date et heure */}
          <div className="flex items-center gap-3">
            <span className="text-lg">📅</span>
            <span className="font-medium" style={{ color: 'var(--text-dark)' }}>
              {formatDate(session.start_time)}
            </span>
          </div>

          {/* Lieu */}
          <div className="flex items-center gap-3">
            <span className="text-lg">📍</span>
            <span style={{ color: 'var(--text-dark)' }}>{session.location_name}</span>
          </div>

          {/* Allure et Distance */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-semibold gradient-text">
                {getPaceDisplay()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏃</span>
              <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>
                {session.distance_km} km
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-gradient"></div>

        {/* Footer avec niveau et places */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge-gradient">
              Niveau {renderLevel()}
            </span>
          </div>
          <div className={`text-sm font-bold flex items-center gap-2 ${spotsLeft === 0 ? '' : ''}`} style={{
            color: spotsLeft === 0 ? '#ef4444' : 'var(--primary-blue)'
          }}>
            {spotsLeft === 0 ? (
              <>
                <span>❌</span>
                <span>Complet</span>
              </>
            ) : (
              <>
                <span>👥</span>
                <span>{spotsText}</span>
              </>
            )}
          </div>
        </div>

        {/* Indicator pour marquer qu'il reste peu de places */}
        {spotsLeft > 0 && spotsLeft <= 2 && (
          <div className="mt-3 text-xs font-semibold text-center px-3 py-1.5 rounded-full" style={{
            background: 'rgba(255, 107, 157, 0.1)',
            color: 'var(--primary-pink)'
          }}>
            ⚠️ Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
          </div>
        )}
      </div>
    </Link>
  );
}
