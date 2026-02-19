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
 * Bonus performance (max 20 pts):
 * - Marathon < 2h30: +20
 * - Marathon < 2h45: +18
 * - Marathon < 3h00: +15
 * - Marathon < 3h15: +12
 * - Marathon < 3h30: +9
 * - Marathon < 3h45: +6
 * - Semi < 1h40: +4
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
 */
function calculatePerformanceBonus(bestEfforts: BestEffort[]): number {
  let bonus = 0;

  const marathon = bestEfforts.find(e => e.distance === 'marathon');
  const semi = bestEfforts.find(e => e.distance === 'semi');

  // Bonus marathon (prioritaire)
  if (marathon) {
    const timeMinutes = marathon.timeSeconds / 60;
    if (timeMinutes < 150) bonus = 20;       // < 2h30
    else if (timeMinutes < 165) bonus = 18;  // < 2h45
    else if (timeMinutes < 180) bonus = 15;  // < 3h00
    else if (timeMinutes < 195) bonus = 12;  // < 3h15
    else if (timeMinutes < 210) bonus = 9;   // < 3h30
    else if (timeMinutes < 225) bonus = 6;   // < 3h45
  }

  // Bonus semi (si pas de marathon ou marathon > 3h45)
  if (bonus === 0 && semi) {
    const timeMinutes = semi.timeSeconds / 60;
    if (timeMinutes < 100) bonus = 4; // < 1h40
  }

  return bonus;
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
