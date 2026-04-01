'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[GlobalError]', error.digest ?? error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white mb-2">
          Quelque chose s'est mal passé
        </h1>
        <p className="text-dark-300 text-sm mb-8 leading-relaxed">
          Une erreur inattendue s'est produite. L'équipe a été notifiée.
          {error.digest && (
            <span className="block mt-1 text-dark-500 text-xs font-mono">
              Réf : {error.digest}
            </span>
          )}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-500 hover:bg-neon-400 text-dark-800 font-bold text-sm rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
