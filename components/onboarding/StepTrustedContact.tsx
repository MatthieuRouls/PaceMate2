'use client';

import { useState } from 'react';
import { User, Phone, CheckCircle } from 'lucide-react';
import { StepProps, validateStep4 } from './onboarding.types';

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
      const validation = validateStep4(data);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Contact de confiance</h2>
        <p className="text-dark-500 text-sm">Une personne à prévenir si besoin — optionnel</p>
      </div>

      {/* Intro */}
      {!showForm && !data.trustedContactName && (
        <div className="space-y-4">
          <div className="p-4 bg-silver-50 rounded-lg border border-silver-200 space-y-2.5">
            {[
              { emoji: '🔒', text: 'Jamais partagé sans ton accord' },
              { emoji: '🏃', text: 'Utilisé uniquement en situation d\'urgence' },
              { emoji: '✏️', text: 'Modifiable à tout moment dans les réglages' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base">{item.emoji}</span>
                <p className="text-sm text-dark-600">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-500 font-medium text-sm
                hover:border-silver-500 hover:bg-silver-50 transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
                hover:bg-dark-700 transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {(showForm || data.trustedContactName) && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-800 mb-2">Nom</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Jean Dupont"
                value={data.trustedContactName}
                onChange={(e) => updateData({ trustedContactName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-silver-400 outline-none transition-all text-dark-800 placeholder-silver-500 text-sm
                  focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700 hover:border-silver-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-800 mb-2">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={data.trustedContactPhone}
                onChange={(e) => updateData({ trustedContactPhone: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all text-dark-800 placeholder-silver-500 text-sm
                  focus:ring-2 focus:ring-neon-700/20 focus:border-neon-700
                  ${errors.trustedContactPhone ? 'border-pink-400 bg-pink-50/30' : 'border-silver-400 hover:border-silver-500'}`}
              />
            </div>
            {errors.trustedContactPhone && (
              <p className="mt-1 text-xs text-pink-600">{errors.trustedContactPhone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-800 mb-2">Relation</label>
            <div className="grid grid-cols-2 gap-2">
              {RELATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateData({ trustedContactRelation: option.value })}
                  className={`py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    data.trustedContactRelation === option.value
                      ? 'border-neon-700 bg-neon-50 text-neon-700'
                      : 'border-silver-300 text-dark-600 hover:border-silver-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isContactComplete && (
            <div className="flex items-center gap-2.5 p-3 bg-neon-50 rounded-lg border border-neon-200">
              <CheckCircle className="w-4 h-4 text-neon-700 flex-shrink-0" />
              <p className="text-sm font-medium text-dark-700">Contact enregistré</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 font-medium text-sm
                hover:border-silver-500 hover:bg-silver-50 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-[2] py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
                hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : 'Terminer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
