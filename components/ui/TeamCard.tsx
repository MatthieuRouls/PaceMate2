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
        bg-white rounded-3xl shadow-lg border-2 p-6 transition-all hover:shadow-xl transform hover:scale-[1.01]
        ${isTopThree ? 'border-primary-500 bg-gradient-to-br from-primary-50/50 to-orange-50/50' : 'border-gray-100 hover:border-gray-200'}
      `}
    >
      <div className="flex items-center gap-5">
        {/* Position */}
        <div
          className={`
            flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md
            ${isTopThree
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
            }
          `}
        >
          {isTopThree ? getPositionBadge(position) : `${position}e`}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Nom de l'équipe */}
          <h3 className="text-xl font-bold text-secondary-600 mb-1 truncate">{team.name}</h3>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{team.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <span className="font-bold text-secondary-600">
                {team.members_count || 0}
              </span>
              <span className="text-sm text-gray-500">
                membre{(team.members_count || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isTopThree ? 'bg-primary-100' : 'bg-gray-100'
              }`}>
                <span className="text-lg">🏃</span>
              </div>
              <span className={`font-bold text-xl ${
                isTopThree ? 'text-primary-600' : 'text-secondary-600'
              }`}>
                {(team.total_distance || 0).toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
