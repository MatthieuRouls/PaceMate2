'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Générer les initiales pour l'avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  const navLinks = [
    { href: '/sessions', label: 'Sessions', icon: '🏃' },
    { href: '/teams', label: 'Équipes', icon: '🏆' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Si on est sur une page d'auth, ne pas afficher la navbar complète
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return null;
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 shadow-md"
      style={{
        backgroundColor: theme === 'elite' ? '#1a1a2e' : '#ffffff',
        borderBottom: `1px solid ${theme === 'elite' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            <span style={{ color: 'var(--color-primary)' }}>⚡</span>
            <span>PaceMate</span>
          </Link>

          {/* Navigation centrale - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                  isActive(link.href)
                    ? 'font-bold'
                    : 'opacity-75 hover:opacity-100'
                }`}
                style={{
                  borderRadius: 'var(--radius)',
                  color: isActive(link.href) ? 'var(--color-primary)' : 'inherit',
                  backgroundColor: isActive(link.href)
                    ? theme === 'elite'
                      ? 'rgba(167, 139, 250, 0.1)'
                      : 'rgba(34, 197, 94, 0.1)'
                    : 'transparent',
                }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Navigation mobile */}
          <div className="flex md:hidden items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg transition-all ${
                  isActive(link.href) ? '' : 'opacity-60'
                }`}
                style={{
                  borderRadius: 'var(--radius)',
                  color: isActive(link.href) ? 'var(--color-primary)' : 'inherit',
                  backgroundColor: isActive(link.href)
                    ? theme === 'elite'
                      ? 'rgba(167, 139, 250, 0.1)'
                      : 'rgba(34, 197, 94, 0.1)'
                    : 'transparent',
                }}
                title={link.label}
              >
                {link.icon}
              </Link>
            ))}
          </div>

          {/* Actions à droite */}
          <div className="flex items-center gap-4">
            {/* Toggle thème */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
              style={{
                borderRadius: 'var(--radius)',
                backgroundColor: theme === 'elite'
                  ? 'rgba(167, 139, 250, 0.1)'
                  : 'rgba(34, 197, 94, 0.1)',
              }}
              title={`Passer en mode ${theme === 'discovery' ? 'Elite' : 'Discovery'}`}
            >
              <span className="text-xl">{theme === 'discovery' ? '☀️' : '🌙'}</span>
            </button>

            {/* Avatar utilisateur avec dropdown */}
            {!loading && profile ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: theme === 'elite'
                      ? 'rgba(167, 139, 250, 0.2)'
                      : 'rgba(34, 197, 94, 0.2)',
                    color: 'var(--color-primary)',
                  }}
                  title={profile.username}
                >
                  {getInitials(profile.username)}
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <>
                    {/* Overlay pour fermer le dropdown */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />

                    {/* Menu */}
                    <div
                      className="absolute right-0 mt-2 w-48 py-2 shadow-lg z-50"
                      style={{
                        backgroundColor: theme === 'elite' ? '#1a1a2e' : '#ffffff',
                        borderRadius: 'var(--radius)',
                        border: `1px solid ${theme === 'elite' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                      }}
                    >
                      {/* Username */}
                      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {profile.username}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-secondary)' }}>
                          {profile.xp_points || 0} XP
                        </p>
                      </div>

                      {/* Mon profil */}
                      <Link
                        href="/profile"
                        className="block px-4 py-2 hover:bg-opacity-80 transition-colors"
                        style={{
                          color: 'var(--color-text)',
                        }}
                        onClick={() => setDropdownOpen(false)}
                      >
                        👤 Mon profil
                      </Link>

                      {/* Déconnexion */}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 hover:bg-opacity-80 transition-colors"
                        style={{
                          color: '#ef4444',
                        }}
                      >
                        🚪 Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Boutons de connexion/inscription si pas connecté
              !loading && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity"
                    style={{
                      borderRadius: 'var(--radius)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    style={{
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                    }}
                  >
                    Inscription
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
