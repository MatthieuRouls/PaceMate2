'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { StepProps, validateStep5 } from './onboarding.types';

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
    updateData({
      trustedContactName: '',
      trustedContactPhone: '',
      trustedContactRelation: '',
    });
    onNext();
  };

  const relationOptions = [
    { value: 'family', label: 'Famille' },
    { value: 'friend', label: 'Ami(e)' },
    { value: 'partner', label: 'Conjoint(e)' },
    { value: 'other', label: 'Autre' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Contact de confiance</h2>
        <p className="text-gray-500">Quelqu&apos;un a prevenir en cas de besoin</p>
      </div>

      {/* Explanation Card */}
      {!showForm && !data.trustedContactName && (
        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pourquoi un contact de confiance ?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Cette personne pourra etre contactee en cas d&apos;urgence lors de vos sorties running.
                  Completement optionnel.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleSkip}
              variant="outline"
              size="lg"
              fullWidth
            >
              Plus tard
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              size="lg"
              fullWidth
            >
              Ajouter
            </Button>
          </div>
        </div>
      )}

      {/* Contact Form */}
      {(showForm || data.trustedContactName) && (
        <div className="space-y-4 animate-slideUp">
          <Input
            label="Nom du contact"
            type="text"
            placeholder="Jean Dupont"
            value={data.trustedContactName}
            onChange={(e) => updateData({ trustedContactName: e.target.value })}
            error={errors.trustedContactName}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <Input
            label="Telephone"
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={data.trustedContactPhone}
            onChange={(e) => updateData({ trustedContactPhone: e.target.value })}
            error={errors.trustedContactPhone}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Relation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {relationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateData({ trustedContactRelation: option.value })}
                  className={`
                    py-3 px-4 rounded-xl border-2 text-sm font-medium
                    transition-all duration-200
                    ${data.trustedContactRelation === option.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Added confirmation */}
          {data.trustedContactName && data.trustedContactPhone && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 animate-scaleIn">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-700">Contact ajoute</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-gray-500">
          Ces informations ne sont jamais partagees sans votre accord explicite
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="lg"
          className="flex-1"
        >
          Retour
        </Button>
        <Button
          onClick={handleNext}
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="flex-[2]"
        >
          Terminer
        </Button>
      </div>
    </div>
  );
}
