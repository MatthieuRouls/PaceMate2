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

    // Allow skip for optional steps even if not valid
    if (!validation.isValid && !canSkipStep(currentStep)) {
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setDirection('forward');
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
    } else {
      // Final step - complete onboarding
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Progress Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`
                  transition-all duration-500
                  ${step === currentStep
                    ? 'w-8 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600'
                    : step < currentStep
                    ? 'w-2 h-2 rounded-full bg-blue-500'
                    : 'w-2 h-2 rounded-full bg-gray-200'
                  }
                `}
              />
            ))}
          </div>

          {/* Step title */}
          <div className="text-center">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Etape {currentStep} sur {TOTAL_STEPS}
            </span>
            <h1 className="text-sm font-semibold text-gray-700 mt-0.5">
              {STEP_TITLES[currentStep]}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div
          className={`
            w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-gray-200/50
            p-6 sm:p-8
            transition-transform duration-300
            ${direction === 'forward' ? 'animate-slideInRight' : 'animate-slideInLeft'}
          `}
          key={currentStep}
        >
          {currentStep === 1 && <StepAccount {...stepProps} />}
          {currentStep === 2 && <StepProfile {...stepProps} />}
          {currentStep === 3 && <StepPhone {...stepProps} />}
          {currentStep === 4 && <StepSafety {...stepProps} />}
          {currentStep === 5 && <StepTrustedContact {...stepProps} />}
        </div>
      </main>

      {/* Footer with logo */}
      <footer className="py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
          </svg>
          <span className="text-sm font-medium">PaceMate</span>
        </div>
      </footer>
    </div>
  );
}
