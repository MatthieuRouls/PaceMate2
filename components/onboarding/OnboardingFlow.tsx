'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  OnboardingStep,
  OnboardingData,
  INITIAL_ONBOARDING_DATA,
  TOTAL_STEPS,
  STEP_TITLES,
  validateCurrentStep,
  canSkipStep,
} from './onboarding.types';

import StepProfile from './StepProfile';
import StepPhone from './StepPhone';
import StepSafety from './StepSafety';
import StepTrustedContact from './StepTrustedContact';
import StepLevel from './StepLevel';
import StepStrava from './StepStrava';
import { getLevelConfig } from '@/lib/strava';
import {
  calculateManualScore,
  scoreToLevel,
  type WeeklyKm,
  type RunnerPace,
  type LongestRun,
} from '@/lib/level-manual';

// ─── Récapitulatif niveau ─────────────────────────────────────────────────────

const LEVEL_DESCRIPTIONS: Record<number, { peers: string; sessions: string }> = {
  1: { peers: 'Des débutants bienveillants — premières sorties à ton rythme', sessions: 'niveaux 1 et 2' },
  2: { peers: 'Des runners occasionnels (1-2x/semaine, ~6:30-7:00/km)', sessions: 'niveaux 1 à 3' },
  3: { peers: 'Des réguliers (2-3x/semaine, ~5:30-6:30/km)', sessions: 'niveaux 2 à 4' },
  4: { peers: 'Des confirmés avec une bonne base (3-4x/semaine, < 5:30/km)', sessions: 'niveaux 3 à 5' },
  5: { peers: 'Des compétiteurs sérieux (4-5x/semaine, < 5:00/km)', sessions: 'niveaux 4 à 6' },
  6: { peers: 'Des experts (5+/semaine, < 4:30/km, sorties longues régulières)', sessions: 'niveaux 5 à 7' },
  7: { peers: 'Des performeurs (entraînement structuré, < 4:00/km)', sessions: 'niveaux 6 à 8' },
  8: { peers: 'Des élites amateurs (semi < 1h30, marathon < 3h30)', sessions: 'niveaux 7 à 9' },
  9: { peers: 'Des élites nationaux — niveau compétition', sessions: 'niveau 9' },
};

interface RecapModalProps {
  completedData: OnboardingData;
  onStart: () => void;
}

