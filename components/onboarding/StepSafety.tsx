'use client';

import Button from '@/components/ui/Button';
import { StepProps } from './onboarding.types';

export default function StepSafety({
  data,
  updateData,
  onNext,
  onBack,
  isLoading,
}: StepProps) {
  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Coureurs verifies',
      description: 'Sessions uniquement avec des membres verifies',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Groupes de 3+',
      description: 'Pas de sessions en tete-a-tete',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      title: 'Hotes certifies',
      description: 'Priorite aux organisateurs experimentes',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Mode securite</h2>
        <p className="text-gray-500">Des options pour courir en toute serenite</p>
      </div>

      {/* Toggle Card */}
      <div
        onClick={() => updateData({ safetyEnhancedMode: !data.safetyEnhancedMode })}
        className={`
          relative p-5 rounded-2xl border-2 cursor-pointer
          transition-all duration-300
          ${data.safetyEnhancedMode
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
      >
        <div className="flex items-start gap-4">
          <div className={`
            w-14 h-8 rounded-full relative transition-colors duration-300
            ${data.safetyEnhancedMode ? 'bg-violet-500' : 'bg-gray-300'}
          `}>
            <div className={`
              absolute top-1 w-6 h-6 rounded-full bg-white shadow-md
              transition-transform duration-300
              ${data.safetyEnhancedMode ? 'translate-x-7' : 'translate-x-1'}
            `} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Mode securite active</h3>
            <p className="text-sm text-gray-500 mt-1">
              Filtres supplementaires pour une experience sereine
            </p>
          </div>
        </div>

        {/* Checkmark when active */}
        {data.safetyEnhancedMode && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center animate-scaleIn">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Features List */}
      <div className={`
        space-y-3 transition-all duration-500
        ${data.safetyEnhancedMode ? 'opacity-100 translate-y-0' : 'opacity-50'}
      `}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100
              transition-all duration-300 delay-${index * 100}
              ${data.safetyEnhancedMode ? 'shadow-sm' : ''}
            `}
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${data.safetyEnhancedMode ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'}
            `}>
              {feature.icon}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{feature.title}</h4>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">
          Vous pouvez modifier ce parametre a tout moment dans vos reglages
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
          onClick={onNext}
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="flex-[2]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
