'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import AuthDrawer from '../ui/AuthDrawer';
import DarkModeToggle from '../ui/DarkModeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [scrolled, setScrolled] = useState(false);

  const isHomepage = pathname === '/';

  // Force light mode when not logged in (guest users)
  useEffect(() => {
    if (!loading && !profile) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pacemate-theme', 'light');
    }
  }, [loading, profile]);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
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

  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/sessions/create') {
      return pathname === '/sessions/create';
    }
    if (path === '/sessions') {
      return pathname?.startsWith('/sessions') && pathname !== '/sessions/create';
    }
    return pathname?.startsWith(path);
  };

  // Navigation items for connected users
  const connectedNavItems = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/mes-sorties', label: 'Mes sorties' },
    { href: '/sessions/create', label: 'Creer' },
    { href: '/teams', label: 'Equipes' },
    { href: '/friends', label: 'Amis' },
  ];

  // Navigation items for guests
  const guestNavItems = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/teams', label: 'Equipes' },
  ];

  const navItems = profile ? connectedNavItems : guestNavItems;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 transition-all duration-300">
      <div className="flex items-center justify-between w-full">
        {/* Logo - Far left */}
        <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src="/PaceMateLogo_vert.svg"
            alt="PaceMate Logo"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <span className={`text-2xl font-bold transition-colors ${scrolled ? 'text-dark-800' : 'text-white'}`}>
            PaceMate
          </span>
        </Link>

        {/* Center Navigation - Inside glass pill */}
        <div className={`hidden md:flex items-center transition-all duration-300 ${
          scrolled
            ? 'glass-pill px-2 py-1 shadow-lg'
            : 'bg-white/10 backdrop-blur-sm rounded-full px-2 py-1'
        }`}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                isActive(item.href)
                  ? scrolled
                    ? 'neu-tab-active'
                    : 'bg-white/20 text-white'
                  : scrolled
                  ? 'text-dark-600 hover:text-dark-800'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle - only for connected users */}
          {profile && <DarkModeToggle />}

          {profile ? (
            <>
              {/* Notifications */}
              <button className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                scrolled ? 'hover:bg-silver-200 dark:hover:bg-dark-600' : 'hover:bg-white/20'
              }`}>
                <Bell className={`w-5 h-5 transition-colors ${scrolled ? 'text-dark-800' : 'text-white'}`} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-full bg-neon-400 flex items-center justify-center text-white text-sm font-semibold">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className={`hidden md:block font-medium transition-colors ${scrolled ? 'text-dark-800' : 'text-white'}`}>
                    {profile.username}
                  </span>
                  <svg
                    className={`hidden md:block w-4 h-4 transition-all ${scrolled ? 'text-dark-800' : 'text-white'} ${dropdownOpen ? 'rotate-180' : ''}`}
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
                    <div className="absolute right-0 top-14 w-56 bg-white dark:bg-dark-700 rounded-xl shadow-xl border border-silver-400 dark:border-dark-600 py-2 z-50">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-dark-800 dark:text-silver-200 hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-neon-700 dark:text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mon profil
                      </Link>
                      <Link
                        href="/profile/stats"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-dark-800 dark:text-silver-200 hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-neon-700 dark:text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Mes statistiques
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-dark-800 dark:text-silver-200 hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-neon-700 dark:text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Parametres
                      </Link>
                      <div className="my-2 border-t border-silver-300 dark:border-dark-500" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30 w-full transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Deconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : !loading ? (
            <>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthDrawerOpen(true);
                }}
                className={`px-5 py-2 font-medium transition-colors ${
                  scrolled ? 'text-dark-800 hover:text-neon-700' : 'text-white hover:text-silver-400'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setAuthDrawerOpen(true);
                }}
                className="neu-btn px-5 py-2 text-dark-800 text-sm font-semibold"
              >
                Inscription
              </button>
            </>
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
