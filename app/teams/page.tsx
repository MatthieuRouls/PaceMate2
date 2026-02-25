'use client';

import { useEffect, useState, FormEvent } from 'react';
import { MessageCircle, Users, UserPlus, Trophy, TrendingUp, Calendar, MapPin, ChevronRight, Zap, Crown } from 'lucide-react';
import { Team } from '@/lib/types';
import {
  getUserTeam,
  getTeamsLeaderboard,
  createTeam,
  leaveTeam,
} from '@/lib/actions';
import { getTeamConversation } from '@/lib/chat-actions';
import { useChat } from '@/components/chat';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Disable static pre-generation
export const dynamic = 'force-dynamic';

// Mock team members for display (will be replaced with real data later)
interface TeamMember {
  id: string;
  username: string;
  avatar_url?: string;
  role: 'captain' | 'member';
  total_distance_km?: number;
}

// Mock activity feed items
interface ActivityItem {
  id: string;
  type: 'join' | 'run' | 'session_created' | 'milestone';
  user: { username: string; avatar_url?: string };
  content: string;
  timestamp: string;
}

// Generate mock members based on members_count
function generateMockMembers(count: number): TeamMember[] {
  const names = ['Matthieu', 'Thomas', 'Marie', 'Lucas', 'Emma', 'Hugo', 'Lea', 'Nathan', 'Chloe', 'Jules'];
  const members: TeamMember[] = [];

  for (let i = 0; i < Math.min(count, 10); i++) {
    members.push({
      id: `member-${i}`,
      username: names[i] || `Runner ${i + 1}`,
      role: i === 0 ? 'captain' : 'member',
      total_distance_km: Math.floor(Math.random() * 500) + 50,
    });
  }

  return members;
}

// Generate mock activity feed
function generateMockActivity(): ActivityItem[] {
  return [
    {
      id: 'act-1',
      type: 'run',
      user: { username: 'Marie' },
      content: 'a couru 12 km ce matin',
      timestamp: 'Il y a 2h',
    },
    {
      id: 'act-2',
      type: 'session_created',
      user: { username: 'Thomas' },
      content: 'a cree une sortie pour samedi',
      timestamp: 'Il y a 5h',
    },
    {
      id: 'act-3',
      type: 'milestone',
      user: { username: 'Lucas' },
      content: 'a atteint 100 km ce mois !',
      timestamp: 'Hier',
    },
    {
      id: 'act-4',
      type: 'join',
      user: { username: 'Emma' },
      content: 'a rejoint l\'equipe',
      timestamp: 'Il y a 2 jours',
    },
    {
      id: 'act-5',
      type: 'run',
      user: { username: 'Hugo' },
      content: 'a complete un semi-marathon',
      timestamp: 'Il y a 3 jours',
    },
  ];
}

