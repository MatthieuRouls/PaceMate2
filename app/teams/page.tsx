'use client';

import { useEffect, useState, FormEvent } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-100/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-secondary-600 mb-2">Équipes</h1>
          <p className="text-gray-600">Rejoins une équipe et grimpe dans le classement</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 mb-4">
              <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Chargement...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-3xl shadow-lg border-2 border-red-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-900 font-bold text-xl">Erreur</p>
            </div>
            <p className="text-red-700 ml-15">{error}</p>
          </div>
        )}

        {/* Contenu principal */}
        {!loading && !error && (
          <div className="space-y-8">
            {/* Section Mon équipe */}
            {userTeam && (
              <div className="bg-white rounded-3xl shadow-lg border-2 border-primary-500 p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-600">Mon équipe</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-secondary-600 mb-2">{userTeam.name}</h3>
                    {userTeam.description && (
                      <p className="text-gray-600">{userTeam.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border border-primary-100">
                      <p className="text-sm text-gray-600 mb-2 font-medium">👥 Membres</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {userTeam.members_count || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border border-primary-100">
                      <p className="text-sm text-gray-600 mb-2 font-medium">🏃 Distance totale</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {(userTeam.total_distance || 0).toFixed(1)} <span className="text-lg">km</span>
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 border border-primary-100">
                      <p className="text-sm text-gray-600 mb-2 font-medium">🏆 Classement</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {getUserTeamRank() ? `${getUserTeamRank()}e` : '-'}
                        {getUserTeamRank() && getUserTeamRank()! <= 3 && (
                          <span className="ml-2 text-2xl">
                            {getUserTeamRank() === 1 && '🥇'}
                            {getUserTeamRank() === 2 && '🥈'}
                            {getUserTeamRank() === 3 && '🥉'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Bouton quitter */}
                  <div className="pt-6 border-t border-gray-100">
                    <button
                      onClick={handleLeaveTeam}
                      disabled={leavingTeam}
                      className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl border-2 border-red-200 hover:border-red-300 hover:bg-red-50 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {leavingTeam ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Chargement...
                        </span>
                      ) : (
                        '🚪 Quitter l\'équipe'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section Créer une équipe */}
            {!userTeam && (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-600">Créer une équipe</h2>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-6">
                  {/* Erreur de création */}
                  {createError && (
                    <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="font-semibold text-red-900 text-lg">Erreur</p>
                      </div>
                      <p className="text-red-700 ml-13">{createError}</p>
                    </div>
                  )}

                  {/* Nom */}
                  <div>
                    <label htmlFor="teamName" className="block text-sm font-semibold text-secondary-600 mb-2">
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400"
                    />
                    <p className="text-sm text-gray-500 mt-2">{teamName.length}/50 caractères</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="teamDescription" className="block text-sm font-semibold text-secondary-600 mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      id="teamDescription"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Décris ton équipe et son ambiance..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400 resize-none"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {teamDescription.length}/200 caractères
                    </p>
                  </div>

                  {/* Bouton submit */}
                  <button
                    type="submit"
                    disabled={creatingTeam || !teamName.trim()}
                    className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {creatingTeam ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Création en cours...
                      </span>
                    ) : (
                      '✨ Créer mon équipe'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Section Classement */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-secondary-600">Classement des équipes</h2>
              </div>

              {teams.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-4xl">🏃‍♂️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-600 mb-2">Aucune équipe pour le moment</h3>
                  <p className="text-gray-600">Sois le premier à créer une équipe !</p>
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
