'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Session, SessionParticipant, BadgeType } from '@/lib/types';
import { calculateLevel } from '@/lib/constants';
import ProgressBar from '@/components/ui/ProgressBar';
import SessionCard from '@/components/ui/SessionCard';
import {
  getUserUpcomingSessions,
  getUserSessionHistory,
  updateProfileLocation,
} from '@/lib/actions';
import { getRunnerStats } from '@/lib/stats-actions';
import type { RunnerStats } from '@/lib/types';
import {
  MapPin,
  Search,
  Crosshair,
  Route,
  CheckCircle,
  Star,
  Zap,
  Users,
  Calendar,
  ChevronRight,
  Shield,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TrustScore from '@/components/ui/TrustScore';
import TrustBadge from '@/components/ui/TrustBadge';
import EmergencyButton from '@/components/ui/EmergencyButton';
import { getVerificationInfo } from '@/lib/trust';

export const dynamic = 'force-dynamic';

const BADGE_META_PROFILE: Record<BadgeType, { label: string; emoji: string }> = {
  first_run:         { label: 'Premier run',              emoji: '🏃' },
  social_runner:     { label: 'Coureur social',            emoji: '👥' },
  community_builder: { label: 'Bâtisseur de communauté',  emoji: '🌍' },
  reliable_runner:   { label: 'Coureur fiable',            emoji: '✅' },
  team_player:       { label: 'Esprit d\'équipe',          emoji: '🤝' },
};

// Shown while stats are loading
const BADGE_DEFS_FALLBACK = Object.entries(BADGE_META_PROFILE).map(([type]) => [
  type,
  { current: 0, target: 1 },
]) as [string, { current: number; target: number }][];

export default function ProfilePage() {
  const { profile, loading: authLoading } = useAuth();

  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionParticipant[]>([]);
  const [runnerStats, setRunnerStats] = useState<RunnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location state
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationGeolocating, setLocationGeolocating] = useState(false);

  const searchLocationForProfile = async (query: string) => {
    if (!query.trim()) return;
    setLocationSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      setLocationSearchResults(data);
    } catch {
      setLocationSearchResults([]);
    } finally {
      setLocationSearching(false);
    }
  };

  const saveProfileLocation = async (lat: number, lng: number, cityName: string) => {
    setLocationSaving(true);
    try {
      await updateProfileLocation({
        home_latitude: lat,
        home_longitude: lng,
        home_city: cityName,
      });
      window.location.reload();
    } catch {
      // silently fail
    } finally {
      setLocationSaving(false);
    }
  };

  const useCurrentPositionForProfile = () => {
    if (!navigator.geolocation) return;
    setLocationGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Ma position';
          await saveProfileLocation(latitude, longitude, city);
        } catch {
          await saveProfileLocation(latitude, longitude, 'Ma position');
        }
        setLocationGeolocating(false);
      },
      () => { setLocationGeolocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    async function fetchData() {
      if (authLoading) return;

      if (!profile) {
        setError('Profil non trouve');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [upcoming, history, stats] = await Promise.all([
          getUserUpcomingSessions(),
          getUserSessionHistory(),
          getRunnerStats(),
        ]);
        setUpcomingSessions(upcoming);
        setSessionHistory(history);
        setRunnerStats(stats);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des donnees');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile, authLoading]);

  const levelInfo = profile ? calculateLevel(profile.xp_points || 0) : null;

  const getInitials = (username: string) => {
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const parseBestTimes = (bestTimesJson?: string) => {
    if (!bestTimesJson) return null;
    try {
      const times = JSON.parse(bestTimesJson);
      const firstKey = Object.keys(times)[0];
      return firstKey ? `${firstKey} : ${times[firstKey]}` : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-neu-base pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-dark-800 mb-2">Mon Profil</h1>
          <p className="text-dark-500">Suis ta progression et consulte tes statistiques</p>
        </div>

        {/* Loading */}
        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card border-2 border-pink-500 text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-pink-500" />
            </div>
            <p className="text-pink-500 font-semibold mb-2">Erreur</p>
            <p className="text-dark-500">{error}</p>
          </div>
        )}

        {/* Main content */}
        {!loading && !authLoading && !error && profile && (
          <div className="space-y-8">
            {/* Profile Header Card */}
            <div className="card p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="flex-shrink-0 w-24 h-24 rounded-2xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {getInitials(profile.username)}
                  </div>
                )}

                {/* Profile Info */}
                <div className="flex-1 w-full">
                  <h2 className="text-2xl font-bold text-dark-800 mb-2">{profile.username}</h2>

                  {profile.bio && (
                    <p className="text-dark-500 mb-4">{profile.bio}</p>
                  )}

                  {/* Level progression */}
                  {levelInfo && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-dark-800">
                          Niveau {levelInfo.currentLevel} - {levelInfo.levelName}
                        </span>
                        {levelInfo.currentLevel < 5 && (
                          <span className="text-sm text-dark-500">
                            Niveau {levelInfo.currentLevel + 1} a {levelInfo.nextLevelXP} XP
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        current={levelInfo.currentXP}
                        max={levelInfo.nextLevelXP}
                        level={levelInfo.currentLevel}
                      />
                    </div>
                  )}

                  {/* Team badge */}
                  {profile.team && (
                    <Link
                      href="/teams"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-50 border border-neon-200 text-neon-700 font-semibold hover:bg-neon-100 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      {profile.team.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div>
              <h2 className="text-2xl font-bold text-dark-800 mb-4">Statistiques</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Distance */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                      <Route className="w-6 h-6 text-pink-500" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-dark-800 mb-1">
                    {(profile.total_distance_km || 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-dark-500">km parcourus</div>
                </div>

                {/* Sessions */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-neon-700" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-dark-800 mb-1">
                    {profile.completed_sessions_count || 0}
                  </div>
                  <div className="text-sm text-dark-500">sorties</div>
                </div>

                {/* XP */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                      <Star className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-dark-800 mb-1">
                    {profile.xp_points || 0}
                  </div>
                  <div className="text-sm text-dark-500">points XP</div>
                </div>

                {/* Best time */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-dark-800 mb-1">
                    {parseBestTimes(profile.best_times) || '--'}
                  </div>
                  <div className="text-sm text-dark-500">meilleur temps</div>
                </div>
              </div>
            </div>

            {/* ── Badges Section ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-dark-800">Mes badges</h2>
                {runnerStats && (
                  <span className="text-sm text-dark-500">
                    {runnerStats.badges.length}/{Object.keys(runnerStats.badgeProgress).length} obtenus
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {(runnerStats ? Object.entries(runnerStats.badgeProgress) : BADGE_DEFS_FALLBACK).map(([type, progress]) => {
                  const meta = BADGE_META_PROFILE[type as BadgeType];
                  const isEarned = runnerStats?.badges.some(b => b.badge_type === type) ?? false;
                  const pct = Math.min(100, Math.round(((progress as {current:number;target:number}).current / (progress as {current:number;target:number}).target) * 100));
                  return (
                    <div
                      key={type}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        isEarned
                          ? 'bg-neon-50 border-neon-300 shadow-sm'
                          : 'bg-silver-50 border-silver-200 opacity-70'
                      }`}
                    >
                      <span className={`text-3xl ${isEarned ? '' : 'grayscale opacity-50'}`}>{meta.emoji}</span>
                      <span className="text-xs font-semibold text-dark-800 text-center leading-tight">{meta.label}</span>
                      {isEarned ? (
                        <span className="text-[10px] font-bold text-neon-700 bg-neon-100 px-2 py-0.5 rounded-full">Obtenu ✓</span>
                      ) : (
                        <>
                          <div className="w-full bg-silver-200 rounded-full h-1.5">
                            <div className="bg-neon-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-dark-400">
                            {(progress as {current:number;target:number}).current}/{(progress as {current:number;target:number}).target}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Trust & Safety Section ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-dark-800">Confiance & Sécurité</h2>
                {profile.phone_verified && (
                  <TrustBadge level="phone" />
                )}
              </div>
              <div className="space-y-4">
                {/* Trust score card */}
                <div className="rounded-2xl overflow-hidden">
                  <TrustScore profile={profile} expanded />
                </div>

                {/* Verification steps */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-base font-bold text-dark-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-neon-700" />
                    Niveau de vérification
                  </h3>
                  <div className="space-y-3">
                    {/* Email */}
                    <div className="flex items-center justify-between py-2 border-b border-silver-200">
                      <div className="flex items-center gap-2.5 text-sm text-dark-700">
                        <span className="text-base">✉️</span>
                        Email
                      </div>
                      <TrustBadge
                        level={profile.email ? 'email' : 'none'}
                        label={profile.email ? 'Vérifié' : 'Non configuré'}
                        size="md"
                      />
                    </div>
                    {/* Phone */}
                    <div className="flex items-center justify-between py-2 border-b border-silver-200">
                      <div className="flex items-center gap-2.5 text-sm text-dark-700">
                        <span className="text-base">📱</span>
                        Téléphone
                      </div>
                      {profile.phone_verified ? (
                        <TrustBadge level="phone" label="Vérifié" size="md" />
                      ) : (
                        <a
                          href="/settings/verification"
                          className="text-xs text-neon-700 font-semibold hover:text-neon-600 underline"
                        >
                          Vérifier →
                        </a>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="text-center">
                        <p className="text-xl font-black text-dark-800">{profile.runs_completed ?? 0}</p>
                        <p className="text-xs text-dark-500">Sorties</p>
                      </div>
                      <div className="text-center border-x border-silver-200">
                        <p className="text-xl font-black text-dark-800">
                          {profile.reliability_score != null ? `${profile.reliability_score}%` : '–'}
                        </p>
                        <p className="text-xs text-dark-500">Fiabilité</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-dark-500 mb-1">Depuis</p>
                        <p className="text-sm font-bold text-dark-800">
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                            : '–'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trusted contact + emergency */}
                <div className="card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-dark-800">Sécurité lors des runs</h3>
                    <EmergencyButton
                      trustedContactPhone={profile.trusted_contact_phone}
                      trustedContactName={profile.trusted_contact_name}
                    />
                  </div>
                  {profile.trusted_contact_name ? (
                    <div className="flex items-center gap-3 p-3 bg-neon-50 border border-neon-200 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-neon-100 flex items-center justify-center text-neon-700 text-sm font-bold flex-shrink-0">
                        {profile.trusted_contact_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-800 truncate">{profile.trusted_contact_name}</p>
                        <p className="text-xs text-dark-500">
                          {profile.trusted_contact_relation && `${profile.trusted_contact_relation} · `}
                          Contact de confiance
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-neon-600 flex-shrink-0" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-silver-100 border border-silver-300 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-silver-200 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-dark-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-dark-700">Aucun contact configuré</p>
                        <p className="text-xs text-dark-500">Ajoute un contact de confiance dans les paramètres</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div>
              <h2 className="text-2xl font-bold text-dark-800 mb-4">Ma localisation</h2>
              <div className="card p-6">
                {profile.home_city ? (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-dark-800">{profile.home_city}</div>
                      <div className="text-xs text-dark-500">
                        Utilise pour trouver les sorties a proximite
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-silver-200 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-dark-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-dark-800">Aucune localisation</div>
                      <div className="text-xs text-dark-500">
                        Renseigne ta ville pour trouver les sorties pres de chez toi
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={useCurrentPositionForProfile}
                    disabled={locationGeolocating || locationSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-700 text-neon-700 text-sm font-medium hover:bg-neon-50 transition-colors disabled:opacity-50"
                  >
                    <Crosshair className="w-4 h-4" />
                    {locationGeolocating ? 'Localisation...' : locationSaving ? 'Enregistrement...' : 'Utiliser ma position GPS'}
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchLocationForProfile(locationSearchQuery); } }}
                      placeholder="Rechercher une ville..."
                      className="flex-1 px-3 py-2 rounded-lg border border-silver-400 text-sm focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => searchLocationForProfile(locationSearchQuery)}
                      disabled={locationSearching}
                      className="px-3 py-2 rounded-lg bg-dark-800 text-white text-sm hover:bg-dark-700 transition-colors disabled:opacity-50"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {locationSearchResults.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {locationSearchResults.map((result, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={locationSaving}
                          onClick={() => {
                            const city = result.display_name.split(',')[0].trim();
                            saveProfileLocation(parseFloat(result.lat), parseFloat(result.lon), city);
                            setLocationSearchResults([]);
                            setLocationSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-dark-700 hover:bg-neon-50 transition-colors border border-transparent hover:border-neon-300 disabled:opacity-50"
                        >
                          {result.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-dark-800">Mes prochaines sessions</h2>
                <Link
                  href="/mes-sorties"
                  className="text-sm font-semibold text-neon-700 hover:text-neon-600 transition-colors"
                >
                  Voir tout
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-silver-100 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-dark-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-dark-800 mb-2">Aucune sortie prevue</h3>
                  <p className="text-dark-500 mb-6">Rejoins une session pour courir avec la communaute !</p>
                  <Link
                    href="/sessions"
                    className="neu-btn inline-block px-8 py-3 text-dark-800 font-semibold"
                  >
                    Voir les sessions
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </div>

            {/* History Section */}
            {sessionHistory.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-dark-800 mb-4">Historique</h2>
                <div className="card divide-y divide-silver-200">
                  {sessionHistory.map((participant) => {
                    const session = participant.session;
                    if (!session) return null;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 hover:bg-silver-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neon-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-neon-700" />
                          </div>
                          <div>
                            <div className="font-semibold text-dark-800">{session.title}</div>
                            <div className="text-sm text-dark-500">
                              {formatDate(session.start_time)} · {session.distance_km} km
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {participant.rating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              {Array.from({ length: participant.rating }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-current" />
                              ))}
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-dark-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
