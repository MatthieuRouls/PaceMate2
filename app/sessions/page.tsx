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
    <div className="min-h-screen bg-gray-100 pt-20">
      {/* Header */}
      <div className="bg-secondary-700 text-white py-8 px-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Sessions de running</h1>
            <p className="text-gray-400">Trouve ta prochaine sortie et rejoins la communaute</p>
          </div>
          <Link
            href="/sessions/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Creer une sortie
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-700 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="text-sm font-semibold text-secondary-700">Filtrer par niveau</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterLevel === 'all'
                  ? 'bg-secondary-700 text-white'
                  : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterLevel('beginner')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterLevel === 'beginner'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
              }`}
            >
              Debutant
            </button>
            <button
              onClick={() => setFilterLevel('intermediate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterLevel === 'intermediate'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
              }`}
            >
              Intermediaire
            </button>
            <button
              onClick={() => setFilterLevel('advanced')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterLevel === 'advanced'
                  ? 'bg-secondary-800 text-white'
                  : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
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
          <div className="bg-white rounded-xl p-6 border border-red-200 text-center">
            <p className="text-red-600 font-semibold mb-1">Erreur</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {/* Sessions List */}
        {!loading && !error && (
          <>
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-gray-200">
                <div className="w-16 h-16 rounded-full bg-secondary-700 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-secondary-700 mb-2">
                  {filterLevel === 'all' ? 'Aucune session disponible' : 'Aucune session pour ce niveau'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {filterLevel === 'all'
                    ? 'Sois le premier a creer une sortie !'
                    : 'Essaie de changer les filtres ou cree ta propre session'}
                </p>
                <div className="flex gap-3 justify-center">
                  {filterLevel !== 'all' && (
                    <button
                      onClick={() => setFilterLevel('all')}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-secondary-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Voir toutes les sessions
                    </button>
                  )}
                  <Link
                    href="/sessions/create"
                    className="px-5 py-2.5 rounded-lg bg-secondary-700 text-white font-medium hover:bg-secondary-600 transition-colors"
                  >
                    Creer une sortie
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500">
                  <span className="font-semibold text-secondary-700">{filteredSessions.length}</span>
                  session{filteredSessions.length > 1 ? 's' : ''} trouvee{filteredSessions.length > 1 ? 's' : ''}
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
