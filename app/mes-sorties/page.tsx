'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import SessionCard from '@/components/ui/SessionCard';
import { Session } from '@/lib/types';
import { getUserSessions } from '@/lib/actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function MesSortiesPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingCreated, setUpcomingCreated] = useState<Session[]>([]);
  const [upcomingJoined, setUpcomingJoined] = useState<Session[]>([]);
  const [pastCreated, setPastCreated] = useState<Session[]>([]);
  const [pastJoined, setPastJoined] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/');
    }
  }, [loading, profile, router]);

  useEffect(() => {
    async function fetchUserSessions() {
      if (!profile) return;

      try {
        setSessionsLoading(true);
        const { upcomingJoined, pastJoined, upcomingCreated, pastCreated } = await getUserSessions();
        setUpcomingCreated(upcomingCreated);
        setUpcomingJoined(upcomingJoined);
        setPastCreated(pastCreated);
        setPastJoined(pastJoined);
      } catch (error) {
        console.error('Error fetching user sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    }

    fetchUserSessions();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500/5 via-white to-primary-500/10 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-primary-500/20 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-1">
            Mes sorties
          </h1>
          <p className="text-sm text-secondary-600/80">
            Gère tes sessions inscrites et consulte ton historique
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-primary-500/20">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                : 'text-secondary-600/70 hover:bg-primary-500/5'
            }`}
          >
            ✨ À venir
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'past'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                : 'text-secondary-600/70 hover:bg-primary-500/5'
            }`}
          >
            📊 Historique
          </button>
        </div>

        {/* Content */}
        {sessionsLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {activeTab === 'upcoming' && (
              <>
                {upcomingCreated.length === 0 && upcomingJoined.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-primary-500/10 via-white to-primary-500/5 rounded-3xl shadow-xl border-2 border-primary-500/30">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-secondary-600 mb-3">
                      Aucune sortie prévue
                    </h3>
                    <p className="text-lg text-secondary-600/70 mb-8">
                      Inscris-toi à une session ou crée la tienne
                    </p>
                    <div className="flex gap-4 justify-center">
                      <a
                        href="/sessions"
                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold hover:shadow-2xl transition-all shadow-lg hover:scale-105"
                      >
                        Découvrir les sessions
                      </a>
                      <a
                        href="/sessions/create"
                        className="px-8 py-4 rounded-xl bg-white border-2 border-primary-500 text-primary-600 font-bold hover:bg-primary-50 transition-all shadow-lg hover:scale-105"
                      >
                        Créer une sortie
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mes créations */}
                    {upcomingCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm">
                            <span className="text-base">👑</span>
                            <span className="font-bold text-sm">Mes créations</span>
                          </div>
                          <span className="text-xs text-secondary-600/70 font-medium">
                            {upcomingCreated.length} session{upcomingCreated.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {upcomingCreated.map((session) => (
                            <SessionCard key={session.id} session={session} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mes participations */}
                    {upcomingJoined.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-500 text-primary-600 shadow-sm">
                            <span className="text-base">🏃</span>
                            <span className="font-bold text-sm">Mes participations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {upcomingJoined.length} session{upcomingJoined.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {upcomingJoined.map((session) => (
                            <SessionCard key={session.id} session={session} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'past' && (
              <>
                {pastCreated.length === 0 && pastJoined.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-secondary-600/5 via-white to-primary-500/5 rounded-3xl shadow-xl border-2 border-gray-200">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary-600 to-gray-800 flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-secondary-600 mb-3">
                      Aucune sortie passée
                    </h3>
                    <p className="text-lg text-secondary-600/70 mb-6">
                      Ton historique apparaîtra ici après tes premières sessions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mes créations passées */}
                    {pastCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm">
                            <span className="text-base">👑</span>
                            <span className="font-bold text-sm">Mes créations</span>
                          </div>
                          <span className="text-xs text-secondary-600/70 font-medium">
                            {pastCreated.length} session{pastCreated.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pastCreated.map((session) => (
                            <SessionCard key={session.id} session={session} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mes participations passées */}
                    {pastJoined.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-500 text-primary-600 shadow-sm">
                            <span className="text-base">🏃</span>
                            <span className="font-bold text-sm">Mes participations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {pastJoined.length} session{pastJoined.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pastJoined.map((session) => (
                            <SessionCard key={session.id} session={session} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Stats Summary (if has past sessions) */}
        {activeTab === 'past' && (pastCreated.length > 0 || pastJoined.length > 0) && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-white mb-1">{pastCreated.length + pastJoined.length}</div>
              <div className="text-xs text-white/90 font-medium">Sessions complétées</div>
            </div>
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-white mb-1">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + s.distance_km, 0)} km
              </div>
              <div className="text-xs text-white/90 font-medium">Distance totale</div>
            </div>
            <div className="bg-gradient-to-br from-forest-700 to-forest-800 rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-white mb-1">
                {pastCreated.length > 0 ? (
                  <span>👑 {pastCreated.length}</span>
                ) : (
                  <span>0</span>
                )}
              </div>
              <div className="text-xs text-white/90 font-medium">Sessions organisées</div>
            </div>
            <div className="bg-gradient-to-br from-secondary-600 to-secondary-700 rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-white mb-1">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + (s.participants_count || 0), 0)}
              </div>
              <div className="text-xs text-white/90 font-medium">Runners rencontrés</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
