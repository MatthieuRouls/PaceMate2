'use client';

import { RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Stats {
  totalProfiles: number;
  totalSessions: number;
  totalTeams: number;
  totalParticipants: number;
}

interface DashboardTabProps {
  stats: Stats | null;
  onRefresh: () => void;
}

export default function DashboardTab({ stats, onRefresh }: DashboardTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Vue d'ensemble</h2>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Stats */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Statistiques Utilisateurs</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-purple-700">Total utilisateurs</span>
                <span className="text-2xl font-bold text-purple-900">{stats.totalProfiles}</span>
              </div>
              <div className="h-px bg-purple-300"></div>
              <p className="text-sm text-purple-600">
                Gérez les profils, niveaux et statistiques des utilisateurs
              </p>
            </div>
          </div>

          {/* Session Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Statistiques Sessions</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Total sessions</span>
                <span className="text-2xl font-bold text-blue-900">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Participations</span>
                <span className="text-2xl font-bold text-blue-900">{stats.totalParticipants}</span>
              </div>
              <div className="h-px bg-blue-300"></div>
              <p className="text-sm text-blue-600">
                Surveillez et gérez toutes les sessions de running
              </p>
            </div>
          </div>

          {/* Team Stats */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-900 mb-4">Statistiques Équipes</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-pink-700">Total équipes</span>
                <span className="text-2xl font-bold text-pink-900">{stats.totalTeams}</span>
              </div>
              <div className="h-px bg-pink-300"></div>
              <p className="text-sm text-pink-600">
                Gérez les équipes et leurs membres
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Actions Rapides</h3>
            <div className="space-y-2">
              <p className="text-sm text-green-700">
                ✓ Créer, modifier et supprimer des utilisateurs
              </p>
              <p className="text-sm text-green-700">
                ✓ Gérer les sessions et participants
              </p>
              <p className="text-sm text-green-700">
                ✓ Administrer les équipes
              </p>
              <p className="text-sm text-green-700">
                ✓ Modérer le contenu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Bienvenue dans l'interface d'administration
        </h3>
        <p className="text-blue-700 mb-4">
          Utilisez les onglets ci-dessus pour accéder aux différentes sections de gestion.
          Vous pouvez effectuer toutes les opérations CRUD (Créer, Lire, Mettre à jour, Supprimer)
          sur les utilisateurs, sessions et équipes.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Attention :</strong> Les suppressions sont définitives et supprimeront également
            les données associées (participations, memberships, etc.). Soyez prudent lors de la suppression.
          </p>
        </div>
      </div>
    </div>
  );
}
