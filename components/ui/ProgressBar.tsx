'use client';

interface ProgressBarProps {
  current: number;
  max: number;
  level: number;
}

export default function ProgressBar({ current, max, level }: ProgressBarProps) {
  // Calculer le pourcentage
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full">
      {/* Barre de fond */}
      <div
        className="w-full h-3 overflow-hidden relative rounded"
        style={{
          backgroundColor: '#e9ecef',
        }}
      >
        {/* Barre de progression */}
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: '#0066cc',
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
