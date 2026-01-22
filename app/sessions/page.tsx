'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';
import { useTheme } from '@/components/providers/ThemeProvider';

type FilterLevel = 'all' | 'beginner' | 'expert';

export default function SessionsPage() {
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');

  // Récupérer les sessions depuis Supabase
  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select(`
            *,
            creator:profiles!sessions_creator_id_fkey(id, username, running_level, avatar_url)
          `)
          .gte('start_time', new Date().toISOString()) // Seulement les sessions futures
          .order('start_time', { ascending: true });

        if (fetchError) throw fetchError;

        // Compter les participants pour chaque session
        const sessionsWithCounts = await Promise.all(
          (data || []).map(async (session) => {
            const { count } = await supabase
              .from('session_participants')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .eq('status', 'confirmed');

            return {
              ...session,
              participants_count: count || 0,
            };
          })
        );

        setSessions(sessionsWithCounts);
        setFilteredSessions(sessionsWithCounts);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des sessions');
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
      filtered = filtered.filter(s => s.level_required <= 2);
    } else if (filterLevel === 'expert') {
      filtered = filtered.filter(s => s.level_required >= 4);
    }

    setFilteredSessions(filtered);
  }, [filterLevel, sessions]);

  // Composant bouton de filtre
  const FilterButton = ({ level, label }: { level: FilterLevel; label: string }) => (
    <button
      onClick={() => setFilterLevel(level)}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        filterLevel === level
          ? 'btn-primary'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      style={
        filterLevel === level
          ? {}
          : theme === 'elite'
          ? { backgroundColor: 'rgba(167, 139, 250, 0.1)', color: 'var(--color-text)' }
          : {}
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header avec titre et bouton créer */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Sessions de running
            </h1>
            <p className="text-sm md:text-base opacity-75">
              Trouve ta prochaine sortie et rejoins la communauté
            </p>
          </div>
          <button className="btn-primary whitespace-nowrap">
            ➕ Créer une sortie
          </button>
        </div>

        {/* Filtres */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            <FilterButton level="all" label="Tous les niveaux" />
            <FilterButton level="beginner" label="Débutant (1-2 ⭐)" />
            <FilterButton level="expert" label="Expert (4-5 ⭐)" />
          </div>
        </div>

        {/* États de chargement et erreur */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
                 style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4 opacity-75">Chargement des sessions...</p>
          </div>
        )}

        {error && (
          <div className="card border-2 border-red-500 text-center py-8">
            <p className="text-red-500 font-semibold mb-2">❌ Erreur</p>
            <p className="opacity-75">{error}</p>
          </div>
        )}

        {/* Liste des sessions */}
        {!loading && !error && (
          <>
            {filteredSessions.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-2xl mb-4">🏃‍♂️</p>
                <h3 className="text-xl font-semibold mb-2">
                  {filterLevel === 'all'
                    ? 'Aucune session disponible'
                    : 'Aucune session pour ce niveau'}
                </h3>
                <p className="opacity-75 mb-6">
                  {filterLevel === 'all'
                    ? 'Sois le premier à créer une sortie !'
                    : 'Essaie de changer les filtres ou crée ta propre session'}
                </p>
                {filterLevel !== 'all' && (
                  <button
                    onClick={() => setFilterLevel('all')}
                    className="btn-primary"
                  >
                    Voir toutes les sessions
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
