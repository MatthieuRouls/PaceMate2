'use client';

import { useState } from 'react';
import { StepProps, validateStep5 } from './onboarding.types';

const RELATION_OPTIONS = [
  { value: 'family', label: 'Famille' },
  { value: 'friend', label: 'Ami(e)' },
  { value: 'partner', label: 'Conjoint(e)' },
  { value: 'other', label: 'Autre' },
];

export default function StepTrustedContact({
  data,
  updateData,
  onNext,
  onBack,
  isLoading,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const handleNext = () => {
    if (showForm && data.trustedContactName) {
      const validation = validateStep5(data);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
    }
    setErrors({});
    onNext();
  };

  const handleSkip = () => {
    updateData({ trustedContactName: '', trustedContactPhone: '', trustedContactRelation: '' });
    onNext();
  };

  const isContactComplete = data.trustedContactName && data.trustedContactPhone;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-dark-800">Contact de confiance</h2>
        <p className="text-dark-500 text-sm">Une personne à prévenir si besoin — optionnel</p>
      </div>

      {/* Intro card */}
      {!showForm && !data.trustedContactName && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-silver-50 rounded-2xl border border-silver-200 space-y-3">
            {[
              { icon: '🔒', text: 'Jamais partagé sans votre accord' },
              { icon: '🏃', text: 'Utilisé uniquement en situation d\'urgence' },
              { icon: '✏️', text: 'Modifiable à tout moment dans les réglages' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <p className="text-sm text-dark-600">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSkip}
              className="py-3 rounded-xl border border-silver-300 text-dark-500 font-medium text-sm
                hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
            >
              Plus tard
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="py-3 rounded-xl bg-pink-500 text-white font-semibold text-sm
                hover:bg-pink-600 active:scale-[0.99] transition-all duration-200"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {(showForm || data.trustedContactName) && (
        <div className="space-y-4 animate-slideInRight">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-1.5">Nom</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={data.trustedContactName}
                onChange={(e) => updateData({ trustedContactName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-silver-300 text-dark-800 placeholder-silver-500 text-sm
                  transition-all duration-200 outline-none
                  focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400
                  hover:border-silver-400"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-1.5">Téléphone</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={data.trustedContactPhone}
                onChange={(e) => updateData({ trustedContactPhone: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-dark-800 placeholder-silver-500 text-sm
                  transition-all duration-200 outline-none
                  focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400
                  ${errors.trustedContactPhone ? 'border-pink-500 bg-pink-50/30' : 'border-silver-300 hover:border-silver-400'}`}
              />
            </div>
            {errors.trustedContactPhone && (
              <p className="mt-1 text-xs text-pink-500">{errors.trustedContactPhone}</p>
            )}
          </div>

          {/* Relation chips */}
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">Relation</label>
            <div className="grid grid-cols-2 gap-2">
              {RELATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateData({ trustedContactRelation: option.value })}
                  className={`
                    py-2.5 px-4 rounded-xl border-2 text-sm font-medium
                    transition-all duration-200
                    ${data.trustedContactRelation === option.value
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-silver-200 text-dark-600 hover:border-silver-300'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirmation */}
          {isContactComplete && (
            <div className="flex items-center gap-2.5 py-2.5 px-4 bg-neon-50 rounded-xl border border-neon-200 animate-scaleIn">
              <div className="w-5 h-5 rounded-full bg-neon-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-dark-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-dark-700">Contact enregistré</p>
            </div>
          )}
        </div>
      )}

      {/* Footer buttons */}
      {(showForm || data.trustedContactName) && (
        <div className="flex gap-3 pt-1">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-silver-300 text-dark-700 font-medium text-sm
              hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex-[2] py-3 rounded-xl bg-dark-800 text-neon-500 font-semibold text-sm
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
                Terminer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
