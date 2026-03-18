/**
 * Integration Strava - Calcul de niveau securise
 */

const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || '';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const STRAVA_REDIRECT_URI = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI || '';

// Scopes necessaires pour lire les activites
const STRAVA_SCOPES = 'read,activity:read_all';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

export interface BestEffort {
  distance: '5k' | '10k' | 'semi' | 'marathon';
  timeSeconds: number;
  activityId: number;
  date: string;
}

export interface StravaStats {
  avgPaceSeconds: number; // secondes par km
  weeklyKm: number;
  longestRunKm: number;
  totalRuns: number;
  recentRuns: StravaActivity[];
  bestEfforts: BestEffort[];
}

/**
 * Genere l'URL d'autorisation Strava
 */
export function getStravaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    scope: STRAVA_SCOPES,
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Echange le code d'autorisation contre des tokens
 */
export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors de l\'echange du code Strava');
  }

  return response.json();
}

/**
 * Rafraichit le token d'acces si expire
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors du rafraichissement du token Strava');
  }

  return response.json();
}

/**
 * Recupere les activites de course des 3 derniers mois
 */
export async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
  const threeMonthsAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);

  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${threeMonthsAgo}&per_page=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Erreur lors de la recuperation des activites Strava');
  }

  const activities: StravaActivity[] = await response.json();

  // Filtrer uniquement les courses (Run, Trail Run, etc.)
  return activities.filter(a =>
    a.type === 'Run' ||
    a.sport_type === 'Run' ||
    a.sport_type === 'TrailRun' ||
    a.type === 'TrailRun'
  );
}

// Distances standards avec tolerance (en km)
const RACE_DISTANCES = {
  '5k': { target: 5, min: 4.8, max: 5.3 },
  '10k': { target: 10, min: 9.5, max: 10.5 },
  'semi': { target: 21.0975, min: 20.5, max: 22 },
  'marathon': { target: 42.195, min: 41, max: 43.5 },
} as const;

/**
 * Calcule les statistiques a partir des activites
 */
export function calculateStravaStats(activities: StravaActivity[]): StravaStats {
  if (activities.length === 0) {
    return {
      avgPaceSeconds: 0,
      weeklyKm: 0,
      longestRunKm: 0,
      totalRuns: 0,
      recentRuns: [],
      bestEfforts: [],
    };
  }

  // Trier par date (plus recent en premier)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  // Calculer la distance totale et le temps total
  let totalDistance = 0;
  let totalMovingTime = 0;
  let longestRun = 0;

  // Stocker les meilleures performances par distance
  const bestByDistance: Record<string, BestEffort> = {};

  for (const activity of activities) {
    const distanceKm = activity.distance / 1000;
    totalDistance += distanceKm;
    totalMovingTime += activity.moving_time;
    if (distanceKm > longestRun) {
      longestRun = distanceKm;
    }

    // Verifier si c'est une course sur distance standard
    for (const [distKey, range] of Object.entries(RACE_DISTANCES)) {
      if (distanceKm >= range.min && distanceKm <= range.max) {
        // Normaliser le temps a la distance exacte
        const normalizedTime = (activity.moving_time / distanceKm) * range.target;

        if (!bestByDistance[distKey] || normalizedTime < bestByDistance[distKey].timeSeconds) {
          bestByDistance[distKey] = {
            distance: distKey as BestEffort['distance'],
            timeSeconds: Math.round(normalizedTime),
            activityId: activity.id,
            date: activity.start_date,
          };
        }
      }
    }
  }

  // Allure moyenne (secondes par km)
  const avgPaceSeconds = totalDistance > 0 ? totalMovingTime / totalDistance : 0;

  // Km hebdomadaire moyen (sur 12 semaines = 3 mois)
  const weeklyKm = totalDistance / 12;

  return {
    avgPaceSeconds,
    weeklyKm,
    longestRunKm: longestRun,
    totalRuns: activities.length,
    recentRuns: sortedActivities.slice(0, 10),
    bestEfforts: Object.values(bestByDistance),
  };
}

/**
 * Calcule le niveau du coureur (1-9) basé sur ses stats Strava
 *
 * Criteres (100 pts de base):
 * - Allure moyenne (max 30 pts)
 * - Volume hebdomadaire (max 30 pts)
 * - Plus longue sortie (max 25 pts)
 * - Regularite (max 15 pts)
 *
 * Bonus performance - meilleure perf parmi (max 20 pts):
 * Marathon: <2h30 +20, <2h45 +18, <3h00 +15, <3h15 +12, <3h30 +9, <3h45 +6
 * Semi: <1h15 +12, <1h20 +10, <1h25 +8, <1h30 +6, <1h35 +5, <1h40 +4, <1h50 +2
 * 10K: <32' +10, <35' +8, <38' +6, <40' +5, <45' +4, <50' +3, <55' +2, <60' +1
 * 5K: <15' +8, <16' +6, <17' +5, <18' +4, <19' +3, <20' +2, <25' +1
 *
 * Score total possible: 120 pts
 *
 * Niveaux:
 * 1: Debutant (<20)
 * 2: Occasionnel (20-34)
 * 3: Regulier (35-49)
 * 4: Confirme (50-64)
 * 5: Competiteur (65-79)
 * 6: Expert (80-94)
 * 7: Performance (95-109)
 * 8: Elite amateur (110-117)
 * 9: Elite national (>=118)
 */
