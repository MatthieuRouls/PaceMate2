'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DiscoverySession } from '@/lib/actions';

interface MapViewProps {
  sessions: DiscoverySession[];
  onSessionClick: (sessionId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
    __mapSessionClick?: (id: string) => void;
  }
}

export default function MapView({ sessions, onSessionClick, userLocation }: MapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersGroupRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletReadyRef = useRef(false);

  // Register global click handler for popup buttons
  useEffect(() => {
    window.__mapSessionClick = (id: string) => onSessionClick(id);
    return () => { delete window.__mapSessionClick; };
  }, [onSessionClick]);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    // Remove existing markers layer
    if (markersGroupRef.current) {
      mapRef.current.removeLayer(markersGroupRef.current);
    }

    const group = L.featureGroup();
    markersGroupRef.current = group;

    sessions
      .filter((s) => s.latitude != null && s.longitude != null)
      .forEach((session) => {
        const count = session.participants_count ?? 0;
        const fillPct = count / Math.max(session.max_participants, 1);
        const pinColor =
          fillPct >= 0.9 ? '#f87171'
          : fillPct >= 0.7 ? '#fb923c'
          : '#00F57A';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:38px;height:38px;
            background:${pinColor};
            border:3px solid #0B2E26;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 3px 10px rgba(0,0,0,0.6);
            cursor:pointer;
          "><span style="transform:rotate(45deg);font-size:15px;line-height:1">🏃</span></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38],
        });

        const popup = L.popup({ maxWidth: 220, className: 'discovery-popup' }).setContent(`
          <div style="font-family:-apple-system,sans-serif;padding:4px 2px;">
            <div style="font-weight:700;font-size:13px;color:#0F2F27;margin-bottom:6px;line-height:1.3">
              ${session.title}
            </div>
            <div style="font-size:11px;color:#5E7F76;margin-bottom:2px">
              📍 ${session.location_name}
            </div>
            <div style="font-size:11px;color:#5E7F76;margin-bottom:2px">
              📏 ${session.distance_km} km${session.target_pace ? ` · ⚡ ${session.target_pace}/km` : ''}
            </div>
            <div style="font-size:11px;color:#5E7F76;margin-bottom:8px">
              👥 ${count}/${session.max_participants} inscrits
            </div>
            <button
              onclick="window.__mapSessionClick && window.__mapSessionClick('${session.id}')"
              style="width:100%;padding:7px;background:#00F57A;border:none;border-radius:8px;
                     font-weight:700;font-size:12px;cursor:pointer;color:#0B2E26"
            >
              Voir la sortie →
            </button>
          </div>
        `);

        L.marker([session.latitude!, session.longitude!], { icon })
          .bindPopup(popup)
          .addTo(group);
      });

    group.addTo(mapRef.current);

    // Fit to markers if any; otherwise fit to user location
    const sessionsWithCoords = sessions.filter((s) => s.latitude && s.longitude);
    if (sessionsWithCoords.length > 0) {
      try { mapRef.current.fitBounds(group.getBounds().pad(0.25)); } catch { /* noop */ }
    } else if (userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [sessions, userLocation]);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.L || mapRef.current) return;
    const L = window.L;

    // Default center: Paris or user location
    const center: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [48.8566, 2.3522];

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;
    leafletReadyRef.current = true;

    // Dark CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // User position dot
    if (userLocation) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;
          background:#3b82f6;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 0 5px rgba(59,130,246,0.25);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup('<div style="font-size:12px;font-weight:700;color:#0F2F27">Votre position</div>')
        .addTo(map);
    }

    updateMarkers();
  }, [userLocation, updateMarkers]);

  // Load Leaflet from CDN once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      initMap();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletReadyRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers whenever filtered sessions change
  useEffect(() => {
    if (leafletReadyRef.current) updateMarkers();
  }, [updateMarkers]);

  const hasCoords = sessions.some((s) => s.latitude && s.longitude);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10">
      <div ref={containerRef} className="w-full" style={{ height: 520 }} />

      {/* No-coords overlay */}
      {!hasCoords && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-900/80 gap-3">
          <span className="text-4xl">🗺️</span>
          <p className="text-white font-semibold">Aucune sortie géolocalisée</p>
          <p className="text-dark-300 text-sm">Les organisateurs n'ont pas encore précisé leur lieu</p>
        </div>
      )}
    </div>
  );
}
