'use client';

import Link from 'next/link';
import { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  // Format date et heure
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${dayName} ${day} ${month}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}h${minutes}`;
  };

  // Calculer les places restantes
  const spotsLeft = session.max_participants - (session.participants_count || 0);
  const isFull = spotsLeft === 0;
  const almostFull = !isFull && spotsLeft <= 2;

  return (
    <Link href={`/sessions/${session.id}`} className="card" style={{ display: 'block', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}>
      {/* Header: Niveau + Date/Heure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          backgroundColor: '#0066cc',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          Niveau {session.level_required}
        </span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {formatDate(session.start_time)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
            {formatTime(session.start_time)}
          </div>
        </div>
      </div>

      {/* Titre et description */}
      <h3 style={{ marginBottom: '0.5rem' }}>{session.title}</h3>
      {session.description && (
        <p style={{
          fontSize: '0.875rem',
          color: '#6c757d',
          marginBottom: '1rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {session.description}
        </p>
      )}

      {/* Infos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem' }}>
          📍 {session.location_name}
        </div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
          🏃 {session.distance_km} km
        </div>
        {session.target_pace && (
          <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            ⚡ {session.target_pace} min/km
          </div>
        )}
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isFull ? '#dc3545' : almostFull ? '#fd7e14' : '#212529' }}>
          👥 {session.participants_count || 0}/{session.max_participants}
        </div>
      </div>

      {/* Warning si presque complet ou complet */}
      {almostFull && (
        <div style={{
          padding: '0.5rem',
          borderRadius: '0.25rem',
          backgroundColor: '#fff3cd',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#856404',
          marginBottom: '1rem'
        }}>
          ⚠️ Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !
        </div>
      )}
      {isFull && (
        <div style={{
          padding: '0.5rem',
          borderRadius: '0.25rem',
          backgroundColor: '#f8d7da',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#721c24',
          marginBottom: '1rem'
        }}>
          ❌ Complet
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid #dee2e6', margin: '1rem 0' }} />

      {/* Footer: Créateur */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {session.creator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#0066cc',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {session.creator.username.substring(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
              @{session.creator.username}
            </span>
          </div>
        )}
        <span style={{ fontSize: '0.875rem', color: '#0066cc', fontWeight: 600 }}>
          {isFull ? 'Voir →' : 'Rejoindre →'}
        </span>
      </div>
    </Link>
  );
}
