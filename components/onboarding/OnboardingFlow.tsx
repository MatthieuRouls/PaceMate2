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
          {currentStep === 1 && <StepProfile {...stepProps} />}
          {currentStep === 2 && <StepPhone {...stepProps} />}
          {currentStep === 3 && <StepSafety {...stepProps} />}
          {currentStep === 4 && <StepTrustedContact {...stepProps} />}
        </div>
      </div>
    </div>
  );
}
