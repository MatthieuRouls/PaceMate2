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
    <div className="min-h-screen bg-silver-50 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5 bg-white rounded-xl p-5 border border-silver-400">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-800 mb-1">
            Mes sorties
          </h1>
          <p className="text-sm text-dark-500">
            Gere tes sessions inscrites et consulte ton historique
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white rounded-lg p-1.5 border border-silver-400">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'upcoming'
                ? 'bg-dark-800 text-white'
                : 'text-dark-500 hover:bg-silver-100'
            }`}
          >
            A venir
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'past'
                ? 'bg-dark-800 text-white'
                : 'text-dark-500 hover:bg-silver-100'
            }`}
          >
            Historique
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
                  <div className="text-center py-16 bg-white rounded-xl border border-silver-400">
                    <div className="w-20 h-20 rounded-full bg-petrol-700 flex items-center justify-center mx-auto mb-5">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-dark-800 mb-2">
                      Aucune sortie prevue
                    </h3>
                    <p className="text-dark-500 mb-6">
                      Inscris-toi a une session ou cree la tienne
                    </p>
                    <div className="flex gap-3 justify-center">
                      <a
                        href="/sessions"
                        className="px-6 py-3 rounded-lg bg-rust-500 text-white font-semibold hover:bg-rust-600 transition-colors"
                      >
                        Decouvrir les sessions
                      </a>
                      <a
                        href="/sessions/create"
                        className="px-6 py-3 rounded-lg bg-white border border-petrol-500 text-petrol-700 font-semibold hover:bg-petrol-50 transition-colors"
                      >
                        Creer une sortie
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mes creations */}
                    {upcomingCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rust-500 text-white">
                            <span className="text-sm">👑</span>
                            <span className="font-bold text-sm">Mes creations</span>
                          </div>
                          <span className="text-xs text-dark-500 font-medium">
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
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-petrol-500 text-petrol-700">
                            <span className="text-sm">🏃</span>
                            <span className="font-bold text-sm">Mes participations</span>
                          </div>
                          <span className="text-sm text-dark-500 font-medium">
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
                  <div className="text-center py-16 bg-white rounded-xl border border-silver-400">
                    <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-5">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-dark-800 mb-2">
                      Aucune sortie passee
                    </h3>
                    <p className="text-dark-500 mb-4">
                      Ton historique apparaitra ici apres tes premieres sessions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mes creations passees */}
                    {pastCreated.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rust-500 text-white">
                            <span className="text-sm">👑</span>
                            <span className="font-bold text-sm">Mes creations</span>
                          </div>
                          <span className="text-xs text-dark-500 font-medium">
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

                    {/* Mes participations passees */}
                    {pastJoined.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-petrol-500 text-petrol-700">
                            <span className="text-sm">🏃</span>
                            <span className="font-bold text-sm">Mes participations</span>
                          </div>
                          <span className="text-sm text-dark-500 font-medium">
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
            <div className="bg-rust-500 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">{pastCreated.length + pastJoined.length}</div>
              <div className="text-xs text-white/90 font-medium">Sessions completees</div>
            </div>
            <div className="bg-terra-400 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + s.distance_km, 0)} km
              </div>
              <div className="text-xs text-white/90 font-medium">Distance totale</div>
            </div>
            <div className="bg-petrol-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {pastCreated.length > 0 ? (
                  <span>👑 {pastCreated.length}</span>
                ) : (
                  <span>0</span>
                )}
              </div>
              <div className="text-xs text-white/90 font-medium">Sessions organisees</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {[...pastCreated, ...pastJoined].reduce((sum, s) => sum + (s.participants_count || 0), 0)}
              </div>
              <div className="text-xs text-white/90 font-medium">Runners rencontres</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
