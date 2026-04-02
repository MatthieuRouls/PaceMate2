/**
 * Calcul du niveau de running via questionnaire manuel.
 * Même algorithme que l'analyse Strava, plafonné à niveau 7 (niveau 8-9 = Strava uniquement).
 * Fichier pur (pas de 'use server') — importable côté client et serveur.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklyKm = 'below_20' | '20_35' | '35_55' | '55_75' | 'above_75';
export type RunnerPace = 'above_7' | '6h30_7' | '5h30_6h30' | '5_5h30' | '4h30_5' | '4_4h30' | 'below_4';
export type LongestRun = 'below_5' | '5_10' | '10_15' | '15_21' | '21_30' | 'above_30';

export interface ManualLevelAnswers {
  isRunner: boolean;
  weeklyKm?: WeeklyKm;
  pace?: RunnerPace;
  longestRun?: LongestRun;
  bestTime5k?: string;       // "mm:ss"
  bestTime10k?: string;      // "mm:ss"
  bestTimeSemi?: string;     // "h:mm:ss"
  bestTimeMarathon?: string; // "h:mm:ss"
}

// ─── Score tables (alignées avec l'algo Strava) ───────────────────────────────

// Kilométrage hebdomadaire — remplace la fréquence (30 pts max, comme Strava)
const WEEKLY_KM_SCORES: Record<WeeklyKm, number> = {
  below_20:  5,
  '20_35':   12,
  '35_55':   20,
  '55_75':   26,
  above_75:  30,
};

// Allure — corrigée pour compenser le biais déclaratif :
// les gens donnent leur allure confortable/tempo, ~20-30s/km plus rapide que la moyenne Strava
const PACE_SCORES: Record<RunnerPace, number> = {
  above_7:     2,
  '6h30_7':    5,
  '5h30_6h30': 10,
  '5_5h30':    15,
  '4h30_5':    20,  // était 15 — corrigé
  '4_4h30':    26,
  below_4:     30,
};

// Plus longue sortie (25 pts max)
const LONGEST_SCORES: Record<LongestRun, number> = {
  below_5:  2,
  '5_10':   5,
  '10_15':  10,
  '15_21':  15,
  '21_30':  20,
  above_30: 25,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToSeconds(s: string): number | null {
  const parts = s.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function calcPerfBonus(answers: ManualLevelAnswers): number {
  let bonus = 0;

  if (answers.bestTimeMarathon) {
    const secs = parseTimeToSeconds(answers.bestTimeMarathon);
    if (secs) {
      const m = secs / 60;
      if (m < 150) bonus = Math.max(bonus, 20);
      else if (m < 165) bonus = Math.max(bonus, 18);
      else if (m < 180) bonus = Math.max(bonus, 15);
      else if (m < 195) bonus = Math.max(bonus, 12);
      else if (m < 210) bonus = Math.max(bonus, 9);
      else if (m < 225) bonus = Math.max(bonus, 6);
      else if (m < 240) bonus = Math.max(bonus, 4);
      else if (m < 270) bonus = Math.max(bonus, 2);
    }
  }

  if (answers.bestTimeSemi) {
    const secs = parseTimeToSeconds(answers.bestTimeSemi);
    if (secs) {
      const m = secs / 60;
      if (m < 75)  bonus = Math.max(bonus, 12);
      else if (m < 80)  bonus = Math.max(bonus, 10);
      else if (m < 85)  bonus = Math.max(bonus, 8);
      else if (m < 90)  bonus = Math.max(bonus, 6);
      else if (m < 95)  bonus = Math.max(bonus, 5);
      else if (m < 100) bonus = Math.max(bonus, 4);
      else if (m < 110) bonus = Math.max(bonus, 3);
      else if (m < 120) bonus = Math.max(bonus, 2);
    }
  }

  if (answers.bestTime10k) {
    const secs = parseTimeToSeconds(answers.bestTime10k);
    if (secs) {
      const m = secs / 60;
      if (m < 32)  bonus = Math.max(bonus, 10);
      else if (m < 35) bonus = Math.max(bonus, 8);
      else if (m < 38) bonus = Math.max(bonus, 6);
      else if (m < 40) bonus = Math.max(bonus, 5);
      else if (m < 43) bonus = Math.max(bonus, 4);
      else if (m < 47) bonus = Math.max(bonus, 3);
      else if (m < 52) bonus = Math.max(bonus, 2);
      else if (m < 60) bonus = Math.max(bonus, 1);
    }
  }

  if (answers.bestTime5k) {
    const secs = parseTimeToSeconds(answers.bestTime5k);
    if (secs) {
      const m = secs / 60;
      if (m < 15)  bonus = Math.max(bonus, 8);
      else if (m < 16) bonus = Math.max(bonus, 7);
      else if (m < 17) bonus = Math.max(bonus, 6);
      else if (m < 18) bonus = Math.max(bonus, 5);
      else if (m < 19) bonus = Math.max(bonus, 4);  // 18min → 4 pts (était 3)
      else if (m < 20) bonus = Math.max(bonus, 3);
      else if (m < 22) bonus = Math.max(bonus, 2);
      else if (m < 25) bonus = Math.max(bonus, 1);
    }
  }

  return bonus;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Calcule le score brut à partir des réponses au questionnaire.
 * Max théorique : 30 (km) + 30 (allure) + 25 (sortie) + 20 (perf) = 105 pts → niveau 7 max.
 * Niveau 8-9 inaccessible sans Strava.
 */
