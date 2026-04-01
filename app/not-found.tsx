import { Footprints, Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Big 404 */}
        <p className="text-8xl font-black text-white/6 mb-2 select-none leading-none">404</p>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center -mt-4">
          <Footprints className="w-10 h-10 text-dark-300" />
        </div>

        {/* Text */}
        <h1 className="text-2xl font-black text-white mb-2">
          Cette page est introuvable
        </h1>
        <p className="text-dark-300 text-sm mb-8 leading-relaxed">
          La page que tu cherches n'existe pas ou a été déplacée.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-500 hover:bg-neon-400 text-dark-800 font-bold text-sm rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            Trouver un run
          </Link>
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
