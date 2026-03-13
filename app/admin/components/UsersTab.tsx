'use client';

import { useEffect, useState } from 'react';
import {
  getAllProfiles, updateAdminProfile, deleteProfile,
  suspendUser, unsuspendUser, grantAdminRole, revokeAdminRole,
  forcePhoneVerified, forceIdentityVerified, resetIdentityVerification,
} from '@/lib/admin-actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  RefreshCw, Search, Edit2, Trash2, X, Save, ChevronDown, ChevronUp,
  Shield, ShieldCheck, Phone, Ban, CheckCircle, Crown, Eye,
  UserX, RotateCcw,
} from 'lucide-react';

interface AdminProfile {
  id: string;
  username: string;
  email?: string;
  running_level: number;
  avatar_url?: string;
  bio?: string;
  team_id?: string;
  total_distance_km: number;
  xp_points: number;
  created_at: string;
  phone_number?: string;
  phone_verified?: boolean;
  safety_enhanced_mode?: boolean;
  trusted_contact_name?: string;
  is_admin?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string;
  team?: { id: string; name: string };
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Débutant', 2: 'Occasionnel', 3: 'Régulier', 4: 'Confirmé', 5: 'Expert',
};

export default function UsersTab({ onRefreshStats }: { onRefreshStats?: () => void }) {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'suspended' | 'admin'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminProfile>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ id: string; username: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [forcePhoneModal, setForcePhoneModal] = useState<{ id: string; username: string } | null>(null);
  const [forcePhone, setForcePhone] = useState('');

  useEffect(() => { loadProfiles(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProfiles = async (q?: string) => {
    setLoading(true);
    const result = await getAllProfiles(q || search || undefined);
    if (result.success && result.profiles) setProfiles(result.profiles as AdminProfile[]);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProfiles(search);
  };

  const filtered = profiles.filter((p) => {
    if (filter === 'verified') return p.phone_verified;
    if (filter === 'suspended') return p.is_suspended;
    if (filter === 'admin') return p.is_admin;
    return true;
  });

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSubmitting(true);
    const result = await updateAdminProfile(editingId, editForm as AdminProfile);
    setSubmitting(false);
    if (result.success) { showToast('Profil mis à jour'); await loadProfiles(); setEditingId(null); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Supprimer "${username}" ? Action irréversible.`)) return;
    setSubmitting(true);
    const result = await deleteProfile(id);
    setSubmitting(false);
    if (result.success) { showToast('Utilisateur supprimé'); await loadProfiles(); onRefreshStats?.(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleSuspend = async () => {
    if (!suspendModal || !suspendReason) return;
    setSubmitting(true);
    const result = await suspendUser(suspendModal.id, suspendReason);
    setSubmitting(false);
    setSuspendModal(null);
    setSuspendReason('');
    if (result.success) { showToast('Compte suspendu'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleUnsuspend = async (id: string) => {
    setSubmitting(true);
    const result = await unsuspendUser(id);
    setSubmitting(false);
    if (result.success) { showToast('Compte réactivé'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleToggleAdmin = async (id: string, isAdmin: boolean) => {
    if (!confirm(isAdmin ? 'Retirer les droits admin ?' : 'Accorder les droits admin ?')) return;
    setSubmitting(true);
    const result = isAdmin ? await revokeAdminRole(id) : await grantAdminRole(id);
    setSubmitting(false);
    if (result.success) { showToast(isAdmin ? 'Droits admin retirés' : 'Admin accordé'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleForcePhone = async () => {
    if (!forcePhoneModal || !forcePhone) return;
    setSubmitting(true);
    const result = await forcePhoneVerified(forcePhoneModal.id, forcePhone);
    setSubmitting(false);
    setForcePhoneModal(null);
    setForcePhone('');
    if (result.success) { showToast('Téléphone marqué vérifié'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleForceIdentity = async (id: string, username: string) => {
    if (!confirm(`Marquer l'identité de "${username}" comme vérifiée (bypass IA) ?`)) return;
    setSubmitting(true);
    const result = await forceIdentityVerified(id);
    setSubmitting(false);
    if (result.success) { showToast('Identité forcée niveau 2'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleResetIdentity = async (id: string, username: string) => {
    if (!confirm(`Réinitialiser la vérification d'identité de "${username}" ?`)) return;
    setSubmitting(true);
    const result = await resetIdentityVerification(id);
    setSubmitting(false);
    if (result.success) { showToast('Vérification réinitialisée'); await loadProfiles(); }
    else showToast(result.error || 'Erreur', false);
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex-1">Gestion des utilisateurs</h2>
        <button onClick={() => loadProfiles()} disabled={submitting} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 outline-none"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
            Chercher
          </button>
        </form>
        <div className="flex gap-1">
          {(['all', 'verified', 'suspended', 'admin'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${filter === f ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'all' ? 'Tous' : f === 'verified' ? '📱 Vérifiés' : f === 'suspended' ? '🚫 Suspendus' : '👑 Admins'}
              <span className="ml-1 text-gray-400">
                ({f === 'all' ? profiles.length : profiles.filter((p) =>
                  f === 'verified' ? p.phone_verified : f === 'suspended' ? p.is_suspended : p.is_admin
                ).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Niveau</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">XP / Distance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Équipe</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((profile) => {
                  const isEditing = editingId === profile.id;
                  const isExpanded = expandedId === profile.id;

                  return (
                    <>
                      <tr key={profile.id} className={`${isEditing ? 'bg-purple-50' : profile.is_suspended ? 'bg-red-50/40' : 'hover:bg-gray-50'} transition-colors`}>
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {profile.username.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.username || ''}
                                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded w-32"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-900">{profile.username}</span>
                                  {profile.is_admin && <Crown className="w-3.5 h-3.5 text-yellow-500" title="Admin" />}
                                  {profile.is_suspended && <Ban className="w-3.5 h-3.5 text-red-500" title="Suspendu" />}
                                </div>
                              )}
                              <p className="text-xs text-gray-400">{profile.email || 'no email'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editForm.running_level || 1}
                              onChange={(e) => setEditForm({ ...editForm, running_level: parseInt(e.target.value) })}
                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              {[1,2,3,4,5].map((l) => <option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>)}
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Niv. {profile.running_level}
                            </span>
                          )}
                        </td>

                        {/* XP / Distance */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="number"
                                value={editForm.xp_points || 0}
                                onChange={(e) => setEditForm({ ...editForm, xp_points: parseInt(e.target.value) })}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                                placeholder="XP"
                              />
                              <input
                                type="number"
                                step="0.1"
                                value={editForm.total_distance_km || 0}
                                onChange={(e) => setEditForm({ ...editForm, total_distance_km: parseFloat(e.target.value) })}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                                placeholder="km"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-semibold text-gray-700">{profile.xp_points} XP</div>
                              <div className="text-xs text-gray-500">{(profile.total_distance_km || 0).toFixed(1)} km</div>
                            </div>
                          )}
                        </td>

                        {/* Status badges */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {profile.phone_verified ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                                <Phone className="w-3 h-3" /> SMS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                                <Phone className="w-3 h-3" /> —
                              </span>
                            )}
                            {profile.safety_enhanced_mode && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">
                                <Shield className="w-3 h-3" /> Safety
                              </span>
                            )}
                            {profile.trusted_contact_name && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium">
                                👤 Contact
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Team */}
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {profile.team?.name || <span className="text-gray-400">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={handleSaveEdit} disabled={submitting} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Sauvegarder">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Annuler">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setExpandedId(expandedId === profile.id ? null : profile.id); }}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                                  title="Détails"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => { setEditingId(profile.id); setEditForm({ username: profile.username, running_level: profile.running_level, xp_points: profile.xp_points, total_distance_km: profile.total_distance_km, bio: profile.bio }); }}
                                  disabled={submitting}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(profile.id, profile.username)} disabled={submitting} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {isExpanded && (
                        <tr key={`${profile.id}-expanded`} className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                                <p className="text-sm font-medium">{profile.phone_number || '—'}</p>
                                {profile.phone_verified && <span className="text-xs text-green-600">✓ Vérifié</span>}
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Contact de confiance</p>
                                <p className="text-sm font-medium">{profile.trusted_contact_name || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Inscrit le</p>
                                <p className="text-sm">{new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Bio</p>
                                <p className="text-sm text-gray-600 truncate max-w-xs">{profile.bio || '—'}</p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                              {/* Admin toggle */}
                              <button
                                onClick={() => handleToggleAdmin(profile.id, !!profile.is_admin)}
                                disabled={submitting}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${profile.is_admin ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              >
                                <Crown className="w-3.5 h-3.5" />
                                {profile.is_admin ? 'Retirer admin' : 'Rendre admin'}
                              </button>

                              {/* Suspend / Unsuspend */}
                              {profile.is_suspended ? (
                                <button
                                  onClick={() => handleUnsuspend(profile.id)}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Réactiver
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSuspendModal({ id: profile.id, username: profile.username })}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Suspendre
                                </button>
                              )}

                              {/* Force phone verified */}
                              {!profile.phone_verified && (
                                <button
                                  onClick={() => setForcePhoneModal({ id: profile.id, username: profile.username })}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Forcer tél. vérifié
                                </button>
                              )}

                              {/* Force identity verified */}
                              <button
                                onClick={() => handleForceIdentity(profile.id, profile.username)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Forcer identité niveau 2
                              </button>

                              {/* Reset identity */}
                              <button
                                onClick={() => handleResetIdentity(profile.id, profile.username)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset vérification
                              </button>

                              {/* View as user */}
                              <a
                                href={`/profile?uid=${profile.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Voir profil
                              </a>
                            </div>

                            {profile.is_suspended && profile.suspension_reason && (
                              <p className="mt-2 text-xs text-red-600">
                                <span className="font-semibold">Raison de suspension :</span> {profile.suspension_reason}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucun utilisateur trouvé</div>
      )}

      {/* Suspend modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Suspendre <span className="text-red-600">{suspendModal.username}</span></h3>
            <p className="text-sm text-gray-600 mb-4">Indique la raison (visible dans les logs).</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Raison de la suspension..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:border-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleSuspend} disabled={!suspendReason || submitting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                Suspendre
              </button>
              <button onClick={() => { setSuspendModal(null); setSuspendReason(''); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force phone modal */}
      {forcePhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Forcer téléphone — {forcePhoneModal.username}</h3>
            <p className="text-sm text-gray-600 mb-4">Renseigne le numéro et il sera marqué comme vérifié (test).</p>
            <input
              type="tel"
              value={forcePhone}
              onChange={(e) => setForcePhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleForcePhone} disabled={!forcePhone || submitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                Confirmer
              </button>
              <button onClick={() => { setForcePhoneModal(null); setForcePhone(''); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
