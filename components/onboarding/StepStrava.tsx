'use client';

import { useState } from 'react';
import { Activity, TrendingUp, Target, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { StepProps } from './onboarding.types';
import { getStravaConnectUrlForOnboarding } from '@/lib/actions';

const benefits = [
  {
    icon: Target,
    title: 'Suggestions personnalisées',
    description: 'Des runs adaptés à ton allure et niveau réels',
  },
  {
    icon: TrendingUp,
    title: 'Score de compatibilité précis',
    description: 'Vois à quel point tu matches avec chaque groupe',
  },
  {
    icon: Zap,
    title: 'Création de run pré-remplie',
    description: 'Ton allure et distance habituelles déjà renseignées',
  },
];

export default function StepStrava({ onNext, onBack, isLoading }: StepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const result = await getStravaConnectUrlForOnboarding();
      if ('error' in result) {
        setConnectError('Impossible de se connecter à Strava. Réessaie plus tard.');
        setIsConnecting(false);
        return;
      }
      // Redirect to Strava OAuth — will come back to /onboarding?strava_success=true
      window.location.href = result.url;
    } catch {
      setConnectError('Une erreur est survenue. Réessaie plus tard.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-800 mb-1">Améliore tes suggestions</h2>
        <p className="text-dark-500 text-sm">Connecte Strava pour des runs vraiment adaptés à toi</p>
      </div>

      {/* Strava logo + illustration */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#FC4C02] flex items-center justify-center shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-neon-500 rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-dark-800">✓</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3.5 rounded-lg border border-silver-200 bg-white"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-neon-700" />
              </div>
              <div>
                <p className="font-medium text-dark-800 text-sm">{benefit.title}</p>
                <p className="text-xs text-dark-500">{benefit.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {connectError && (
        <p className="text-xs text-red-500 text-center">{connectError}</p>
      )}

      <p className="text-xs text-dark-400 text-center">
        On ne lit que tes activités de course — rien d&apos;autre.
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleConnect}
          disabled={isConnecting || isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#FC4C02] text-white font-semibold text-sm
            hover:bg-[#e44302] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          {isConnecting ? 'Connexion…' : 'Connecter Strava'}
          {!isConnecting && <ChevronRight className="w-4 h-4" />}
        </button>

        <button
          onClick={onNext}
          disabled={isConnecting || isLoading}
          className="w-full py-3 rounded-lg border border-silver-300 text-dark-500 font-medium text-sm
            hover:border-silver-400 hover:text-dark-700 transition-colors disabled:opacity-40"
        >
          Passer cette étape
        </button>
      </div>

      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="text-xs text-dark-400 hover:text-dark-600 transition-colors"
        >
          ← Retour
        </button>
      </div>
    </div>
  );
}
