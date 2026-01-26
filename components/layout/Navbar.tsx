'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';

export default function Navbar() {
  const pathname = usePathname();
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
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'var(--gradient-primary)',
              boxShadow: 'var(--shadow-colored)'
            }}>
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <span className="gradient-text hidden sm:inline">PaceMate</span>
          </Link>

          {/* Navigation centrale - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-all ${
                  isActive(link.href)
                    ? 'font-semibold'
                    : 'opacity-75 hover:opacity-100'
                }`}
                style={{
                  borderRadius: 'var(--radius-md)',
                  color: isActive(link.href) ? 'var(--primary-pink)' : 'var(--text-dark)',
                  backgroundColor: isActive(link.href)
                    ? 'rgba(255, 107, 157, 0.1)'
                    : 'transparent',
                }}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Navigation mobile */}
          <div className="flex md:hidden items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 transition-all ${
                  isActive(link.href) ? '' : 'opacity-60'
                }`}
                style={{
                  borderRadius: 'var(--radius-md)',
                  color: isActive(link.href) ? 'var(--primary-pink)' : 'var(--text-dark)',
                  backgroundColor: isActive(link.href)
                    ? 'rgba(255, 107, 157, 0.1)'
                    : 'transparent',
                }}
                title={link.label}
              >
                <span className="text-xl">{link.icon}</span>
              </Link>
            ))}
          </div>

          {/* Actions à droite */}
          <div className="flex items-center gap-3">
            {/* Avatar utilisateur avec dropdown */}
            {!loading && profile ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="avatar-gradient w-11 h-11 flex items-center justify-center text-sm font-bold hover:scale-105 transition-transform"
                  style={{
                    background: 'var(--gradient-primary)',
                    color: 'var(--text-white)',
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
                      className="absolute right-0 mt-2 w-56 py-2 z-50 glass animate-fadeIn"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      {/* Username */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                        <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>
                          {profile.username}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                          {profile.xp_points || 0} XP
                        </p>
                      </div>

                      {/* Mon profil */}
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-3 hover:bg-opacity-50 transition-colors"
                        style={{
                          color: 'var(--text-dark)',
                        }}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span>👤</span>
                        <span>Mon profil</span>
                      </Link>

                      {/* Déconnexion */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 text-left px-4 py-3 hover:bg-opacity-50 transition-colors"
                        style={{
                          color: '#ef4444',
                        }}
                      >
                        <span>🚪</span>
                        <span>Déconnexion</span>
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
                    className="px-4 py-2 font-medium hover:opacity-80 transition-opacity"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--primary-pink)',
                    }}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn-gradient"
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
