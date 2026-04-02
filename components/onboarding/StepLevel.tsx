'use client';

import { useState } from 'react';
import { StepProps } from './onboarding.types';
import {
  WEEKLY_KM_OPTIONS,
  PACE_OPTIONS,
  LONGEST_RUN_OPTIONS,
  calculateManualScore,
  scoreToLevel,
  type WeeklyKm,
  type RunnerPace,
  type LongestRun,
} from '@/lib/level-manual';
import { getLevelConfig } from '@/lib/strava';

type SubStep = 'choice' | 'habits' | 'times';

export default function StepLevel({ data, updateData, onNext, onBack }: StepProps) {
  const [subStep, setSubStep] = useState<SubStep>(
    data.levelIsRunner === null ? 'choice' : data.levelIsRunner ? 'habits' : 'choice'
  );

  const weeklyKm = data.levelWeeklyKm as WeeklyKm | '';
  const pace = data.levelPace as RunnerPace | '';
  const longest = data.levelLongestRun as LongestRun | '';

  const canProceedHabits = weeklyKm !== '' && pace !== '' && longest !== '';

  // Prévisualisation niveau en temps réel
  const previewScore = canProceedHabits
    ? calculateManualScore({
        isRunner: true,
        weeklyKm: weeklyKm as WeeklyKm,
        pace: pace as RunnerPace,
        longestRun: longest as LongestRun,
      })
    : 0;
  const previewLevel = canProceedHabits ? scoreToLevel(previewScore) : null;
  const previewCfg = previewLevel ? getLevelConfig(previewLevel) : null;

  const handleDebutant = () => {
    updateData({ levelIsRunner: false });
    onNext();
  };

  return (
    <div className="space-y-5">

      {/* ── Choice ──────────────────────────────────────── */}
      {subStep === 'choice' && (
        <>
          <div>
            <h2 className="text-2xl font-bold text-dark-800 mb-1">Ton niveau de running</h2>
            <p className="text-dark-500 text-sm">
              Pour te matcher avec des runners compatibles, on a besoin d'estimer ton niveau.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { updateData({ levelIsRunner: true }); setSubStep('habits'); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-silver-300 hover:border-neon-500 hover:bg-neon-50 transition-all text-left"
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-dark-800">Je cours déjà</p>
                <p className="text-xs text-dark-500">Dis-moi tes habitudes pour estimer ton niveau</p>
              </div>
            </button>

            <button
              onClick={handleDebutant}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-silver-300 hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
            >
              <span className="text-2xl">🌱</span>
              <div>
                <p className="font-semibold text-dark-800">Je débute</p>
                <p className="text-xs text-dark-500">Pas encore de références — on commence au niveau Débutant</p>
              </div>
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onBack} className="text-xs text-dark-400 hover:text-dark-600 transition-colors">
              ← Retour
            </button>
            <button onClick={onNext} className="ml-auto text-xs text-dark-400 hover:text-dark-600 transition-colors">
              Passer →
            </button>
          </div>
        </>
      )}

      {/* ── Habits ──────────────────────────────────────── */}
      {subStep === 'habits' && (
        <>
          <div>
            <h2 className="text-xl font-bold text-dark-800 mb-1">Tes habitudes</h2>
            <p className="text-dark-500 text-sm">Choisis l'option qui te correspond le mieux.</p>
          </div>

          {/* Kilométrage hebdomadaire */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
              Kilométrage hebdomadaire moyen
            </p>
            <div className="space-y-1.5">
              {WEEKLY_KM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateData({ levelWeeklyKm: opt.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    weeklyKm === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allure */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
              Ton allure habituelle (sortie facile/tempo)
            </p>
            <div className="space-y-1.5">
              {PACE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateData({ levelPace: opt.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    pace === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plus longue sortie */}
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
              Ta plus longue sortie
            </p>
            <div className="space-y-1.5">
              {LONGEST_RUN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateData({ levelLongestRun: opt.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    longest === opt.value
                      ? 'border-neon-500 bg-neon-50 text-neon-800'
                      : 'border-silver-300 text-dark-700 hover:border-neon-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview niveau */}
          {previewCfg && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${previewCfg.bgClass} ${previewCfg.borderClass}`}>
              <span className="text-sm text-dark-500">Niveau estimé :</span>
              <span className={`font-bold text-sm ${previewCfg.textClass}`}>{previewCfg.label}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setSubStep('choice')}
              className="px-4 py-2.5 rounded-lg border border-silver-300 text-dark-600 font-medium hover:bg-silver-100 transition-colors text-sm"
            >
              Retour
            </button>
            <button
              onClick={() => setSubStep('times')}
              disabled={!canProceedHabits}
              className="flex-1 py-2.5 rounded-lg bg-neon-500 text-dark-800 font-bold hover:bg-neon-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Continuer
            </button>
          </div>
        </>
      )}

      {/* ── Times ───────────────────────────────────────── */}
      {subStep === 'times' && (
        <>
          <div>
            <h2 className="text-xl font-bold text-dark-800 mb-1">Temps de référence</h2>
            <p className="text-dark-500 text-sm">
              Facultatif — affine ton niveau si tu as des chronos.{' '}
              <span className="font-mono text-xs">mm:ss</span> ou{' '}
              <span className="font-mono text-xs">h:mm:ss</span>
            </p>
          </div>

          <div className="space-y-3">
            {[
              { key: 'levelBestTime5k',       label: '5 km',          placeholder: '25:30' },
              { key: 'levelBestTime10k',      label: '10 km',         placeholder: '52:15' },
              { key: 'levelBestTimeSemi',     label: 'Semi-marathon', placeholder: '1:55:00' },
              { key: 'levelBestTimeMarathon', label: 'Marathon',      placeholder: '3:45:00' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 text-sm font-medium text-dark-700 flex-shrink-0">{label}</span>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={data[key as keyof typeof data] as string}
                  onChange={e => updateData({ [key]: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-silver-300 text-dark-800 font-mono text-sm focus:outline-none focus:border-neon-500"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSubStep('habits')}
              className="px-4 py-2.5 rounded-lg border border-silver-300 text-dark-600 font-medium hover:bg-silver-100 transition-colors text-sm"
            >
              Retour
            </button>
            <button
              onClick={onNext}
              className="flex-1 py-2.5 rounded-lg bg-neon-500 text-dark-800 font-bold hover:bg-neon-400 transition-colors text-sm"
            >
              Valider
            </button>
          </div>
        </>
      )}
    </div>
  );
}
