/**
 * Onboarding Flow Types
 *
 * Security-focused onboarding with 4 steps (user is already authenticated):
 * 1. Profile (photo required, name, city)
 * 2. Phone verification (optional but encouraged)
 * 3. Safety mode toggle
 * 4. Trusted contact (optional)
 */

export type OnboardingStep = 1 | 2 | 3 | 4;

export const TOTAL_STEPS = 4;

export interface OnboardingData {
  // Step 1 - Profile
  firstName: string;
  city: string;
  photoUrl: string | null;
  photoFile: File | null;

  // Step 2 - Phone
  phoneNumber: string;
  phoneVerified: boolean;
  otpCode: string;

  // Step 3 - Safety Mode
  safetyEnhancedMode: boolean;

  // Step 4 - Trusted Contact
  trustedContactName: string;
  trustedContactPhone: string;
  trustedContactRelation: string;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  firstName: '',
  city: '',
  photoUrl: null,
  photoFile: null,
  phoneNumber: '',
  phoneVerified: false,
  otpCode: '',
  safetyEnhancedMode: false,
  trustedContactName: '',
  trustedContactPhone: '',
  trustedContactRelation: '',
};

export interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading: boolean;
}

export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export const STEP_TITLES: Record<OnboardingStep, string> = {
  1: 'Profil',
  2: 'Téléphone',
  3: 'Sécurité',
  4: 'Contact',
};

export function validateStep1(data: OnboardingData): StepValidation {
  const errors: Record<string, string> = {};

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = 'Prénom requis (min 2 caractères)';
  }

  if (!data.photoUrl && !data.photoFile) {
    errors.photo = 'Photo de profil requise';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep2(data: OnboardingData): StepValidation {
  const errors: Record<string, string> = {};

  if (data.phoneNumber && !/^(\+33|0)[1-9](\d{2}){4}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
    errors.phoneNumber = 'Numéro invalide';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep3(_data: OnboardingData): StepValidation {
  return { isValid: true, errors: {} };
}

export function validateStep4(data: OnboardingData): StepValidation {
  const errors: Record<string, string> = {};

  if (data.trustedContactName && !data.trustedContactPhone) {
    errors.trustedContactPhone = 'Téléphone requis si nom fourni';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCurrentStep(step: OnboardingStep, data: OnboardingData): StepValidation {
  switch (step) {
    case 1: return validateStep1(data);
    case 2: return validateStep2(data);
    case 3: return validateStep3(data);
    case 4: return validateStep4(data);
    default: return { isValid: true, errors: {} };
  }
}

export function canSkipStep(step: OnboardingStep): boolean {
  return step === 2 || step === 4;
}
