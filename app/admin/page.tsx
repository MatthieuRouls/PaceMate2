'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getAdminStats } from '@/lib/admin-actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Users, Calendar, Shield, BarChart3, ShieldCheck,
  ToggleLeft, AlertTriangle, Activity,
} from 'lucide-react';
import UsersTab from './components/UsersTab';
import SessionsTab from './components/SessionsTab';
import TeamsTab from './components/TeamsTab';
import DashboardTab from './components/DashboardTab';
import FeatureFlagsTab from './components/FeatureFlagsTab';
import IdentityReviewTab from './components/IdentityReviewTab';

type Tab = 'dashboard' | 'users' | 'sessions' | 'teams' | 'identity' | 'flags';

export interface AdminStats {
  totalProfiles: number;
  totalSessions: number;
  totalTeams: number;
  totalParticipants: number;
  phoneVerifiedCount: number;
  idVerifiedCount: number;
  suspendedCount: number;
  upcomingSessions: number;
  recentUsers: { id: string; username: string; created_at: string; avatar_url?: string }[];
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!authLoading && user) loadStats();
  }, [user, authLoading]);

  const loadStats = async () => {
    setLoading(true);
    const result = await getAdminStats();
    if (result.success && result.stats) {
      setStats(result.stats as AdminStats);
      setAccessDenied(false);
    } else if (result.error?.includes('refus')) {
      setAccessDenied(true);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Connecte-toi pour accéder à l'administration.</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h2>
          <p className="text-gray-600 mb-4">Ton compte n'a pas les droits administrateur.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800 font-semibold mb-2">Pour activer l'accès admin :</p>
            <pre className="text-xs text-yellow-700 bg-yellow-100 p-3 rounded overflow-x-auto">
{`UPDATE profiles SET is_admin = TRUE
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'ton@email.com'
);`}
            </pre>
            <p className="text-xs text-yellow-600 mt-2">À exécuter dans le SQL Editor de Supabase.</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'users', label: 'Utilisateurs', icon: Users, badge: stats?.totalProfiles },
    { id: 'sessions', label: 'Sessions', icon: Calendar, badge: stats?.upcomingSessions },
    { id: 'teams', label: 'Équipes', icon: Shield, badge: stats?.totalTeams },
    { id: 'identity', label: 'Identités', icon: ShieldCheck },
    { id: 'flags', label: 'Feature Flags', icon: ToggleLeft },
  ];

  const statCards = [
    { label: 'Utilisateurs', value: stats?.totalProfiles || 0, color: 'purple', icon: Users },
    { label: 'Sessions à venir', value: stats?.upcomingSessions || 0, color: 'blue', icon: Calendar },
    { label: 'Équipes', value: stats?.totalTeams || 0, color: 'pink', icon: Shield },
    { label: 'Identités vérifiées', value: stats?.idVerifiedCount || 0, color: 'green', icon: ShieldCheck },
    { label: 'Tél. vérifiés', value: stats?.phoneVerifiedCount || 0, color: 'indigo', icon: Activity },
    { label: 'Comptes suspendus', value: stats?.suspendedCount || 0, color: 'red', icon: AlertTriangle },
  ];

  const colorMap: Record<string, string> = {
    purple: 'border-purple-500 text-purple-700',
    blue: 'border-blue-500 text-blue-700',
    pink: 'border-pink-500 text-pink-700',
    green: 'border-green-500 text-green-700',
    indigo: 'border-indigo-500 text-indigo-700',
    red: 'border-red-500 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration PaceMate</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Connecté : <span className="font-semibold text-purple-600">{profile?.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Admin actif</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {statCards.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${colorMap[color]}`}>
              <div className="flex items-center justify-between mb-1">
                <Icon className="w-4 h-4 opacity-60" />
                <span className="text-2xl font-bold">{value}</span>
              </div>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
            {tabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === id
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === id ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === 'dashboard' && <DashboardTab stats={stats} onRefresh={loadStats} />}
            {activeTab === 'users' && <UsersTab onRefreshStats={loadStats} />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'teams' && <TeamsTab />}
            {activeTab === 'identity' && <IdentityReviewTab />}
            {activeTab === 'flags' && <FeatureFlagsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
