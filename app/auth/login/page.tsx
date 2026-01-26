'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Tentative de connexion avec:', email);
      const result = await signIn(email, password);
      console.log('📊 Résultat de la connexion:', result);

      if (result.success) {
        console.log('✅ Connexion réussie, redirection vers /sessions');
        window.location.href = '/sessions';
      } else {
        console.error('❌ Échec de la connexion:', result.error);
        setError(result.error || 'Erreur lors de la connexion');
      }
    } catch (err) {
      console.error('💥 Erreur inattendue:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Logo / Titre */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--color-primary)' }}
            >
              PaceMate
            </h1>
            <p style={{ color: 'var(--color-secondary)' }}>
              Connectez-vous à votre compte
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border"
                style={{
                  borderRadius: 'var(--radius)',
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
                placeholder="votre@email.com"
                disabled={loading}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border"
                style={{
                  borderRadius: 'var(--radius)',
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
            </div>

            {/* Erreur */}
            {error && (
              <div
                className="p-3 text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderRadius: 'var(--radius)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {error}
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold transition-all"
              style={{
                backgroundColor: loading
                  ? 'var(--color-border)'
                  : 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Lien inscription */}
          <div className="mt-6 text-center">
            <p style={{ color: 'var(--color-secondary)' }}>
              Pas encore de compte ?{' '}
              <Link
                href="/auth/signup"
                className="font-semibold hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
