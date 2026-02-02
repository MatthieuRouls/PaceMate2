'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthDrawer({ isOpen, onClose, mode, onSwitchMode }: AuthDrawerProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when drawer closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setUsername('');
      setError('');
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        // Use client-side Supabase directly
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(translateError(signInError.message));
          setLoading(false);
          return;
        }

        if (data.user) {
          // Success! Close drawer
          onClose();
          // Wait for AuthProvider's onAuthStateChange to update the profile
          // before redirecting to ensure dashboard sees authenticated state
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = '/dashboard';
        }
      } else {
        // Use client-side Supabase for signup
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (signUpError) {
          setError(translateError(signUpError.message));
          setLoading(false);
          return;
        }

        if (data.user) {
          setError('');
          alert('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const translateError = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email',
      'User already registered': 'Cet email est déjà utilisé',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (error.includes(key)) {
        return value;
      }
    }
    return error;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Floating Card */}
      <div
        className={`fixed top-6 right-6 w-[420px] max-h-[calc(100vh-48px)] bg-white rounded-3xl shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
        }`}
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex flex-col max-h-[calc(100vh-48px)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-bold text-secondary-600">
                {mode === 'login' ? 'Connexion' : 'Inscription'}
              </h2>
              <p className="text-sm text-secondary-600/60 mt-1">
                {mode === 'login'
                  ? 'Bon retour parmi nous !'
                  : 'Rejoins la communauté PaceMate'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-secondary-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Username field (signup only) */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary-600">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600 bg-white"
                    placeholder="ton_pseudo"
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600 bg-white"
                  placeholder="ton@email.com"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary-600">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600 bg-white"
                  placeholder="••••••••"
                />
                {mode === 'signup' && (
                  <p className="text-xs text-secondary-600/60">
                    Minimum 6 caractères
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Chargement...
                  </span>
                ) : (
                  mode === 'login' ? 'Se connecter' : 'Créer mon compte'
                )}
              </button>

              {/* Switch mode */}
              <div className="text-center pt-2">
                <p className="text-sm text-secondary-600/60">
                  {mode === 'login' ? (
                    <>
                      Pas encore de compte ?{' '}
                      <button
                        type="button"
                        onClick={() => onSwitchMode('signup')}
                        className="text-primary-500 font-semibold hover:text-primary-600 transition-colors"
                      >
                        Inscris-toi
                      </button>
                    </>
                  ) : (
                    <>
                      Déjà un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => onSwitchMode('login')}
                        className="text-primary-500 font-semibold hover:text-primary-600 transition-colors"
                      >
                        Connecte-toi
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>

            {/* Features (signup only) */}
            {mode === 'signup' && (
              <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                <h3 className="text-xs font-semibold text-secondary-600 uppercase tracking-wide">
                  Pourquoi PaceMate ?
                </h3>
                <div className="space-y-2.5">
                  {[
                    { icon: '🏃', text: 'Trouve des partenaires de course' },
                    { icon: '📅', text: 'Organise tes sessions facilement' },
                    { icon: '👥', text: 'Rejoins une communauté active' },
                    { icon: '📊', text: 'Suis ta progression' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{feature.icon}</span>
                      <span className="text-sm text-secondary-600/70">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
