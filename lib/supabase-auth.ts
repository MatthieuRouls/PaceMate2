'use server';

import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(
  email: string,
  password: string,
  username: string
): Promise<AuthResult> {
  try {
    // 1. Créer l'utilisateur dans auth.users avec metadata
    // Le trigger PostgreSQL créera automatiquement le profil
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: translateAuthError(authError.message),
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Erreur lors de la création du compte',
      };
    }

    // Le profil est créé automatiquement par le trigger PostgreSQL
    return {
      success: true,
      user: authData.user,
    };
  } catch (error) {
    console.error('SignUp error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'inscription',
    };
  }
}

/**
 * Connexion d'un utilisateur existant
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: translateAuthError(error.message),
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('SignIn error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la connexion',
    };
  }
}

/**
 * Déconnexion de l'utilisateur
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la déconnexion',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('SignOut error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la déconnexion',
    };
  }
}

/**
 * Récupérer l'utilisateur actuellement connecté
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('GetCurrentUser error:', error);
    return null;
  }
}

/**
 * Récupérer la session active
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('GetSession error:', error);
    return null;
  }
}

/**
 * Traduction des erreurs Supabase en français
 */
function translateAuthError(error: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'User already registered': 'Cet email est déjà utilisé',
    'Email not confirmed': 'Veuillez confirmer votre email',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'Signup requires a valid password': 'Mot de passe requis',
    'User not found': 'Utilisateur non trouvé',
    'Email rate limit exceeded': 'Trop de tentatives, veuillez réessayer plus tard',
  };

  // Recherche exacte
  if (errorMap[error]) {
    return errorMap[error];
  }

  // Recherche partielle
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }

  return error;
}
