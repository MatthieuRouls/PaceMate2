'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SignupPage() {
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password, username);

      if (result.success) {
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription, puis connectez-vous.');
        // Réinitialiser le formulaire
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
      } else {
        setError(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Une erreur est survenue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="card-modern p-8">
          {/* Logo / Titre */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{
              background: 'var(--gradient-primary)',
              boxShadow: 'var(--shadow-colored)'
            }}>
              <span className="text-white text-3xl font-bold">M</span>
            </div>
            <h1 className="text-3xl font-bold mb-2 gradient-text">
              PaceMate
            </h1>
            <p style={{ color: 'var(--text-light)' }}>
              Créez votre compte
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-modern"
                placeholder="votre_pseudo"
                minLength={3}
                maxLength={20}
                disabled={loading}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                Entre 3 et 20 caractères
              </p>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
                placeholder="votre@email.com"
                disabled={loading}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                Minimum 6 caractères
              </p>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
            </div>

            {/* Success */}
            {success && (
              <div className="p-4 text-sm font-medium animate-fadeIn" style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}>
                ✅ {success}
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="p-4 text-sm font-medium animate-fadeIn" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                ❌ {error}
              </div>
            )}

            {/* Bouton d'inscription */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner-gradient w-5 h-5"></div>
                  Création du compte...
                </span>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Lien connexion */}
          <div className="mt-6 text-center">
            <p style={{ color: 'var(--text-light)' }}>
              Déjà un compte ?{' '}
              <Link
                href="/auth/login"
                className="font-bold link-gradient"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
