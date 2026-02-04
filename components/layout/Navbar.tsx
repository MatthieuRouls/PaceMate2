'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import AuthDrawer from '../ui/AuthDrawer';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [scrolled, setScrolled] = useState(false);

  const isHomepage = pathname === '/';

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    // Forcer un rechargement complet de la page pour réinitialiser tout l'état
    window.location.href = '/';
  };

  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  // Detect scroll on homepage
  useEffect(() => {
    if (!isHomepage) {
      setScrolled(true);
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomepage]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 transition-all duration-300 ${
      scrolled
        ? 'bg-secondary-700/95 backdrop-blur-xl border-b border-secondary-600 shadow-lg'
        : 'bg-transparent'
    }`}>
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src={scrolled ? "/PaceMateLogo_vert.svg" : "/PaceMateLogo_vert.svg"}
            alt="PaceMate Logo"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <span className="text-2xl font-bold text-white">
            PaceMate
          </span>
        </Link>

        {/* Navigation - User connected */}
        {!loading && profile ? (
          <>
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/sessions"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/sessions')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Sessions
              </Link>
              <Link
                href="/mes-sorties"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/mes-sorties')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Mes sorties
              </Link>
              <Link
                href="/sessions/create"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/sessions/create')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Creer une sortie
              </Link>
              <Link
                href="/teams"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/teams')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Equipes
              </Link>
            </div>

            {/* User actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
                <Bell className="w-5 h-5 text-white" />
                {/* Badge for unread notifications */}
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full"></span>
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-400 p-0.5">
                    <div className="w-full h-full rounded-lg bg-secondary-600 flex items-center justify-center text-white text-sm font-semibold">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <span className="hidden md:block font-medium text-white">
                    {profile.username}
                  </span>
                  <svg
                    className={`hidden md:block w-4 h-4 transition-all text-white ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
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
                        href="/profile/stats"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-secondary-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Mes statistiques
                      </Link>
                      <Link
                        href="/profile/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-secondary-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Paramètres
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
              </div>
            </div>
          </>
        ) : !loading ? (
          /* Navigation - Not connected */
          <>
            <div className="hidden md:flex items-center gap-10">
              <Link
                href="/sessions"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/sessions')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Sessions
              </Link>
              <Link
                href="/teams"
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/teams')
                    ? 'text-primary-400'
                    : 'text-white/80 hover:text-primary-400'
                }`}
              >
                Equipes
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthDrawerOpen(true);
                }}
                className="px-5 py-2 font-medium text-white hover:text-primary-400 transition-colors"
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
          </>
        ) : null}
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
