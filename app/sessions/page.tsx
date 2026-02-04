'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Session } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import SessionDetailsDrawer from '@/components/ui/SessionDetailsDrawer';
import { getAllUpcomingSessions } from '@/lib/actions';
import { Filter } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type FilterLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Récupérer les sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        setError(null);

        const data = await getAllUpcomingSessions();
        setSessions(data);
        setFilteredSessions(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Erreur lors du chargement des sessions');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...sessions];

    if (filterLevel === 'beginner') {
      filtered = filtered.filter((s) => s.level_required <= 2);
    } else if (filterLevel === 'intermediate') {
      filtered = filtered.filter((s) => s.level_required === 3);
    } else if (filterLevel === 'advanced') {
      filtered = filtered.filter((s) => s.level_required >= 4);
    }

    setFilteredSessions(filtered);
  }, [filterLevel, sessions]);

  return (
    <div className="min-h-screen bg-silver-50 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white rounded-xl p-5 border border-silver-400">
          <div>
            <h1 className="text-2xl font-bold text-dark-800 mb-1">
              Sessions de running
            </h1>
            <p className="text-sm text-dark-500">
              Trouve ta prochaine sortie et rejoins la communaute
            </p>
          </div>
          <Link
            href="/sessions/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rust-500 text-white text-sm font-semibold hover:bg-rust-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Creer une sortie
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 border border-silver-400 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-petrol-700 flex items-center justify-center">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-dark-800">Filtrer par niveau</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'all'
                  ? 'bg-dark-800 text-white'
                  : 'bg-silver-200 text-dark-700 hover:bg-silver-300'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterLevel('beginner')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'beginner'
                  ? 'bg-sand-400 text-white'
                  : 'bg-silver-200 text-dark-700 hover:bg-silver-300'
              }`}
            >
              Debutant
            </button>
            <button
              onClick={() => setFilterLevel('intermediate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'intermediate'
                  ? 'bg-terra-400 text-white'
                  : 'bg-silver-200 text-dark-700 hover:bg-silver-300'
              }`}
            >
              Intermediaire
            </button>
            <button
              onClick={() => setFilterLevel('advanced')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'advanced'
                  ? 'bg-rust-500 text-white'
                  : 'bg-silver-200 text-dark-700 hover:bg-silver-300'
              }`}
            >
              Avance
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-xl p-6 border border-rust-300 text-center">
            <p className="text-rust-600 font-semibold mb-1">Erreur</p>
            <p className="text-dark-500">{error}</p>
          </div>
        )}

        {/* Sessions List */}
        {!loading && !error && (
          <>
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-silver-400">
                <div className="w-16 h-16 rounded-full bg-petrol-700 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-800 mb-2">
                  {filterLevel === 'all' ? 'Aucune session disponible' : 'Aucune session pour ce niveau'}
                </h3>
                <p className="text-dark-500 mb-6">
                  {filterLevel === 'all'
                    ? 'Sois le premier a creer une sortie !'
                    : 'Essaie de changer les filtres ou cree ta propre session'}
                </p>
                <div className="flex gap-3 justify-center">
                  {filterLevel !== 'all' && (
                    <button
                      onClick={() => setFilterLevel('all')}
                      className="px-5 py-2.5 rounded-lg border border-silver-400 text-dark-700 font-medium hover:bg-silver-100 transition-colors"
                    >
                      Voir toutes les sessions
                    </button>
                  )}
                  <Link
                    href="/sessions/create"
                    className="px-5 py-2.5 rounded-lg bg-rust-500 text-white font-medium hover:bg-rust-600 transition-colors"
                  >
                    Creer une sortie
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 text-sm text-dark-500">
                  <span className="font-semibold text-dark-800">{filteredSessions.length}</span> session{filteredSessions.length > 1 ? 's' : ''} trouvee{filteredSessions.length > 1 ? 's' : ''}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onClick={() => {
                        setSelectedSession(session);
                        setIsDrawerOpen(true);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Session Details Drawer */}
      <SessionDetailsDrawer
        session={selectedSession}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setTimeout(() => setSelectedSession(null), 300);
        }}
      />
    </div>
  );
}
