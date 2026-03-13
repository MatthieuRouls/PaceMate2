'use client';

import { useEffect, useState } from 'react';
import { useConfirmModal } from './ConfirmModal';
import {
  getAllIdentityVerifications,
  approveIdentityVerification,
  rejectIdentityVerification,
  forceIdentityVerified,
  resetIdentityVerification,
} from '@/lib/admin-actions';
import {
  RefreshCw, ShieldCheck, X, Check, AlertTriangle,
  Clock, Eye, RotateCcw, Filter,
} from 'lucide-react';

interface IdentityVerification {
  id: string;
  user_id: string;
  level: number;
  level_name: string;
  id_verified: boolean;
  id_verified_at?: string;
  id_document_type?: string;
  id_document_country?: string;
  selfie_match_score?: number;
  selfie_match_passed: boolean;
  admin_review_required: boolean;
  admin_review_reason?: string;
  admin_reviewed_at?: string;
  verification_attempts: number;
  flagged_for_fraud: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatar_url?: string;
  };
}

const DOC_LABELS: Record<string, string> = {
  passport: 'Passeport',
  national_id: 'Carte d\'identité',
  drivers_license: 'Permis de conduire',
  residence_permit: 'Titre de séjour',
};

const LEVEL_BADGES: Record<number, { label: string; color: string }> = {
  0: { label: 'Basic', color: 'bg-gray-100 text-gray-600' },
  1: { label: 'Tél. vérifié', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'ID vérifié', color: 'bg-green-100 text-green-700' },
  3: { label: 'De confiance', color: 'bg-purple-100 text-purple-700' },
};

