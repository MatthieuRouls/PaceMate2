'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import Container from '../ui/Container';

export default function Navbar() {
  const pathname = usePathname();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  const navLinks = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/teams', label: 'Équipes' },
    { href: '/profile', label: 'Profil' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Ne pas afficher la navbar sur les pages auth
  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'navbar-scrolled' : 'bg-white/60 backdrop-blur-lg border-b border-white/20'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-2xl font-bold text-gradient hidden sm:inline-block">
              PaceMate
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative group"
              >
                <span className={`text-base font-semibold transition-colors duration-200 ${
                  isActive(link.href)
                    ? 'text-gray-900'
                    : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                  {link.label}
                </span>
                {isActive(link.href) && (
                  <span className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full" />
                )}
                {!isActive(link.href) && (
                  <span className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!loading && profile ? (
              <div className="relative">
                {/* Avatar */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/80 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden sm:block font-semibold text-gray-900">
                    {profile.username}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-14 w-64 glass-card p-2 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-200/50">
                        <p className="font-semibold text-gray-900">{profile.username}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {profile.xp_points || 0} XP • Niveau {Math.floor((profile.xp_points || 0) / 100) + 1}
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100/80 transition-colors duration-200 mt-1"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-900 font-medium">Mon profil</span>
                      </Link>

                      <Link
                        href="/sessions/create"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100/80 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-gray-900 font-medium">Créer une sortie</span>
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors duration-200 mt-1"
                      >
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-red-600 font-medium">Déconnexion</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : !loading ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex px-5 py-2.5 text-gray-700 font-semibold rounded-xl hover:bg-gray-100/80 transition-colors duration-200"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Inscription
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      {/* Navigation mobile */}
      {!isAuthPage && (
        <div className="md:hidden border-t border-gray-200/50 bg-white/80 backdrop-blur-lg">
          <Container>
            <div className="flex gap-1 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex-1 text-center py-2.5 px-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100/80'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Container>
        </div>
      )}
    </nav>
  );
}
