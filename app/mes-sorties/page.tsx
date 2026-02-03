'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import SessionCard from '@/components/ui/SessionCard';
import { Session } from '@/lib/types';
import { getUserSessions } from '@/lib/actions';

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
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-600 mb-2">
            Mes sorties
          </h1>
          <p className="text-lg text-secondary-600/70">
            Gère tes sessions inscrites et consulte ton historique
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-4 px-2 font-semibold transition-all relative ${
              activeTab === 'upcoming'
                ? 'text-primary-500'
                : 'text-secondary-600/60 hover:text-secondary-600'
            }`}
          >
            À venir
            {activeTab === 'upcoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-4 px-2 font-semibold transition-all relative ${
              activeTab === 'past'
                ? 'text-primary-500'
                : 'text-secondary-600/60 hover:text-secondary-600'
            }`}
          >
            Historique
            {activeTab === 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></div>
            )}
          </button>
        </div>

        {/* Content */}
        {sessionsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {activeTab === 'upcoming' && (
              <>
                {upcomingCreated.length === 0 && upcomingJoined.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-md border border-gray-100">
                    <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-secondary-600 mb-2">
                      Aucune sortie prévue
                    </h3>
                    <p className="text-secondary-600/70 mb-6">
                      Inscris-toi à une session ou crée la tienne
                    </p>
                    <div className="flex gap-4 justify-center">
                      <a
                        href="/sessions"
                        className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all shadow-lg hover:scale-105"
                      >
                        Découvrir les sessions
                      </a>
                      <a
                        href="/sessions/create"
                        className="px-6 py-3 rounded-xl bg-white border-2 border-primary-200 text-primary-600 font-semibold hover:bg-primary-50 transition-all"
                      >
                        Créer une sortie
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {/* Mes créations */}
                    {upcomingCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md">
                            <span className="text-xl">👑</span>
                            <span className="font-bold">Mes créations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {upcomingCreated.length} session{upcomingCreated.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-primary-500 text-primary-600 shadow-md">
                            <span className="text-xl">🏃</span>
                            <span className="font-bold">Mes participations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {upcomingJoined.length} session{upcomingJoined.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className="text-center py-20 bg-white rounded-2xl shadow-md border border-gray-100">
                    <div className="w-20 h-20 rounded-full bg-secondary-600/10 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-secondary-600 mb-2">
                      Aucune sortie passée
                    </h3>
                    <p className="text-secondary-600/70 mb-6">
                      Ton historique apparaîtra ici après tes premières sessions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {/* Mes créations passées */}
                    {pastCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md">
                            <span className="text-xl">👑</span>
                            <span className="font-bold">Mes créations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {pastCreated.length} session{pastCreated.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-primary-500 text-primary-600 shadow-md">
                            <span className="text-xl">🏃</span>
                            <span className="font-bold">Mes participations</span>
                          </div>
                          <span className="text-sm text-secondary-600/70 font-medium">
                            {pastJoined.length} session{pastJoined.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">{pastCreated.length + pastJoined.length}</div>
              <div className="text-sm text-secondary-600/70">Sessions complétées</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + s.distance_km, 0)} km
              </div>
              <div className="text-sm text-secondary-600/70">Distance totale</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">
                {pastCreated.length > 0 && (
                  <span className="text-xl">👑 {pastCreated.length}</span>
                )}
              </div>
              <div className="text-sm text-secondary-600/70">Sessions organisées</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + (s.participants_count || 0), 0)}
              </div>
              <div className="text-sm text-secondary-600/70">Runners rencontrés</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
