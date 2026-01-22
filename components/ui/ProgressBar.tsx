'use client';

import { useTheme } from '../providers/ThemeProvider';

interface ProgressBarProps {
  current: number;
  max: number;
  level: number;
}

export default function ProgressBar({ current, max, level }: ProgressBarProps) {
  const { theme } = useTheme();

  // Calculer le pourcentage
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full">
      {/* Barre de fond */}
      <div
        className="w-full h-3 overflow-hidden relative"
        style={{
          borderRadius: theme === 'discovery' ? '999px' : '4px',
          backgroundColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Barre de progression */}
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: 'var(--color-primary)',
            borderRadius: theme === 'discovery' ? '999px' : '4px',
          }}
        />
      </div>

      {/* Texte de progression */}
      <div className="flex justify-between items-center mt-2 text-sm opacity-75">
        <span>
          {current} / {max === Infinity ? '∞' : max} XP
        </span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
