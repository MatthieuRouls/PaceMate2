'use client';

import { useEffect, useState } from 'react';
import {
  getAllSessions,
  updateSession,
  deleteSession,
  removeParticipant,
  updateParticipantStatus,
} from '@/lib/admin-actions';
import type { Session, Profile } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Edit2, Trash2, X, Save, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface SessionParticipant {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface SessionWithDetails extends Omit<Session, 'creator'> {
  creator: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  participants: SessionParticipant[];
}

export default function SessionsTab() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Session>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const result = await getAllSessions();
    if (result.success && result.sessions) {
      setSessions(result.sessions);
    }
    setLoading(false);
  };

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleEdit = (session: SessionWithDetails) => {
    setEditingId(session.id);
    setEditForm({
      title: session.title,
      description: session.description,
      location_name: session.location_name,
      distance_km: session.distance_km,
      level_required: session.level_required,
      max_participants: session.max_participants,
      walk_breaks_ok: session.walk_breaks_ok,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setSubmitting(true);
    const result = await updateSession(editingId, editForm);

    if (result.success) {
      await loadSessions();
      setEditingId(null);
      setEditForm({});
    } else {
      alert(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la session "${title}" ? Cette action est irréversible.`)) {
      return;
    }

    setSubmitting(true);
    const result = await deleteSession(id);

    if (result.success) {
      await loadSessions();
    } else {
      alert(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  };

  const handleRemoveParticipant = async (participantId: string, username: string) => {
    if (!confirm(`Retirer ${username} de cette session ?`)) {
      return;
    }

    setSubmitting(true);
    const result = await removeParticipant(participantId);

    if (result.success) {
      await loadSessions();
    } else {
      alert(result.error || 'Erreur lors de la suppression');
    }
    setSubmitting(false);
  };

  const handleUpdateParticipantStatus = async (
    participantId: string,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  ) => {
    setSubmitting(true);
    const result = await updateParticipantStatus(participantId, status);

    if (result.success) {
      await loadSessions();
    } else {
      alert(result.error || 'Erreur lors de la mise à jour');
    }
    setSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Sessions</h2>
        <Button variant="outline" onClick={loadSessions} disabled={submitting}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const isEditing = editingId === session.id;
          const isExpanded = expandedSessions.has(session.id);
          const participantCount = session.participants?.length || 0;

          return (
            <div
              key={session.id}
              className={`bg-white rounded-lg border ${
                isEditing ? 'border-blue-500 shadow-lg' : 'border-gray-200'
              } overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Title */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                        placeholder="Titre"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">{formatDate(session.start_time)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Lieu:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.location_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="font-medium">{session.location_name}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Distance:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editForm.distance_km || 0}
                            onChange={(e) =>
                              setEditForm({ ...editForm, distance_km: parseFloat(e.target.value) })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="font-medium">{session.distance_km} km</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Niveau requis:</span>
                        {isEditing ? (
                          <select
                            value={editForm.level_required || 1}
                            onChange={(e) =>
                              setEditForm({ ...editForm, level_required: parseInt(e.target.value) })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                          </select>
                        ) : (
                          <p className="font-medium">Niveau {session.level_required}</p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {isEditing ? (
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                        placeholder="Description"
                      />
                    ) : (
                      session.description && (
                        <p className="text-gray-600 text-sm">{session.description}</p>
                      )
                    )}

                    {/* Creator & Participants */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        Créateur: <span className="font-medium text-gray-900">{session.creator.username}</span>
                      </span>
                      <button
                        onClick={() => toggleExpanded(session.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Users className="w-4 h-4" />
                        {participantCount} participant{participantCount > 1 ? 's' : ''}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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
                          onClick={() => handleEdit(session)}
                          disabled={submitting}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id, session.title)}
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

                {/* Participants List */}
                {isExpanded && session.participants && session.participants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Participants:</h4>
                    <div className="space-y-2">
                      {session.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{participant.user.username}</span>
                            <select
                              value={participant.status}
                              onChange={(e) =>
                                handleUpdateParticipantStatus(
                                  participant.id,
                                  e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed'
                                )
                              }
                              disabled={submitting}
                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmé</option>
                              <option value="cancelled">Annulé</option>
                              <option value="completed">Terminé</option>
                            </select>
                          </div>
                          <button
                            onClick={() => handleRemoveParticipant(participant.id, participant.user.username)}
                            disabled={submitting}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Retirer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucune session trouvée</div>
      )}
    </div>
  );
}
