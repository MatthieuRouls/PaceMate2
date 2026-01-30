'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { signIn as signInAction, signUp as signUpAction } from '@/lib/supabase-auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer le profil depuis la table profiles
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
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
        console.log('Auth state changed:', event);

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
    console.log('🔑 AuthProvider: signIn appelé');
    const result = await signInAction(email, password);
    console.log('🔑 AuthProvider: Résultat signInAction:', result);

    if (result.success && result.user) {
      console.log('✅ AuthProvider: Utilisateur authentifié:', result.user.email);
      setUser(result.user);

      // Attendre que le profil soit disponible (au cas où il vient d'être créé)
      let userProfile = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!userProfile && attempts < maxAttempts) {
        console.log(`🔍 AuthProvider: Tentative ${attempts + 1}/${maxAttempts} de chargement du profil`);
        userProfile = await fetchProfile(result.user.id);
        if (!userProfile && attempts < maxAttempts - 1) {
          console.log('⏳ AuthProvider: Attente de 300ms avant nouvelle tentative');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        attempts++;
      }

      if (userProfile) {
        console.log('✅ AuthProvider: Profil chargé:', userProfile.username);
        setProfile(userProfile);
      } else {
        console.error('❌ AuthProvider: Impossible de charger le profil après', maxAttempts, 'tentatives');
      }
    } else {
      console.error('❌ AuthProvider: Échec de l\'authentification');
    }

    return result;
  };

  const signUp = async (email: string, password: string, username: string) => {
    const result = await signUpAction(email, password, username);

    if (result.success && result.user) {
      setUser(result.user);

      // Attendre que le trigger PostgreSQL crée le profil
      // Retry avec backoff si le profil n'existe pas encore
      let userProfile = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!userProfile && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempts + 1)));
        userProfile = await fetchProfile(result.user.id);
        attempts++;
      }

      setProfile(userProfile);
    }

    return result;
  };

  const signOut = async () => {
    try {
      // Utiliser le client Supabase directement au lieu d'une server action
      // pour que l'état soit immédiatement mis à jour via onAuthStateChange
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }

      // Le listener onAuthStateChange mettra automatiquement à jour user et profile à null
      // Mais on les met à jour immédiatement pour un feedback instantané
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, on force quand même la déconnexion côté client
      setUser(null);
      setProfile(null);
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
