'use client';

import { useEffect, useState } from 'react';
import { getAllProfiles, updateProfile, deleteProfile } from '@/lib/admin-actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Edit2, Trash2, X, Save, RefreshCw } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  running_level: number;
  avatar_url?: string;
  bio?: string;
  team_id?: string;
  total_distance_km: number;
  xp_points: number;
  created_at: string;
  team?: {
    id: string;
    name: string;
  };
}

export default function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const result = await getAllProfiles();
    if (result.success && result.profiles) {
      setProfiles(result.profiles);
    }
    setLoading(false);
  };

  const handleEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditForm({
      username: profile.username,
      running_level: profile.running_level,
      bio: profile.bio,
      total_distance_km: profile.total_distance_km,
      xp_points: profile.xp_points,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setSubmitting(true);
    const result = await updateProfile(editingId, editForm);

    if (result.success) {
      await loadProfiles();
      setEditingId(null);
      setEditForm({});
    } else {
      alert(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ? Cette action est irréversible.`)) {
      return;
    }

    setSubmitting(true);
    const result = await deleteProfile(id);

    if (result.success) {
      await loadProfiles();
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
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
        <Button variant="outline" onClick={loadProfiles} disabled={submitting}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Niveau</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distance (km)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">XP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Équipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map((profile) => {
                const isEditing = editingId === profile.id;

                return (
                  <tr key={profile.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.username || ''}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <div className="font-medium text-gray-900">{profile.username}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.running_level || 1}
                          onChange={(e) => setEditForm({ ...editForm, running_level: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value={1}>1 - Débutant</option>
                          <option value={2}>2 - Occasionnel</option>
                          <option value={3}>3 - Régulier</option>
                          <option value={4}>4 - Confirmé</option>
                          <option value={5}>5 - Expert</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Niveau {profile.running_level}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.total_distance_km || 0}
                          onChange={(e) => setEditForm({ ...editForm, total_distance_km: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-gray-700">{profile.total_distance_km.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.xp_points || 0}
                          onChange={(e) => setEditForm({ ...editForm, xp_points: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-gray-700">{profile.xp_points}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700 text-sm">
                        {profile.team?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {isEditing ? (
                        <textarea
                          value={editForm.bio || ''}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows={2}
                        />
                      ) : (
                        <span className="text-gray-600 text-sm truncate block">
                          {profile.bio || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Sauvegarder"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(profile)}
                              disabled={submitting}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(profile.id, profile.username)}
                              disabled={submitting}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun utilisateur trouvé
        </div>
      )}
    </div>
  );
}
