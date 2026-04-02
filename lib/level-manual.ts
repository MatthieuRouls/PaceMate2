/**
 * Calcul du niveau de running via questionnaire manuel.
 * Même algorithme que l'analyse Strava, plafonné à niveau 8 (niveau 9 = Strava uniquement).
 * Fichier pur (pas de 'use server') — importable côté client et serveur.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunnerFrequency = 'never' | 'once' | '2-3' | '4-5' | '5plus';
export type RunnerPace = 'above_7' | '6_7' | '5_6' | '4h30_5' | '4_4h30' | 'below_4';
export type LongestRun = 'below_5' | '5_10' | '10_15' | '15_21' | '21_30' | 'above_30';

export interface ManualLevelAnswers {
  isRunner: boolean;
  frequency?: RunnerFrequency;
  pace?: RunnerPace;
  longestRun?: LongestRun;
  bestTime5k?: string;       // "mm:ss"
  bestTime10k?: string;      // "mm:ss"
  bestTimeSemi?: string;     // "h:mm:ss"
  bestTimeMarathon?: string; // "h:mm:ss"
}

// ─── Score tables (alignées avec l'algo Strava) ───────────────────────────────

const FREQ_SCORES: Record<RunnerFrequency, number> = {
  never:  1,
  once:   3,
  '2-3':  9,
  '4-5':  12,
  '5plus': 15,
};

const PACE_SCORES: Record<RunnerPace, number> = {
  above_7:   2,
  '6_7':     5,
  '5_6':     10,
  '4h30_5':  15,
  '4_4h30':  25,
  below_4:   30,
};

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
      else if (m < 110) bonus = Math.max(bonus, 2);
    }
  }

  if (answers.bestTime10k) {
    const secs = parseTimeToSeconds(answers.bestTime10k);
    if (secs) {
      const m = secs / 60;
      if (m < 32) bonus = Math.max(bonus, 10);
      else if (m < 35) bonus = Math.max(bonus, 8);
      else if (m < 38) bonus = Math.max(bonus, 6);
      else if (m < 40) bonus = Math.max(bonus, 5);
      else if (m < 45) bonus = Math.max(bonus, 4);
      else if (m < 50) bonus = Math.max(bonus, 3);
      else if (m < 55) bonus = Math.max(bonus, 2);
      else if (m < 60) bonus = Math.max(bonus, 1);
    }
  }

  if (answers.bestTime5k) {
    const secs = parseTimeToSeconds(answers.bestTime5k);
    if (secs) {
      const m = secs / 60;
      if (m < 15) bonus = Math.max(bonus, 8);
      else if (m < 16) bonus = Math.max(bonus, 6);
      else if (m < 17) bonus = Math.max(bonus, 5);
      else if (m < 18) bonus = Math.max(bonus, 4);
      else if (m < 19) bonus = Math.max(bonus, 3);
      else if (m < 20) bonus = Math.max(bonus, 2);
      else if (m < 25) bonus = Math.max(bonus, 1);
    }
  }

  return bonus;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Calcule le score brut (0-90) à partir des réponses au questionnaire.
 * Plafonné à ~90 pour que le niveau 9 (≥118) soit inaccessible sans Strava.
 */
export function calculateManualScore(answers: ManualLevelAnswers): number {
  if (!answers.isRunner) return 0;

  let score = 0;
  score += FREQ_SCORES[answers.frequency ?? 'never'];
  score += PACE_SCORES[answers.pace ?? 'above_7'];
  score += LONGEST_SCORES[answers.longestRun ?? 'below_5'];
  score += calcPerfBonus(answers);

  return score; // max théorique : 15 + 30 + 25 + 20 = 90
}

/**
 * Convertit un score (0-120) en niveau (1-9).
 * Pour le questionnaire manuel, le score est capé à 90 donc niveau max = 7.
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
 * Ex : score 57 → niveau 4 (50-64) → (57-50)/(64-50) = 50%
 */
export function getLevelBandProgress(score: number, level: number): number {
  const band = LEVEL_BANDS[level - 1];
  if (!band) return 0;
  const pct = ((score - band.min) / (band.max - band.min + 1)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

// Labels affichés dans le questionnaire
export const FREQUENCY_OPTIONS: { value: RunnerFrequency; label: string }[] = [
  { value: 'never',  label: 'Je ne cours pas encore' },
  { value: 'once',   label: 'Moins d\'une fois par semaine' },
  { value: '2-3',    label: '2 à 3 fois par semaine' },
  { value: '4-5',    label: '4 à 5 fois par semaine' },
  { value: '5plus',  label: '5 fois ou plus par semaine' },
];

export const PACE_OPTIONS: { value: RunnerPace; label: string }[] = [
  { value: 'above_7',  label: 'Plus de 7:00 /km  (débutant)' },
  { value: '6_7',      label: '6:00 – 7:00 /km' },
  { value: '5_6',      label: '5:00 – 6:00 /km' },
  { value: '4h30_5',   label: '4:30 – 5:00 /km' },
  { value: '4_4h30',   label: '4:00 – 4:30 /km' },
  { value: 'below_4',  label: 'Moins de 4:00 /km  (élite)' },
];

export const LONGEST_RUN_OPTIONS: { value: LongestRun; label: string }[] = [
  { value: 'below_5',  label: 'Moins de 5 km' },
  { value: '5_10',     label: '5 – 10 km' },
  { value: '10_15',    label: '10 – 15 km' },
  { value: '15_21',    label: '15 – 21 km (semi)' },
  { value: '21_30',    label: '21 – 30 km' },
  { value: 'above_30', label: 'Plus de 30 km (marathon+)' },
];
