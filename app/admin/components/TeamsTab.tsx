'use client';

import { useEffect, useState } from 'react';
import { getAllTeams, updateTeam, deleteTeam } from '@/lib/admin-actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Edit2, Trash2, X, Save, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamMember {
  id: string;
  role: 'captain' | 'member';
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  city?: string;
  total_distance: number;
  created_at: string;
  members: TeamMember[];
}

export default function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Team>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    const result = await getAllTeams();
    if (result.success && result.teams) {
      setTeams(result.teams);
    }
    setLoading(false);
  };

  const toggleExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleEdit = (team: Team) => {
    setEditingId(team.id);
    setEditForm({
      name: team.name,
      description: team.description,
      city: team.city,
      total_distance: team.total_distance,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setSubmitting(true);
    const result = await updateTeam(editingId, editForm);

    if (result.success) {
      await loadTeams();
      setEditingId(null);
      setEditForm({});
    } else {
      alert(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer l'équipe "${name}" ? Cette action est irréversible et retirera tous les membres.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    const result = await deleteTeam(id);

    if (result.success) {
      await loadTeams();
    } else {
      alert(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Équipes</h2>
        <Button variant="outline" onClick={loadTeams} disabled={submitting}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="space-y-4">
        {teams.map((team) => {
          const isEditing = editingId === team.id;
          const isExpanded = expandedTeams.has(team.id);
          const memberCount = team.members?.length || 0;
          const captain = team.members?.find((m) => m.role === 'captain');

          return (
            <div
              key={team.id}
              className={`bg-white rounded-lg border ${
                isEditing ? 'border-pink-500 shadow-lg' : 'border-gray-200'
              } overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Team Name */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                        placeholder="Nom de l'équipe"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Ville:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.city || ''}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                            placeholder="Ville"
                          />
                        ) : (
                          <p className="font-medium">{team.city || '-'}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Distance totale:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editForm.total_distance || 0}
                            onChange={(e) =>
                              setEditForm({ ...editForm, total_distance: parseFloat(e.target.value) })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                          />
                        ) : (
                          <p className="font-medium">{team.total_distance.toFixed(1)} km</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Capitaine:</span>
                        <p className="font-medium">{captain?.user.username || '-'}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {isEditing ? (
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                        placeholder="Description de l'équipe"
                      />
                    ) : (
                      team.description && <p className="text-gray-600 text-sm">{team.description}</p>
                    )}

                    {/* Members Button */}
                    <button
                      onClick={() => toggleExpanded(team.id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Users className="w-4 h-4" />
                      {memberCount} membre{memberCount > 1 ? 's' : ''}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          disabled={submitting}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Sauvegarder"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={submitting}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annuler"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(team)}
                          disabled={submitting}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(team.id, team.name)}
                          disabled={submitting}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Members List */}
                {isExpanded && team.members && team.members.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Membres:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{member.user.username}</span>
                            {member.role === 'captain' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Capitaine
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucune équipe trouvée</div>
      )}
    </div>
  );
}