function RecapModal({ completedData, onStart }: RecapModalProps) {
  // Calcule le niveau depuis les données collectées
  let level = 1;
  let source: 'strava' | 'manual' | 'default' = 'default';

  if (completedData.stravaConnected) {
    source = 'strava';
    // Niveau Strava sera recalculé côté serveur — on affiche "en cours de calcul"
    level = 1;
  } else if (
    completedData.levelIsRunner === true &&
    completedData.levelWeeklyKm &&
    completedData.levelPace &&
    completedData.levelLongestRun
  ) {
    source = 'manual';
    const score = calculateManualScore({
      isRunner: true,
      weeklyKm: completedData.levelWeeklyKm as WeeklyKm,
      pace: completedData.levelPace as RunnerPace,
      longestRun: completedData.levelLongestRun as LongestRun,
      bestTime5k: completedData.levelBestTime5k || undefined,
      bestTime10k: completedData.levelBestTime10k || undefined,
      bestTimeSemi: completedData.levelBestTimeSemi || undefined,
      bestTimeMarathon: completedData.levelBestTimeMarathon || undefined,
    });
    level = scoreToLevel(score);
  } else if (completedData.levelIsRunner === false) {
    source = 'manual';
    level = 1;
  }

  const cfg = getLevelConfig(level);
  const desc = LEVEL_DESCRIPTIONS[level];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header coloré */}
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-b from-neon-50 to-white">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-dark-800 mb-1">Ton profil est prêt !</h2>
          <p className="text-dark-500 text-sm">
            Bienvenue sur PaceMate, {completedData.firstName || 'runner'} !
          </p>
        </div>

        <div className="px-8 pb-8 space-y-5">
          {/* Niveau assigné */}
          <div className={`rounded-xl border-2 p-4 ${cfg.bgClass} ${cfg.borderClass}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-dark-500 mb-2">
              Ton niveau
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${cfg.textClass}`}>
                Niveau {level} — {cfg.label}
              </span>
            </div>
            <p className="text-xs mt-2 text-dark-500">
              {source === 'strava'
                ? '⚡ Calculé depuis tes activités Strava'
                : source === 'manual'
                ? '✏️ Estimé depuis tes réponses — tu pourras l\'affiner'
                : '⬜ Par défaut — complète ton profil pour plus de précision'}
            </p>
          </div>

          {/* Avec qui tu vas courir */}
          {!completedData.stravaConnected && (
            <div className="rounded-xl bg-silver-50 border border-silver-200 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-dark-500">
                Avec qui tu vas courir
              </p>
              <p className="text-sm text-dark-700">{desc.peers}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-dark-400">Sessions compatibles :</span>
                <span className="text-xs font-semibold text-dark-700">{desc.sessions}</span>
              </div>
            </div>
          )}

          {/* Strava connecté */}
          {completedData.stravaConnected && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 space-y-1">
              <p className="text-sm font-semibold text-orange-800">⚡ Strava connecté</p>
              <p className="text-xs text-orange-700">
                Ton niveau sera calculé précisément depuis tes vraies activités.
                Tu verras des sessions parfaitement adaptées à ta forme actuelle.
              </p>
            </div>
          )}

          {/* Ce que l'app a décidé */}
          <div className="rounded-xl bg-silver-50 border border-silver-200 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-dark-500">
              Ce que PaceMate a configuré
            </p>
            <ul className="space-y-1.5 text-sm text-dark-700">
              <li className="flex items-start gap-2">
                <span className="text-neon-600 font-bold mt-0.5">✓</span>
                Filtres de sessions alignés sur ton niveau
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon-600 font-bold mt-0.5">✓</span>
                Suggestions de runs dans ta fourchette de vitesse
              </li>
              {completedData.safetyEnhancedMode && (
                <li className="flex items-start gap-2">
                  <span className="text-neon-600 font-bold mt-0.5">✓</span>
                  Mode sécurité renforcée activé
                </li>
              )}
              {completedData.trustedContactName && (
                <li className="flex items-start gap-2">
                  <span className="text-neon-600 font-bold mt-0.5">✓</span>
                  Contact de confiance enregistré ({completedData.trustedContactName})
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={onStart}
            className="w-full py-3.5 rounded-xl bg-pink-500 text-white font-bold text-lg hover:bg-pink-600 transition-colors"
          >
            Commencer sur PaceMate →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Flow principal ───────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete?: (data: OnboardingData) => Promise<void>;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [completedData, setCompletedData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);

  // Handle return from Strava OAuth
  useEffect(() => {
    if (searchParams.get('strava_success') === 'true') {
      const finalData = { ...data, stravaConnected: true };
      setData(finalData);
      setCurrentStep(6);

      const timer = setTimeout(async () => {
        setIsLoading(true);
        try {
          if (onComplete) {
            await onComplete(finalData);
          }
          setCompletedData(finalData);
          setShowRecap(true);
        } catch (error) {
          console.error('Onboarding error:', error);
          router.push('/dashboard?strava_connected=true');
        } finally {
          setIsLoading(false);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(async () => {
    const validation = validateCurrentStep(currentStep, data);

    if (!validation.isValid && !canSkipStep(currentStep)) {
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
    } else {
      // Dernière étape — sauvegarder et afficher le récap
      setIsLoading(true);
      try {
        if (onComplete) {
          await onComplete(data);
        }
        setCompletedData(data);
        setShowRecap(true);
      } catch (error) {
        console.error('Onboarding error:', error);
        // En cas d'erreur on redirige quand même
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentStep, data, onComplete, router]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  }, [currentStep]);

  const handleStart = useCallback(() => {
    const dest = completedData.stravaConnected ? '/dashboard?strava_connected=true' : '/dashboard';
    router.push(dest);
  }, [completedData.stravaConnected, router]);

  const stepProps = {
    data,
    updateData,
    onNext: handleNext,
    onBack: handleBack,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === TOTAL_STEPS,
    isLoading,
  };

  const isStravaReturn = searchParams.get('strava_success') === 'true';

  return (
    <>
      {/* Modale récapitulatif */}
      {showRecap && (
        <RecapModal completedData={completedData} onStart={handleStart} />
      )}

      <div className="min-h-screen bg-neu-base pt-20 pb-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-dark-800">
                {STEP_TITLES[currentStep]}
              </span>
              <span className="text-sm text-dark-500">
                {currentStep} / {TOTAL_STEPS}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    step <= currentStep ? 'bg-neon-700' : 'bg-silver-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="card p-6 sm:p-8">
            {isStravaReturn ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-neon-500/20 flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-dark-800 text-lg">Strava connecté !</p>
                  <p className="text-sm text-dark-500 mt-1">Finalisation de ton profil…</p>
                </div>
              </div>
            ) : (
              <>
                {currentStep === 1 && <StepProfile {...stepProps} />}
                {currentStep === 2 && <StepPhone {...stepProps} />}
                {currentStep === 3 && <StepSafety {...stepProps} />}
                {currentStep === 4 && <StepTrustedContact {...stepProps} />}
                {currentStep === 5 && <StepLevel {...stepProps} />}
                {currentStep === 6 && <StepStrava {...stepProps} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
