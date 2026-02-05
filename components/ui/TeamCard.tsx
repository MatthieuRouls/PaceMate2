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
    return pos;
  };

  const isTopThree = position <= 3;

  return (
    <div
      className={`
        bg-white rounded-xl border p-5 transition-all hover:shadow-md
        ${isTopThree ? 'border-petrol-500' : 'border-silver-400 hover:border-petrol-300'}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Position */}
        <div
          className={`
            flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg
            ${isTopThree
              ? 'bg-petrol-700 text-white'
              : 'bg-silver-200 text-dark-700'
            }
          `}
        >
          {isTopThree ? getPositionBadge(position) : `${position}e`}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Nom de l'equipe */}
          <h3 className="text-lg font-bold text-dark-800 mb-1 truncate">{team.name}</h3>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-dark-500 mb-2 line-clamp-2">{team.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-silver-200 flex items-center justify-center">
                <span className="text-sm">👥</span>
              </div>
              <span className="font-bold text-dark-800">
                {team.members_count || 0}
              </span>
              <span className="text-sm text-dark-500">
                membre{(team.members_count || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isTopThree ? 'bg-petrol-100' : 'bg-silver-200'
              }`}>
                <span className="text-sm">🏃</span>
              </div>
              <span className={`font-bold text-lg ${
                isTopThree ? 'text-rust-500' : 'text-dark-800'
              }`}>
                {(team.total_distance || 0).toFixed(1)}
              </span>
              <span className="text-sm text-dark-500">km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
