'use client';

import { useEffect } from 'react';
import { Session } from '@/lib/types';
import { X } from 'lucide-react';
import Link from 'next/link';

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
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;
  const estimatedDuration = Math.round((session.distance_km * parseFloat(session.target_pace?.split(':')[0] || '5')) / 60);

  const levelLabels = ['Débutant', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert'];

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
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-white z-50 shadow-2xl transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-secondary-600">Détails de la session</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title & Date */}
          <div>
            <h3 className="text-3xl font-bold text-secondary-600 mb-3">{session.title}</h3>
            <div className="flex items-center gap-2 text-secondary-600/70">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-lg">{formatDate(session.start_time)} à {formatTime(session.start_time)}</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white">
              <div className="text-3xl font-bold mb-1">{session.distance_km}</div>
              <div className="text-sm opacity-90">Kilomètres</div>
            </div>
            <div className="bg-white border-2 border-primary-500 rounded-2xl p-5">
              <div className="text-3xl font-bold text-secondary-600 mb-1">{session.target_pace || '5\'30"'}</div>
              <div className="text-sm text-secondary-600/70">Allure/km</div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
              <div className="text-3xl font-bold text-secondary-600 mb-1">{estimatedDuration}</div>
              <div className="text-sm text-secondary-600/70">Minutes</div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-secondary-600 mb-1">Point de rendez-vous</div>
                <div className="text-secondary-600/70">{session.location_name}</div>
              </div>
            </div>
          </div>

          {/* Level */}
          <div>
            <div className="font-semibold text-secondary-600 mb-3">Niveau requis</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < session.level_required ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-secondary-600/70">{levelLabels[session.level_required - 1]}</span>
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div>
              <div className="font-semibold text-secondary-600 mb-3">Description</div>
              <p className="text-secondary-600/70 leading-relaxed">{session.description}</p>
            </div>
          )}

          {/* Organizer */}
          {session.creator && (
            <div>
              <div className="font-semibold text-secondary-600 mb-3">Organisateur</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5">
                  <div className="w-full h-full rounded-full bg-secondary-600 flex items-center justify-center text-white font-bold">
                    {session.creator.username.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-secondary-600">{session.creator.username}</div>
                  <div className="text-sm text-secondary-600/70">Créateur de la session</div>
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <div className="font-semibold text-secondary-600 mb-3">Participants</div>
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-5">
              <div className="flex items-center gap-4">
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
                  {Array.from({ length: Math.min(3, (session.participants_count || 1) - 1) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5"
                    >
                      <div className="w-full h-full rounded-full bg-secondary-400 border-2 border-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-secondary-600">
                    {session.participants_count || 1} / {session.max_participants}
                  </div>
                  <div className="text-sm text-secondary-600/70">
                    {spotsLeft > 0 ? `${spotsLeft} place${spotsLeft > 1 ? 's' : ''} restante${spotsLeft > 1 ? 's' : ''}` : 'Session complète'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100 -mx-6 px-6">
            <div className="flex gap-3">
              <Link
                href={`/sessions/${session.id}`}
                className="flex-1 py-4 rounded-xl bg-white border-2 border-gray-200 text-secondary-600 font-semibold text-center hover:border-primary-500 hover:bg-gray-50 transition-all"
              >
                Voir tous les détails
              </Link>
              {!isFull ? (
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex-1 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Rejoindre la session
                </Link>
              ) : (
                <button
                  disabled
                  className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed"
                >
                  Session complète
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
