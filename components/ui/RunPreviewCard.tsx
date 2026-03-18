'use client';

import { Calendar, MapPin, Users, Zap, Clock, Crown, Route } from 'lucide-react';
import { CreateSessionData } from '@/lib/actions';
import { getLevelConfig } from '@/lib/strava';

interface RunPreviewCardProps {
  formData: CreateSessionData;
  compact?: boolean;
  sessionTypes: Array<{
    value: string;
    label: string;
    icon: string;
  }>;
}

export default function RunPreviewCard({
  formData,
  compact = false,
  sessionTypes,
}: RunPreviewCardProps) {
  const sessionType = sessionTypes.find(t => t.value === formData.session_type);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const dateInfo = formatDate(formData.start_time);

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 rounded-xl p-4 border border-neon-700/30 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Left: Title & Type */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">
              {formData.title || 'Titre de la sortie'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {sessionType && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-700/20 text-neon-400 text-xs font-medium">
                  <span>{sessionType.icon}</span>
                  {sessionType.label}
                </span>
              )}
              {formData.distance_km > 0 && (
                <span className="text-xs text-silver-400">{formData.distance_km} km</span>
              )}
            </div>
          </div>

          {/* Right: Date */}
          <div className="text-right shrink-0">
            {dateInfo ? (
              <>
                <div className="text-sm font-medium text-white">{dateInfo.day}</div>
                <div className="text-xs text-neon-400">{dateInfo.time}</div>
              </>
            ) : (
              <span className="text-xs text-silver-500">Date a definir</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 border border-neon-700/40 shadow-2xl">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-neon-700/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-neon-700 via-pink-500 to-neon-400" />

      <div className="p-5 space-y-4 relative">
        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-white leading-tight">
            {formData.title || (
              <span className="text-silver-500 italic">Titre de la sortie</span>
            )}
          </h3>
          {formData.description && (
            <p className="mt-1 text-sm text-silver-400 line-clamp-2">{formData.description}</p>
          )}
        </div>

        {/* Type Badge */}
        {sessionType && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-700/20 border border-neon-700/30 text-neon-400 text-sm font-medium">
              <span className="text-base">{sessionType.icon}</span>
              {sessionType.label}
            </span>
            {formData.walk_breaks_ok && (
              <span className="px-2 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs">
                Pauses OK
              </span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Date */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/50">
            <div className="w-9 h-9 rounded-lg bg-neon-700/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-neon-400" />
            </div>
            <div className="min-w-0">
              {dateInfo ? (
                <>
                  <div className="text-sm font-medium text-white truncate">{dateInfo.day}</div>
                  <div className="text-xs text-neon-400">{dateInfo.time}</div>
                </>
              ) : (
                <span className="text-xs text-silver-500">A definir</span>
              )}
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/50">
            <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Route className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{formData.distance_km} km</div>
              {formData.target_pace && (
                <div className="text-xs text-pink-400">{formData.target_pace}/km</div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/50">
            <div className="w-9 h-9 rounded-lg bg-neon-700/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-neon-400" />
            </div>
            <div className="min-w-0 flex-1">
              {formData.location_name ? (
                <div className="text-sm font-medium text-white truncate">{formData.location_name}</div>
              ) : (
                <span className="text-xs text-silver-500">Lieu a definir</span>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/50">
            <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{formData.max_participants} max</div>
              <div className="text-xs text-silver-500">participants</div>
            </div>
          </div>
        </div>

        {/* Level indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-silver-300">Niveau requis</span>
          </div>
          {(() => { const cfg = getLevelConfig(formData.level_required); return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold ${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`}>
              {cfg.label}
            </span>
          ); })()}
        </div>

        {/* Organizer badge */}
        <div className="flex items-center gap-2 pt-2 border-t border-dark-600">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-700 to-neon-500 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-silver-500">Organisateur</div>
            <div className="text-sm font-medium text-white">Toi</div>
          </div>
        </div>

        {/* Placeholder avatars */}
        <div className="flex items-center gap-1 pt-2">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(formData.max_participants, 4) }).map((_, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center"
              >
                <span className="text-xs text-silver-500">?</span>
              </div>
            ))}
          </div>
          {formData.max_participants > 4 && (
            <span className="text-xs text-silver-500 ml-1">
              +{formData.max_participants - 4} places
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
