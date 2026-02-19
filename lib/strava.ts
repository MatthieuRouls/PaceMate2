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

export interface StravaStats {
  avgPaceSeconds: number; // secondes par km
  weeklyKm: number;
  longestRunKm: number;
  totalRuns: number;
  recentRuns: StravaActivity[];
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

  for (const activity of activities) {
    const distanceKm = activity.distance / 1000;
    totalDistance += distanceKm;
    totalMovingTime += activity.moving_time;
    if (distanceKm > longestRun) {
      longestRun = distanceKm;
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
  };
}

/**
 * Calcule le niveau du coureur (1-5) basé sur ses stats Strava
 *
 * Criteres:
 * - Allure moyenne
 * - Volume hebdomadaire
 * - Plus longue sortie
 * - Regularite (nombre de courses)
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

  // Convertir le score (0-100) en niveau (1-5)
  if (score >= 80) return 5; // Elite
  if (score >= 60) return 4; // Expert
  if (score >= 40) return 3; // Confirme
  if (score >= 20) return 2; // Regulier
  return 1; // Debutant
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
