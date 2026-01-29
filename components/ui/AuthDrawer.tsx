'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthDrawer({ isOpen, onClose, mode, onSwitchMode }: AuthDrawerProps) {
  const { signIn, signUp } = useAuth();
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
        const result = await signIn(email, password);
        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = '/sessions';
        } else {
          setError(result.error || 'Erreur lors de la connexion');
        }
      } else {
        const result = await signUp(email, password, username);
        if (result.success) {
          setError('');
          // Show success message - user needs to confirm email
          alert('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
          onClose();
        } else {
          setError(result.error || 'Erreur lors de l\'inscription');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
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
              className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-secondary-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600"
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600"
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-secondary-600"
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
                className="w-full px-6 py-4 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="text-center pt-4">
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
              <div className="mt-12 space-y-4">
                <h3 className="text-sm font-semibold text-secondary-600">
                  Pourquoi rejoindre PaceMate ?
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: '🏃', text: 'Trouve des partenaires de course' },
                    { icon: '📅', text: 'Organise tes sessions facilement' },
                    { icon: '👥', text: 'Rejoins une communauté active' },
                    { icon: '📊', text: 'Suis ta progression' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-2xl">{feature.icon}</span>
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
