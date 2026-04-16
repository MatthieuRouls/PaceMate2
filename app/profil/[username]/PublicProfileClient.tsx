'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLevelConfig } from '@/lib/strava';
import { computeTrustScore } from '@/lib/trust';
import { sendFriendRequest, checkFriendshipStatus } from '@/lib/friend-actions';
import { useEffect } from 'react';
import {
  MapPin,
  Activity,
  Route,
  Users,
  Calendar,
  Shield,
  CheckCircle,
  MessageCircle,
  UserPlus,
  Timer,
  TrendingUp,
  Star,
  Zap,
} from 'lucide-react';

interface PublicProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  home_city?: string;
  running_level: number;
  level_source?: 'strava' | 'manual' | 'default';
  strava_connected?: boolean;
  calculated_avg_pace?: string;
  calculated_weekly_km?: number;
  calculated_longest_run?: number;
  calculated_total_runs?: number;
  runs_completed?: number;
  runs_hosted?: number;
  total_distance_km?: number;
  reliability_score?: number;
  phone_verified?: boolean;
  created_at?: string;
  completed_sessions_count: number;
}

interface Props {
  profile: PublicProfile;
}

const LEVEL_PEERS: Record<number, string> = {
  1: 'Premiers pas — sorties découverte',
  2: 'Occasionnel — 1-2x/sem, ~6:30-7:00/km',
  3: 'Régulier — 2-3x/sem, ~5:30-6:30/km',
  4: 'Confirmé — 3-4x/sem, < 5:30/km',
  5: 'Compétiteur — 4-5x/sem, < 5:00/km',
  6: 'Expert — 5+/sem, < 4:30/km',
  7: 'Performance — entraînement structuré, < 4:00/km',
  8: 'Élite amateur — semi < 1h30',
  9: 'Élite national — compétition',
};

function formatPace(pace?: string): string {
  if (!pace) return '—';
  // Format: "00:05:30" → "5:30 /km"
  const parts = pace.split(':');
  if (parts.length === 3) {
    const min = parseInt(parts[1]);
    const sec = parts[2];
    return `${min}:${sec} /km`;
  }
  return pace;
}

