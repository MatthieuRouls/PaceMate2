'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLevelConfig } from '@/lib/strava';
import {
  WEEKLY_KM_OPTIONS,
  PACE_OPTIONS,
  LONGEST_RUN_OPTIONS,
  calculateManualScore,
  scoreToLevel,
  getLevelBandProgress,
  type WeeklyKm,
  type RunnerPace,
  type LongestRun,
  type ManualLevelAnswers,
} from '@/lib/level-manual';
import { saveManualLevel } from '@/lib/actions';

// ─── Tableau des niveaux ──────────────────────────────────────────────────────

const LEVEL_TABLE = [
  { level: 1, emoji: '🌱', allure: '> 7:00 /km',      km: '< 20 km/sem', profil: 'Premières sorties, pas de référence' },
  { level: 2, emoji: '🚶', allure: '6:30 – 7:00 /km', km: '20 – 35 km',  profil: '1-2x/sem, objectif finisher' },
  { level: 3, emoji: '🏃', allure: '5:30 – 6:30 /km', km: '35 – 55 km',  profil: '3x/sem, 10K confortablement' },
  { level: 4, emoji: '💪', allure: '5:00 – 5:30 /km', km: '55 – 75 km',  profil: 'Semi-marathon régulier' },
  { level: 5, emoji: '🎯', allure: '4:30 – 5:00 /km', km: '55 – 75 km',  profil: 'Compétitions, performances' },
  { level: 6, emoji: '⚡', allure: '4:00 – 4:30 /km', km: '75+ km',      profil: 'Entraînement structuré, podiums' },
  { level: 7, emoji: '🔥', allure: '< 4:00 /km',      km: '75+ km',      profil: 'Compétition sérieuse (Strava)' },
  { level: 8, emoji: '🏆', allure: 'Semi < 1h30',     km: '80+ km',      profil: 'Élite amateur (Strava)' },
  { level: 9, emoji: '🌟', allure: 'Semi < 1h15',     km: '100+ km',     profil: 'Niveau national (Strava)' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NiveauPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Pré-remplissage depuis les données existantes
  const existing = profile?.manual_level_data as ManualLevelAnswers | undefined;

  const [weeklyKm, setWeeklyKm] = useState<WeeklyKm | ''>(existing?.weeklyKm ?? '');
  const [pace, setPace] = useState<RunnerPace | ''>(existing?.pace ?? '');
  const [longest, setLongest] = useState<LongestRun | ''>(existing?.longestRun ?? '');
  const [times, setTimes] = useState({
    fiveK:    existing?.bestTime5k       ?? '',
    tenK:     existing?.bestTime10k      ?? '',
    semi:     existing?.bestTimeSemi     ?? '',
    marathon: existing?.bestTimeMarathon ?? '',
  });

  const [savedLevel, setSavedLevel] = useState<number | null>(null);
  const [showTimes, setShowTimes] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const canSave = weeklyKm !== '' && pace !== '' && longest !== '';

  // Prévisualisation en temps réel
  const previewScore = canSave
    ? calculateManualScore({ isRunner: true, weeklyKm: weeklyKm as WeeklyKm, pace: pace as RunnerPace, longestRun: longest as LongestRun })
    : 0;
  const previewLevel = canSave ? scoreToLevel(previewScore) : null;
  const previewCfg = previewLevel ? getLevelConfig(previewLevel) : null;
  const progressPct = previewLevel ? getLevelBandProgress(previewScore, previewLevel) : 0;

  const handleSave = () => {
    if (!canSave) return;

    const answers: ManualLevelAnswers = {
      isRunner: true,
      weeklyKm:       weeklyKm as WeeklyKm,
      pace:           pace as RunnerPace,
      longestRun:     longest as LongestRun,
      bestTime5k:     times.fiveK    || undefined,
      bestTime10k:    times.tenK     || undefined,
      bestTimeSemi:   times.semi     || undefined,
      bestTimeMarathon: times.marathon || undefined,
    };

    startTransition(async () => {
      const result = await saveManualLevel(answers);
      if (result.success) {
        setSavedLevel(result.level);
        await refreshProfile();
      }
    });
  };

  // ── Succès ────────────────────────────────────────────────────────────────
  if (savedLevel !== null) {
    const cfg = getLevelConfig(savedLevel);
    return (
      <div className="min-h-screen bg-silver-50 pt-24 pb-12 px-4 flex items-start justify-center">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-silver-300 p-8 text-center shadow-sm">
            <CheckCircle className="w-14 h-14 text-neon-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-dark-800 mb-2">Profil mis à jour !</h2>
            <p className="text-dark-500 mb-6">
              Tes sessions, suggestions et filtres sont maintenant calibrés pour ton niveau.
            </p>

            <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-bold text-lg mb-4 ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}>
              Niveau {savedLevel} — {cfg.label}
            </div>

            <div className="w-full bg-silver-200 rounded-full h-2 mb-6">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-neon-600 to-neon-400 transition-all duration-700"
                style={{ width: `${getLevelBandProgress(previewScore, savedLevel)}%` }}
              />
            </div>

            <div className="space-y-2 text-sm text-left bg-silver-50 rounded-xl p-4 mb-6 border border-silver-200">
              <p className="font-semibold text-dark-700 mb-2">Ce qui a été optimisé :</p>
              <p className="text-dark-600">✓ Filtres de sessions adaptés à ton niveau</p>
              <p className="text-dark-600">✓ Suggestions de runs dans ta fourchette</p>
              <p className="text-dark-600">✓ Matching avec des runners compatibles</p>
              {!profile?.strava_connected && (
                <p className="text-dark-400 text-xs mt-2">
                  Connecte Strava dans les paramètres pour un niveau encore plus précis.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/sessions"
                className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold text-base hover:bg-pink-600 transition-colors text-center"
              >
                Voir les sessions pour moi →
              </Link>
              <Link
                href="/profile"
                className="w-full py-3 rounded-xl border border-silver-300 text-dark-600 font-medium text-sm hover:bg-silver-50 transition-colors text-center"
              >
                Retour à mon profil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-silver-50 pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-dark-500 hover:text-dark-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au profil
          </Link>
          <h1 className="text-2xl font-bold text-dark-800">Mon niveau de running</h1>
          <p className="text-dark-500 text-sm mt-1">
            Ces informations calibrent tes sessions, tes suggestions et ton matching.
          </p>
        </div>

        {/* Tableau des niveaux */}
        <div className="bg-white rounded-xl border border-silver-300 overflow-hidden">
          <button
            onClick={() => setShowTable(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-silver-50 transition-colors text-left"
          >
            <span className="font-semibold text-dark-800">📊 Les 9 niveaux PaceMate</span>
            <span className="text-dark-400 text-sm">{showTable ? '▲ Réduire' : '▼ Voir'}</span>
          </button>

          {showTable && (
            <div className="overflow-x-auto border-t border-silver-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-silver-50 text-dark-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left font-semibold">Niveau</th>
                    <th className="px-3 py-2 text-left font-semibold">Allure</th>
                    <th className="px-3 py-2 text-left font-semibold">Volume</th>
                    <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVEL_TABLE.map(({ level, emoji, allure, km, profil }) => {
                    const cfg = getLevelConfig(level);
                    return (
                      <tr key={level} className="border-t border-silver-100 hover:bg-silver-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[11px] ${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`}>
                            {emoji} {cfg.shortLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-dark-600 font-mono text-[11px] whitespace-nowrap">{allure}</td>
                        <td className="px-3 py-2.5 text-dark-600 text-[11px] whitespace-nowrap">{km}</td>
                        <td className="px-3 py-2.5 text-dark-400 text-[11px] hidden sm:table-cell">{profil}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-4 py-2 text-[10px] text-dark-400 border-t border-silver-100 bg-silver-50">
                Niveaux 7-9 accessibles uniquement via connexion Strava.
              </p>
            </div>
          )}
        </div>

        {/* Questionnaire */}
        <div className="bg-white rounded-xl border border-silver-300 p-6 space-y-6">
          <h2 className="font-bold text-dark-800">Tes habitudes de course</h2>

          {/* Kilométrage hebdo */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
              Kilométrage hebdomadaire moyen
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {WEEKLY_KM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWeeklyKm(opt.value)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    weeklyKm === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300 hover:bg-silver-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allure */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
              Allure habituelle (sortie facile / tempo)
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {PACE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPace(opt.value)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    pace === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300 hover:bg-silver-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plus longue sortie */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
              Ta plus longue sortie
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {LONGEST_RUN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLongest(opt.value)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    longest === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300 hover:bg-silver-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview niveau en temps réel */}
          {previewCfg && (
            <div className={`rounded-xl p-4 border-2 ${previewCfg.bgClass} ${previewCfg.borderClass}`}>
              <p className="text-xs text-dark-500 mb-1">Niveau estimé</p>
              <p className={`text-xl font-bold mb-2 ${previewCfg.textClass}`}>
                Niveau {previewLevel} — {previewCfg.label}
              </p>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #b5ff2d, #8bcc00)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Temps de référence */}
          <div>
            <button
              onClick={() => setShowTimes(o => !o)}
              className="text-sm font-medium text-neon-700 hover:text-neon-600 transition-colors"
            >
              {showTimes ? '▲ Masquer les temps de référence' : '+ Ajouter des temps de référence (optionnel)'}
            </button>

            {showTimes && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-dark-500">
                  Affine ton niveau avec tes chronos. Format : <span className="font-mono">mm:ss</span> ou <span className="font-mono">h:mm:ss</span>
                </p>
                {[
                  { key: 'fiveK',    label: '5 km',          placeholder: '25:30' },
                  { key: 'tenK',     label: '10 km',         placeholder: '52:15' },
                  { key: 'semi',     label: 'Semi-marathon', placeholder: '1:55:00' },
                  { key: 'marathon', label: 'Marathon',      placeholder: '3:45:00' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-dark-700 flex-shrink-0">{label}</span>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={times[key as keyof typeof times]}
                      onChange={e => setTimes(t => ({ ...t, [key]: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-silver-300 text-dark-800 font-mono text-sm focus:outline-none focus:border-neon-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSave}
          disabled={!canSave || isPending}
          className="w-full py-4 rounded-xl bg-pink-500 text-white font-bold text-lg hover:bg-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isPending ? 'Enregistrement…' : 'Valider mon niveau'}
        </button>
      </div>
    </div>
  );
}
