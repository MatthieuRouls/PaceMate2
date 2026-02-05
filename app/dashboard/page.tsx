'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import SessionCard from '@/components/ui/SessionCard';
import { getUpcomingSessions } from '@/lib/actions';
import { Session } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
      <div className="min-h-screen bg-neu-base flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="card p-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-dark-800 mb-2">
                Salut {profile.username} !
              </h1>
              <p className="text-dark-500">
                Pret pour ta prochaine sortie ?
              </p>
            </div>
            <Link
              href="/sessions/create"
              className="neu-btn inline-flex items-center justify-center gap-2 px-8 py-4 text-dark-800 font-bold text-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Creer une sortie
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-petrol-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-petrol-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Ce mois</span>
            </div>
            <div className="text-4xl font-bold text-dark-800 mb-1">3</div>
            <div className="text-sm text-dark-500">Sessions a venir</div>
            {/* Mini sparkline placeholder */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-petrol-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Total</span>
            </div>
            <div className="text-4xl font-bold text-orange-500 mb-1">42 km</div>
            <div className="text-sm text-dark-500">Ce mois-ci</div>
            {/* Mini sparkline */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[30, 50, 70, 45, 85, 60, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-orange-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-sand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Completees</span>
            </div>
            <div className="text-4xl font-bold text-dark-800 mb-1">12</div>
            <div className="text-sm text-dark-500">Sessions terminees</div>
            {/* Mini sparkline */}
            <div className="mt-4 flex items-end gap-1 h-8">
              {[55, 40, 75, 50, 65, 80, 60].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-sand-200 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link
            href="/sessions/create"
            className="neu-btn group p-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-dark-800 mb-1">Creer une sortie</h3>
                <p className="text-sm text-dark-500">Organise ta prochaine session</p>
              </div>
              <svg className="w-6 h-6 text-dark-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="neu-btn group p-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-petrol-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-petrol-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-dark-800 mb-1">Decouvrir</h3>
                <p className="text-sm text-dark-500">Trouve des sessions pres de toi</p>
              </div>
              <svg className="w-6 h-6 text-dark-400 group-hover:translate-x-1 group-hover:text-petrol-700 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark-800">
              Sessions recommandees
            </h2>
            <Link
              href="/sessions"
              className="text-sm font-semibold text-petrol-700 hover:text-petrol-600 transition-colors"
            >
              Voir tout
            </Link>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="sm" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 px-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-silver-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-dark-500 mb-6">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="neu-btn inline-block px-8 py-3 text-dark-800 font-semibold"
              >
                Creer la premiere session
              </Link>
            </div>
          )}
        </div>

        {/* CTA Section - Glassmorphism on dark background */}
        <div className="relative overflow-hidden rounded-3xl bg-dark-800 p-10">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-petrol-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Rejoins une <span className="text-orange-500">equipe</span>
            </h3>
            <p className="text-silver-400 mb-8 max-w-xl mx-auto">
              Cours en equipe, progresse ensemble et grimpe dans le classement !
            </p>
            <Link
              href="/teams"
              className="neu-btn inline-block px-10 py-4 text-dark-800 font-bold text-lg"
            >
              Decouvrir les equipes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
