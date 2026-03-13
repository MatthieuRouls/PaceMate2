'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, ChevronRight, ChevronLeft,
  Star, Zap, MapPin, Users, Trophy, ThumbsUp, ThumbsDown, Minus,
  AlertTriangle, X, Flag,
} from 'lucide-react';
import { completeRun, PeerFeedbackInput, CompleteRunResult } from '@/lib/actions';
import { Profile, Session } from '@/lib/types';

// ============================================================
// Types
// ============================================================

type WizardStep = 'confirm' | 'peers' | 'session-rating' | 'celebration';

interface PeerState {
  userId: string;
  username: string;
  avatarUrl?: string;
  rating: 'positive' | 'neutral' | 'negative' | null;
  flags: string[];
  showFlags: boolean;
}

interface PostRunWizardProps {
  session: Session & { participants?: Profile[] };
  currentUserId: string;
  onClose: () => void;
  onComplete?: (result: CompleteRunResult) => void;
}

// ============================================================
// Flag definitions
// ============================================================

const POSITIVE_FLAGS: { id: string; label: string; emoji: string }[] = [
  { id: 'great_pacer',        label: 'Super rythme',         emoji: '⚡' },
  { id: 'encouraging',        label: 'Encourageant(e)',       emoji: '💪' },
  { id: 'punctual',           label: 'Ponctuel(le)',          emoji: '⏱️' },
  { id: 'good_communication', label: 'Bonne communication',   emoji: '💬' },
  { id: 'safe_runner',        label: 'Coureur/se sûr(e)',     emoji: '🛡️' },
];

const NEGATIVE_FLAGS: { id: string; label: string; emoji: string; severe: boolean }[] = [
  { id: 'late_arrival',            label: 'En retard',                  emoji: '🕐', severe: false },
  { id: 'no_show',                 label: 'Absent(e) sans prévenir',    emoji: '👻', severe: false },
  { id: 'different_pace',          label: 'Rythme très différent',      emoji: '🐢', severe: false },
  { id: 'didnt_follow_route',      label: "N'a pas suivi le parcours",  emoji: '🗺️', severe: false },
  { id: 'inappropriate_behavior',  label: 'Comportement inapproprié',   emoji: '⚠️', severe: true  },
  { id: 'uncomfortable',           label: "M'a mis(e) mal à l'aise",    emoji: '😰', severe: true  },
  { id: 'harassment',              label: 'Harcèlement',                emoji: '🚨', severe: true  },
  { id: 'unsafe_behavior',         label: 'Comportement dangereux',     emoji: '🚫', severe: true  },
  { id: 'other',                   label: 'Autre motif',                emoji: '📝', severe: false },
];

const SESSION_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Mauvaise sortie',     color: 'text-red-500'    },
  2: { label: 'Sortie décevante',    color: 'text-orange-500' },
  3: { label: 'Sortie correcte',     color: 'text-yellow-500' },
  4: { label: 'Bonne sortie !',      color: 'text-green-500'  },
  5: { label: 'Sortie parfaite 🔥',  color: 'text-neon-600'   },
};

// ============================================================
// Helpers
// ============================================================

function getInitials(username: string) {
  const parts = username.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.substring(0, 2).toUpperCase();
}

