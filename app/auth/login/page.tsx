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
              Connectez-vous à votre compte
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            {success && (
              <div className="alert alert-success">
                ✓ {success}
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                ✗ {error}
                {needsEmailConfirmation && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resending}
                      style={{
                        textDecoration: 'underline',
                        color: '#DC2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: '600'
                      }}
                    >
                      {resending ? 'Envoi...' : 'Renvoyer l\'email de confirmation'}
                    </button>
                  </div>
                )}
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
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Link */}
          <div className="mt-6 text-center">
            <p className="text-secondary">
              Pas encore de compte ?{' '}
              <Link href="/auth/signup" style={{ fontWeight: '600' }}>
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
