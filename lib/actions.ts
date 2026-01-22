'use server';

import { supabase } from './supabase';

export interface CreateSessionData {
  title: string;
  description?: string;
  start_time: string; // datetime-local format
  location_name: string;
  distance_km: number;
  session_type?: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
  level_required: number;
  target_pace?: string; // Format: "5:30"
  walk_breaks_ok: boolean;
  max_participants: number;
}

export interface CreateSessionResult {
  success: boolean;
  session_id?: string;
  error?: string;
}

/**
 * Convertit une allure "5:30" en interval PostgreSQL "00:05:30"
 */
function convertPaceToInterval(pace: string): string | null {
  if (!pace || !pace.trim()) return null;

  // Format attendu: "5:30" ou "5:30:45" (min:sec ou min:sec:centièmes)
  const parts = pace.split(':');
  if (parts.length < 2) return null;

  const minutes = parts[0].padStart(2, '0');
  const seconds = parts[1].padStart(2, '0');

  return `00:${minutes}:${seconds}`;
}

/**
 * Crée une nouvelle session running
 */
export async function createSession(data: CreateSessionData): Promise<CreateSessionResult> {
  try {
    // 1. Récupérer le premier profil pour creator_id (en dur pour l'instant)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profileError || !profiles) {
      console.error('Error fetching profile:', profileError);
      return {
        success: false,
        error: 'Impossible de récupérer le profil utilisateur. Veuillez créer un profil d\'abord.',
      };
    }

    const creator_id = profiles.id;

    // 2. Convertir l'allure si renseignée
    const target_pace = data.target_pace ? convertPaceToInterval(data.target_pace) : null;

    // 3. Convertir la date en format ISO
    const start_time = new Date(data.start_time).toISOString();

    // 4. Préparer les données pour l'insertion
    const sessionData = {
      title: data.title,
      description: data.description || null,
      creator_id,
      start_time,
      location_name: data.location_name,
      distance_km: data.distance_km,
      session_type: data.session_type || null,
      level_required: data.level_required,
      target_pace,
      walk_breaks_ok: data.walk_breaks_ok,
      max_participants: data.max_participants,
    };

    // 5. Insérer dans Supabase
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting session:', insertError);
      return {
        success: false,
        error: `Erreur lors de la création de la session: ${insertError.message}`,
      };
    }

    return {
      success: true,
      session_id: session.id,
    };
  } catch (error) {
    console.error('Unexpected error in createSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
  }
}
