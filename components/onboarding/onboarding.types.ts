/**
 * Onboarding Flow Types
 *
 * Security-focused onboarding with 5 steps:
 * 1. Account (email/password)
 * 2. Profile (photo required, name, city)
 * 3. Phone verification (optional but encouraged)
 * 4. Safety mode toggle
 * 5. Trusted contact (optional)
 */

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export const TOTAL_STEPS = 5;

export interface OnboardingData {
  // Step 1 - Account
  email: string;
  password: string;

  // Step 2 - Profile
  firstName: string;
  city: string;
  photoUrl: string | null;
  photoFile: File | null;

  // Step 3 - Phone
  phoneNumber: string;
  phoneVerified: boolean;
  otpCode: string;

  // Step 4 - Safety Mode
  safetyEnhancedMode: boolean;

  // Step 5 - Trusted Contact
  trustedContactName: string;
  trustedContactPhone: string;
  trustedContactRelation: string;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  email: '',
  password: '',
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

// Step titles for progress indicator
export const STEP_TITLES: Record<OnboardingStep, string> = {
  1: 'Compte',
  2: 'Profil',
  3: 'Telephone',
  4: 'Securite',
  5: 'Contact',
};

// Step descriptions
export const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  1: 'Creez votre compte',
  2: 'Personnalisez votre profil',
  3: 'Verifiez votre numero',
  4: 'Vos preferences de securite',
  5: 'Ajoutez un contact de confiance',
};

// Validation helpers
export function validateStep1(data: OnboardingData): StepValidation {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email requis';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email invalide';
  }

  if (!data.password) {
    errors.password = 'Mot de passe requis';
  } else if (data.password.length < 8) {
    errors.password = 'Minimum 8 caracteres';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep2(data: OnboardingData): StepValidation {
  const errors: Record<string, string> = {};

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = 'Prenom requis (min 2 caracteres)';
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.city = 'Ville requise';
  }

  // Photo is REQUIRED
  if (!data.photoUrl && !data.photoFile) {
    errors.photo = 'Photo de profil requise';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep3(data: OnboardingData): StepValidation {
  // Phone is optional but if provided, must be valid
  const errors: Record<string, string> = {};

  if (data.phoneNumber && !/^(\+33|0)[1-9](\d{2}){4}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
    errors.phoneNumber = 'Numero invalide';
  }

  if (data.phoneNumber && !data.phoneVerified && data.otpCode) {
    if (data.otpCode.length !== 6) {
      errors.otpCode = 'Code a 6 chiffres';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep4(_data: OnboardingData): StepValidation {
  // Safety mode is just a toggle, always valid
  return {
    isValid: true,
    errors: {},
  };
}

export function validateStep5(data: OnboardingData): StepValidation {
  // Trusted contact is optional
  const errors: Record<string, string> = {};

  // If name is provided, phone should be too
  if (data.trustedContactName && !data.trustedContactPhone) {
    errors.trustedContactPhone = 'Telephone requis si nom fourni';
  }

  if (data.trustedContactPhone && !/^(\+33|0)[1-9](\d{2}){4}$/.test(data.trustedContactPhone.replace(/\s/g, ''))) {
    errors.trustedContactPhone = 'Numero invalide';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCurrentStep(step: OnboardingStep, data: OnboardingData): StepValidation {
  switch (step) {
    case 1:
      return validateStep1(data);
    case 2:
      return validateStep2(data);
    case 3:
      return validateStep3(data);
    case 4:
      return validateStep4(data);
    case 5:
      return validateStep5(data);
    default:
      return { isValid: true, errors: {} };
  }
}

// Can skip step?
export function canSkipStep(step: OnboardingStep): boolean {
  switch (step) {
    case 3: // Phone is optional
    case 5: // Trusted contact is optional
      return true;
    default:
      return false;
  }
}
