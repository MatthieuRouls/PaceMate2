'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { resendConfirmationEmail } from '@/lib/supabase-auth';

export default function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNeedsEmailConfirmation(false);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = '/sessions';
      } else {
        const errorMsg = result.error || 'Erreur lors de la connexion';
        setError(errorMsg);

        if (errorMsg.includes('confirmer votre email') || errorMsg.includes('Email not confirmed')) {
          setNeedsEmailConfirmation(true);
        }
      }
    } catch (err) {
      setError('Une erreur est survenue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const result = await resendConfirmationEmail(email);

      if (result.success) {
        setSuccess('Email de confirmation renvoyé ! Vérifiez votre boîte de réception.');
        setNeedsEmailConfirmation(false);
      } else {
        setError(result.error || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (err) {
      setError('Une erreur est survenue');
      console.error(err);
    } finally {
      setResending(false);
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
            Connectez-vous à votre compte
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
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f5132' }}>{success}</p>
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
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#842029', marginBottom: needsEmailConfirmation ? '0.5rem' : 0 }}>
                  {error}
                </p>
                {needsEmailConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resending}
                    className="btn-secondary"
                    style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}
                  >
                    {resending ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
                  </button>
                )}
              </div>
            )}

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
            <div style={{ marginBottom: '1.5rem' }}>
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

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
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
                Pas encore de compte ?
              </span>
            </div>

            {/* Sign Up Link */}
            <Link href="/auth/signup">
              <button type="button" className="btn-secondary" style={{ width: '100%' }}>
                Créer un compte
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
