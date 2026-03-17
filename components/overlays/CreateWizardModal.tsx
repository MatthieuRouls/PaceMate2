'use client';

import { useState, useMemo, FormEvent, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { createSession, CreateSessionData } from '@/lib/actions';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Search, Crosshair,
  Calendar, Zap, Navigation, ClipboardCheck, ArrowRight,
  X, Sun, Sunrise, Clock, Users, Gauge, Route, Pencil,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  title: string;
  description: string;
  start_time: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  distance_km: number;
  pace_seconds: number; // 240–420, step 5
  max_participants: number;
  session_type: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
  level_required: number;
  walk_breaks_ok: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_META = [
  { num: 1, label: 'Quand',    icon: Calendar },
  { num: 2, label: 'Lieu',     icon: Navigation },
  { num: 3, label: 'Réglages', icon: Zap },
  { num: 4, label: 'Détails',  icon: ClipboardCheck },
];

const MAX_RUNNERS_OPTIONS = [2, 4, 6, 8, 10, 12];

const SESSION_TYPES = [
  { value: 'casual'    as const, label: 'Détente',    icon: '🚶', description: 'Rythme tranquille' },
  { value: 'recovery'  as const, label: 'Récup',      icon: '🧘', description: 'Allure modérée' },
  { value: 'tempo'     as const, label: 'Tempo',      icon: '🏃', description: 'Rythme challengeant' },
  { value: 'long_run'  as const, label: 'Longue',     icon: '🗺️', description: 'Endurance fondamentale' },
  { value: 'intervals' as const, label: 'Fractionné', icon: '⚡', description: 'Séance intensive' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paceToString(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function generateTitle(form: Pick<FormState, 'start_time' | 'distance_km'>): string {
  const dist = form.distance_km;
  if (!form.start_time) return `Course – ${dist} km`;
  const d = new Date(form.start_time);
  const h = d.getHours();
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) {
    return dist >= 18 ? `Sortie longue du week-end – ${dist} km` : `Sortie du week-end – ${dist} km`;
  }
  if (h >= 5 && h < 10) return `Matinale – ${dist} km`;
  if (h >= 10 && h < 14) return `Run de la pause – ${dist} km`;
  if (h >= 14 && h < 19) return `Afterwork Run – ${dist} km`;
  return `Sortie du soir – ${dist} km`;
}

function formatDatePreview(iso: string): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getQuickPicks() {
  return [
    {
      label: 'Ce soir',
      icon: <Sun className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Demain matin',
      icon: <Sunrise className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(7, 30, 0, 0);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Samedi',
      icon: <Calendar className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        const days = (6 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + days);
        d.setHours(9, 0, 0, 0);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Dimanche',
      icon: <Clock className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        const days = (7 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + days);
        d.setHours(9, 30, 0, 0);
        return toLocalDatetime(d);
      },
    },
  ];
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function PreviewRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white/60">
      <span className="text-white/30 flex-shrink-0">{icon}</span>
      <span className="truncate text-sm">{label}</span>
    </div>
  );
}

function LivePreview({ form, autoTitle }: { form: FormState; autoTitle: string }) {
  const title = form.title || autoTitle;
  return (
    <div className="bg-gradient-to-br from-pink-600/15 to-purple-700/15 border border-white/8 rounded-2xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Aperçu en direct</p>
        <h3 className="text-sm font-bold text-white leading-snug">
          {title || 'Ta prochaine sortie'}
        </h3>
      </div>
      <div className="space-y-2.5">
        <PreviewRow icon={<Route className="w-3.5 h-3.5" />}    label={`${form.distance_km} km`} />
        <PreviewRow icon={<Gauge className="w-3.5 h-3.5" />}    label={`${paceToString(form.pace_seconds)} /km`} />
        <PreviewRow icon={<Calendar className="w-3.5 h-3.5" />} label={formatDatePreview(form.start_time)} />
        <PreviewRow icon={<MapPin className="w-3.5 h-3.5" />}   label={form.location_name || '–'} />
        <PreviewRow icon={<Users className="w-3.5 h-3.5" />}    label={`Max ${form.max_participants} coureurs`} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateWizardModal({ isOpen, onClose, onSuccess }: CreateWizardModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  useEffect(() => { setMounted(true); }, []);

  const defaultStartTime = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 30, 0, 0);
    return toLocalDatetime(d);
  }, []);

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    start_time: defaultStartTime,
    location_name: '',
    latitude: undefined,
    longitude: undefined,
    distance_km: 6,
    pace_seconds: 330, // 5:30/km
    max_participants: 6,
    session_type: 'casual',
    level_required: 3,
    walk_breaks_ok: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [geoSearchResults, setGeoSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [titleEdited, setTitleEdited] = useState(false);

  const quickPicks = useMemo(() => getQuickPicks(), []);
  const autoTitle = useMemo(
    () => generateTitle({ start_time: form.start_time, distance_km: form.distance_km }),
    [form.start_time, form.distance_km],
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
      setTitleEdited(false);
      setGeoSearchResults([]);
      setGeoSearchQuery('');
    }
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeoSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } },
      );
      setGeoSearchResults(await res.json());
    } catch {
      setGeoSearchResults([]);
    } finally {
      setGeoSearching(false);
    }
  }, []);

  const useCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'fr' } },
          );
          const data = await res.json();
          const short = [
            data.address?.road,
            data.address?.city || data.address?.town || data.address?.village,
          ].filter(Boolean).join(', ');
          setForm(prev => ({
            ...prev,
            location_name: short || data.display_name.split(',').slice(0, 2).join(','),
          }));
        } catch { /* ignore */ }
        setGeoLocating(false);
      },
      () => setGeoLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!form.start_time;
      case 2: return form.location_name.trim().length > 0;
      case 3: return form.distance_km > 0 && form.pace_seconds >= 240;
      default: return true;
    }
  };

  const nextStep = () => currentStep < totalSteps && setCurrentStep(s => s + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(s => s - 1);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data: CreateSessionData = {
      title: (form.title.trim() || autoTitle),
      description: form.description,
      start_time: form.start_time,
      location_name: form.location_name,
      latitude: form.latitude,
      longitude: form.longitude,
      distance_km: form.distance_km,
      session_type: form.session_type,
      level_required: form.level_required,
      target_pace: paceToString(form.pace_seconds),
      walk_breaks_ok: form.walk_breaks_ok,
      max_participants: form.max_participants,
    };
    try {
      const result = await createSession(data);
      if (result.success) {
        onSuccess?.();
        onClose();
        router.push('/sessions');
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          className="bg-dark-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto animate-modalIn flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white">Créer une sortie</h2>
              <p className="text-sm text-white/40">Étape {currentStep}/{totalSteps}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-6 py-3 bg-dark-700/30 flex-shrink-0">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              {STEP_META.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;
                return (
                  <div key={step.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                          isCompleted
                            ? 'bg-neon-500 text-dark-800'
                            : isActive
                            ? 'bg-pink-500 text-white ring-4 ring-pink-500/20'
                            : 'bg-dark-600 text-white/30'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-pink-400' : 'text-white/30'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEP_META.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 rounded ${currentStep > step.num ? 'bg-neon-500' : 'bg-dark-600'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body: step content + live preview panel */}
          <div className="flex flex-1 min-h-0">

            {/* Left: form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-w-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                {/* ── Step 1: When ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        Date et heure
                      </label>
                      <input
                        type="datetime-local"
                        value={form.start_time}
                        onChange={e => set('start_time', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-2 font-medium">Raccourcis</p>
                      <div className="flex flex-wrap gap-2">
                        {quickPicks.map(pick => (
                          <button
                            key={pick.label}
                            type="button"
                            onClick={() => set('start_time', pick.getDate())}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-600 text-white/60 text-sm font-medium hover:bg-dark-500 hover:text-white transition-colors"
                          >
                            {pick.icon}
                            {pick.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Location ── */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        Point de rendez-vous
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input
                            type="text"
                            value={geoSearchQuery}
                            onChange={e => setGeoSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchLocation(geoSearchQuery))}
                            placeholder="Rechercher une adresse..."
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/30 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => searchLocation(geoSearchQuery)}
                          disabled={geoSearching}
                          className="px-4 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
                        >
                          {geoSearching ? '…' : 'Chercher'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={useCurrentPosition}
                      disabled={geoLocating}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-500/10 text-neon-400 border border-neon-500/20 text-sm font-medium hover:bg-neon-500/20 transition-colors disabled:opacity-50"
                    >
                      <Crosshair className="w-4 h-4" />
                      {geoLocating ? 'Localisation...' : 'Utiliser ma position'}
                    </button>

                    {geoSearchResults.length > 0 && (
                      <div className="border border-white/10 rounded-xl overflow-hidden">
                        {geoSearchResults.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                location_name: r.display_name.split(',').slice(0, 2).join(', '),
                                latitude: parseFloat(r.lat),
                                longitude: parseFloat(r.lon),
                              }));
                              setGeoSearchResults([]);
                              setGeoSearchQuery('');
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-dark-600 border-b last:border-b-0 border-white/8 flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4 text-white/30 flex-shrink-0" />
                            {r.display_name}
                          </button>
                        ))}
                      </div>
                    )}

                    {form.location_name && (
                      <div className="p-3 rounded-xl bg-neon-500/10 border border-neon-500/20 flex items-center gap-2 text-neon-400 text-sm">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">{form.location_name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Run Settings ── */}
                {currentStep === 3 && (
                  <div className="space-y-7">

                    {/* Distance */}
                    <div>
                      <div className="flex justify-between items-baseline mb-3">
                        <label className="text-sm font-semibold text-white/80">Distance</label>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {form.distance_km} <span className="text-sm text-white/40">km</span>
                        </span>
                      </div>
                      <input
                        type="range" min="1" max="42" step="1"
                        value={form.distance_km}
                        onChange={e => set('distance_km', parseInt(e.target.value))}
                        className="w-full accent-pink-500"
                      />
                      <div className="flex justify-between text-xs text-white/30 mt-1">
                        <span>1 km</span><span>21 km</span><span>42 km</span>
                      </div>
                    </div>

                    {/* Pace */}
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <label className="text-sm font-semibold text-white/80">Allure</label>
                          <p className="text-xs text-white/40 mt-0.5">
                            Aide à matcher des coureurs de même niveau
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {paceToString(form.pace_seconds)} <span className="text-sm text-white/40">/km</span>
                        </span>
                      </div>
                      <input
                        type="range" min="240" max="420" step="5"
                        value={form.pace_seconds}
                        onChange={e => set('pace_seconds', parseInt(e.target.value))}
                        className="w-full accent-pink-500"
                      />
                      <div className="flex justify-between text-xs text-white/30 mt-1">
                        <span>4:00/km</span><span>5:30/km</span><span>7:00/km</span>
                      </div>
                    </div>

                    {/* Max runners */}
                    <div>
                      <div className="mb-3">
                        <label className="text-sm font-semibold text-white/80">Participants max</label>
                        <p className="text-xs text-white/40 mt-0.5">
                          Limite la taille du groupe pour plus de cohésion et de sécurité
                        </p>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {MAX_RUNNERS_OPTIONS.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => set('max_participants', n)}
                            className={`py-3 rounded-xl text-sm font-bold transition-all ${
                              form.max_participants === n
                                ? 'bg-pink-500 text-white ring-2 ring-pink-500 ring-offset-2 ring-offset-dark-800'
                                : 'bg-dark-600 text-white/50 hover:bg-dark-500 hover:text-white'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* ── Step 4: Details & Recap ── */}
                {currentStep === 4 && (
                  <div className="space-y-5">

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        Nom de la sortie{' '}
                        <span className="text-white/30 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        value={titleEdited ? form.title : (form.title || autoTitle)}
                        onChange={e => { setTitleEdited(true); set('title', e.target.value); }}
                        placeholder={autoTitle}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/30 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                      {!titleEdited && (
                        <p className="text-xs text-white/35 mt-1.5 flex items-center gap-1">
                          <Pencil className="w-3 h-3" />
                          Généré automatiquement — modifie si tu veux
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        Description{' '}
                        <span className="text-white/30 font-normal">(optionnel)</span>
                      </label>
                      <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Ajoute des détails sur ta sortie..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/30 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Session type */}
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-3">
                        Type de sortie
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SESSION_TYPES.map(t => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => set('session_type', t.value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              form.session_type === t.value
                                ? 'bg-pink-500 text-white'
                                : 'bg-dark-600 text-white/50 hover:bg-dark-500 hover:text-white'
                            }`}
                          >
                            <span>{t.icon}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between flex-shrink-0">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/50 font-medium hover:bg-white/8 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Retour
                  </button>
                ) : <div />}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuer
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Création...' : 'Publier la sortie'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Right: Live Preview (desktop only) */}
            <div className="hidden lg:flex w-64 flex-col flex-shrink-0 border-l border-white/8 p-5">
              <LivePreview form={form} autoTitle={autoTitle} />
            </div>

          </div>

          {/* Mobile: sticky preview strip */}
          <div className="lg:hidden px-5 py-3 bg-dark-700/50 border-t border-white/8 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-white/50 overflow-x-auto">
              <span className="font-semibold text-white/80 flex-shrink-0 truncate max-w-[140px]">
                {form.title || autoTitle || 'Course'}
              </span>
              <span className="flex-shrink-0 text-white/20">·</span>
              <span className="flex-shrink-0">{form.distance_km} km</span>
              <span className="flex-shrink-0 text-white/20">·</span>
              <span className="flex-shrink-0">{paceToString(form.pace_seconds)}/km</span>
              {form.location_name && (
                <>
                  <span className="flex-shrink-0 text-white/20">·</span>
                  <span className="flex-shrink-0 truncate max-w-[120px]">{form.location_name}</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);  }
        }
        .animate-modalIn { animation: modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </>
  );

  const container = document.getElementById('overlay-root') || document.body;
  return createPortal(content, container);
}
