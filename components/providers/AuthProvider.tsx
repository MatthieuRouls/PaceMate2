'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { signOut as signOutAction } from '@/lib/supabase-auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initializing: boolean; // True during first load only
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

// AbortErrors are expected when a component unmounts mid-request — suppress them
function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err && typeof err === 'object') {
    const msg = (err as { message?: string; details?: string }).message ?? '';
    const details = (err as { message?: string; details?: string }).details ?? '';
    if (msg.includes('AbortError') || msg.includes('aborted') ||
        details.includes('AbortError') || details.includes('aborted')) return true;
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Use refs to track mounted state and prevent race conditions
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Récupérer le profil depuis la table profiles avec retry
  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let i = 0; i < retries; i++) {
      // Stop retrying if the component has unmounted
      if (!isMountedRef.current) return null;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // AbortError = component unmounted or request cancelled — not a real error
          if (isAbortError(error)) return null;

          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
            continue;
          }
          console.error('Error fetching profile:', error);
          return null;
        }

        return data;
      } catch (err) {
        if (isAbortError(err)) return null;

        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
          continue;
        }
        console.error('Error fetching profile:', err);
        return null;
      }
    }
    return null;
  }, []);

  // Function to refresh profile manually
  const refreshProfile = useCallback(async () => {
    if (currentUserIdRef.current) {
      const userProfile = await fetchProfile(currentUserIdRef.current);
      if (isMountedRef.current && userProfile) {
        setProfile(userProfile);
      }
    }
  }, [fetchProfile]);

  // Initialiser l'état d'authentification au chargement
  useEffect(() => {
    isMountedRef.current = true;

    const initAuth = async () => {
      // Prevent double initialization
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        // First, get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        if (session?.user && isMountedRef.current) {
          currentUserIdRef.current = session.user.id;
          setUser(session.user);

          const userProfile = await fetchProfile(session.user.id);
          if (isMountedRef.current) {
            setProfile(userProfile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    // Set up auth state change listener BEFORE initializing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;

        // Only process auth changes after initialization is complete
        // This prevents the listener from overwriting the initial state with stale data
        if (event === 'INITIAL_SESSION') {
          // Skip - we handle this in initAuth
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            currentUserIdRef.current = session.user.id;
            setUser(session.user);

            const userProfile = await fetchProfile(session.user.id);
            if (isMountedRef.current) {
              setProfile(userProfile);
              setLoading(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initialize auth
    initAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return {
          success: false,
          error: translateError(error.message),
        };
      }

      if (!data.user) {
        setLoading(false);
        return {
          success: false,
          error: 'Erreur lors de la connexion',
        };
      }

      // Manually update state to avoid race conditions
      currentUserIdRef.current = data.user.id;
      setUser(data.user);

      const userProfile = await fetchProfile(data.user.id);
      if (isMountedRef.current) {
        setProfile(userProfile);
        setLoading(false);
      }

      return { success: true };
    } catch (error) {
      console.error('SignIn error:', error);
      setLoading(false);
      return {
        success: false,
        error: 'Une erreur est survenue lors de la connexion',
      };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);

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
        setLoading(false);
        return {
          success: false,
          error: translateError(error.message),
        };
      }

      if (!data.user) {
        setLoading(false);
        return {
          success: false,
          error: 'Erreur lors de la création du compte',
        };
      }

      // Wait for the profile trigger to create the profile
      // Then retry fetching the profile with increasing delays
      currentUserIdRef.current = data.user.id;
      setUser(data.user);

      // Essayer plusieurs fois de récupérer le profil (la création peut prendre du temps)
      let userProfile = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500 + (attempt * 300)));
        userProfile = await fetchProfile(data.user.id);
        if (userProfile) break;
      }

      if (isMountedRef.current) {
        setProfile(userProfile);
        setLoading(false);
      }

      return { success: true };
    } catch (error) {
      console.error('SignUp error:', error);
      setLoading(false);
      return {
        success: false,
        error: 'Une erreur est survenue lors de l\'inscription',
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear state immediately
      currentUserIdRef.current = null;
      setUser(null);
      setProfile(null);

      // 1. Déconnexion côté serveur pour supprimer les cookies HTTPOnly
      await signOutAction();

      // 2. Déconnexion côté client
      await supabase.auth.signOut();

      // 3. Rediriger vers la landing page
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Même en cas d'erreur, on force la déconnexion côté client
      currentUserIdRef.current = null;
      setUser(null);
      setProfile(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    profile,
    loading,
    initializing,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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
