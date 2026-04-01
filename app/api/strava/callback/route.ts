import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  exchangeStravaCode,
  fetchStravaActivities,
  calculateStravaStats,
  calculateRunningLevel,
} from '@/lib/strava';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Decode context from state: "{userId}" or "{userId}:onboarding"
  const isOnboarding = state?.endsWith(':onboarding') ?? false;
  const errorBase = isOnboarding ? '/onboarding?strava_error' : '/settings?strava_error';
  const successUrl = isOnboarding ? '/onboarding?strava_success=true' : '/settings?strava_success=true';

  // Gerer les erreurs d'autorisation
  if (error) {
    return NextResponse.redirect(
      new URL(`${errorBase}=access_denied`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${errorBase}=no_code`, request.url)
    );
  }

  try {
    // 1. Echanger le code contre des tokens
    const tokens = await exchangeStravaCode(code);

    // 2. Creer le client Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // 3. Verifier l'utilisateur connecte
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL(`${errorBase}=not_authenticated`, request.url)
      );
    }

    // 4. Recuperer les activites et calculer le niveau
    const activities = await fetchStravaActivities(tokens.access_token);
    const stats = calculateStravaStats(activities);
    const calculatedLevel = calculateRunningLevel(stats);

    // 5. Convertir l'allure en format interval PostgreSQL
    const avgPaceMinutes = Math.floor(stats.avgPaceSeconds / 60);
    const avgPaceSeconds = Math.round(stats.avgPaceSeconds % 60);
    const paceInterval = `00:${avgPaceMinutes.toString().padStart(2, '0')}:${avgPaceSeconds.toString().padStart(2, '0')}`;

    // 6a. Stocker les tokens OAuth dans la table dédiée (isolée de profiles)
    const { error: tokenError } = await supabase
      .from('strava_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        athlete_id: tokens.athlete.id,
      }, { onConflict: 'user_id' });

    if (tokenError) {
      logger.error('Error storing Strava tokens:', tokenError);
      return NextResponse.redirect(new URL(`${errorBase}=update_failed`, request.url));
    }

    // 6b. Mettre a jour les métadonnées non-sensibles dans profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_athlete_id: tokens.athlete.id,
        strava_connected: true,
        strava_last_sync: new Date().toISOString(),
        running_level: calculatedLevel,
        calculated_avg_pace: paceInterval,
        calculated_weekly_km: Math.round(stats.weeklyKm * 10) / 10,
        calculated_longest_run: Math.round(stats.longestRunKm * 10) / 10,
        calculated_total_runs: stats.totalRuns,
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error updating profile with Strava data:', updateError);
      return NextResponse.redirect(new URL(`${errorBase}=update_failed`, request.url));
    }

    // 7. Rediriger vers la destination appropriee
    return NextResponse.redirect(
      new URL(successUrl, request.url)
    );
  } catch (err) {
    logger.error('Strava OAuth error:', err);
    return NextResponse.redirect(
      new URL(`${errorBase}=exchange_failed`, request.url)
    );
  }
}
