'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Session } from '@/lib/types';
import SessionCard from '@/components/ui/SessionCard';

type FilterLevel = 'all' | 'beginner' | 'expert';

export default function SessionsPage() {
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

  return (
    <div className="py-4">
      <div className="container">
        {/* Header avec titre et bouton créer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Sessions de running</h1>
            <p style={{ fontSize: '0.875rem', color: '#6c757d' }}>
              Trouve ta prochaine sortie et rejoins la communauté
            </p>
          </div>
          <Link href="/sessions/create" className="btn-primary">
            ➕ Créer une sortie
          </Link>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterLevel('all')}
            className={filterLevel === 'all' ? 'btn-primary' : 'btn-secondary'}
          >
            Tous les niveaux
          </button>
          <button
            onClick={() => setFilterLevel('beginner')}
            className={filterLevel === 'beginner' ? 'btn-primary' : 'btn-secondary'}
          >
            Débutant (1-2 ⭐)
          </button>
          <button
            onClick={() => setFilterLevel('expert')}
            className={filterLevel === 'expert' ? 'btn-primary' : 'btn-secondary'}
          >
            Expert (4-5 ⭐)
          </button>
        </div>

        {/* États de chargement et erreur */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Chargement des sessions...</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '2px solid #dc3545' }}>
            <p style={{ color: '#dc3545', fontWeight: 600, marginBottom: '0.5rem' }}>❌ Erreur</p>
            <p style={{ color: '#6c757d' }}>{error}</p>
          </div>
        )}

        {/* Liste des sessions */}
        {!loading && !error && (
          <>
            {filteredSessions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏃‍♂️</p>
                <h3 style={{ marginBottom: '0.5rem' }}>
                  {filterLevel === 'all'
                    ? 'Aucune session disponible'
                    : 'Aucune session pour ce niveau'}
                </h3>
                <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
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
              <div className="grid grid-3">
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
