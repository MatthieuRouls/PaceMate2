'use client';

import { useEffect, useState } from 'react';
import { getFeatureFlags, updateFeatureFlag } from '@/lib/admin-actions';
import { RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, Info } from 'lucide-react';

interface FeatureFlag {
  key: string;
  value: unknown;
  description: string;
  category: string;
  updated_at: string;
  updated_by?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  phone: { label: '📱 Téléphone / SMS', color: 'blue' },
  identity: { label: '🪪 Vérification d\'identité', color: 'purple' },
  safety: { label: '🛡️ Mode sécurité', color: 'green' },
  sessions: { label: '🏃 Sessions', color: 'orange' },
  system: { label: '⚙️ Système', color: 'gray' },
};

const CATEGORY_COLORS: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50',
  purple: 'border-purple-200 bg-purple-50',
  green: 'border-green-200 bg-green-50',
  orange: 'border-orange-200 bg-orange-50',
  gray: 'border-gray-200 bg-gray-50',
};

const FLAG_WARNINGS: Record<string, string> = {
  maintenance_mode: '⚠️ Active le mode maintenance — les utilisateurs ne pourront plus accéder à l\'app !',
  identity_bypass_for_testing: '⚠️ TESTS SEULEMENT — ne jamais activer en production !',
  new_registrations_enabled: '⚠️ Désactiver bloquera toutes les nouvelles inscriptions.',
};

export default function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [numericEdits, setNumericEdits] = useState<Record<string, string>>({});

  useEffect(() => { loadFlags(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFlags = async () => {
    setLoading(true);
    const result = await getFeatureFlags();
    if (result.success && result.flags) {
      setFlags(result.flags as FeatureFlag[]);
      // Init numeric edits
      const edits: Record<string, string> = {};
      (result.flags as FeatureFlag[]).forEach((f) => {
        if (typeof f.value === 'number') edits[f.key] = String(f.value);
      });
      setNumericEdits(edits);
    }
    setLoading(false);
  };

  const handleToggle = async (flag: FeatureFlag) => {
    const current = Boolean(flag.value);
    const warning = FLAG_WARNINGS[flag.key];

    if (warning && !current) {
      if (!confirm(`${warning}\n\nConfirmer l'activation ?`)) return;
    }
    if (warning && current) {
      if (!confirm(`Désactiver "${flag.key}" ?`)) return;
    }

    setSaving(flag.key);
    const result = await updateFeatureFlag(flag.key, !current);
    setSaving(null);

    if (result.success) {
      setFlags((prev) => prev.map((f) => f.key === flag.key ? { ...f, value: !current } : f));
      showToast(`${flag.key} → ${!current ? 'activé' : 'désactivé'}`);
    } else {
      showToast(result.error || 'Erreur', false);
    }
  };

  const handleNumericSave = async (key: string) => {
    const val = parseFloat(numericEdits[key]);
    if (isNaN(val)) return;
    setSaving(key);
    const result = await updateFeatureFlag(key, val);
    setSaving(null);
    if (result.success) {
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, value: val } : f));
      showToast(`${key} → ${val}`);
    } else {
      showToast(result.error || 'Erreur', false);
    }
  };

  // Group by category
  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Feature Flags</h2>
          <p className="text-sm text-gray-500 mt-0.5">Active ou désactive les fonctionnalités sans redéployer l'application.</p>
        </div>
        <button onClick={loadFlags} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">Modifications en temps réel</p>
          <p>Les changements prennent effet immédiatement sans redéploiement. Fais attention aux flags marqués ⚠️ qui peuvent impacter tous les utilisateurs.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, categoryFlags]) => {
            const meta = CATEGORY_LABELS[category] || { label: category, color: 'gray' };
            const colorClass = CATEGORY_COLORS[meta.color] || CATEGORY_COLORS.gray;

            return (
              <div key={category} className={`rounded-xl border p-5 ${colorClass}`}>
                <h3 className="font-bold text-gray-800 mb-4 text-base">{meta.label}</h3>
                <div className="space-y-3">
                  {categoryFlags.map((flag) => {
                    const isBool = typeof flag.value === 'boolean';
                    const isNum = typeof flag.value === 'number';
                    const isOn = Boolean(flag.value);
                    const isSavingThis = saving === flag.key;
                    const hasWarning = Boolean(FLAG_WARNINGS[flag.key]);

                    return (
                      <div key={flag.key} className="bg-white rounded-lg p-4 border border-white/80 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-gray-800">{flag.key}</span>
                              {hasWarning && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Attention
                                </span>
                              )}
                              {isBool && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {isOn ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{flag.description}</p>
                            <p className="text-xs text-gray-400 mt-1">Modifié le {formatDate(flag.updated_at)}</p>
                          </div>

                          {/* Toggle or number input */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {isBool && (
                              <button
                                onClick={() => handleToggle(flag)}
                                disabled={isSavingThis}
                                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                  isOn ? 'bg-green-500' : 'bg-gray-300'
                                } ${isSavingThis ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isOn ? 'translate-x-5' : ''}`} />
                              </button>
                            )}

                            {isNum && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={numericEdits[flag.key] ?? String(flag.value)}
                                  onChange={(e) => setNumericEdits((prev) => ({ ...prev, [flag.key]: e.target.value }))}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center font-semibold outline-none focus:border-purple-500"
                                />
                                <button
                                  onClick={() => handleNumericSave(flag.key)}
                                  disabled={isSavingThis}
                                  className="px-2.5 py-1 bg-purple-600 text-white text-xs rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                  {isSavingThis ? '…' : 'OK'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {hasWarning && isOn && (
                          <div className="mt-2 flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-xs text-orange-700">
                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                            {FLAG_WARNINGS[flag.key]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && flags.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">Aucun flag trouvé.</p>
          <p className="text-gray-400 text-xs mt-1">Exécute la migration <code className="font-mono">supabase-admin-feature-flags.sql</code> dans Supabase.</p>
        </div>
      )}
    </div>
  );
}
