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

  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderBottom: '1px solid #dee2e6',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      zIndex: 1000,
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px'
    }}>
      {/* Logo */}
      <Link href="/" style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#0066cc'
      }}>
        PaceMate
      </Link>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link href="/sessions" style={{
          fontWeight: pathname?.startsWith('/sessions') ? 600 : 400,
          color: pathname?.startsWith('/sessions') ? '#0066cc' : '#495057'
        }}>
          Sessions
        </Link>
        <Link href="/teams" style={{
          fontWeight: pathname?.startsWith('/teams') ? 600 : 400,
          color: pathname?.startsWith('/teams') ? '#0066cc' : '#495057'
        }}>
          Équipes
        </Link>

        {/* User menu */}
        {!loading && profile ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0066cc',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                {profile.username.substring(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {profile.username}
              </span>
            </button>

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
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    width: '200px',
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    padding: '0.5rem',
                    zIndex: 50
                  }}
                >
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'block',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      color: '#495057'
                    }}
                  >
                    Mon profil
                  </Link>
                  <Link
                    href="/sessions/create"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'block',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      color: '#495057'
                    }}
                  >
                    Créer une sortie
                  </Link>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545'
                    }}
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        ) : !loading ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/auth/login" className="btn-secondary">
              Connexion
            </Link>
            <Link href="/auth/signup" className="btn-primary">
              Inscription
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
