'use client';

import { StepProps } from './onboarding.types';

const features = [
  {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    title: 'Coureurs vérifiés',
    description: 'Sessions avec des membres ayant un profil complet',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    title: 'Groupes de 3+',
    description: 'Priorité aux sorties en groupe',
  },
  {
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    title: 'Hôtes expérimentés',
    description: 'Organisateurs avec un historique positif',
  },
];

export default function StepSafety({
  data,
  updateData,
  onNext,
  onBack,
  isLoading,
}: StepProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-dark-700 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-neon-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-dark-800">Mode sécurité</h2>
        <p className="text-dark-500 text-sm">Des options pour courir en toute sérénité</p>
      </div>

      {/* Toggle card */}
      <button
        type="button"
        onClick={() => updateData({ safetyEnhancedMode: !data.safetyEnhancedMode })}
        className={`
          w-full p-5 rounded-2xl border-2 text-left
          transition-all duration-300 cursor-pointer
          ${data.safetyEnhancedMode
            ? 'border-neon-500 bg-neon-50'
            : 'border-silver-200 bg-white hover:border-silver-300'
          }
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-dark-800">Mode sécurité renforcée</h3>
            <p className="text-sm text-dark-500 mt-0.5">
              Filtres supplémentaires pour une expérience sereine
            </p>
          </div>
          {/* Toggle switch */}
          <div className={`
            relative w-14 h-7 rounded-full flex-shrink-0
            transition-colors duration-300
            ${data.safetyEnhancedMode ? 'bg-neon-500' : 'bg-silver-300'}
          `}>
            <div className={`
              absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm
              transition-transform duration-300
              ${data.safetyEnhancedMode ? 'translate-x-7' : 'translate-x-0.5'}
            `} />
          </div>
        </div>
      </button>

      {/* Features — visible when active */}
      <div className={`space-y-2.5 transition-all duration-400 ${data.safetyEnhancedMode ? 'opacity-100' : 'opacity-40'}`}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-3.5 p-4 rounded-xl border transition-all duration-300
              ${data.safetyEnhancedMode
                ? 'border-neon-200 bg-neon-50/50'
                : 'border-silver-200 bg-white'
              }
            `}
          >
            <div className={`
              w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
              transition-colors duration-300
              ${data.safetyEnhancedMode ? 'bg-neon-500 text-dark-800' : 'bg-silver-100 text-silver-400'}
            `}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
              </svg>
            </div>
            <div>
              <p className="font-medium text-dark-800 text-sm">{feature.title}</p>
              <p className="text-xs text-dark-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-3.5 bg-silver-50 rounded-xl border border-silver-200">
        <svg className="w-4 h-4 text-dark-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-dark-500">
          Ce paramètre peut être modifié à tout moment dans vos réglages.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-silver-300 text-dark-700 font-medium text-sm
            hover:border-silver-400 hover:bg-silver-50 transition-all duration-200"
        >
          Retour
        </button>
        <button
          onClick={onNext}
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
              Continuer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
