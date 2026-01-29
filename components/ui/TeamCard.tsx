'use client';

import { Team } from '@/lib/types';

interface TeamCardProps {
  team: Team;
  position: number;
}

export default function TeamCard({ team, position }: TeamCardProps) {
  // Badges pour le top 3
  const getPositionBadge = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}e`;
  };

  const isTopThree = position <= 3;

  return (
    <div
      className={`card transition-all ${isTopThree ? 'border-2' : ''}`}
      style={
        isTopThree
          ? {
              borderColor: '#0066cc',
              backgroundColor: '#f0f7ff',
            }
          : {}
      }
    >
      <div className="flex items-start gap-4">
        {/* Position */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
          style={{
            backgroundColor: isTopThree ? '#cfe2ff' : '#e9ecef',
            color: isTopThree ? '#0066cc' : '#212529',
          }}
        >
          {getPositionBadge(position)}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Nom de l'équipe */}
          <h3 className="text-lg font-bold mb-1 truncate">{team.name}</h3>

          {/* Description */}
          {team.description && (
            <p className="text-sm opacity-75 mb-3 line-clamp-2">{team.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span>👥</span>
              <span className="font-semibold">
                {team.members_count || 0} membre{(team.members_count || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>🏃</span>
              <span
                className="font-semibold"
                style={{ color: isTopThree ? '#0066cc' : 'inherit' }}
              >
                {(team.total_distance || 0).toFixed(1)} km
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