export function calculateRunningLevel(stats: StravaStats): number {
  if (stats.totalRuns === 0) {
    return 1; // Debutant si pas de donnees
  }

  let score = 0;

  // 1. Score basé sur l'allure moyenne (max 30 points)
  // 7:00/km = debutant, 4:00/km = elite
  const paceMinPerKm = stats.avgPaceSeconds / 60;
  if (paceMinPerKm <= 4.0) score += 30;
  else if (paceMinPerKm <= 4.5) score += 25;
  else if (paceMinPerKm <= 5.0) score += 20;
  else if (paceMinPerKm <= 5.5) score += 15;
  else if (paceMinPerKm <= 6.0) score += 10;
  else if (paceMinPerKm <= 6.5) score += 5;
  else score += 2;

  // 2. Score basé sur le volume hebdomadaire (max 30 points)
  // 0-10km = debutant, 80km+ = elite
  if (stats.weeklyKm >= 80) score += 30;
  else if (stats.weeklyKm >= 60) score += 25;
  else if (stats.weeklyKm >= 40) score += 20;
  else if (stats.weeklyKm >= 25) score += 15;
  else if (stats.weeklyKm >= 15) score += 10;
  else if (stats.weeklyKm >= 8) score += 5;
  else score += 2;

  // 3. Score basé sur la plus longue sortie (max 25 points)
  // 5km = debutant, 30km+ = elite
  if (stats.longestRunKm >= 30) score += 25;
  else if (stats.longestRunKm >= 21) score += 20;
  else if (stats.longestRunKm >= 15) score += 15;
  else if (stats.longestRunKm >= 10) score += 10;
  else if (stats.longestRunKm >= 7) score += 5;
  else score += 2;

  // 4. Score basé sur la regularite (max 15 points)
  // Nombre de courses sur 3 mois
  const runsPerWeek = stats.totalRuns / 12;
  if (runsPerWeek >= 5) score += 15;
  else if (runsPerWeek >= 4) score += 12;
  else if (runsPerWeek >= 3) score += 9;
  else if (runsPerWeek >= 2) score += 6;
  else if (runsPerWeek >= 1) score += 3;
  else score += 1;

  // 5. Bonus basé sur les meilleures performances (max 20 points)
  const perfBonus = calculatePerformanceBonus(stats.bestEfforts);
  score += perfBonus;

  // Convertir le score (0-120) en niveau (1-9)
  if (score >= 118) return 9; // Elite national
  if (score >= 110) return 8; // Elite amateur
  if (score >= 95) return 7;  // Performance
  if (score >= 80) return 6;  // Expert
  if (score >= 65) return 5;  // Competiteur
  if (score >= 50) return 4;  // Confirme
  if (score >= 35) return 3;  // Regulier
  if (score >= 20) return 2;  // Occasionnel
  return 1; // Debutant
}

/**
 * Calcule le bonus de performance basé sur les meilleures courses
 * Prend le meilleur bonus parmi toutes les distances
 */
