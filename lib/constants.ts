export const LEVEL_THRESHOLDS = {
  1: { min: 0, max: 50, name: 'Débutant' },
  2: { min: 50, max: 200, name: 'Régulier' },
  3: { min: 200, max: 500, name: 'Confirmé' },
  4: { min: 500, max: 1000, name: 'Expert' },
  5: { min: 1000, max: Infinity, name: 'Élite' },
} as const;

export interface LevelInfo {
  currentLevel: number;
  levelName: string;
  currentXP: number;
  nextLevelXP: number;
  progressPercentage: number;
}

/**
 * Calcule le niveau actuel et la progression vers le prochain niveau
 */
export function calculateLevel(xp_points: number = 0): LevelInfo {
  let currentLevel = 1;

  // Trouver le niveau actuel
  for (let level = 5; level >= 1; level--) {
    const threshold = LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS];
    if (xp_points >= threshold.min) {
      currentLevel = level;
      break;
    }
  }

  const levelData = LEVEL_THRESHOLDS[currentLevel as keyof typeof LEVEL_THRESHOLDS];
  const nextLevelXP = levelData.max === Infinity ? levelData.min : levelData.max;

  // Calculer la progression
  const xpInCurrentLevel = xp_points - levelData.min;
  const xpNeededForNextLevel = nextLevelXP - levelData.min;
  const progressPercentage = levelData.max === Infinity
    ? 100
    : Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  return {
    currentLevel,
    levelName: levelData.name,
    currentXP: xp_points,
    nextLevelXP,
    progressPercentage,
  };
}