export function calculateManualScore(answers: ManualLevelAnswers): number {
  if (!answers.isRunner) return 0;

  let score = 0;
  score += WEEKLY_KM_SCORES[answers.weeklyKm ?? 'below_20'];
  score += PACE_SCORES[answers.pace ?? 'above_7'];
  score += LONGEST_SCORES[answers.longestRun ?? 'below_5'];
  score += calcPerfBonus(answers);

  return score;
}

/**
 * Convertit un score (0-120) en niveau (1-9).
 * Pour le questionnaire manuel, le score est capé à ~105 donc niveau max = 7.
 */
export function scoreToLevel(score: number): number {
  if (score >= 118) return 9;
  if (score >= 110) return 8;
  if (score >= 95)  return 7;
  if (score >= 80)  return 6;
  if (score >= 65)  return 5;
  if (score >= 50)  return 4;
  if (score >= 35)  return 3;
  if (score >= 20)  return 2;
  return 1;
}

// Tranches de niveaux (min inclusif, max inclusif)
const LEVEL_BANDS = [
  { min: 0,   max: 19  }, // niveau 1
  { min: 20,  max: 34  }, // niveau 2
  { min: 35,  max: 49  }, // niveau 3
  { min: 50,  max: 64  }, // niveau 4
  { min: 65,  max: 79  }, // niveau 5
  { min: 80,  max: 94  }, // niveau 6
  { min: 95,  max: 109 }, // niveau 7
  { min: 110, max: 117 }, // niveau 8
  { min: 118, max: 120 }, // niveau 9
];

/**
 * Retourne le pourcentage de progression dans la tranche du niveau courant.
 */
export function getLevelBandProgress(score: number, level: number): number {
  const band = LEVEL_BANDS[level - 1];
  if (!band) return 0;
  const pct = ((score - band.min) / (band.max - band.min + 1)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

// ─── Labels questionnaire ─────────────────────────────────────────────────────

export const WEEKLY_KM_OPTIONS: { value: WeeklyKm; label: string }[] = [
  { value: 'below_20',  label: 'Moins de 20 km' },
  { value: '20_35',     label: '20 – 35 km' },
  { value: '35_55',     label: '35 – 55 km' },
  { value: '55_75',     label: '55 – 75 km' },
  { value: 'above_75',  label: 'Plus de 75 km' },
];

export const PACE_OPTIONS: { value: RunnerPace; label: string }[] = [
  { value: 'above_7',      label: 'Plus de 7:00 /km  (débutant)' },
  { value: '6h30_7',       label: '6:30 – 7:00 /km' },
  { value: '5h30_6h30',    label: '5:30 – 6:30 /km' },
  { value: '5_5h30',       label: '5:00 – 5:30 /km' },
  { value: '4h30_5',       label: '4:30 – 5:00 /km' },
  { value: '4_4h30',       label: '4:00 – 4:30 /km' },
  { value: 'below_4',      label: 'Moins de 4:00 /km  (élite)' },
];

export const LONGEST_RUN_OPTIONS: { value: LongestRun; label: string }[] = [
  { value: 'below_5',  label: 'Moins de 5 km' },
  { value: '5_10',     label: '5 – 10 km' },
  { value: '10_15',    label: '10 – 15 km' },
  { value: '15_21',    label: '15 – 21 km (semi)' },
  { value: '21_30',    label: '21 – 30 km' },
  { value: 'above_30', label: 'Plus de 30 km (marathon+)' },
];
