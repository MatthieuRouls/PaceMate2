'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, profile, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!authLoading && profile) {
      router.push('/dashboard');
    }
  }, [authLoading, profile, router]);

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
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0066cc'
          }}>
            PaceMate
          </Link>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
            Créez votre compte
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Success Message */}
            {success && (
              <div style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#d1e7dd',
                border: '1px solid #badbcc',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f5132', marginBottom: '0.5rem' }}>
                  {success}
                </p>
                <Link href="/auth/login">
                  <button type="button" className="btn-secondary" style={{ width: '100%', fontSize: '0.875rem' }}>
                    Se connecter →
                  </button>
                </Link>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c2c7',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#842029' }}>{error}</p>
              </div>
            )}

            {/* Username */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Nom d'utilisateur
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="votre_pseudo"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Mot de passe
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>

            {/* Divider */}
            <div style={{
              position: 'relative',
              margin: '1.5rem 0',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                borderTop: '1px solid #dee2e6'
              }} />
              <span style={{
                position: 'relative',
                padding: '0 1rem',
                backgroundColor: 'white',
                fontSize: '0.875rem',
                color: '#6c757d'
              }}>
                Déjà un compte ?
              </span>
            </div>

            {/* Login Link */}
            <Link href="/auth/login">
              <button type="button" className="btn-secondary" style={{ width: '100%' }}>
                Se connecter
              </button>
            </Link>
          </form>
        </div>

        {/* Back to home */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
