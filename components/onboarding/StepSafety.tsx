'use client';

import { Shield, Users, Star, CheckCircle } from 'lucide-react';
import { StepProps } from './onboarding.types';

const features = [
  {
    icon: CheckCircle,
    title: 'Coureurs vérifiés',
    description: 'Sessions avec des membres ayant un profil complet',
  },
  {
    icon: Users,
    title: 'Groupes de 3+',
    description: 'Priorité aux sorties en groupe',
  },
  {
    icon: Star,
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Mode sécurité</h2>
        <p className="text-dark-500 text-sm">Des options pour courir en toute sérénité</p>
      </div>

      {/* Toggle card */}
      <button
        type="button"
        onClick={() => updateData({ safetyEnhancedMode: !data.safetyEnhancedMode })}
        className={`w-full p-5 rounded-lg border-2 text-left transition-all cursor-pointer ${
          data.safetyEnhancedMode
            ? 'border-neon-700 bg-neon-50'
            : 'border-silver-300 bg-white hover:border-silver-400'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${data.safetyEnhancedMode ? 'text-neon-700' : 'text-dark-400'}`} />
            <div>
              <p className="font-semibold text-dark-800 text-sm">Mode sécurité renforcée</p>
              <p className="text-xs text-dark-500 mt-0.5">Filtres supplémentaires pour une expérience sereine</p>
            </div>
          </div>
          <div className={`relative w-12 h-6 rounded-full flex-shrink-0 transition-colors ${
            data.safetyEnhancedMode ? 'bg-neon-700' : 'bg-silver-300'
          }`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              data.safetyEnhancedMode ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </div>
        </div>
      </button>

      {/* Features */}
      <div className={`space-y-2 transition-opacity ${data.safetyEnhancedMode ? 'opacity-100' : 'opacity-40'}`}>
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                data.safetyEnhancedMode ? 'border-neon-200 bg-neon-50/50' : 'border-silver-200 bg-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${data.safetyEnhancedMode ? 'text-neon-700' : 'text-silver-400'}`} />
              <div>
                <p className="font-medium text-dark-800 text-sm">{feature.title}</p>
                <p className="text-xs text-dark-500">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-dark-500">Ce paramètre peut être modifié à tout moment dans tes réglages.</p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg border border-silver-400 text-dark-700 font-medium text-sm
            hover:border-silver-500 hover:bg-silver-50 transition-colors"
        >
          Retour
        </button>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="flex-[2] py-3 rounded-lg bg-dark-800 text-neon-500 font-semibold text-sm
            hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
