import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { exchangeStravaCode } from '@/lib/strava';

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
    // 1. Echanger le code contre des tokens (rapide — appel Strava OAuth)
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

    // 4. Stocker les tokens OAuth dans la table dédiée (opération rapide)
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

    // 5. Marquer le compte comme connecté à Strava (sans calcul de niveau — fait en background)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_athlete_id: tokens.athlete.id,
        strava_connected: true,
        strava_last_sync: new Date().toISOString(),
        level_source: 'strava',
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error updating profile with Strava data:', updateError);
      return NextResponse.redirect(new URL(`${errorBase}=update_failed`, request.url));
    }

    // 6. Rediriger immédiatement — le calcul de niveau se fait en background depuis la page
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