export default function IdentityReviewTab() {
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; userId: string; username: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { confirm, ConfirmModalNode } = useConfirmModal();

  useEffect(() => { loadVerifications(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadVerifications = async () => {
    setLoading(true);
    const result = await getAllIdentityVerifications();
    if (result.success && result.verifications) {
      setVerifications(result.verifications as IdentityVerification[]);
    }
    setLoading(false);
  };

  const filtered = verifications.filter((v) => {
    if (filter === 'pending') return v.admin_review_required && !v.id_verified;
    if (filter === 'verified') return v.id_verified;
    if (filter === 'rejected') return !v.id_verified && !v.admin_review_required && v.verification_attempts > 0;
    return true;
  });

  const pendingCount = verifications.filter((v) => v.admin_review_required && !v.id_verified).length;

  const handleApprove = async (v: IdentityVerification) => {
    if (!await confirm({ title: `Approuver — ${v.user?.username}`, message: "L'identité sera marquée comme vérifiée (niveau 2). L'utilisateur recevra le badge vérifié.", confirmLabel: 'Approuver', variant: 'info' })) return;
    setSubmitting(v.id);
    const result = await approveIdentityVerification(v.id, v.user_id);
    setSubmitting(null);
    if (result.success) { showToast('Identité approuvée ✓'); await loadVerifications(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason) return;
    setSubmitting(rejectModal.id);
    const result = await rejectIdentityVerification(rejectModal.id, rejectModal.userId, rejectReason);
    setSubmitting(null);
    setRejectModal(null);
    setRejectReason('');
    if (result.success) { showToast('Vérification rejetée'); await loadVerifications(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleForce = async (v: IdentityVerification) => {
    if (!await confirm({ title: `Forcer l'identité — ${v.user?.username}`, message: 'Bypass IA : marque l\'identité comme vérifiée sans analyse des documents. À utiliser pour les tests uniquement.', confirmLabel: 'Forcer', variant: 'warning' })) return;
    setSubmitting(v.id);
    const result = await forceIdentityVerified(v.user_id);
    setSubmitting(null);
    if (result.success) { showToast('Identité forcée niveau 2'); await loadVerifications(); }
    else showToast(result.error || 'Erreur', false);
  };

  const handleReset = async (v: IdentityVerification) => {
    if (!await confirm({ title: `Réinitialiser — ${v.user?.username}`, message: 'La vérification sera supprimée. L\'utilisateur devra recommencer depuis le début.', confirmLabel: 'Réinitialiser', variant: 'warning' })) return;
    setSubmitting(v.id);
    const result = await resetIdentityVerification(v.user_id);
    setSubmitting(null);
    if (result.success) { showToast('Vérification réinitialisée'); await loadVerifications(); }
    else showToast(result.error || 'Erreur', false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-5">
      {ConfirmModalNode}
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Vérifications d'identité
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                <Clock className="w-3 h-3" /> {pendingCount} en attente
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Révise et approuve les demandes de vérification d'identité.</p>
        </div>
        <button onClick={loadVerifications} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <span className="font-bold">{pendingCount} vérification{pendingCount > 1 ? 's' : ''}</span> nécessite{pendingCount > 1 ? 'nt' : ''} une révision manuelle car le score IA est dans la zone grise (40–80).
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'all', label: 'Toutes', count: verifications.length },
          { id: 'pending', label: '🟡 En attente', count: pendingCount },
          { id: 'verified', label: '✅ Vérifiées', count: verifications.filter((v) => v.id_verified).length },
          { id: 'rejected', label: '❌ Échouées', count: verifications.filter((v) => !v.id_verified && !v.admin_review_required && v.verification_attempts > 0).length },
        ] as const).map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setFilter(id as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label} <span className="opacity-60">({count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune vérification dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const levelMeta = LEVEL_BADGES[v.level] || LEVEL_BADGES[0];
            const isProcessing = submitting === v.id;

            return (
              <div
                key={v.id}
                className={`bg-white rounded-xl border shadow-sm p-5 ${
                  v.admin_review_required && !v.id_verified
                    ? 'border-orange-300 bg-orange-50/20'
                    : v.id_verified
                    ? 'border-green-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* User info */}
                  <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                    {v.user?.avatar_url ? (
                      <img src={v.user.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {v.user?.username?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{v.user?.username || 'Inconnu'}</p>
                      <p className="text-xs text-gray-400">{v.user?.email}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${levelMeta.color}`}>
                      {levelMeta.label}
                    </span>
                    {v.admin_review_required && !v.id_verified && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Révision requise
                      </span>
                    )}
                    {v.id_verified && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Approuvé
                      </span>
                    )}
                    {v.flagged_for_fraud && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Fraude
                      </span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Document</p>
                    <p className="font-medium text-gray-800">{v.id_document_type ? DOC_LABELS[v.id_document_type] || v.id_document_type : '—'}</p>
                    <p className="text-xs text-gray-400">{v.id_document_country || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Score IA</p>
                    <p className={`font-bold text-lg ${getScoreColor(v.selfie_match_score)}`}>
                      {v.selfie_match_score !== undefined ? `${v.selfie_match_score}%` : '—'}
                    </p>
                    {v.selfie_match_score !== undefined && (
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full ${v.selfie_match_score >= 80 ? 'bg-green-500' : v.selfie_match_score >= 60 ? 'bg-orange-400' : 'bg-red-500'}`}
                          style={{ width: `${v.selfie_match_score}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tentatives</p>
                    <p className="font-medium text-gray-800">{v.verification_attempts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Soumis le</p>
                    <p className="font-medium text-gray-800 text-xs">{formatDate(v.updated_at)}</p>
                  </div>
                </div>

                {/* Reason */}
                {v.admin_review_reason && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-orange-700">
                      <span className="font-semibold">Raison de révision :</span> {v.admin_review_reason}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {/* Approve (show for pending or force) */}
                  {(v.admin_review_required && !v.id_verified) && (
                    <>
                      <button
                        onClick={() => handleApprove(v)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: v.id, userId: v.user_id, username: v.user?.username || '' })}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </>
                  )}

                  {/* Force level 2 */}
                  {!v.id_verified && (
                    <button
                      onClick={() => handleForce(v)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Forcer niveau 2
                    </button>
                  )}

                  {/* Reset */}
                  <button
                    onClick={() => handleReset(v)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                  </button>

                  {isProcessing && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500">
                      <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Traitement…
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Rejeter — <span className="text-red-600">{rejectModal.username}</span></h3>
            <p className="text-sm text-gray-600 mb-4">Indique la raison du rejet (sera enregistrée dans les logs).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex : Qualité d'image insuffisante, visages non concordants..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:border-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={!rejectReason || submitting !== null}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                Rejeter
              </button>
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
