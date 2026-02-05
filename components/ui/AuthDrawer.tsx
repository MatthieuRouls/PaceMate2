'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export default function AuthDrawer({ isOpen, onClose, mode, onSwitchMode }: AuthDrawerProps) {
  const router = useRouter();
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
          onClose();
          // Attendre que onAuthStateChange mette à jour le profile
          await new Promise(resolve => setTimeout(resolve, 800));
          router.push('/dashboard');
        } else {
          setError(result.error || 'Erreur lors de la connexion');
        }
      } else {
        if (!username) {
          setError('Veuillez entrer un nom d\'utilisateur');
          setLoading(false);
          return;
        }

        const result = await signUp(email, password, username);

        if (result.success) {
          setError('');
          alert('Compte cree ! Verifiez votre email pour confirmer votre inscription.');
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

      {/* Floating Card */}
      <div
        className={`fixed top-6 right-6 w-[420px] max-h-[calc(100vh-48px)] bg-white rounded-xl shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
        }`}
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex flex-col max-h-[calc(100vh-48px)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-silver-300">
            <div>
              <h2 className="text-2xl font-bold text-dark-800">
                {mode === 'login' ? 'Connexion' : 'Inscription'}
              </h2>
              <p className="text-sm text-dark-500 mt-1">
                {mode === 'login'
                  ? 'Bon retour parmi nous !'
                  : 'Rejoins la communaute PaceMate'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-silver-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-dark-800" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-rust-50 border border-rust-300">
                  <p className="text-sm text-rust-600">{error}</p>
                </div>
              )}

              {/* Username field (signup only) */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-dark-800">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-petrol-700 focus:ring-2 focus:ring-petrol-700/20 outline-none transition-all text-dark-800 bg-white"
                    placeholder="ton_pseudo"
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-800">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-petrol-700 focus:ring-2 focus:ring-petrol-700/20 outline-none transition-all text-dark-800 bg-white"
                  placeholder="ton@email.com"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-800">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-silver-400 focus:border-petrol-700 focus:ring-2 focus:ring-petrol-700/20 outline-none transition-all text-dark-800 bg-white"
                  placeholder="••••••••"
                />
                {mode === 'signup' && (
                  <p className="text-xs text-dark-500">
                    Minimum 6 caracteres
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-lg bg-rust-500 text-white font-semibold hover:bg-rust-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  mode === 'login' ? 'Se connecter' : 'Creer mon compte'
                )}
              </button>

              {/* Switch mode */}
              <div className="text-center pt-2">
                <p className="text-sm text-dark-500">
                  {mode === 'login' ? (
                    <>
                      Pas encore de compte ?{' '}
                      <button
                        type="button"
                        onClick={() => onSwitchMode('signup')}
                        className="text-petrol-700 font-semibold hover:text-petrol-600 transition-colors"
                      >
                        Inscris-toi
                      </button>
                    </>
                  ) : (
                    <>
                      Deja un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => onSwitchMode('login')}
                        className="text-petrol-700 font-semibold hover:text-petrol-600 transition-colors"
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
              <div className="mt-8 pt-6 border-t border-silver-300 space-y-3">
                <h3 className="text-xs font-semibold text-dark-800 uppercase tracking-wide">
                  Pourquoi PaceMate ?
                </h3>
                <div className="space-y-2.5">
                  {[
                    { icon: '🏃', text: 'Trouve des partenaires de course' },
                    { icon: '📅', text: 'Organise tes sessions facilement' },
                    { icon: '👥', text: 'Rejoins une communaute active' },
                    { icon: '📊', text: 'Suis ta progression' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{feature.icon}</span>
                      <span className="text-sm text-dark-500">{feature.text}</span>
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
