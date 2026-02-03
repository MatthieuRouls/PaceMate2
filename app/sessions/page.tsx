'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Session } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import SessionDetailsDrawer from '@/components/ui/SessionDetailsDrawer';
import { getAllUpcomingSessions } from '@/lib/actions';
import { Filter } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-forest-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-2 border-primary-500/20">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-500 to-forest-700 bg-clip-text text-transparent mb-3">
              Sessions de running
            </h1>
            <p className="text-lg text-secondary-600/80">
              Trouve ta prochaine sortie et rejoins la communauté
            </p>
          </div>
          <Link
            href="/sessions/create"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer une sortie
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-gradient-to-br from-white/90 to-primary-500/5 backdrop-blur-md rounded-3xl p-6 shadow-xl border-2 border-primary-500/30 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-secondary-600">Filtrer par niveau</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filterLevel === 'all'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg scale-105'
                  : 'bg-white/80 text-secondary-600 hover:bg-white hover:shadow-md'
              }`}
            >
              🌟 Tous les niveaux
            </button>
            <button
              onClick={() => setFilterLevel('beginner')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filterLevel === 'beginner'
                  ? 'bg-gradient-to-r from-primary-300 to-primary-500 text-white shadow-lg scale-105'
                  : 'bg-white/80 text-secondary-600 hover:bg-white hover:shadow-md'
              }`}
            >
              🌱 Débutant (1-2 ⭐)
            </button>
            <button
              onClick={() => setFilterLevel('intermediate')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filterLevel === 'intermediate'
                  ? 'bg-gradient-to-r from-primary-600 to-forest-700 text-white shadow-lg scale-105'
                  : 'bg-white/80 text-secondary-600 hover:bg-white hover:shadow-md'
              }`}
            >
              🔥 Intermédiaire (3 ⭐)
            </button>
            <button
              onClick={() => setFilterLevel('advanced')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filterLevel === 'advanced'
                  ? 'bg-gradient-to-r from-forest-800 to-secondary-600 text-white shadow-lg scale-105'
                  : 'bg-white/80 text-secondary-600 hover:bg-white hover:shadow-md'
              }`}
            >
              🚀 Avancé (4-5 ⭐)
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-3xl p-8 border-2 border-red-500 text-center shadow-lg">
            <p className="text-red-500 font-bold text-xl mb-2">❌ Erreur</p>
            <p className="text-secondary-600/70">{error}</p>
          </div>
        )}

        {/* Sessions List */}
        {!loading && !error && (
          <>
            {filteredSessions.length === 0 ? (
              <div className="bg-gradient-to-br from-primary-500/10 via-white to-forest-500/5 rounded-3xl p-12 text-center shadow-2xl border-2 border-primary-500/30">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-forest-700 flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-secondary-600 mb-4">
                  {filterLevel === 'all' ? 'Aucune session disponible' : 'Aucune session pour ce niveau'}
                </h3>
                <p className="text-lg text-secondary-600/80 mb-8">
                  {filterLevel === 'all'
                    ? 'Sois le premier à créer une sortie !'
                    : 'Essaie de changer les filtres ou crée ta propre session'}
                </p>
                <div className="flex gap-4 justify-center">
                  {filterLevel !== 'all' && (
                    <button
                      onClick={() => setFilterLevel('all')}
                      className="px-8 py-4 rounded-xl bg-white border-2 border-primary-500 text-primary-600 font-bold hover:bg-primary-50 transition-all shadow-lg hover:scale-105"
                    >
                      Voir toutes les sessions
                    </button>
                  )}
                  <Link
                    href="/sessions/create"
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    Créer une sortie
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 inline-flex items-center gap-3 shadow-lg border-2 border-primary-500/30">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">{filteredSessions.length}</span>
                  </div>
                  <span className="text-secondary-600 font-semibold">
                    session{filteredSessions.length > 1 ? 's' : ''} trouvée{filteredSessions.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
