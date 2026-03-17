'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, X, Phone, MapPin, Copy, Check, Shield } from 'lucide-react';

interface EmergencyButtonProps {
  /** Trusted contact phone number from profile */
  trustedContactPhone?: string;
  /** Trusted contact name */
  trustedContactName?: string;
}

export default function EmergencyButton({ trustedContactPhone, trustedContactName }: EmergencyButtonProps) {
  const [open, setOpen]             = useState(false);
  const [locating, setLocating]     = useState(false);
  const [location, setLocation]     = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError]     = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError("GPS non disponible"); return; }
    setLocating(true); setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => { setLocError("Impossible d'obtenir la position"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : null;

  const alertMessage = location
    ? `🚨 J'ai besoin d'aide. Ma position : ${mapsUrl}`
    : `🚨 J'ai besoin d'aide. Je cours avec PaceMate.`;

  const handleSendAlert = () => {
    if (!trustedContactPhone) return;
    const smsUrl = `sms:${trustedContactPhone}?body=${encodeURIComponent(alertMessage)}`;
    window.location.href = smsUrl;
  };

  const handleCopyLocation = async () => {
    if (!mapsUrl) return;
    await navigator.clipboard.writeText(alertMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    setOpen(true);
    getLocation();
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold transition-all active:scale-95"
      >
        <AlertTriangle className="w-4 h-4" />
        Urgence
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative w-full max-w-sm bg-dark-800 border border-red-500/25 rounded-3xl overflow-hidden shadow-2xl">
            {/* Red accent top bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-orange-400" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Alerte d'urgence</h2>
                    <p className="text-xs text-white/40">Envoie ta position à ton contact de confiance</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/50 hover:text-white hover:bg-white/12 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Location status */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                location ? 'bg-neon-500/10 border-neon-500/25' :
                locError ? 'bg-red-500/10 border-red-500/20' :
                'bg-white/5 border-white/10'
              }`}>
                <MapPin className={`w-4 h-4 flex-shrink-0 ${location ? 'text-neon-400' : locError ? 'text-red-400' : 'text-white/30'}`} />
                <span className={`text-sm ${location ? 'text-neon-400' : locError ? 'text-red-400' : 'text-white/40'}`}>
                  {locating ? 'Localisation en cours...' :
                   location ? `Position obtenue (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` :
                   locError ?? 'Position non disponible'}
                </span>
                {locError && (
                  <button onClick={getLocation} className="text-xs text-white/50 hover:text-white ml-auto underline">
                    Réessayer
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                {/* Send SMS to trusted contact */}
                {trustedContactPhone ? (
                  <button
                    onClick={handleSendAlert}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-500 hover:bg-red-400 active:scale-[0.98] rounded-xl text-white font-bold text-sm transition-all shadow-[0_4px_20px_rgba(239,68,68,0.35)]"
                  >
                    <Phone className="w-4 h-4" />
                    Alerter {trustedContactName || 'mon contact'}
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 text-sm text-center">
                    Aucun contact de confiance configuré
                  </div>
                )}

                {/* Copy location link */}
                {mapsUrl && (
                  <button
                    onClick={handleCopyLocation}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-neon-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copié !' : 'Copier ma position'}
                  </button>
                )}

                {/* Open Maps */}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/8 rounded-xl text-white/60 text-sm transition-colors hover:text-white hover:bg-white/8"
                  >
                    <MapPin className="w-4 h-4" />
                    Ouvrir sur Google Maps
                  </a>
                )}
              </div>

              <p className="text-center text-[11px] text-white/25">
                Ton identité reste anonyme pour les autres coureurs.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
