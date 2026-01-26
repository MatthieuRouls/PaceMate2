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
        <div style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '48px'
        }}>
          {/* Logo */}
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <span style={{
              fontSize: '26px',
              fontWeight: '700',
              color: 'var(--primary)',
              letterSpacing: '-0.5px'
            }}>
              PaceMate
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '32px',
            flex: 1,
            justifyContent: 'center'
          }} className="md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: isActive(link.href) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 0',
                  position: 'relative',
                  transition: 'color 0.2s ease'
                }}
              >
                {link.label}
                {isActive(link.href) && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '3px 3px 0 0'
                  }} />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}>
            {!loading && profile ? (
              <div style={{ position: 'relative' }}>
                {/* Avatar */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-dark)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
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
                        top: '52px',
                        width: '220px',
                        zIndex: 50,
                        padding: '8px'
                      }}
                    >
                      <div style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <p style={{
                          fontWeight: '600',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          marginBottom: '4px'
                        }}>
                          {profile.username}
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)'
                        }}>
                          {profile.xp_points || 0} XP
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          color: 'var(--text-primary)',
                          fontSize: '15px',
                          fontWeight: '500',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Mon profil
                      </Link>

                      <button
                        onClick={handleSignOut}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 16px',
                          color: '#DC2626',
                          fontSize: '15px',
                          fontWeight: '500',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
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
                <Link
                  href="/auth/login"
                  style={{
                    padding: '10px 20px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius)',
                    transition: 'background-color 0.2s ease',
                    display: 'none'
                  }}
                  className="sm:inline-flex"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  style={{
                    padding: '10px 24px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: 'var(--primary)',
                    borderRadius: 'var(--radius)',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }}
                >
                  Inscription
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      {!isAuthPage && (
        <div style={{
          display: 'block',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'white'
        }} className="md:hidden">
          <div className="container" style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 24px'
          }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 16px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: isActive(link.href) ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive(link.href) ? 'var(--primary-light)' : 'transparent',
                  borderRadius: 'var(--radius)',
                  transition: 'all 0.2s ease'
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
