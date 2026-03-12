'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  OnboardingStep,
  OnboardingData,
  INITIAL_ONBOARDING_DATA,
  TOTAL_STEPS,
  STEP_TITLES,
  validateCurrentStep,
  canSkipStep,
} from './onboarding.types';

import StepAccount from './StepAccount';
import StepProfile from './StepProfile';
import StepPhone from './StepPhone';
import StepSafety from './StepSafety';
import StepTrustedContact from './StepTrustedContact';

interface OnboardingFlowProps {
  onComplete?: (data: OnboardingData) => Promise<void>;
}

const STEP_ICON_PATHS: Record<number, string> = {
  1: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  2: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  3: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  4: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  5: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
};

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(async () => {
    const validation = validateCurrentStep(currentStep, data);

    if (!validation.isValid && !canSkipStep(currentStep)) {
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setDirection('forward');
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
      setDirection('backward');
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

  return (
    <div className="min-h-screen bg-neu-base flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-silver-200">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-dark-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-neon-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
              </svg>
            </div>
            <span className="text-sm font-bold text-dark-800 tracking-tight">PaceMate</span>
          </div>

          {/* Progress bar + step icons */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
              const isDone = step < currentStep;
              const isActive = step === currentStep;
              return (
                <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`
                    w-full h-1 rounded-full transition-all duration-500
                    ${isDone ? 'bg-neon-500' : isActive ? 'bg-neon-500/50' : 'bg-silver-300'}
                  `} />
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                    ${isDone ? 'bg-neon-500 text-dark-800' : isActive ? 'bg-dark-800 text-neon-500' : 'bg-silver-200 text-silver-500'}
                  `}>
                    {isDone ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={STEP_ICON_PATHS[step]} />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-dark-500 font-medium mt-2">
            {STEP_TITLES[currentStep]} · étape {currentStep} sur {TOTAL_STEPS}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center p-4 pt-6 pb-10">
        <div
          key={currentStep}
          className={`
            w-full max-w-lg bg-white rounded-2xl shadow-sm border border-silver-200
            p-6 sm:p-8
            ${direction === 'forward' ? 'animate-slideInRight' : 'animate-slideInLeft'}
          `}
        >
          {currentStep === 1 && <StepAccount {...stepProps} />}
          {currentStep === 2 && <StepProfile {...stepProps} />}
          {currentStep === 3 && <StepPhone {...stepProps} />}
          {currentStep === 4 && <StepSafety {...stepProps} />}
          {currentStep === 5 && <StepTrustedContact {...stepProps} />}
        </div>
      </main>
    </div>
  );
}
