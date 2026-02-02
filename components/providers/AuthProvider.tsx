'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { signOut as signOutAction } from '@/lib/supabase-auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Traduction des erreurs Supabase
function translateError(error: string): string {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer le profil depuis la table profiles avec retry
  const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (i < retries - 1) {
            // Attendre avant de réessayer (backoff exponentiel)
            await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
            continue;
          }
          console.error('Error fetching profile:', error);
          return null;
        }

        return data;
      } catch (error) {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
          continue;
        }
        console.error('Error fetching profile:', error);
        return null;
      }
    }
    return null;
  };

  // Initialiser l'état d'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: translateError(error.message),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Erreur lors de la connexion',
        };
      }

      // onAuthStateChange va mettre à jour user et profile automatiquement
      return {
        success: true,
      };
    } catch (error) {
      console.error('SignIn error:', error);
      return {
        success: false,
        error: 'Une erreur est survenue lors de la connexion',
      };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: translateError(error.message),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Erreur lors de la création du compte',
        };
      }

      // onAuthStateChange va mettre à jour user et profile automatiquement
      return {
        success: true,
      };
    } catch (error) {
      console.error('SignUp error:', error);
      return {
        success: false,
        error: 'Une erreur est survenue lors de l\'inscription',
      };
    }
  };

  const signOut = async () => {
    try {
      // 1. Déconnexion côté serveur pour supprimer les cookies HTTPOnly
      await signOutAction();

      // 2. Déconnexion côté client - déclenche onAuthStateChange qui va mettre à jour l'état
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Forcer la mise à jour de l'état en cas d'erreur
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Forcer la mise à jour de l'état en cas d'erreur
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