export default function TeamsPage() {
  const { openChat } = useChat();

  // State
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities] = useState<ActivityItem[]>(generateMockActivity());

  // Create form display
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Team creation form
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Leave team state
  const [leavingTeam, setLeavingTeam] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch user team
        const userTeamData = await getUserTeam();
        setUserTeam(userTeamData);

        // Generate mock members if team exists
        if (userTeamData) {
          setMembers(generateMockMembers(userTeamData.members_count || 1));
        }

        // Fetch teams leaderboard
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } catch (err) {
        console.error('Error fetching teams data:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des donnees');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Create team
  const handleCreateTeam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setCreatingTeam(true);
    setCreateError(null);

    try {
      const result = await createTeam(teamName, teamDescription);

      if (result.success && result.team_id) {
        const newTeam = await getUserTeam();
        setUserTeam(newTeam);
        if (newTeam) {
          setMembers(generateMockMembers(newTeam.members_count || 1));
        }

        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);

        setTeamName('');
        setTeamDescription('');
        setShowCreateForm(false);
      } else {
        setCreateError(result.error || 'Erreur lors de la creation de l\'equipe');
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setCreateError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Leave team
  const handleLeaveTeam = async () => {
    if (!userTeam) return;

    const confirmLeave = window.confirm(
      'Es-tu sur de vouloir quitter ton equipe ? Cette action est irreversible.'
    );

    if (!confirmLeave) return;

    setLeavingTeam(true);

    try {
      const result = await leaveTeam(userTeam.id);

      if (result.success) {
        setUserTeam(null);
        setMembers([]);

        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);
      } else {
        alert(result.error || 'Erreur lors de la sortie de l\'equipe');
      }
    } catch (err) {
      console.error('Error leaving team:', err);
      alert(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setLeavingTeam(false);
    }
  };

  // Open team chat (popup)
  const handleOpenChat = async () => {
    if (!userTeam) return;

    try {
      const result = await getTeamConversation(userTeam.id);
      if (result.success && result.conversation) {
        openChat(result.conversation.id);
      }
    } catch (err) {
      console.error('Error opening team chat:', err);
    }
  };

  // Calculate user team rank
  const getUserTeamRank = () => {
    if (!userTeam) return null;
    const rank = teams.findIndex((t) => t.id === userTeam.id) + 1;
    return rank > 0 ? rank : null;
  };

  // Get team ahead
  const getTeamAhead = () => {
    const rank = getUserTeamRank();
    if (!rank || rank <= 1) return null;
    return teams[rank - 2];
  };

  // Activity icon based on type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'join': return <UserPlus className="w-3.5 h-3.5 text-neon-500" />;
      case 'run': return <TrendingUp className="w-3.5 h-3.5 text-neon-500" />;
      case 'session_created': return <Calendar className="w-3.5 h-3.5 text-neon-500" />;
      case 'milestone': return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Zap className="w-3.5 h-3.5 text-neon-500" />;
    }
  };

  return (
    <>
      <style jsx global>{`
        /* Brutalist team name */
        .team-name-brutal {
          font-size: clamp(2.2rem, 8vw, 4.5rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.05em;
          line-height: 0.85;
          margin-left: -0.03em;
        }

        /* Card enter animation */
        .card-enter {
          animation: cardFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .card-enter:nth-child(1) { animation-delay: 0ms; }
        .card-enter:nth-child(2) { animation-delay: 60ms; }
        .card-enter:nth-child(3) { animation-delay: 120ms; }

        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Stat card hover */
        .stat-card {
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px -4px rgba(0,0,0,0.08);
        }

        /* Sidebar card hover */
        .sidebar-card {
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sidebar-card:hover {
          box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);
        }

        /* Avatar stack */
        .avatar-stack { display: flex; }
        .avatar-stack > * {
          margin-left: -8px;
          border: 2px solid rgba(255,255,255,0.15);
          transition: transform 0.2s ease;
        }
        .avatar-stack > *:first-child { margin-left: 0; }
        .avatar-stack > *:hover { transform: translateY(-2px); z-index: 10; }

        /* Progress bar grow */
        .progress-bar-fill {
          animation: progressGrow 1s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both;
          transform-origin: left;
        }
        @keyframes progressGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        /* Activity feed internal scroll */
        .activity-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.1) transparent;
        }
        .activity-scroll::-webkit-scrollbar { width: 4px; }
        .activity-scroll::-webkit-scrollbar-track { background: transparent; }
        .activity-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
      `}</style>

      <div className="min-h-screen bg-neu-base pt-20">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="card p-5">
              <p className="text-pink-600 font-semibold mb-1">Erreur</p>
              <p className="text-dark-500 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {userTeam ? (
              <>
                {/* ============================================ */}
                {/* TEAM HEADER — compact, full width, 200-260px */}
                {/* ============================================ */}
                <div className="relative overflow-hidden bg-gradient-to-br from-dark-800 via-dark-900 to-black">
                  {/* Subtle green glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(185,255,102,0.07),transparent_50%)]" />

                  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 py-8 lg:py-10" style={{ minHeight: '220px' }}>
                      {/* LEFT — Team identity */}
                      <div className="flex-1 min-w-0 flex flex-col justify-end">
                        {/* Meta badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/8 backdrop-blur-sm rounded-full text-xs text-white/70 mb-3 w-fit">
                          <Users className="w-3.5 h-3.5" />
                          <span>{userTeam.members_count || 1} membre{(userTeam.members_count || 1) > 1 ? 's' : ''}</span>
                          <span className="w-1 h-1 rounded-full bg-neon-500" />
                          <span className="text-neon-400">Recrute</span>
                        </div>

                        {/* Team name — brutalist */}
                        <h1 className="team-name-brutal text-white mb-2">
                          {userTeam.name}
                        </h1>

                        {/* Description + avatars row */}
                        <div className="flex flex-wrap items-center gap-4 mt-1">
                          {userTeam.description && (
                            <p className="text-white/40 text-sm max-w-sm">{userTeam.description}</p>
                          )}
                          <div className="avatar-stack">
                            {members.slice(0, 4).map((member) => (
                              <div
                                key={member.id}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-500 to-neon-700 flex items-center justify-center text-dark-900 font-bold text-xs"
                                title={member.username}
                              >
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  member.username[0].toUpperCase()
                                )}
                              </div>
                            ))}
                            {(userTeam.members_count || 1) > 4 && (
                              <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-white text-[10px] font-medium">
                                +{(userTeam.members_count || 1) - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT — CTA buttons */}
                      <div className="flex items-center gap-3 flex-shrink-0 lg:pb-1">
                        <button
                          onClick={handleOpenChat}
                          className="flex items-center gap-2 px-6 py-3 bg-neon-500 hover:bg-neon-400 text-dark-900 font-bold rounded-full transition-all duration-200 hover:scale-[1.03] text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat de l'equipe
                        </button>
                        <button className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-full backdrop-blur-sm transition-all duration-200 text-sm">
                          <UserPlus className="w-4 h-4" />
                          Inviter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================ */}
                {/* GRID 2 COLUMNS — main dashboard area         */}
                {/* ============================================ */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ======== LEFT COLUMN (8/12) ======== */}
                    <div className="lg:col-span-8 space-y-6">

                      {/* ROW 1: Stats cards */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* KM together */}
                        <div className="card-enter stat-card bg-gradient-to-br from-neon-500 to-neon-600 rounded-xl p-4 text-dark-900 cursor-default">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                              <MapPin className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="text-2xl font-black leading-none">{(userTeam.total_distance || 0).toFixed(0)} <span className="text-base font-bold">km</span></p>
                          <p className="text-xs font-medium opacity-70 mt-1">parcourus ensemble</p>
                        </div>

                        {/* Sessions */}
                        <div className="card-enter stat-card bg-white rounded-xl p-4 border border-silver-200 cursor-default">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-neon-100 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-neon-600" />
                            </div>
                          </div>
                          <p className="text-2xl font-black text-dark-800 leading-none">8</p>
                          <p className="text-xs font-medium text-dark-400 mt-1">sorties organisees</p>
                        </div>

                        {/* Runs this week */}
                        <div className="card-enter stat-card bg-white rounded-xl p-4 border border-silver-200 cursor-default">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-neon-100 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-neon-600" />
                            </div>
                          </div>
                          <p className="text-2xl font-black text-dark-800 leading-none">12</p>
                          <p className="text-xs font-medium text-dark-400 mt-1">runs cette semaine</p>
                        </div>
                      </div>

                      {/* ROW 2: Activity feed — internal scroll */}
                      <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-silver-200 flex items-center justify-between">
                          <h2 className="text-sm font-bold text-dark-800 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-neon-600" />
                            Activite recente
                          </h2>
                          <span className="text-xs text-dark-400">{activities.length} evenements</span>
                        </div>
                        <div className="activity-scroll overflow-y-auto" style={{ maxHeight: '420px' }}>
                          {activities.length === 0 ? (
                            <div className="px-5 py-12 text-center text-dark-400 text-sm">
                              Aucune activite recente
                            </div>
                          ) : (
                            activities.map((activity) => (
                              <div
                                key={activity.id}
                                className="flex items-center gap-3 px-5 py-3 border-b border-silver-100 last:border-b-0 hover:bg-silver-50/50 transition-colors"
                              >
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-400 to-neon-600 flex items-center justify-center text-dark-900 font-bold text-xs flex-shrink-0">
                                  {activity.user.avatar_url ? (
                                    <img src={activity.user.avatar_url} alt={activity.user.username} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    activity.user.username[0].toUpperCase()
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-dark-700">
                                    <span className="font-semibold text-dark-800">{activity.user.username}</span>{' '}
                                    {activity.content}
                                  </p>
                                </div>

                                {/* Time + icon */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-dark-400 hidden sm:block">{activity.timestamp}</span>
                                  <div className="w-6 h-6 rounded-full bg-silver-100 flex items-center justify-center">
                                    {getActivityIcon(activity.type)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ======== RIGHT COLUMN / SIDEBAR (4/12) ======== */}
                    <div className="lg:col-span-4 space-y-5">

                      {/* MEMBERS card */}
                      <div className="sidebar-card bg-white rounded-xl border border-silver-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-silver-200">
                          <h3 className="text-sm font-bold text-dark-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-neon-600" />
                            Membres
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-3">
                            {members.map((member) => (
                              <div key={member.id} className="text-center group cursor-pointer">
                                <div className="relative mx-auto w-12 h-12 mb-1.5">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-400 to-neon-600 flex items-center justify-center text-dark-900 font-bold text-sm group-hover:scale-105 transition-transform">
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      member.username[0].toUpperCase()
                                    )}
                                  </div>
                                  {member.role === 'captain' && (
                                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                                      <Crown className="w-3 h-3 text-yellow-800" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-dark-700 truncate">{member.username}</p>
                              </div>
                            ))}

                            {/* Invite placeholder tile */}
                            <div className="text-center cursor-pointer group">
                              <div className="mx-auto w-12 h-12 rounded-full border-2 border-dashed border-silver-300 group-hover:border-neon-400 flex items-center justify-center mb-1.5 transition-colors">
                                <UserPlus className="w-4 h-4 text-silver-400 group-hover:text-neon-500 transition-colors" />
                              </div>
                              <p className="text-xs font-medium text-silver-400 group-hover:text-neon-600 transition-colors">Inviter</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CHALLENGE DU MOIS card — sticky on desktop */}
                      <div className="sidebar-card bg-gradient-to-br from-dark-800 to-dark-900 rounded-xl overflow-hidden text-white lg:sticky lg:top-24">
                        <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
                          <h3 className="text-sm font-bold flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            Challenge du mois
                          </h3>
                        </div>
                        <div className="p-4">
                          {/* Current rank */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-xs text-silver-500 mb-0.5">Position</p>
                              <span className="text-3xl font-black text-neon-400 leading-none">
                                {getUserTeamRank() || '-'}
                                <span className="text-sm font-medium text-silver-400">e</span>
                              </span>
                              <span className="text-xs text-silver-500 ml-1">/ {teams.length}</span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-neon-600/15 flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-neon-400" />
                            </div>
                          </div>

                          {/* Progress to next rank */}
                          {getTeamAhead() && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-silver-500">Objectif</span>
                                <span className="text-neon-400 font-medium truncate ml-2">{getTeamAhead()?.name}</span>
                              </div>
                              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                  className="progress-bar-fill h-full bg-gradient-to-r from-neon-500 to-neon-400 rounded-full"
                                  style={{
                                    width: `${Math.min(95, ((userTeam.total_distance || 0) / (getTeamAhead()?.total_distance || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-silver-500 mt-1.5">
                                <span className="text-neon-400 font-semibold">
                                  {Math.max(0, ((getTeamAhead()?.total_distance || 0) - (userTeam.total_distance || 0))).toFixed(1)} km
                                </span>{' '}
                                pour passer {getUserTeamRank()! - 1}e
                              </p>
                            </div>
                          )}

                          {/* Top 3 podium */}
                          <div className="border-t border-dark-700 pt-3">
                            <p className="text-[10px] font-semibold text-silver-600 uppercase tracking-wider mb-2">Podium</p>
                            <div className="space-y-1.5">
                              {teams.slice(0, 3).map((team, index) => {
                                const isUserTeam = userTeam && team.id === userTeam.id;
                                const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
                                return (
                                  <div
                                    key={team.id}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs ${
                                      isUserTeam ? 'bg-neon-600/15' : 'bg-dark-700/40'
                                    }`}
                                  >
                                    <span className="text-sm">{medals[index]}</span>
                                    <span className={`flex-1 font-medium truncate ${isUserTeam ? 'text-neon-400' : 'text-white'}`}>
                                      {team.name}
                                    </span>
                                    <span className="text-silver-500 font-medium">{(team.total_distance || 0).toFixed(0)} km</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* INVITE card */}
                      <div className="sidebar-card bg-gradient-to-br from-neon-500 to-neon-400 rounded-xl p-5 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                          <UserPlus className="w-7 h-7 text-dark-900 mx-auto mb-2" />
                          <p className="text-sm font-bold text-dark-900 mb-1">Invite des coureurs</p>
                          <p className="text-xs text-dark-700 mb-3">Plus on est, plus on grimpe !</p>
                          <button className="inline-flex items-center gap-1.5 px-5 py-2 bg-dark-900 hover:bg-dark-800 text-white text-xs font-semibold rounded-full transition-all hover:scale-[1.03]">
                            Inviter
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* DANGER ZONE — Quitter */}
                      <div className="pt-3 border-t border-silver-200">
                        <button
                          onClick={handleLeaveTeam}
                          disabled={leavingTeam}
                          className="text-xs text-dark-400 hover:text-pink-600 transition-colors disabled:opacity-50"
                        >
                          {leavingTeam ? 'Chargement...' : 'Quitter l\'equipe'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===== NO TEAM — JOIN/CREATE ===== */
              <div className="max-w-2xl mx-auto px-6 py-12">
                {!showCreateForm ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-500 to-neon-600 flex items-center justify-center">
                      <Users className="w-10 h-10 text-dark-900" />
                    </div>
                    <h1 className="text-2xl font-black text-dark-800 mb-3">Rejoins une equipe !</h1>
                    <p className="text-dark-500 mb-8 max-w-md mx-auto">
                      Cours avec un crew, participe aux defis collectifs et grimpe dans le classement ensemble.
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-neon-500 hover:bg-neon-400 text-dark-900 font-semibold rounded-full transition-all duration-200 hover:scale-105"
                    >
                      Creer mon equipe
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {teams.length > 0 && (
                      <div className="mt-10 pt-8 border-t border-silver-200">
                        <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                          Top equipes
                        </h3>
                        <div className="space-y-2">
                          {teams.slice(0, 5).map((team, index) => (
                            <div
                              key={team.id}
                              className="flex items-center gap-3 p-3 bg-silver-50 rounded-xl"
                            >
                              <span className="w-6 text-center font-bold text-dark-400">
                                {index + 1}
                              </span>
                              <div className="flex-1 text-left">
                                <p className="font-semibold text-dark-800">{team.name}</p>
                                <p className="text-xs text-dark-500">
                                  {team.members_count || 0} membre{(team.members_count || 0) > 1 ? 's' : ''} • {(team.total_distance || 0).toFixed(1)} km
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-dark-800">Cree ton equipe</h2>
                      <button
                        onClick={() => { setShowCreateForm(false); setCreateError(null); }}
                        className="text-dark-400 hover:text-dark-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleCreateTeam} className="space-y-5">
                      {createError && (
                        <div className="p-4 rounded-xl bg-pink-50 border border-pink-200">
                          <p className="text-pink-600 text-sm">{createError}</p>
                        </div>
                      )}

                      <div>
                        <label htmlFor="teamName" className="block text-sm font-semibold text-dark-800 mb-2">
                          Nom de l'equipe <span className="text-pink-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="teamName"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          required
                          maxLength={50}
                          placeholder="Ex: Les Runners du dimanche"
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/20 transition-all text-dark-800 placeholder:text-silver-500"
                        />
                        <p className="text-xs text-silver-500 mt-1.5">{teamName.length}/50</p>
                      </div>

                      <div>
                        <label htmlFor="teamDescription" className="block text-sm font-semibold text-dark-800 mb-2">
                          Slogan / Description <span className="text-silver-500">(optionnel)</span>
                        </label>
                        <textarea
                          id="teamDescription"
                          value={teamDescription}
                          onChange={(e) => setTeamDescription(e.target.value)}
                          maxLength={200}
                          rows={3}
                          placeholder="On court ensemble, on progresse ensemble."
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/20 transition-all text-dark-800 placeholder:text-silver-500 resize-none"
                        />
                        <p className="text-xs text-silver-500 mt-1.5">{teamDescription.length}/200</p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setShowCreateForm(false); setCreateError(null); }}
                          className="flex-1 px-5 py-3 border border-silver-300 text-dark-600 font-medium rounded-full hover:bg-silver-50 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={creatingTeam || !teamName.trim()}
                          className="flex-1 px-5 py-3 bg-neon-500 hover:bg-neon-400 text-dark-900 font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingTeam ? 'Creation...' : 'Creer l\'equipe'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
