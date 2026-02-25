'use client';

import { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
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

  // Scroll reveal refs
  const heroRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Intersection observer for scroll reveals
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    const refs = [heroRef, membersRef, activityRef, statsRef, challengeRef, ctaRef];
    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [observerCallback, userTeam]);

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
        // Fetch created team
        const newTeam = await getUserTeam();
        setUserTeam(newTeam);
        if (newTeam) {
          setMembers(generateMockMembers(newTeam.members_count || 1));
        }

        // Refresh leaderboard
        const leaderboard = await getTeamsLeaderboard();
        setTeams(leaderboard);

        // Reset form
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

        // Refresh leaderboard
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
      case 'join': return <UserPlus className="w-4 h-4 text-neon-500" />;
      case 'run': return <TrendingUp className="w-4 h-4 text-neon-500" />;
      case 'session_created': return <Calendar className="w-4 h-4 text-neon-500" />;
      case 'milestone': return <Trophy className="w-4 h-4 text-yellow-500" />;
      default: return <Zap className="w-4 h-4 text-neon-500" />;
    }
  };

  return (
    <>
      {/* Global styles for animations */}
      <style jsx global>{`
        /* Section reveal - visible by default, animate on scroll */
        .section-reveal {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .section-reveal.animate-in {
          opacity: 0;
          transform: translateY(40px);
        }

        .section-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Hero banner animation */
        .hero-banner {
          animation: heroFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes heroFadeIn {
          from {
            opacity: 0;
            transform: scale(1.02);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Brutalist team name */
        .team-name-brutal {
          font-size: clamp(3rem, 12vw, 7rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.05em;
          line-height: 0.85;
          margin-left: -0.04em;
        }

        /* Staggered avatar reveal - visible by default */
        .avatar-stagger {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .avatar-stagger:nth-child(1) { transition-delay: 0ms; }
        .avatar-stagger:nth-child(2) { transition-delay: 50ms; }
        .avatar-stagger:nth-child(3) { transition-delay: 100ms; }
        .avatar-stagger:nth-child(4) { transition-delay: 150ms; }
        .avatar-stagger:nth-child(5) { transition-delay: 200ms; }
        .avatar-stagger:nth-child(6) { transition-delay: 250ms; }
        .avatar-stagger:nth-child(7) { transition-delay: 300ms; }
        .avatar-stagger:nth-child(8) { transition-delay: 350ms; }
        .avatar-stagger:nth-child(9) { transition-delay: 400ms; }
        .avatar-stagger:nth-child(10) { transition-delay: 450ms; }

        /* Activity feed animation - visible by default */
        .activity-item {
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .activity-item:nth-child(1) { transition-delay: 0ms; }
        .activity-item:nth-child(2) { transition-delay: 80ms; }
        .activity-item:nth-child(3) { transition-delay: 160ms; }
        .activity-item:nth-child(4) { transition-delay: 240ms; }
        .activity-item:nth-child(5) { transition-delay: 320ms; }

        /* Stats cards - visible by default */
        .stat-card {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .stat-card:nth-child(1) { transition-delay: 0ms; }
        .stat-card:nth-child(2) { transition-delay: 100ms; }
        .stat-card:nth-child(3) { transition-delay: 200ms; }

        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
        }

        /* Challenge progress animation */
        .progress-bar-fill {
          animation: progressGrow 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
          transform-origin: left;
        }

        @keyframes progressGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        /* CTA pulse animation */
        .cta-pulse {
          animation: ctaPulse 2s ease-in-out infinite;
        }

        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(185, 255, 102, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(185, 255, 102, 0); }
        }

        /* Avatar stack for hero */
        .avatar-stack {
          display: flex;
        }

        .avatar-stack > * {
          margin-left: -8px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.2s ease;
        }

        .avatar-stack > *:first-child {
          margin-left: 0;
        }

        .avatar-stack > *:hover {
          transform: translateY(-2px);
          z-index: 10;
        }
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
          <div className="max-w-4xl mx-auto px-6 py-6">
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
              /* ===== TEAM EXISTS - CLUB PAGE ===== */
              <div className="pb-20">
                {/* SECTION 1: HERO BANNER */}
                <div
                  ref={heroRef}
                  className="hero-banner relative overflow-hidden"
                  style={{ minHeight: '420px' }}
                >
                  {/* Background with overlay */}
                  <div className="absolute inset-0">
                    {/* Placeholder gradient background (will be replaced with team photo) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-black" />
                    {/* Subtle texture overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(185,255,102,0.08),transparent_50%)]" />
                  </div>

                  {/* Content - flush left */}
                  <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-end" style={{ minHeight: '420px' }}>
                    {/* Team name - BRUTAL STYLE */}
                    <h1 className="team-name-brutal text-white mb-4">
                      {userTeam.name}
                    </h1>

                    {/* Team info row */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      {/* Team badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80">
                        <Users className="w-4 h-4" />
                        <span>{userTeam.members_count || 1} membre{(userTeam.members_count || 1) > 1 ? 's' : ''}</span>
                        <span className="w-1 h-1 rounded-full bg-neon-500" />
                        <span className="text-neon-400">Recrute</span>
                      </div>

                      {/* Team description/slogan */}
                      {userTeam.description && (
                        <p className="text-white/50 text-sm max-w-md">
                          {userTeam.description}
                        </p>
                      )}
                    </div>

                    {/* Avatar stack + CTAs */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Stacked avatars */}
                      <div className="avatar-stack">
                        {members.slice(0, 5).map((member, i) => (
                          <div
                            key={member.id}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-500 to-neon-700 flex items-center justify-center text-dark-900 font-bold text-sm"
                            title={member.username}
                          >
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              member.username[0].toUpperCase()
                            )}
                          </div>
                        ))}
                        {(userTeam.members_count || 1) > 5 && (
                          <div className="w-10 h-10 rounded-full bg-dark-700 border-2 border-white/20 flex items-center justify-center text-white text-xs font-medium">
                            +{(userTeam.members_count || 1) - 5}
                          </div>
                        )}
                      </div>

                      {/* CTA buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleOpenChat}
                          className="flex items-center gap-2 px-5 py-2.5 bg-neon-500 hover:bg-neon-400 text-dark-900 font-semibold rounded-full transition-all duration-200 hover:scale-105"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat de l'equipe
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full backdrop-blur-sm transition-all duration-200">
                          <UserPlus className="w-4 h-4" />
                          Inviter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: TEAM MEMBERS */}
                <div ref={membersRef} className="section-reveal max-w-4xl mx-auto px-6 py-10">
                  <h2 className="text-xl font-bold text-dark-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-neon-600" />
                    Les membres
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="avatar-stagger group bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      >
                        {/* Avatar */}
                        <div className="relative mx-auto w-16 h-16 mb-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-400 to-neon-600 flex items-center justify-center text-dark-900 font-bold text-xl group-hover:scale-105 transition-transform">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              member.username[0].toUpperCase()
                            )}
                          </div>
                          {/* Captain badge */}
                          {member.role === 'captain' && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                              <Crown className="w-3.5 h-3.5 text-yellow-800" />
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <p className="font-semibold text-dark-800 text-sm truncate">{member.username}</p>
                        {/* Distance */}
                        <p className="text-xs text-dark-500 mt-1">{member.total_distance_km || 0} km</p>
                      </div>
                    ))}

                    {/* Placeholder slots if few members */}
                    {members.length < 5 && Array.from({ length: 5 - members.length }).map((_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className="avatar-stagger bg-silver-100 rounded-2xl p-4 text-center border-2 border-dashed border-silver-300 cursor-pointer hover:border-neon-400 hover:bg-neon-50 transition-all duration-300"
                      >
                        <div className="mx-auto w-16 h-16 rounded-full bg-silver-200 flex items-center justify-center mb-3">
                          <UserPlus className="w-6 h-6 text-silver-400" />
                        </div>
                        <p className="font-medium text-silver-500 text-sm">Inviter</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 3: ACTIVITY FEED */}
                <div ref={activityRef} className="section-reveal max-w-4xl mx-auto px-6 py-10">
                  <h2 className="text-xl font-bold text-dark-800 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-neon-600" />
                    Activite recente
                  </h2>

                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="activity-item flex items-center gap-4 px-5 py-4 border-b border-silver-200 last:border-b-0 hover:bg-silver-50 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-400 to-neon-600 flex items-center justify-center text-dark-900 font-bold text-sm flex-shrink-0">
                          {activity.user.avatar_url ? (
                            <img src={activity.user.avatar_url} alt={activity.user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            activity.user.username[0].toUpperCase()
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-800">
                            <span className="font-semibold">{activity.user.username}</span>{' '}
                            <span className="text-dark-600">{activity.content}</span>
                          </p>
                          <p className="text-xs text-dark-400 mt-0.5">{activity.timestamp}</p>
                        </div>

                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full bg-silver-100 flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 4: TEAM STATS (PRIDE) */}
                <div ref={statsRef} className="section-reveal max-w-4xl mx-auto px-6 py-10">
                  <h2 className="text-xl font-bold text-dark-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neon-600" />
                    Nos performances
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* KM this month */}
                    <div className="stat-card bg-gradient-to-br from-neon-500 to-neon-600 rounded-2xl p-6 text-dark-900 transition-all duration-300 cursor-default">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <p className="text-3xl font-black">{(userTeam.total_distance || 0).toFixed(0)} km</p>
                      <p className="text-sm font-medium opacity-80">parcourus ensemble</p>
                    </div>

                    {/* Sessions organized */}
                    <div className="stat-card bg-white rounded-2xl p-6 shadow-sm border border-silver-200 transition-all duration-300 cursor-default">
                      <div className="w-12 h-12 rounded-xl bg-neon-100 flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6 text-neon-600" />
                      </div>
                      <p className="text-3xl font-black text-dark-800">{Math.floor(Math.random() * 12) + 3}</p>
                      <p className="text-sm font-medium text-dark-500">sorties organisees</p>
                    </div>

                    {/* Runs this week */}
                    <div className="stat-card bg-white rounded-2xl p-6 shadow-sm border border-silver-200 transition-all duration-300 cursor-default">
                      <div className="w-12 h-12 rounded-xl bg-neon-100 flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6 text-neon-600" />
                      </div>
                      <p className="text-3xl font-black text-dark-800">{Math.floor(Math.random() * 15) + 5}</p>
                      <p className="text-sm font-medium text-dark-500">runs cette semaine</p>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: CHALLENGE / LEADERBOARD */}
                <div ref={challengeRef} className="section-reveal max-w-4xl mx-auto px-6 py-10">
                  <h2 className="text-xl font-bold text-dark-800 mb-6 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Challenge du mois
                  </h2>

                  <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-6 text-white">
                    {/* Current rank */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-sm text-silver-400 mb-1">Position actuelle</p>
                        <div className="flex items-center gap-2">
                          <span className="text-4xl font-black text-neon-400">
                            {getUserTeamRank() || '-'}
                            <span className="text-lg font-medium text-silver-400">e</span>
                          </span>
                          <span className="text-silver-400">/ {teams.length} equipes</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-neon-600/20 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-neon-400" />
                      </div>
                    </div>

                    {/* Progress to next rank */}
                    {getTeamAhead() && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-silver-400">Prochain objectif</span>
                          <span className="text-neon-400 font-medium">{getTeamAhead()?.name}</span>
                        </div>
                        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className="progress-bar-fill h-full bg-gradient-to-r from-neon-500 to-neon-400 rounded-full"
                            style={{
                              width: `${Math.min(95, ((userTeam.total_distance || 0) / (getTeamAhead()?.total_distance || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-sm text-silver-400 mt-2">
                          <span className="text-neon-400 font-semibold">
                            Encore {Math.max(0, ((getTeamAhead()?.total_distance || 0) - (userTeam.total_distance || 0))).toFixed(1)} km
                          </span>{' '}
                          pour passer {getUserTeamRank()! - 1}e
                        </p>
                      </div>
                    )}

                    {/* Top 3 teams */}
                    <div className="border-t border-dark-700 pt-5">
                      <p className="text-xs font-semibold text-silver-500 uppercase tracking-wider mb-3">Podium</p>
                      <div className="space-y-2">
                        {teams.slice(0, 3).map((team, index) => {
                          const isUserTeam = userTeam && team.id === userTeam.id;
                          const medals = ['', '', ''];
                          return (
                            <div
                              key={team.id}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                isUserTeam ? 'bg-neon-600/20' : 'bg-dark-700/50'
                              }`}
                            >
                              <span className="text-xl">{medals[index]}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${isUserTeam ? 'text-neon-400' : 'text-white'}`}>
                                  {team.name}
                                </p>
                              </div>
                              <p className="text-sm text-silver-400 font-medium">
                                {(team.total_distance || 0).toFixed(1)} km
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: FINAL CTA */}
                <div ref={ctaRef} className="section-reveal max-w-4xl mx-auto px-6 py-10">
                  <div className="bg-gradient-to-br from-neon-500 via-neon-400 to-neon-500 rounded-2xl p-8 text-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-900/20 flex items-center justify-center">
                        <UserPlus className="w-8 h-8 text-dark-900" />
                      </div>
                      <h2 className="text-2xl font-black text-dark-900 mb-2">
                        Invite des coureurs a rejoindre l'equipe
                      </h2>
                      <p className="text-dark-700 mb-6 max-w-md mx-auto">
                        Plus on est nombreux, plus on progresse vite dans le classement !
                      </p>
                      <button className="cta-pulse inline-flex items-center gap-2 px-8 py-3 bg-dark-900 hover:bg-dark-800 text-white font-semibold rounded-full transition-all duration-200 hover:scale-105">
                        <UserPlus className="w-5 h-5" />
                        Inviter des coureurs
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leave team link - discrete */}
                <div className="max-w-4xl mx-auto px-6 pb-10 text-center">
                  <button
                    onClick={handleLeaveTeam}
                    disabled={leavingTeam}
                    className="text-sm text-dark-400 hover:text-pink-600 transition-colors disabled:opacity-50"
                  >
                    {leavingTeam ? 'Chargement...' : 'Quitter l\'equipe'}
                  </button>
                </div>
              </div>
            ) : (
              /* ===== NO TEAM - JOIN/CREATE ===== */
              <div className="max-w-2xl mx-auto px-6 py-12">
                {!showCreateForm ? (
                  /* Invitation to create/join */
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

                    {/* Teams leaderboard preview */}
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
                  /* Create team form */
                  <div className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-dark-800">Cree ton equipe</h2>
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setCreateError(null);
                        }}
                        className="text-dark-400 hover:text-dark-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleCreateTeam} className="space-y-5">
                      {/* Error */}
                      {createError && (
                        <div className="p-4 rounded-xl bg-pink-50 border border-pink-200">
                          <p className="text-pink-600 text-sm">{createError}</p>
                        </div>
                      )}

                      {/* Name */}
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

                      {/* Description */}
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

                      {/* Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false);
                            setCreateError(null);
                          }}
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
