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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="mb-2" style={{ fontSize: '28px', color: 'var(--primary)' }}>
              PaceMate
            </h1>
            <p className="text-secondary">
              Créez votre compte
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom d'utilisateur</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="votre_pseudo"
                minLength={3}
                maxLength={20}
                disabled={loading}
              />
              <p className="text-xs text-light mt-1">Entre 3 et 20 caractères</p>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="votre@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-light mt-1">Minimum 6 caractères</p>
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
            </div>

            {success && (
              <div className="alert alert-success">
                ✓ {success}
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                ✗ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', fontSize: '16px' }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="spinner"></div>
                  Création...
                </div>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Link */}
          <div className="mt-6 text-center">
            <p className="text-secondary">
              Déjà un compte ?{' '}
              <Link href="/auth/login" style={{ fontWeight: '600' }}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
