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
import StepStrava from './StepStrava';

interface OnboardingFlowProps {
  onComplete?: (data: OnboardingData) => Promise<void>;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [isLoading, setIsLoading] = useState(false);

  // Handle return from Strava OAuth — auto-mark as connected and complete
  useEffect(() => {
    if (searchParams.get('strava_success') === 'true') {
      setData((prev) => ({ ...prev, stravaConnected: true }));
      setCurrentStep(5);
      // Auto-advance to complete onboarding after a brief moment
      const timer = setTimeout(async () => {
        setIsLoading(true);
        try {
          if (onComplete) {
            await onComplete({ ...INITIAL_ONBOARDING_DATA, stravaConnected: true });
          }
          router.push('/dashboard?strava_connected=true');
        } catch (error) {
          console.error('Onboarding error:', error);
          setIsLoading(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, onComplete, router]);

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
      setIsLoading(true);
      try {
        if (onComplete) {
          await onComplete(data);
        }
        router.push('/dashboard');
      } catch (error) {
        console.error('Onboarding error:', error);
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

  const stepProps = {
    data,
    updateData,
    onNext: handleNext,
    onBack: handleBack,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === TOTAL_STEPS,
    isLoading,
  };

  // Show success state while redirecting after Strava connect
  const isStravaReturn = searchParams.get('strava_success') === 'true';

  return (
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
                <p className="text-sm text-dark-500 mt-1">Tes données de course sont synchronisées</p>
              </div>
            </div>
          ) : (
            <>
              {currentStep === 1 && <StepProfile {...stepProps} />}
              {currentStep === 2 && <StepPhone {...stepProps} />}
              {currentStep === 3 && <StepSafety {...stepProps} />}
              {currentStep === 4 && <StepTrustedContact {...stepProps} />}
              {currentStep === 5 && <StepStrava {...stepProps} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
