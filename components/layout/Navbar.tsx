'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import AuthDrawer from '../ui/AuthDrawer';

export default function Navbar() {
  const pathname = usePathname();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-white font-bold shadow-lg">
            P
          </div>
          <span className="text-2xl font-bold text-secondary-600">
            PaceMate
          </span>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-10">
          <Link
            href="/sessions"
            className={`text-sm font-medium transition-colors ${
              pathname?.startsWith('/sessions')
                ? 'text-primary-500'
                : 'text-secondary-600/80 hover:text-primary-500'
            }`}
          >
            Sessions
          </Link>
          <Link
            href="/teams"
            className={`text-sm font-medium transition-colors ${
              pathname?.startsWith('/teams')
                ? 'text-primary-500'
                : 'text-secondary-600/80 hover:text-primary-500'
            }`}
          >
            Équipes
          </Link>
        </div>

        {/* User actions */}
        <div className="flex items-center gap-4">
          {!loading && profile ? (
            <div className="relative flex items-center gap-4">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-400 p-0.5">
                  <div className="w-full h-full rounded-lg bg-secondary-600 flex items-center justify-center text-white text-sm font-semibold">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <span className="hidden md:block font-medium text-secondary-600">
                  {profile.username}
                </span>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-secondary-600 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mon profil
                    </Link>
                    <Link
                      href="/sessions/create"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-secondary-600 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Créer une sortie
                    </Link>
                    <div className="my-2 border-t border-gray-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </>
              )}

              <Link
                href="/sessions/create"
                className="ml-2 px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-all shadow-md hover:scale-105"
              >
                Créer une session
              </Link>
            </div>
          ) : !loading ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthDrawerOpen(true);
                }}
                className="px-5 py-2 font-medium text-secondary-600 hover:text-primary-500 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setAuthDrawerOpen(true);
                }}
                className="px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-all shadow-md hover:scale-105"
              >
                Inscription
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Auth Drawer */}
      <AuthDrawer
        isOpen={authDrawerOpen}
        onClose={() => setAuthDrawerOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />
    </nav>
  );
}