function getInitials(username: string): string {
  const parts = username.split(/[\s_-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.substring(0, 2).toUpperCase();
}

export default function PublicProfileClient({ profile }: Props) {
  const { user, profile: myProfile } = useAuth();
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'sent' | 'loading'>('loading');
  const [sending, setSending] = useState(false);

  const isOwnProfile = user?.id === profile.id;
  const cfg = getLevelConfig(profile.running_level);
  const trustScore = computeTrustScore(profile);

  // Compatibilité de niveau (différence <= 1 = idéal, <= 2 = compatible)
  const myLevel = myProfile?.running_level ?? 0;
  const levelDiff = myLevel ? Math.abs(myLevel - profile.running_level) : null;
  const isCompatible = levelDiff !== null && levelDiff <= 2;
  const isIdeal = levelDiff !== null && levelDiff <= 1;

  useEffect(() => {
    if (!user || isOwnProfile) {
      setFriendStatus('none');
      return;
    }
    checkFriendshipStatus(profile.id).then((res) => {
      if (!res.success) { setFriendStatus('none'); return; }
      const s = res.status;
      if (s === 'accepted') setFriendStatus('accepted');
      else if (s === 'pending_sent') setFriendStatus('sent');
      else if (s === 'pending_received') setFriendStatus('pending');
      else setFriendStatus('none');
    }).catch(() => setFriendStatus('none'));
  }, [user, profile.id, isOwnProfile]);

  const handleSendRequest = async () => {
    if (!user) return;
    setSending(true);
    try {
      const res = await sendFriendRequest(profile.id);
      if (res.success) setFriendStatus('sent');
    } finally {
      setSending(false);
    }
  };

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-silver-50 to-white pb-24 pt-20 px-4 sm:px-6">
      <div className="max-w-[600px] mx-auto space-y-5">

        {/* ── HERO ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-silver-100 p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-neon-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {getInitials(profile.username)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-dark-800 truncate">{profile.username}</h1>
                  {profile.home_city && (
                    <p className="text-sm text-dark-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.home_city}
                    </p>
                  )}
                </div>
                {/* Niveau badge */}
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-sm font-bold ${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`}>
                  Niv. {profile.running_level} — {cfg.label}
                </span>
              </div>

              {/* Badges de confiance */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {profile.phone_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16C784]/10 text-[#0EA371] border border-[#16C784]/25 text-xs font-semibold">
                    <CheckCircle className="w-3 h-3" /> Vérifié
                  </span>
                )}
                {profile.strava_connected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                    <Activity className="w-3 h-3" /> Strava
                  </span>
                )}
                <span className="text-xs text-dark-400">
                  Fiabilité {trustScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-sm text-dark-600 leading-relaxed border-t border-silver-100 pt-4">
              {profile.bio}
            </p>
          )}

          {/* Profil type de niveau */}
          <div className={`mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${cfg.bgClass} ${cfg.borderClass}`}>
            <Zap className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.textClass}`} />
            <span className="text-dark-600">{LEVEL_PEERS[profile.running_level]}</span>
          </div>

          {/* Compatibilité avec l'utilisateur connecté */}
          {!isOwnProfile && myLevel > 0 && levelDiff !== null && (
            <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              isIdeal
                ? 'bg-neon-50 text-neon-800 border border-neon-200'
                : isCompatible
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-silver-100 text-dark-500 border border-silver-200'
            }`}>
              <Star className="w-3.5 h-3.5 shrink-0" />
              {isIdeal
                ? 'Niveau idéalement compatible avec toi'
                : isCompatible
                ? 'Niveau compatible avec toi'
                : `Différence de ${levelDiff} niveaux avec toi`}
            </div>
          )}

          {/* Actions */}
          {!isOwnProfile && user && (
            <div className="mt-4 flex gap-2">
              {friendStatus === 'loading' ? null : friendStatus === 'accepted' ? (
                <Link
                  href="/messages"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-800 text-white text-sm font-semibold hover:bg-dark-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Envoyer un message
                </Link>
              ) : friendStatus === 'sent' ? (
                <div className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-silver-100 text-dark-500 text-sm font-medium border border-silver-200 cursor-default">
                  <CheckCircle className="w-4 h-4" />
                  Demande envoyée
                </div>
              ) : friendStatus === 'pending' ? (
                <div className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neon-50 text-neon-800 text-sm font-medium border border-neon-200 cursor-default">
                  Demande reçue — va dans{' '}
                  <Link href="/friends" className="underline">Runners</Link>
                </div>
              ) : (
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  {sending ? 'Envoi...' : 'Courir ensemble'}
                </button>
              )}
              <Link
                href={`/sessions?create=1`}
                className="px-4 py-2.5 rounded-xl border border-silver-300 text-dark-600 text-sm font-medium hover:bg-silver-50 transition-colors"
              >
                Créer un run
              </Link>
            </div>
          )}

          {isOwnProfile && (
            <div className="mt-4">
              <Link
                href="/settings"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-silver-300 text-dark-600 text-sm font-medium hover:bg-silver-50 transition-colors"
              >
                Modifier mon profil
              </Link>
            </div>
          )}
        </div>

        {/* ── STATS ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-silver-100 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400 mb-4">Statistiques</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Calendar,
                label: 'Runs effectués',
                value: String(profile.runs_completed ?? profile.completed_sessions_count ?? 0),
              },
              {
                icon: Route,
                label: 'Distance totale',
                value: profile.total_distance_km
                  ? `${Math.round(profile.total_distance_km)} km`
                  : profile.calculated_weekly_km
                  ? `~${Math.round((profile.calculated_weekly_km ?? 0) * 12)} km`
                  : '—',
              },
              {
                icon: Users,
                label: 'Sessions organisées',
                value: String(profile.runs_hosted ?? 0),
              },
              {
                icon: Shield,
                label: 'Fiabilité',
                value: `${profile.reliability_score ?? 50}%`,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-silver-50 rounded-xl px-4 py-3">
                <p className="text-[10px] text-dark-400 font-medium flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {label}
                </p>
                <p className="text-lg font-bold text-dark-800 mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Stats Strava si disponibles */}
          {profile.strava_connected && profile.calculated_avg_pace && (
            <div className="mt-3 pt-3 border-t border-silver-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400 mb-2">
                Données Strava
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Timer, label: 'Allure moy.', value: formatPace(profile.calculated_avg_pace) },
                  { icon: TrendingUp, label: 'Km/sem', value: `${(profile.calculated_weekly_km ?? 0).toFixed(0)} km` },
                  { icon: Route, label: 'Plus long run', value: `${(profile.calculated_longest_run ?? 0).toFixed(0)} km` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-orange-50 rounded-xl px-3 py-2 text-center">
                    <Icon className="w-3.5 h-3.5 text-orange-500 mx-auto" />
                    <p className="text-[9px] text-dark-400 mt-0.5">{label}</p>
                    <p className="text-sm font-bold text-dark-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── INFOS ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-silver-100 p-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400">Membre</p>
          {memberSince && (
            <p className="text-sm text-dark-500">
              Sur PaceMate depuis <span className="font-semibold text-dark-700">{memberSince}</span>
            </p>
          )}
          {profile.level_source === 'strava' && (
            <p className="text-xs text-dark-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-orange-500" />
              Niveau calculé depuis ses vraies activités Strava
            </p>
          )}
          {profile.level_source === 'manual' && (
            <p className="text-xs text-dark-400">
              Niveau déclaré sur base de son questionnaire d'étalonnage
            </p>
          )}
        </div>

        {/* ── CTA si non connecté ───────────────────── */}
        {!user && (
          <div className="bg-gradient-to-r from-pink-500 to-neon-500 rounded-2xl p-5 text-center">
            <p className="text-white font-bold text-base mb-1">
              Rejoins PaceMate pour courir avec {profile.username}
            </p>
            <p className="text-white/80 text-sm mb-4">
              Trouve des partenaires de running compatibles avec ton niveau.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl bg-white text-dark-800 text-sm font-bold hover:bg-silver-50 transition-colors"
            >
              Créer un compte →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
