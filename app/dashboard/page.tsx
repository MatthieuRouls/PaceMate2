'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions } from '@/lib/actions';
import { Session } from '@/lib/types';

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    // Only redirect if we're sure user is not authenticated
    // Wait for loading to complete before checking
    if (!loading && !profile) {
      // Add a small delay to ensure auth state is fully settled
      const timeoutId = setTimeout(() => {
        router.push('/');
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, profile, router]);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const sessions = await getUpcomingSessions(3);
        setUpcomingSessions(sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    }
    if (profile) {
      fetchSessions();
    }
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
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-secondary-600 mb-2">
            Salut {profile.username} ! 👋
          </h1>
          <p className="text-lg text-secondary-600/70">
            Prêt pour ta prochaine sortie ?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-secondary-600/60 uppercase">Ce mois</span>
            </div>
            <div className="text-3xl font-bold text-secondary-600 mb-1">3</div>
            <div className="text-sm text-secondary-600/70">Sessions à venir</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-secondary-600/60 uppercase">Total</span>
            </div>
            <div className="text-3xl font-bold text-primary-500 mb-1">42 km</div>
            <div className="text-sm text-secondary-600/70">Ce mois-ci</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-secondary-600/60 uppercase">Complétées</span>
            </div>
            <div className="text-3xl font-bold text-secondary-600 mb-1">12</div>
            <div className="text-sm text-secondary-600/70">Sessions terminées</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/sessions/create"
            className="group bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Créer une sortie</h3>
                <p className="text-sm text-white/80">Organise ta prochaine session</p>
              </div>
              <svg className="w-6 h-6 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="group bg-white rounded-2xl p-8 shadow-md border border-gray-100 hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-secondary-600 mb-1">Découvrir</h3>
                <p className="text-sm text-secondary-600/70">Trouve des sessions près de toi</p>
              </div>
              <svg className="w-6 h-6 text-secondary-600/40 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-secondary-600">
              Sessions recommandées
            </h2>
            <Link
              href="/sessions"
              className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              Voir tout →
            </Link>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-500 border-t-transparent"></div>
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100">
              <p className="text-secondary-600/70 mb-4">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="inline-block px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all shadow-lg hover:scale-105"
              >
                Créer la première session
              </Link>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-secondary-600 to-secondary-500 rounded-3xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Rejoins une{' '}
            <span className="text-primary-400">équipe</span>
          </h3>
          <p className="text-lg text-white/80 mb-6 max-w-2xl mx-auto">
            Cours en équipe, progresse ensemble et grimpe dans le classement !
          </p>
          <Link
            href="/teams"
            className="inline-block px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold shadow-lg hover:bg-primary-600 transition-all hover:scale-105"
          >
            Découvrir les équipes
          </Link>
        </div>
      </div>
    </div>
  );
}
