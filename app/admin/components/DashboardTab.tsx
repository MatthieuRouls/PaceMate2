'use client';

import { useEffect, useState } from 'react';
import { getAdminActivityLog } from '@/lib/admin-actions';
import { RefreshCw, Users, Calendar, Shield, ShieldCheck, Phone, AlertTriangle, Activity } from 'lucide-react';
import type { AdminStats } from '../page';

interface ActivityLog {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  admin?: { username: string };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  update_profile: { label: 'Profil modifié', color: 'blue' },
  delete_profile: { label: 'Compte supprimé', color: 'red' },
  suspend_user: { label: 'Compte suspendu', color: 'orange' },
  unsuspend_user: { label: 'Compte réactivé', color: 'green' },
  grant_admin: { label: 'Admin accordé', color: 'yellow' },
  revoke_admin: { label: 'Admin retiré', color: 'gray' },
  force_phone_verified: { label: 'Tél. forcé vérifié', color: 'blue' },
  force_identity_verified: { label: 'Identité forcée', color: 'purple' },
  reset_identity: { label: 'Identité réinitialisée', color: 'gray' },
  approve_identity: { label: 'Identité approuvée', color: 'green' },
  reject_identity: { label: 'Identité rejetée', color: 'red' },
  update_session: { label: 'Session modifiée', color: 'blue' },
  delete_session: { label: 'Session supprimée', color: 'red' },
  update_team: { label: 'Équipe modifiée', color: 'blue' },
  delete_team: { label: 'Équipe supprimée', color: 'red' },
  update_feature_flag: { label: 'Flag modifié', color: 'purple' },
};

const colorBadge: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
};

export default function DashboardTab({
  stats,
  onRefresh,
}: {
  stats: AdminStats | null;
  onRefresh: () => void;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLogsLoading(true);
    const result = await getAdminActivityLog(15);
    if (result.success && result.logs) setLogs(result.logs as ActivityLog[]);
    setLogsLoading(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const verifiedRatio = stats
    ? stats.totalProfiles > 0
      ? Math.round((stats.idVerifiedCount / stats.totalProfiles) * 100)
      : 0
    : 0;

  const phoneRatio = stats
    ? stats.totalProfiles > 0
      ? Math.round((stats.phoneVerifiedCount / stats.totalProfiles) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Vue d'ensemble</h2>
        <button
          onClick={() => { onRefresh(); loadLogs(); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Utilisateurs */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-purple-900">Utilisateurs</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-700">Total inscrits</span>
                <span className="font-bold text-purple-900">{stats.totalProfiles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-700">Comptes suspendus</span>
                <span className="font-bold text-red-600">{stats.suspendedCount}</span>
              </div>
              {stats.recentUsers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-2">Derniers inscrits</p>
                  {stats.recentUsers.slice(0, 3).map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-purple-800">{u.username}</span>
                      <span className="text-xs text-purple-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-blue-900">Sessions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Total sessions</span>
                <span className="font-bold text-blue-900">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">À venir</span>
                <span className="font-bold text-green-700">{stats.upcomingSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Participations totales</span>
                <span className="font-bold text-blue-900">{stats.totalParticipants}</span>
              </div>
            </div>
          </div>

          {/* Vérifications */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-green-900">Vérifications</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">Identité vérifiée</span>
                  <span className="font-bold text-green-900">{stats.idVerifiedCount} ({verifiedRatio}%)</span>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${verifiedRatio}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">Téléphone vérifié</span>
                  <span className="font-bold text-green-900">{stats.phoneVerifiedCount} ({phoneRatio}%)</span>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${phoneRatio}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Équipes */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5 border border-pink-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-pink-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-pink-900">Équipes</h3>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-pink-700">Total équipes</span>
              <span className="font-bold text-pink-900">{stats.totalTeams}</span>
            </div>
          </div>

          {/* Infos dev */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200 md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-yellow-900">Notes de développement</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-yellow-800">
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="font-semibold text-xs uppercase tracking-wide text-yellow-600 mb-1">SMS / Twilio</p>
                <p>Configurer Supabase Auth → Phone provider + Twilio pour activer la vérification SMS.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="font-semibold text-xs uppercase tracking-wide text-yellow-600 mb-1">Identité IA</p>
                <p>ANTHROPIC_API_KEY + bucket Supabase "identity-docs" (privé) requis.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="font-semibold text-xs uppercase tracking-wide text-yellow-600 mb-1">Tests rapides</p>
                <p>Utilise "Forcer identité niveau 2" et "Forcer tél. vérifié" dans l'onglet Utilisateurs pour simuler les vérifications.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="font-semibold text-xs uppercase tracking-wide text-yellow-600 mb-1">Feature flags</p>
                <p>Onglet "Feature Flags" pour activer/désactiver les fonctionnalités sans redéployment.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Activity log */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" /> Journal d'activité admin (15 dernières actions)
        </h3>
        {logsLoading ? (
          <div className="py-4 text-center text-sm text-gray-400">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
            Aucune action enregistrée encore.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Entité</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'gray' };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorBadge[meta.color]}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{log.admin?.username || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                        {log.entity_type && <span className="text-gray-400">{log.entity_type}/</span>}
                        {log.entity_id?.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(log.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
