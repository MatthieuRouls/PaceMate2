'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getAdminStats } from '@/lib/admin-actions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Calendar, Shield, BarChart3 } from 'lucide-react';
import UsersTab from './components/UsersTab';
import SessionsTab from './components/SessionsTab';
import TeamsTab from './components/TeamsTab';
import DashboardTab from './components/DashboardTab';

type Tab = 'dashboard' | 'users' | 'sessions' | 'teams';

interface Stats {
  totalProfiles: number;
  totalSessions: number;
  totalTeams: number;
  totalParticipants: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    const result = await getAdminStats();
    if (result.success && result.stats) {
      setStats(result.stats);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Tableau de bord', icon: BarChart3 },
    { id: 'users' as Tab, label: 'Utilisateurs', icon: Users },
    { id: 'sessions' as Tab, label: 'Sessions', icon: Calendar },
    { id: 'teams' as Tab, label: 'Équipes', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pt-24 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Administration PaceMate
          </h1>
          <p className="text-gray-600">
            Gérez tous les aspects de votre plateforme de running
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Utilisateurs</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalProfiles}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Sessions</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalSessions}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-pink-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Équipes</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.totalTeams}</p>
                </div>
                <Shield className="w-8 h-8 text-pink-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Participations</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalParticipants}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab stats={stats} onRefresh={loadStats} />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'teams' && <TeamsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
