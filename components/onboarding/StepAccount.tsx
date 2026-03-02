'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { StepProps, validateStep1 } from './onboarding.types';

export default function StepAccount({
  data,
  updateData,
  onNext,
  isLoading,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleNext = () => {
    const validation = validateStep1(data);
    if (validation.isValid) {
      setErrors({});
      onNext();
    } else {
      setErrors(validation.errors);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Bienvenue sur PaceMate</h2>
        <p className="text-gray-500">Creez votre compte pour commencer</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="votre@email.com"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          error={errors.email}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <div className="relative">
          <Input
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 8 caracteres"
            value={data.password}
            onChange={(e) => updateData({ password: e.target.value })}
            error={errors.password}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-[42px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Password strength indicator */}
        {data.password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    data.password.length >= i * 3
                      ? data.password.length >= 12
                        ? 'bg-green-500'
                        : data.password.length >= 8
                        ? 'bg-yellow-500'
                        : 'bg-red-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {data.password.length < 8
                ? 'Mot de passe trop court'
                : data.password.length < 12
                ? 'Mot de passe correct'
                : 'Mot de passe fort'}
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        onClick={handleNext}
        fullWidth
        variant="gradient"
        size="lg"
        loading={isLoading}
      >
        Continuer
      </Button>

      {/* Terms */}
      <p className="text-xs text-center text-gray-500">
        En continuant, vous acceptez nos{' '}
        <a href="#" className="text-blue-600 hover:underline">conditions d&apos;utilisation</a>
        {' '}et notre{' '}
        <a href="#" className="text-blue-600 hover:underline">politique de confidentialite</a>
      </p>
    </div>
  );
}
