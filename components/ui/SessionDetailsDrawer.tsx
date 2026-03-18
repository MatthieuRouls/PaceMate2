'use client';

import { useEffect } from 'react';
import { Session } from '@/lib/types';
import { X } from 'lucide-react';
import Link from 'next/link';
import { getLevelConfig } from '@/lib/strava';

interface SessionDetailsDrawerProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionDetailsDrawer({ session, isOpen, onClose }: SessionDetailsDrawerProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!session) return null;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;
  const estimatedDuration = Math.round((session.distance_km * parseFloat(session.target_pace?.split(':')[0] || '5')) / 60);

  const levelCfg = getLevelConfig(session.level_required);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-white dark:bg-dark-800 z-50 shadow-2xl transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-silver-300 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-dark-800">Details de la session</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-silver-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-dark-800" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title & Date */}
          <div>
            <h3 className="text-2xl font-bold text-dark-800 mb-3">{session.title}</h3>
            <div className="flex items-center gap-2 text-dark-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-lg">{formatDate(session.start_time)} a {formatTime(session.start_time)}</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-pink-500 rounded-lg p-4 text-white">
              <div className="text-2xl font-bold mb-1">{session.distance_km}</div>
              <div className="text-sm opacity-90">Kilometres</div>
            </div>
            <div className="bg-white dark:bg-dark-700 border-2 border-neon-500 rounded-lg p-4">
              <div className="text-2xl font-bold text-dark-800 mb-1">{session.target_pace || '5\'30"'}</div>
              <div className="text-sm text-dark-500">Allure/km</div>
            </div>
            <div className="bg-white dark:bg-dark-700 border border-silver-400 rounded-lg p-4">
              <div className="text-2xl font-bold text-dark-800 mb-1">{estimatedDuration}</div>
              <div className="text-sm text-dark-500">Minutes</div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-silver-100 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-neon-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-dark-800 mb-1">Point de rendez-vous</div>
                <div className="text-dark-500">{session.location_name}</div>
              </div>
            </div>
          </div>

          {/* Level */}
          <div>
            <div className="font-semibold text-dark-800 mb-3">Niveau requis</div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-semibold ${levelCfg.textClass} ${levelCfg.bgClass} ${levelCfg.borderClass}`}>
              {levelCfg.label}
            </span>
          </div>

          {/* Description */}
          {session.description && (
            <div>
              <div className="font-semibold text-dark-800 mb-3">Description</div>
              <p className="text-dark-500 leading-relaxed">{session.description}</p>
            </div>
          )}

          {/* Organizer */}
          {session.creator && (
            <div>
              <div className="font-semibold text-dark-800 mb-3">Organisateur</div>
              <div className="flex items-center gap-3">
                {session.creator.avatar_url ? (
                  <img
                    src={session.creator.avatar_url}
                    alt={session.creator.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neon-400 flex items-center justify-center text-white font-bold">
                    {session.creator.username.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-dark-800">{session.creator.username}</div>
                  <div className="text-sm text-dark-500">Createur de la session</div>
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <div className="font-semibold text-dark-800 mb-3">Participants</div>
            <div className="flex items-center justify-between bg-silver-100 rounded-lg p-5">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {session.creator && (
                    session.creator.avatar_url ? (
                      <img
                        src={session.creator.avatar_url}
                        alt={session.creator.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neon-400 flex items-center justify-center border-2 border-white">
                        <span className="text-white text-xs font-bold">
                          {session.creator.username.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )
                  )}
                  {Array.from({ length: Math.min(3, (session.participants_count || 1) - 1) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-silver-400 border-2 border-white"
                    />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-dark-800">
                    {session.participants_count || 1} / {session.max_participants}
                  </div>
                  <div className="text-sm text-dark-500">
                    {spotsLeft > 0 ? `${spotsLeft} place${spotsLeft > 1 ? 's' : ''} restante${spotsLeft > 1 ? 's' : ''}` : 'Session complete'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white dark:bg-dark-800 pt-4 pb-2 border-t border-silver-300 -mx-6 px-6">
            <div className="flex gap-3">
              <Link
                href={`/sessions/${session.id}`}
                className="flex-1 py-3.5 rounded-lg bg-white dark:bg-dark-700 border border-silver-400 text-dark-800 font-semibold text-center hover:border-neon-500 hover:bg-silver-50 dark:hover:bg-dark-600 transition-all"
              >
                Voir tous les details
              </Link>
              {!isFull ? (
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex-1 py-3.5 rounded-lg bg-pink-500 text-white font-semibold text-center hover:bg-pink-600 transition-colors"
                >
                  Rejoindre la session
                </Link>
              ) : (
                <button
                  disabled
                  className="flex-1 py-3.5 rounded-lg bg-silver-200 text-dark-500 font-semibold cursor-not-allowed"
                >
                  Session complete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