function calculatePerformanceBonus(bestEfforts: BestEffort[]): number {
  let bonus = 0;

  const marathon = bestEfforts.find(e => e.distance === 'marathon');
  const semi = bestEfforts.find(e => e.distance === 'semi');
  const tenK = bestEfforts.find(e => e.distance === '10k');
  const fiveK = bestEfforts.find(e => e.distance === '5k');

  // Bonus marathon (max 20 pts)
  if (marathon) {
    const timeMinutes = marathon.timeSeconds / 60;
    if (timeMinutes < 150) bonus = Math.max(bonus, 20);       // < 2h30
    else if (timeMinutes < 165) bonus = Math.max(bonus, 18);  // < 2h45
    else if (timeMinutes < 180) bonus = Math.max(bonus, 15);  // < 3h00
    else if (timeMinutes < 195) bonus = Math.max(bonus, 12);  // < 3h15
    else if (timeMinutes < 210) bonus = Math.max(bonus, 9);   // < 3h30
    else if (timeMinutes < 225) bonus = Math.max(bonus, 6);   // < 3h45
  }

  // Bonus semi (max 12 pts)
  if (semi) {
    const timeMinutes = semi.timeSeconds / 60;
    if (timeMinutes < 75) bonus = Math.max(bonus, 12);        // < 1h15
    else if (timeMinutes < 80) bonus = Math.max(bonus, 10);   // < 1h20
    else if (timeMinutes < 85) bonus = Math.max(bonus, 8);    // < 1h25
    else if (timeMinutes < 90) bonus = Math.max(bonus, 6);    // < 1h30
    else if (timeMinutes < 95) bonus = Math.max(bonus, 5);    // < 1h35
    else if (timeMinutes < 100) bonus = Math.max(bonus, 4);   // < 1h40
    else if (timeMinutes < 110) bonus = Math.max(bonus, 2);   // < 1h50
  }

  // Bonus 10K (max 10 pts)
  if (tenK) {
    const timeMinutes = tenK.timeSeconds / 60;
    if (timeMinutes < 32) bonus = Math.max(bonus, 10);        // < 32 min
    else if (timeMinutes < 35) bonus = Math.max(bonus, 8);    // < 35 min
    else if (timeMinutes < 38) bonus = Math.max(bonus, 6);    // < 38 min
    else if (timeMinutes < 40) bonus = Math.max(bonus, 5);    // < 40 min
    else if (timeMinutes < 45) bonus = Math.max(bonus, 4);    // < 45 min
    else if (timeMinutes < 50) bonus = Math.max(bonus, 3);    // < 50 min
    else if (timeMinutes < 55) bonus = Math.max(bonus, 2);    // < 55 min
    else if (timeMinutes < 60) bonus = Math.max(bonus, 1);    // < 60 min
  }

  // Bonus 5K (max 8 pts)
  if (fiveK) {
    const timeMinutes = fiveK.timeSeconds / 60;
    if (timeMinutes < 15) bonus = Math.max(bonus, 8);         // < 15 min
    else if (timeMinutes < 16) bonus = Math.max(bonus, 6);    // < 16 min
    else if (timeMinutes < 17) bonus = Math.max(bonus, 5);    // < 17 min
    else if (timeMinutes < 18) bonus = Math.max(bonus, 4);    // < 18 min
    else if (timeMinutes < 19) bonus = Math.max(bonus, 3);    // < 19 min
    else if (timeMinutes < 20) bonus = Math.max(bonus, 2);    // < 20 min
    else if (timeMinutes < 25) bonus = Math.max(bonus, 1);    // < 25 min
  }

  return bonus;
}

// ─── Level display helpers ────────────────────────────────────────────────────

export interface LevelConfig {
  label: string;       // full name shown to users
  shortLabel: string;  // abbreviated for tight spaces
  // Tailwind classes (compatible with light bg cards and dark bg cards)
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * Maps running level (1-9) to display config.
 * Safe for level values outside 1-9 — falls back to level 1.
 */
export function getLevelConfig(level: number): LevelConfig {
  const configs: Record<number, LevelConfig> = {
    1: { label: 'Débutant',        shortLabel: 'Déb.',    textClass: 'text-slate-500',  bgClass: 'bg-slate-100',   borderClass: 'border-slate-300' },
    2: { label: 'Occasionnel',     shortLabel: 'Occ.',    textClass: 'text-blue-500',   bgClass: 'bg-blue-50',     borderClass: 'border-blue-200' },
    3: { label: 'Régulier',        shortLabel: 'Rég.',    textClass: 'text-green-600',  bgClass: 'bg-green-50',    borderClass: 'border-green-200' },
    4: { label: 'Confirmé',        shortLabel: 'Conf.',   textClass: 'text-teal-600',   bgClass: 'bg-teal-50',     borderClass: 'border-teal-200' },
    5: { label: 'Compétiteur',     shortLabel: 'Comp.',   textClass: 'text-amber-600',  bgClass: 'bg-amber-50',    borderClass: 'border-amber-200' },
    6: { label: 'Expert',          shortLabel: 'Exp.',    textClass: 'text-orange-600', bgClass: 'bg-orange-50',   borderClass: 'border-orange-200' },
    7: { label: 'Performance',     shortLabel: 'Perf.',   textClass: 'text-pink-600',   bgClass: 'bg-pink-50',     borderClass: 'border-pink-200' },
    8: { label: 'Élite amateur',   shortLabel: 'Élite',   textClass: 'text-purple-600', bgClass: 'bg-purple-50',   borderClass: 'border-purple-200' },
    9: { label: 'Élite national',  shortLabel: 'Nat.',    textClass: 'text-yellow-600', bgClass: 'bg-yellow-50',   borderClass: 'border-yellow-200' },
  };
  return configs[level] ?? configs[1];
}

/**
 * Derives a suggested required level from a pace (seconds/km).
 * Used when creating a run to auto-set level_required from target pace.
 */
export function levelFromPaceSeconds(paceSeconds: number): number {
  const min = paceSeconds / 60;
  if (min <= 4.0) return 6;
  if (min <= 4.5) return 5;
  if (min <= 5.0) return 4;
  if (min <= 5.5) return 3;
  if (min <= 6.5) return 2;
  return 1;
}

/**
 * Formatte l'allure en min:sec/km
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm === 0) return '--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
