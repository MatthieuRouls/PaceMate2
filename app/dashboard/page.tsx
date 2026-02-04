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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-dark-800 mb-2">
            Salut {profile.username} !
          </h1>
          <p className="text-dark-500">
            Pret pour ta prochaine sortie ?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white rounded-xl p-5 border border-silver-400">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-petrol-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-silver-600 uppercase">Ce mois</span>
            </div>
            <div className="text-3xl font-bold text-dark-800 mb-1">3</div>
            <div className="text-sm text-dark-500">Sessions a venir</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-silver-400">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-terra-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-silver-600 uppercase">Total</span>
            </div>
            <div className="text-3xl font-bold text-rust-500 mb-1">42 km</div>
            <div className="text-sm text-dark-500">Ce mois-ci</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-silver-400">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-sand-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-silver-600 uppercase">Completees</span>
            </div>
            <div className="text-3xl font-bold text-dark-800 mb-1">12</div>
            <div className="text-sm text-dark-500">Sessions terminees</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <Link
            href="/sessions/create"
            className="group bg-rust-500 rounded-xl p-6 hover:bg-rust-600 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Creer une sortie</h3>
                <p className="text-sm text-white/70">Organise ta prochaine session</p>
              </div>
              <svg className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="group bg-white rounded-xl p-6 border border-silver-400 hover:border-petrol-500 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-petrol-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-petrol-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-dark-800 mb-1">Decouvrir</h3>
                <p className="text-sm text-dark-500">Trouve des sessions pres de toi</p>
              </div>
              <svg className="w-5 h-5 text-silver-500 group-hover:translate-x-1 group-hover:text-petrol-700 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-dark-800">
              Sessions recommandees
            </h2>
            <Link
              href="/sessions"
              className="text-sm font-medium text-petrol-700 hover:text-petrol-600 transition-colors"
            >
              Voir tout
            </Link>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="sm" />
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-silver-400">
              <p className="text-dark-500 mb-4">Aucune session disponible</p>
              <Link
                href="/sessions/create"
                className="inline-block px-5 py-2.5 rounded-lg bg-rust-500 text-white font-medium hover:bg-rust-600 transition-colors"
              >
                Creer la premiere session
              </Link>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-dark-800 rounded-xl p-10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Rejoins une <span className="text-sand-400">equipe</span>
          </h3>
          <p className="text-silver-400 mb-6 max-w-xl mx-auto">
            Cours en equipe, progresse ensemble et grimpe dans le classement !
          </p>
          <Link
            href="/teams"
            className="inline-block px-6 py-3 rounded-lg bg-rust-500 text-white font-semibold hover:bg-rust-600 transition-colors"
          >
            Decouvrir les equipes
          </Link>
        </div>
      </div>
    </div>
  );
}