function Avatar({ profile, size = 'md' }: { profile: { username: string; avatar_url?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm';
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.username} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-neon-400 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {getInitials(profile.username)}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current ? 'bg-neon-500 w-6' : i === current ? 'bg-neon-500 w-4' : 'bg-silver-300 w-3'
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function PostRunWizard({ session, currentUserId, onClose, onComplete }: PostRunWizardProps) {
  const otherParticipants = (session.participants ?? []).filter((p) => p.id !== currentUserId);
  const hasPeers = otherParticipants.length > 0;
  const steps: WizardStep[] = ['confirm', ...(hasPeers ? ['peers' as WizardStep] : []), 'session-rating', 'celebration'];
  const totalDisplaySteps = steps.length - 1; // exclude celebration from indicator

  const [step, setStep] = useState<WizardStep>('confirm');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompleteRunResult | null>(null);

  // Session rating state
  const [sessionRating, setSessionRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [sessionComment, setSessionComment] = useState('');

  // Peer states
  const [peers, setPeers] = useState<PeerState[]>(
    otherParticipants.map((p) => ({
      userId: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      rating: null,
      flags: [],
      showFlags: false,
    }))
  );

  const currentStepIndex = steps.indexOf(step);

  // ---- Navigation ----

  const goNext = useCallback(() => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }, [step, steps]);

  const goBack = useCallback(() => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }, [step, steps]);

  // ---- Confirm step actions ----

  const handleNotParticipated = async () => {
    setSubmitting(true);
    await completeRun(session.id, { participated: false, peerFeedbacks: [] });
    setSubmitting(false);
    onClose();
  };

  // ---- Peer rating helpers ----

  const setPeerRating = (userId: string, rating: 'positive' | 'neutral' | 'negative') => {
    setPeers((prev) =>
      prev.map((p) =>
        p.userId === userId
          ? { ...p, rating, flags: rating === 'neutral' ? [] : p.flags, showFlags: rating === 'negative' }
          : p
      )
    );
  };

  const togglePeerFlag = (userId: string, flag: string) => {
    setPeers((prev) =>
      prev.map((p) => {
        if (p.userId !== userId) return p;
        const has = p.flags.includes(flag);
        return { ...p, flags: has ? p.flags.filter((f) => f !== flag) : [...p.flags, flag] };
      })
    );
  };

  // ---- Final submit ----

  const handleSubmit = async () => {
    setSubmitting(true);

    const peerFeedbacks: PeerFeedbackInput[] = peers
      .filter((p) => p.rating !== null)
      .map((p) => ({ userId: p.userId, rating: p.rating!, flags: p.flags }));

    const res = await completeRun(session.id, {
      participated: true,
      sessionRating: sessionRating || undefined,
      sessionComment: sessionComment.trim() || undefined,
      peerFeedbacks,
    });

    setResult(res);
    setSubmitting(false);

    if (res.success) {
      setStep('celebration');
      onComplete?.(res);
    }
  };

  // ============================================================
  // RENDER STEPS
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'celebration' ? onClose : undefined} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        {step !== 'celebration' && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-silver-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              {currentStepIndex > 0 && (
                <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-silver-100 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-dark-600" />
                </button>
              )}
              <div>
                <p className="text-xs text-dark-400 font-medium uppercase tracking-wider">Sortie terminée</p>
                <p className="text-sm font-bold text-dark-800 truncate max-w-[200px]">{session.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StepIndicator current={currentStepIndex} total={totalDisplaySteps} />
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-silver-100 transition-colors">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ========== STEP: confirm ========== */}
          {step === 'confirm' && (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="text-5xl mb-2">🏃</div>
                <h2 className="text-xl font-bold text-dark-800">As-tu participé à cette sortie ?</h2>
                <p className="text-sm text-dark-500">{session.distance_km} km · {session.location_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={goNext}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-neon-500 bg-neon-50 hover:bg-neon-100 transition-all group"
                >
                  <CheckCircle className="w-8 h-8 text-neon-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-dark-800">Oui, j'y étais !</span>
                  <span className="text-xs text-dark-500 text-center">Valider ma participation</span>
                </button>

                <button
                  onClick={handleNotParticipated}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-silver-300 hover:border-pink-300 hover:bg-pink-50 transition-all group disabled:opacity-50"
                >
                  <XCircle className="w-8 h-8 text-dark-400 group-hover:text-pink-500 transition-colors" />
                  <span className="font-bold text-dark-600 group-hover:text-pink-600">Non, je n'ai pas pu</span>
                  <span className="text-xs text-dark-500 text-center">Signaler mon absence</span>
                </button>
              </div>

              <p className="text-center text-xs text-dark-400">
                Valider ta sortie te permet de gagner des XP et d'alimenter tes statistiques.
              </p>
            </div>
          )}

          {/* ========== STEP: peers ========== */}
          {step === 'peers' && (
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-dark-800">Tes co-coureurs</h2>
                <p className="text-sm text-dark-500">
                  Ton avis est anonyme et sert uniquement à améliorer la sécurité.
                </p>
              </div>

              <div className="space-y-3">
                {peers.map((peer) => (
                  <div key={peer.userId} className="border border-silver-200 rounded-xl overflow-hidden">
                    {/* Peer header */}
                    <div className="flex items-center gap-3 p-4">
                      {peer.avatarUrl ? (
                        <img src={peer.avatarUrl} alt={peer.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neon-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {getInitials(peer.username)}
                        </div>
                      )}
                      <span className="font-semibold text-dark-800 flex-1">{peer.username}</span>

                      {/* Rating buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPeerRating(peer.userId, 'positive')}
                          title="Super !"
                          className={`p-2 rounded-lg border-2 transition-all ${
                            peer.rating === 'positive'
                              ? 'border-green-500 bg-green-50 text-green-600'
                              : 'border-silver-200 hover:border-green-300 hover:bg-green-50 text-dark-400'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPeerRating(peer.userId, 'neutral')}
                          title="Neutre"
                          className={`p-2 rounded-lg border-2 transition-all ${
                            peer.rating === 'neutral'
                              ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                              : 'border-silver-200 hover:border-yellow-300 hover:bg-yellow-50 text-dark-400'
                          }`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPeerRating(peer.userId, 'negative')}
                          title="Signaler un problème"
                          className={`p-2 rounded-lg border-2 transition-all ${
                            peer.rating === 'negative'
                              ? 'border-red-400 bg-red-50 text-red-500'
                              : 'border-silver-200 hover:border-red-300 hover:bg-red-50 text-dark-400'
                          }`}
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Positive flag chips */}
                    {peer.rating === 'positive' && (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-dark-400 mb-2">Compliments (optionnel)</p>
                        <div className="flex flex-wrap gap-2">
                          {POSITIVE_FLAGS.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => togglePeerFlag(peer.userId, f.id)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                peer.flags.includes(f.id)
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-silver-200 text-dark-500 hover:border-green-300'
                              }`}
                            >
                              <span>{f.emoji}</span>
                              <span>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Negative flag chips */}
                    {peer.rating === 'negative' && (
                      <div className="px-4 pb-4 bg-red-50/60 border-t border-red-100">
                        <div className="flex items-center gap-1.5 py-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <p className="text-xs font-semibold text-red-600">Précise le motif (ton identité reste anonyme)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {NEGATIVE_FLAGS.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => togglePeerFlag(peer.userId, f.id)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                peer.flags.includes(f.id)
                                  ? f.severe
                                    ? 'border-red-600 bg-red-100 text-red-700 font-bold'
                                    : 'border-orange-400 bg-orange-50 text-orange-700'
                                  : 'border-red-200 text-dark-500 hover:border-red-400'
                              }`}
                            >
                              <span>{f.emoji}</span>
                              <span>{f.label}</span>
                            </button>
                          ))}
                        </div>
                        {peer.flags.some((f) => ['harassment', 'unsafe_behavior', 'inappropriate_behavior', 'uncomfortable'].includes(f)) && (
                          <div className="mt-2 px-3 py-2 bg-red-100 rounded-lg">
                            <p className="text-xs text-red-700 font-medium">
                              🚨 Ce signalement sera transmis à notre équipe de modération pour examen.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-dark-400 italic">
                Tu peux passer cette étape si tu ne souhaites pas évaluer tes co-coureurs.
              </p>
            </div>
          )}

          {/* ========== STEP: session-rating ========== */}
          {step === 'session-rating' && (
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-dark-800">Comment s'est passée la sortie ?</h2>
                <p className="text-sm text-dark-500">Ta note aide les autres coureurs à choisir leurs sessions.</p>
              </div>

              {/* Stars */}
              <div className="text-center space-y-3">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSessionRating(s)}
                      onMouseEnter={() => setHoveredRating(s)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          s <= (hoveredRating || sessionRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-silver-300 fill-silver-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(sessionRating > 0) && (
                  <p className={`text-sm font-bold ${SESSION_LABELS[sessionRating]?.color}`}>
                    {SESSION_LABELS[sessionRating]?.label}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-dark-700">
                  Un mot sur la sortie ? <span className="text-dark-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={sessionComment}
                  onChange={(e) => setSessionComment(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="L'ambiance, le parcours, l'organisation..."
                  className="w-full px-4 py-3 rounded-xl border border-silver-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neon-300 focus:border-neon-400"
                />
                <p className="text-xs text-dark-400 text-right">{sessionComment.length}/300</p>
              </div>

              {/* XP preview */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neon-50 border border-neon-200">
                <Zap className="w-5 h-5 text-neon-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-neon-700">
                    +{50 + (sessionRating ? 10 : 0) + (sessionRating >= 4 ? 5 : 0) + Math.min(peers.filter(p => p.rating).length, 3) * 5} XP
                    &nbsp;<span className="font-normal text-neon-600">à gagner</span>
                  </p>
                  <p className="text-xs text-neon-600">
                    50 XP participation
                    {sessionRating > 0 && ' · +10 XP note'}
                    {sessionRating >= 4 && ' · +5 XP bonus'}
                    {peers.filter(p => p.rating).length > 0 && ` · +${Math.min(peers.filter(p => p.rating).length, 3) * 5} XP évaluations`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP: celebration ========== */}
          {step === 'celebration' && result?.success && (
            <div className="p-6 text-center space-y-6">
              {/* Confetti header */}
              <div className="space-y-2">
                <div className="text-6xl animate-bounce">🎉</div>
                <h2 className="text-2xl font-bold text-dark-800">Sortie validée !</h2>
                <p className="text-dark-500">Bien joué ! Tes stats ont été mises à jour.</p>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neon-50 border border-neon-200 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-neon-600" />
                    <span className="text-xs font-semibold text-neon-600 uppercase tracking-wider">XP Gagnés</span>
                  </div>
                  <p className="text-3xl font-bold text-neon-700">+{result.xpGained}</p>
                  <p className="text-xs text-dark-500 mt-1">Total : {result.totalXp?.toLocaleString()} XP</p>
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-semibold text-pink-600 uppercase tracking-wider">Kilomètres</span>
                  </div>
                  <p className="text-3xl font-bold text-pink-600">+{result.kmAdded}</p>
                  <p className="text-xs text-dark-500 mt-1">Total : {result.totalKm?.toFixed(1)} km</p>
                </div>

                {(result.teamKmAdded ?? 0) > 0 && (
                  <div className="col-span-2 bg-dark-800 rounded-xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-neon-400" />
                      <span className="text-xs font-semibold text-neon-400 uppercase tracking-wider">Contribution équipe</span>
                    </div>
                    <p className="text-2xl font-bold text-white">+{result.teamKmAdded} km</p>
                    <p className="text-xs text-dark-400 mt-1">ajoutés au compteur de ton équipe</p>
                  </div>
                )}
              </div>

              {/* Encouragement */}
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-silver-100">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <p className="text-sm font-medium text-dark-700">Continue comme ça, tu grimpes dans le classement !</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-silver-200 bg-white">
          {step === 'confirm' && null}

          {step === 'peers' && (
            <button
              onClick={goNext}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-dark-800 text-white font-bold hover:bg-dark-700 transition-colors"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {step === 'session-rating' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Validation en cours...
                </>
              ) : (
                <>
                  Valider ma sortie
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {step === 'celebration' && (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-neon-500 text-dark-800 font-bold hover:bg-neon-400 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
