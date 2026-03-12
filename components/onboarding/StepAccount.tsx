'use client';

import { useState } from 'react';
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

  const passwordStrength = (() => {
    const len = data.password.length;
    if (len === 0) return 0;
    if (len < 8) return 1;
    if (len < 12) return 2;
    return 3;
  })();

  const strengthConfig = [
    { color: 'bg-pink-500', label: 'Trop court' },
    { color: 'bg-pink-500', label: 'Trop court' },
    { color: 'bg-yellow-400', label: 'Correct' },
    { color: 'bg-neon-500', label: 'Solide' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-neon-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-dark-800">Bienvenue sur PaceMate</h2>
        <p className="text-dark-500 text-sm">Créez votre compte pour rejoindre la communauté</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">
            Email
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="email"
              placeholder="votre@email.com"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                transition-all duration-200 outline-none
                focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                ${errors.email ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 bg-white hover:border-silver-400'}`}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-pink-500">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 caractères"
              value={data.password}
              onChange={(e) => updateData({ password: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              className={`w-full pl-10 pr-12 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                transition-all duration-200 outline-none
                focus:ring-2 focus:ring-neon-500/30 focus:border-neon-500
                ${errors.password ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 bg-white hover:border-silver-400'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors"
            >
              {showPassword ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-pink-500">{errors.password}</p>}

          {/* Password strength */}
          {data.password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= passwordStrength ? strengthConfig[passwordStrength].color : 'bg-silver-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-dark-500">{strengthConfig[passwordStrength].label}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full py-3.5 rounded-xl bg-dark-800 text-neon-500 font-semibold text-sm
          hover:bg-dark-700 active:scale-[0.99] transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <>
            Continuer
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      {/* Terms */}
      <p className="text-xs text-center text-dark-400">
        En continuant, vous acceptez nos{' '}
        <a href="#" className="text-neon-700 hover:underline">conditions d&apos;utilisation</a>
        {' '}et notre{' '}
        <a href="#" className="text-neon-700 hover:underline">politique de confidentialité</a>
      </p>
    </div>
  );
}
