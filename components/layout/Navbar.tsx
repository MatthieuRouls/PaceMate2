'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { profile, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  const navLinks = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/teams', label: 'Équipes' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Ne pas afficher la navbar sur les pages auth
  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="navbar fixed top-0 left-0 right-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between" style={{ height: '64px' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--primary)'
            }}>
              PaceMate
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontWeight: '500',
                  color: isActive(link.href) ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: isActive(link.href) ? '2px solid var(--primary)' : 'none',
                  paddingBottom: '4px'
                }}
              >
                {link.label}
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
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  {profile.username.substring(0, 2).toUpperCase()}
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 40
                      }}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '48px',
                        width: '200px',
                        zIndex: 50,
                        padding: '8px'
                      }}
                    >
                      <div style={{
                        padding: '12px',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <p style={{
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          {profile.username}
                        </p>
                        <p className="text-sm text-secondary">
                          {profile.xp_points || 0} XP
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px',
                          color: 'var(--text-primary)',
                          fontWeight: '500'
                        }}
                      >
                        Mon profil
                      </Link>

                      <button
                        onClick={handleSignOut}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px',
                          color: '#DC2626',
                          fontWeight: '500',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : !loading ? (
              <>
                <Link href="/auth/login" className="btn-ghost hidden sm:inline-flex">
                  Connexion
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Inscription
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      {!isAuthPage && (
        <div className="md:hidden border-t" style={{
          borderColor: 'var(--border)',
          backgroundColor: 'white'
        }}>
          <div className="container flex gap-4 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex-1 text-center py-2"
                style={{
                  fontWeight: '500',
                  fontSize: '14px',
                  color: isActive(link.href) ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive(link.href) ? 'var(--primary-light)' : 'transparent',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
