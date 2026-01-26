'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Team } from '@/lib/types';
import TeamCard from '@/components/ui/TeamCard';
import {
  getUserTeam,
  getTeamsLeaderboard,
  createTeam,
  leaveTeam,
} from '@/lib/actions';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

export default function TeamsPage() {
  const { theme } = useTheme();

  // State
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire de création d'équipe
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // État de quitter l'équipe
  const [leavingTeam, setLeavingTeam] = useState(false);

  // Récupérer les données
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Récupérer l'équipe de l'utilisateur
        const userTeamData = await getUserTeam();
        setUserTeam(userTeamData);

        // Récupérer le classement des équipes
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } catch (err) {
        console.error('Error fetching teams data:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Créer une équipe
  const handleCreateTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setCreatingTeam(true);
    setCreateError(null);

    try {
      const result = await createTeam(teamName, teamDescription);

      if (result.success && result.team_id) {
        // Récupérer l'équipe créée
        const newTeam = await getUserTeam();
        setUserTeam(newTeam);

        // Rafraîchir le classement
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);

        // Réinitialiser le formulaire
        setTeamName('');
        setTeamDescription('');
      } else {
        setCreateError(result.error || 'Erreur lors de la création de l\'équipe');
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setCreateError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Quitter l'équipe
  const handleLeaveTeam = async () => {
    if (!userTeam) return;

    const confirmLeave = window.confirm(
      'Es-tu sûr de vouloir quitter ton équipe ? Cette action est irréversible.'
    );

    if (!confirmLeave) return;

    setLeavingTeam(true);

    try {
      const result = await leaveTeam(userTeam.id);

      if (result.success) {
        setUserTeam(null);

        // Rafraîchir le classement
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } else {
        alert(result.error || 'Erreur lors de la sortie de l\'équipe');
      }
    } catch (err) {
      console.error('Error leaving team:', err);
      alert(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setLeavingTeam(false);
    }
  };

  // Calculer le rang de l'équipe de l'utilisateur
  const getUserTeamRank = () => {
    if (!userTeam) return null;
    const rank = teams.findIndex((t) => t.id === userTeam.id) + 1;
    return rank > 0 ? rank : null;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Équipes</h1>
          <p className="opacity-75">Rejoins une équipe et grimpe dans le classement</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: 'var(--color-primary)' }}
            ></div>
            <p className="mt-4 opacity-75">Chargement...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card border-2 border-red-500 text-center py-8 mb-8">
            <p className="text-red-500 font-semibold mb-2">❌ Erreur</p>
            <p className="opacity-75">{error}</p>
          </div>
        )}

        {/* Contenu principal */}
        {!loading && !error && (
          <div className="space-y-8">
            {/* Section Mon équipe */}
            {userTeam && (
              <div className="card border-2" style={{ borderColor: 'var(--color-primary)' }}>
                <h2 className="text-2xl font-bold mb-4">Mon équipe</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{userTeam.name}</h3>
                    {userTeam.description && (
                      <p className="opacity-75 mb-3">{userTeam.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm opacity-75 mb-1">Membres</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                        {userTeam.members_count || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75 mb-1">Distance totale</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                        {(userTeam.total_distance || 0).toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75 mb-1">Classement</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                        {getUserTeamRank() || '-'}
                        {getUserTeamRank() && getUserTeamRank()! <= 3 && (
                          <span className="ml-2">
                            {getUserTeamRank() === 1 && '🥇'}
                            {getUserTeamRank() === 2 && '🥈'}
                            {getUserTeamRank() === 3 && '🥉'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Bouton quitter */}
                  <div className="pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    <button
                      onClick={handleLeaveTeam}
                      disabled={leavingTeam}
                      className="px-4 py-2 rounded-lg border-2 border-red-500 text-red-500 font-medium hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: 'var(--radius)' }}
                    >
                      {leavingTeam ? '⏳ Chargement...' : '🚪 Quitter l\'équipe'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section Créer une équipe */}
            {!userTeam && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Créer une équipe</h2>

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  {/* Erreur de création */}
                  {createError && (
                    <div
                      className="p-4 rounded-lg border-2 border-red-500 bg-red-50 text-red-700"
                      style={
                        theme === 'elite'
                          ? {
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderColor: 'rgb(239, 68, 68)',
                            }
                          : {}
                      }
                    >
                      <p className="font-semibold">❌ Erreur</p>
                      <p className="text-sm mt-1">{createError}</p>
                    </div>
                  )}

                  {/* Nom */}
                  <div>
                    <label htmlFor="teamName" className="block font-semibold mb-2">
                      Nom de l'équipe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      maxLength={50}
                      placeholder="Ex: Les Runners du dimanche"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{
                        borderRadius: 'var(--radius)',
                        borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
                      }}
                    />
                    <p className="text-sm opacity-75 mt-1">{teamName.length}/50 caractères</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="teamDescription" className="block font-semibold mb-2">
                      Description
                    </label>
                    <textarea
                      id="teamDescription"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Décris ton équipe et son ambiance..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                      style={{
                        borderRadius: 'var(--radius)',
                        borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
                      }}
                    />
                    <p className="text-sm opacity-75 mt-1">
                      {teamDescription.length}/200 caractères
                    </p>
                  </div>

                  {/* Bouton submit */}
                  <button
                    type="submit"
                    disabled={creatingTeam || !teamName.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingTeam ? '⏳ Création en cours...' : '✨ Créer mon équipe'}
                  </button>
                </form>
              </div>
            )}

            {/* Section Classement */}
            <div>
              <h2 className="text-2xl font-bold mb-6">🏆 Classement des équipes</h2>

              {teams.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-2xl mb-4">🏃‍♂️</p>
                  <h3 className="text-xl font-semibold mb-2">Aucune équipe pour le moment</h3>
                  <p className="opacity-75">Sois le premier à créer une équipe !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team, index) => (
                    <TeamCard key={team.id} team={team} position={index + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
