'use client';

import { useEffect, useState, FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Team } from '@/lib/types';
import {
  getUserTeam,
  getTeamsLeaderboard,
  createTeam,
  leaveTeam,
} from '@/lib/actions';
import { getTeamConversation } from '@/lib/chat-actions';
import { useChat } from '@/components/chat';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Desactiver la pre-generation statique
export const dynamic = 'force-dynamic';

export default function TeamsPage() {
  const { openChat } = useChat();

  // State
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Affichage du formulaire de creation
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Formulaire de creation d'equipe
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Etat de quitter l'equipe
  const [leavingTeam, setLeavingTeam] = useState(false);

  // Recuperer les donnees
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Recuperer l'equipe de l'utilisateur
        const userTeamData = await getUserTeam();
        setUserTeam(userTeamData);

        // Recuperer le classement des equipes
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } catch (err) {
        console.error('Error fetching teams data:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des donnees');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Creer une equipe
  const handleCreateTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setCreatingTeam(true);
    setCreateError(null);

    try {
      const result = await createTeam(teamName, teamDescription);

      if (result.success && result.team_id) {
        // Recuperer l'equipe creee
        const newTeam = await getUserTeam();
        setUserTeam(newTeam);

        // Rafraichir le classement
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);

        // Reinitialiser le formulaire
        setTeamName('');
        setTeamDescription('');
        setShowCreateForm(false);
      } else {
        setCreateError(result.error || 'Erreur lors de la creation de l\'equipe');
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setCreateError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Quitter l'equipe
  const handleLeaveTeam = async () => {
    if (!userTeam) return;

    const confirmLeave = window.confirm(
      'Es-tu sur de vouloir quitter ton equipe ? Cette action est irreversible.'
    );

    if (!confirmLeave) return;

    setLeavingTeam(true);

    try {
      const result = await leaveTeam(userTeam.id);

      if (result.success) {
        setUserTeam(null);

        // Rafraichir le classement
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } else {
        alert(result.error || 'Erreur lors de la sortie de l\'equipe');
      }
    } catch (err) {
      console.error('Error leaving team:', err);
      alert(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setLeavingTeam(false);
    }
  };

  // Ouvrir le chat de l'equipe (popup)
  const handleOpenChat = async () => {
    if (!userTeam) return;

    try {
      const result = await getTeamConversation(userTeam.id);
      if (result.success && result.conversation) {
        openChat(result.conversation.id);
      }
    } catch (err) {
      console.error('Error opening team chat:', err);
    }
  };

  // Calculer le rang de l'equipe de l'utilisateur
  const getUserTeamRank = () => {
    if (!userTeam) return null;
    const rank = teams.findIndex((t) => t.id === userTeam.id) + 1;
    return rank > 0 ? rank : null;
  };

  // Badge de position pour le classement
  const getPositionBadge = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}`;
  };

  return (
    <div className="min-h-screen bg-neu-base pt-20">
      {/* Header */}
      <div className="bg-white border-b border-silver-400">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-dark-800 mb-1">Equipe</h1>
          <p className="text-sm text-dark-500">Gere ton equipe et suis ta progression</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-5 mb-6">
            <p className="text-pink-600 font-semibold mb-1">Erreur</p>
            <p className="text-dark-500 text-sm">{error}</p>
          </div>
        )}

        {/* Contenu principal */}
        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Colonne principale */}
            <div className="flex-1">
              {/* Si l'utilisateur a une equipe */}
              {userTeam ? (
                <div className="card overflow-hidden">
                  {/* En-tete de l'equipe */}
                  <div className="bg-dark-800 px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-silver-400 text-sm font-medium mb-1">Mon equipe</p>
                        <h2 className="text-xl font-bold text-white">{userTeam.name}</h2>
                      </div>
                      {getUserTeamRank() && (
                        <div className="bg-neon-700 rounded-lg px-4 py-2 text-center">
                          <p className="text-xs text-silver-300">Classement</p>
                          <p className="text-xl font-bold text-white">
                            {getPositionBadge(getUserTeamRank()!)}
                          </p>
                        </div>
                      )}
                    </div>
                    {userTeam.description && (
                      <p className="text-silver-400 mt-3 text-sm">{userTeam.description}</p>
                    )}
                  </div>

                  {/* Stats de l'equipe */}
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="bg-silver-100 rounded-lg p-4 text-center">
                        <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-neon-700 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-2xl font-bold text-dark-800">{userTeam.members_count || 0}</p>
                        <p className="text-xs text-dark-500">Membre{(userTeam.members_count || 0) > 1 ? 's' : ''}</p>
                      </div>
                      <div className="bg-silver-100 rounded-lg p-4 text-center">
                        <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-neon-400 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <p className="text-2xl font-bold text-dark-800">{(userTeam.total_distance || 0).toFixed(1)} <span className="text-sm font-normal">km</span></p>
                        <p className="text-xs text-dark-500">Distance totale</p>
                      </div>
                    </div>

                    {/* Chat d'equipe */}
                    <div className="border-t border-silver-300 pt-5">
                      <button
                        onClick={handleOpenChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-500 hover:bg-neon-400 text-dark-800 font-semibold rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chat de l'equipe
                      </button>
                    </div>

                    {/* Section informations supplementaires */}
                    <div className="border-t border-silver-300 pt-5 mt-5">
                      <h3 className="text-xs font-semibold text-silver-600 uppercase tracking-wider mb-3">Activite recente</h3>
                      <div className="bg-silver-100 rounded-lg p-4 text-center text-dark-500 text-sm">
                        Les statistiques detaillees arrivent bientot...
                      </div>
                    </div>

                    {/* Bouton quitter */}
                    <div className="mt-5 pt-5 border-t border-silver-300">
                      <button
                        onClick={handleLeaveTeam}
                        disabled={leavingTeam}
                        className="text-sm px-4 py-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {leavingTeam ? 'Chargement...' : 'Quitter l\'equipe'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Si l'utilisateur n'a pas d'equipe */
                <div className="card p-6">
                  {!showCreateForm ? (
                    /* Message d'invitation */
                    <div className="text-center py-6">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neon-700 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-bold text-dark-800 mb-2">Tu n'as pas encore d'equipe</h2>
                      <p className="text-dark-500 mb-5 max-w-md mx-auto text-sm">
                        Rejoins ou cree une equipe pour participer aux defis collectifs et grimper dans le classement !
                      </p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="neu-btn-white px-5 py-2.5 text-dark-800 font-medium"
                      >
                        Creer une equipe
                      </button>
                    </div>
                  ) : (
                    /* Formulaire de creation */
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-dark-800">Creer une equipe</h2>
                        <button
                          onClick={() => {
                            setShowCreateForm(false);
                            setCreateError(null);
                          }}
                          className="text-silver-500 hover:text-dark-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        {/* Erreur de creation */}
                        {createError && (
                          <div className="p-3 rounded-lg bg-pink-50 border border-pink-200">
                            <p className="text-pink-600 text-sm">{createError}</p>
                          </div>
                        )}

                        {/* Nom */}
                        <div>
                          <label htmlFor="teamName" className="block text-sm font-medium text-dark-800 mb-1">
                            Nom de l'equipe <span className="text-pink-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                            maxLength={50}
                            placeholder="Ex: Les Runners du dimanche"
                            className="w-full px-3 py-2 rounded-lg border border-silver-400 focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/20 transition-all text-dark-800 placeholder:text-silver-500"
                          />
                          <p className="text-xs text-silver-500 mt-1">{teamName.length}/50</p>
                        </div>

                        {/* Description */}
                        <div>
                          <label htmlFor="teamDescription" className="block text-sm font-medium text-dark-800 mb-1">
                            Description <span className="text-silver-500">(optionnel)</span>
                          </label>
                          <textarea
                            id="teamDescription"
                            value={teamDescription}
                            onChange={(e) => setTeamDescription(e.target.value)}
                            maxLength={200}
                            rows={3}
                            placeholder="Decris ton equipe..."
                            className="w-full px-3 py-2 rounded-lg border border-silver-400 focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/20 transition-all text-dark-800 placeholder:text-silver-500 resize-none"
                          />
                          <p className="text-xs text-silver-500 mt-1">{teamDescription.length}/200</p>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateForm(false);
                              setCreateError(null);
                            }}
                            className="flex-1 px-4 py-2 border border-silver-400 text-dark-600 font-medium rounded-full hover:bg-silver-100 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            disabled={creatingTeam || !teamName.trim()}
                            className="neu-btn-white flex-1 px-4 py-2 text-dark-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {creatingTeam ? 'Creation...' : 'Creer'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar - Classement compact */}
            <div className="lg:w-64">
              <div className="bg-dark-800 rounded-xl p-4 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-neon-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-white">Classement</h3>
                </div>

                {teams.length === 0 ? (
                  <p className="text-sm text-silver-400 text-center py-4">Aucune equipe</p>
                ) : (
                  <div className="space-y-1">
                    {teams.slice(0, 10).map((team, index) => {
                      const isUserTeam = userTeam && team.id === userTeam.id;
                      return (
                        <div
                          key={team.id}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            isUserTeam ? 'bg-neon-700' : 'hover:bg-dark-700'
                          }`}
                        >
                          <span className={`w-5 text-center font-bold text-sm ${
                            index < 3 ? 'text-silver-400' : 'text-silver-500'
                          }`}>
                            {getPositionBadge(index + 1)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isUserTeam ? 'text-silver-300' : 'text-white'
                            }`}>
                              {team.name}
                            </p>
                            <p className="text-xs text-silver-500">
                              {(team.total_distance || 0).toFixed(1)} km
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {teams.length > 10 && (
                      <p className="text-xs text-silver-500 text-center pt-2">
                        +{teams.length - 10} autres equipes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
