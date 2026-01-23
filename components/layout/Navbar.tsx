'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');

  // Récupérer le username de l'utilisateur
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.from('profiles').select('username').limit(1).single();
      if (data) {
        setUsername(data.username);
      }
    }
    fetchUser();
  }, []);

  // Générer les initiales pour l'avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const navLinks = [
    { href: '/sessions', label: 'Sessions', icon: '🏃' },
    { href: '/teams', label: 'Équipes', icon: '🏆' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

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

            {/* Avatar utilisateur */}
            <Link href="/profile">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: theme === 'elite'
                    ? 'rgba(167, 139, 250, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  color: 'var(--color-primary)',
                }}
                title="Mon profil"
              >
                {getInitials(username)}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
