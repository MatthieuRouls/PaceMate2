'use client';

import { Shield, Phone, Mail } from 'lucide-react';
import { VerificationLevel } from '@/lib/trust';

interface TrustBadgeProps {
  /** Which level of verification to display */
  level: VerificationLevel;
  /** 'sm' = icon only pill, 'md' = icon + label (default) */
  size?: 'sm' | 'md';
  /** Override the default label */
  label?: string;
}

const CONFIG: Record<VerificationLevel, {
  Icon: React.ElementType;
  defaultLabel: string;
  classes: string;
  iconClass: string;
}> = {
  identity: {
    Icon: Shield,
    defaultLabel: 'Identité vérifiée',
    classes: 'bg-yellow-400/12 border-yellow-400/30 text-yellow-400',
    iconClass: 'text-yellow-400',
  },
  phone: {
    Icon: Phone,
    defaultLabel: 'Téléphone vérifié',
    classes: 'bg-neon-500/10 border-neon-500/30 text-neon-400',
    iconClass: 'text-neon-400',
  },
  email: {
    Icon: Mail,
    defaultLabel: 'Email vérifié',
    classes: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    iconClass: 'text-blue-400',
  },
  none: {
    Icon: Shield,
    defaultLabel: 'Non vérifié',
    classes: 'bg-white/5 border-white/10 text-white/30',
    iconClass: 'text-white/30',
  },
};

export default function TrustBadge({ level, size = 'md', label }: TrustBadgeProps) {
  const cfg = CONFIG[level];
  const { Icon, defaultLabel, classes, iconClass } = cfg;
  const text = label ?? defaultLabel;

  if (size === 'sm') {
    return (
      <span
        title={text}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${classes}`}
      >
        <Icon className={`w-2.5 h-2.5 ${iconClass}`} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${classes}`}>
      <Icon className={`w-3 h-3 ${iconClass}`} />
      {text}
    </span>
  );
}
