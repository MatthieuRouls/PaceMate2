'use client';

import { Session } from '@/lib/types';
import { useTheme } from '../providers/ThemeProvider';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const { theme } = useTheme();

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

  // Formater l'allure selon le thème
  const getPaceDisplay = () => {
    if (theme === 'discovery') {
      if (session.walk_breaks_ok) {
        return 'Tranquille avec pauses';
      }
      // Estimation basée sur le target_pace si disponible
      if (session.target_pace) {
        const [min, sec] = session.target_pace.split(':').map(Number);
        const totalMinutes = min + sec / 60;
        if (totalMinutes <= 5) return 'Rapide';
        if (totalMinutes <= 6) return 'Allure modérée';
        return 'Tranquille';
      }
      return 'Allure modérée';
    } else {
      // Mode Elite : afficher l'allure précise
      return session.target_pace ? `${session.target_pace} min/km` : 'Allure libre';
    }
  };

  // Afficher les étoiles selon le niveau
  const renderStars = () => {
    return '⭐'.repeat(session.level_required);
  };

  // Calculer les places restantes
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const spotsText = `${session.participants_count || 0}/${session.max_participants} places`;

  return (
    <div className="card hover:shadow-lg cursor-pointer transition-all">
      {/* Header avec titre */}
      <div className="mb-3">
        <h3 className="text-xl font-semibold mb-1">{session.title}</h3>
        {session.description && (
          <p className="text-sm opacity-75">{session.description}</p>
        )}
      </div>

      {/* Informations principales */}
      <div className="space-y-2 mb-4">
        {/* Date et heure */}
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="font-medium">{formatDate(session.start_time)}</span>
        </div>

        {/* Lieu */}
        <div className="flex items-center gap-2">
          <span className="text-sm">📍</span>
          <span>{session.location_name}</span>
        </div>

        {/* Allure */}
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span style={{ color: 'var(--color-primary)' }} className="font-semibold">
            {getPaceDisplay()}
          </span>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🏃</span>
          <span>{session.distance_km} km</span>
        </div>
      </div>

      {/* Footer avec niveau et places */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200"
           style={{ borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">Niveau :</span>
          <span>{renderStars()}</span>
        </div>
        <div className={`text-sm font-semibold ${spotsLeft === 0 ? 'text-red-500' : ''}`}>
          {spotsLeft === 0 ? 'Complet' : spotsText}
        </div>
      </div>
    </div>
  );
}
