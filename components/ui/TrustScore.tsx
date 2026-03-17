'use client';

import { Shield, Star, TrendingUp, Users } from 'lucide-react';
import { computeTrustScore, getTrustInfo, getVerificationInfo, reliabilityLabel, reliabilityColor } from '@/lib/trust';
import type { Profile } from '@/lib/types';
import TrustBadge from './TrustBadge';

interface TrustScoreProps {
  profile: Partial<Profile>;
  /** If true, show the full breakdown card. Default: compact inline widget */
  expanded?: boolean;
}

export default function TrustScore({ profile, expanded = false }: TrustScoreProps) {
  const score   = computeTrustScore(profile);
  const info    = getTrustInfo(score, profile.phone_verified);
  const verif   = getVerificationInfo({ phone_verified: profile.phone_verified, email: profile.email });

  if (!expanded) {
    // Compact widget: score number + level label
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${info.bgClass} ${info.borderClass}`}>
        <span className={`font-black text-sm ${info.colorClass}`}>{score}</span>
        <span className={info.colorClass}>{info.label}</span>
      </div>
    );
  }

  // Full card breakdown
  const runsCompleted = profile.runs_completed ?? 0;
  const runsHosted    = profile.runs_hosted ?? 0;
  const reliability   = profile.reliability_score;

  const factors: { icon: React.ReactNode; label: string; value: string; color: string }[] = [
    {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: 'Fiabilité',
      value: reliabilityLabel(reliability),
      color: reliabilityColor(reliability),
    },
    {
      icon: <Star className="w-3.5 h-3.5" />,
      label: 'Sorties effectuées',
      value: String(runsCompleted),
      color: 'text-yellow-400',
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Sorties organisées',
      value: String(runsHosted),
      color: 'text-blue-400',
    },
    {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'Vérification',
      value: verif.shortLabel,
      color: verif.colorClass,
    },
  ];

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${info.bgClass} ${info.borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Score de confiance</p>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-black ${info.colorClass}`}>{score}</span>
            <span className={`text-sm font-semibold ${info.colorClass}`}>/ 100</span>
            <span className="text-lg">{info.emoji}</span>
          </div>
          <p className={`text-sm font-semibold ${info.colorClass}`}>{info.label}</p>
        </div>
        <TrustBadge level={verif.level} size="md" />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score >= 85 ? 'bg-yellow-400' :
              score >= 65 ? 'bg-neon-500' :
              score >= 45 ? 'bg-blue-400' :
              'bg-white/25'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/25">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="grid grid-cols-2 gap-2.5">
        {factors.map(({ icon, label, value, color }) => (
          <div key={label} className="bg-white/4 border border-white/8 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-white/35">
              {icon}
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </div>
            <p className={`text-sm font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* "How to improve" tip when score < 65 */}
      {score < 65 && (
        <div className="text-[11px] text-white/35 bg-white/4 rounded-xl px-3 py-2 leading-relaxed">
          💡 Participe à plus de sorties et fais vérifier ton téléphone pour augmenter ton score.
        </div>
      )}
    </div>
  );
}
