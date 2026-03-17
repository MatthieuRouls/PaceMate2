'use client';

import {
  useState, useMemo, FormEvent, useCallback,
  useEffect, useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { createSession, CreateSessionData } from '@/lib/actions';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Search, Crosshair,
  Calendar, Zap, Navigation, ClipboardCheck, ArrowRight,
  X, Sun, Sunrise, Clock, Users, Gauge, Route, Pencil, Loader2,
  Shield,
} from 'lucide-react';
import { encodeSafetyTags } from '@/lib/trust';

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
  // Safety options (encoded into description on submit)
  women_only: boolean;
  verified_only: boolean;
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
  { value: 'casual'    as const, label: 'Détente',    icon: '🚶' },
  { value: 'recovery'  as const, label: 'Récup',      icon: '🧘' },
  { value: 'tempo'     as const, label: 'Tempo',      icon: '🏃' },
  { value: 'long_run'  as const, label: 'Longue',     icon: '🗺️' },
  { value: 'intervals' as const, label: 'Fractionné', icon: '⚡' },
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
  const day = d.getDay();
  if (day === 0 || day === 6) {
    return dist >= 18 ? `Sortie longue du week-end – ${dist} km` : `Sortie du week-end – ${dist} km`;
  }
  if (h >= 5  && h < 10) return `Matinale – ${dist} km`;
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

/** Soft haptic tap for mobile */
function haptic(ms = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ms);
  }
}

function getQuickPicks() {
  return [
    {
      label: 'Ce soir',
      icon: <Sun className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date(); d.setHours(19, 0, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Demain matin',
      icon: <Sunrise className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 30, 0, 0);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Samedi',
      icon: <Calendar className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
        d.setHours(9, 0, 0, 0);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Dimanche',
      icon: <Clock className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
        d.setHours(9, 30, 0, 0);
        return toLocalDatetime(d);
      },
    },
  ];
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [key, setKey] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      setDisplay(value);
      setKey(k => k + 1);
      prev.current = value;
    }
  }, [value]);

  return (
    <span key={key} className={`animate-titleFadeUp inline-block ${className ?? ''}`}>
      {display}
    </span>
  );
}

function LivePreview({ form, autoTitle, pulse }: { form: FormState; autoTitle: string; pulse: number }) {
  const title = form.title || autoTitle;
  return (
    <div
      key={pulse}
      className="animate-previewPulse bg-gradient-to-br from-pink-600/15 to-purple-700/15 border border-white/8 rounded-2xl p-5 space-y-4"
    >
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Aperçu en direct</p>
        <h3 className="text-sm font-bold text-white leading-snug">
          <AnimatedValue value={title || 'Ta prochaine sortie'} />
        </h3>
      </div>
      <div className="space-y-2.5">
        {[
          { icon: <Route className="w-3.5 h-3.5" />,    val: `${form.distance_km} km` },
          { icon: <Gauge className="w-3.5 h-3.5" />,    val: `${paceToString(form.pace_seconds)} /km` },
          { icon: <Calendar className="w-3.5 h-3.5" />, val: formatDatePreview(form.start_time) },
          { icon: <MapPin className="w-3.5 h-3.5" />,   val: form.location_name || '–' },
          { icon: <Users className="w-3.5 h-3.5" />,    val: `Max ${form.max_participants} coureurs` },
        ].map(({ icon, val }) => (
          <div key={val} className="flex items-center gap-2 text-white/60">
            <span className="text-white/30 flex-shrink-0">{icon}</span>
            <AnimatedValue value={val} className="truncate text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Slider ──────────────────────────────────────────────────────────

interface SliderProps {
  min: number; max: number; step: number;
  value: number;
  onChange: (v: number) => void;
  pctFn: (v: number) => number;
}

function AnimatedSlider({ min, max, step, value, onChange, pctFn }: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const pct = `${pctFn(value).toFixed(1)}%`;

  return (
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      onMouseDown={() => setDragging(true)}
      onTouchStart={() => setDragging(true)}
      onMouseUp={() => setDragging(false)}
      onTouchEnd={() => setDragging(false)}
      className={`wizard-slider${dragging ? ' is-dragging' : ''}`}
      style={{ '--pct': pct } as React.CSSProperties}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateWizardModal({ isOpen, onClose, onSuccess }: CreateWizardModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [transitionDir, setTransitionDir] = useState(1); // 1=fwd, -1=bwd
  const [animKey, setAnimKey] = useState(0);
  const totalSteps = 4;

  useEffect(() => { setMounted(true); }, []);

  const defaultStartTime = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 30, 0, 0);
    return toLocalDatetime(d);
  }, []);

  const [form, setForm] = useState<FormState>({
    title: '', description: '',
    start_time: defaultStartTime,
    location_name: '', latitude: undefined, longitude: undefined,
    distance_km: 6,
    pace_seconds: 330,
    max_participants: 6,
    session_type: 'casual', level_required: 3, walk_breaks_ok: false,
    women_only: false, verified_only: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [geoSearchResults, setGeoSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [titleEdited, setTitleEdited] = useState(false);
  const [previewPulse, setPreviewPulse] = useState(0);

  const quickPicks = useMemo(() => getQuickPicks(), []);
  const autoTitle = useMemo(
    () => generateTitle({ start_time: form.start_time, distance_km: form.distance_km }),
    [form.start_time, form.distance_km],
  );

  // Trigger preview pulse on meaningful changes
  const prevForm = useRef(form);
  useEffect(() => {
    const p = prevForm.current;
    if (
      p.distance_km !== form.distance_km ||
      p.pace_seconds !== form.pace_seconds ||
      p.start_time !== form.start_time ||
      p.location_name !== form.location_name ||
      p.max_participants !== form.max_participants ||
      p.title !== form.title
    ) {
      setPreviewPulse(k => k + 1);
    }
    prevForm.current = form;
  }, [form]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1); setError(null); setSuccess(false);
      setTitleEdited(false); setGeoSearchResults([]); setGeoSearchQuery('');
      setTransitionDir(1); setAnimKey(0);
    }
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      haptic();
      setTransitionDir(1);
      setAnimKey(k => k + 1);
      setCurrentStep(s => s + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      haptic();
      setTransitionDir(-1);
      setAnimKey(k => k + 1);
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!form.start_time;
      case 2: return form.location_name.trim().length > 0;
      case 3: return form.distance_km > 0 && form.pace_seconds >= 240;
      default: return true;
    }
  };

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeoSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } },
      );
      setGeoSearchResults(await res.json());
    } catch { setGeoSearchResults([]); }
    finally { setGeoSearching(false); }
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
          const short = [data.address?.road, data.address?.city || data.address?.town || data.address?.village]
            .filter(Boolean).join(', ');
          setForm(prev => ({ ...prev, location_name: short || data.display_name.split(',').slice(0, 2).join(',') }));
        } catch { /* ignore */ }
        setGeoLocating(false);
      },
      () => setGeoLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setLoading(true); setError(null);
    const data: CreateSessionData = {
      title: form.title.trim() || autoTitle,
      description: encodeSafetyTags(
        { women_only: form.women_only, verified_only: form.verified_only },
        form.description,
      ),
      start_time: form.start_time,
      location_name: form.location_name,
      latitude: form.latitude, longitude: form.longitude,
      distance_km: form.distance_km,
      session_type: form.session_type, level_required: form.level_required,
      target_pace: paceToString(form.pace_seconds),
      walk_breaks_ok: form.walk_breaks_ok, max_participants: form.max_participants,
    };
    try {
      const result = await createSession(data);
      if (result.success) {
        haptic(30);
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
          router.push('/sessions');
        }, 1400);
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

  const slideClass = transitionDir > 0 ? 'animate-slideInRight' : 'animate-slideInLeft';
  const progressPct = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          animation: 'backdropIn 0.25s ease both',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-dark-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden pointer-events-auto animate-modalIn flex flex-col"
          onClick={e => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white">Créer une sortie</h2>
              <p className="text-sm text-white/40">Étape {currentStep}/{totalSteps}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/8 active:scale-90 transition-all duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 mb-1 flex-shrink-0">
            <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(to right, #ec4899, #a855f7)',
                }}
              />
            </div>
          </div>

          {/* Stepper */}
          <div className="px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-xs mx-auto">
              {STEP_META.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;
                return (
                  <div key={step.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                          isCompleted
                            ? 'bg-neon-500 text-dark-800 shadow-[0_0_12px_rgba(163,230,53,0.4)]'
                            : isActive
                            ? 'bg-pink-500 text-white scale-110 shadow-[0_0_16px_rgba(236,72,153,0.45)] ring-4 ring-pink-500/20'
                            : 'bg-dark-600 text-white/30'
                        }`}
                      >
                        {isCompleted
                          ? <Check key="check" className="w-4 h-4 animate-checkBounce" />
                          : <StepIcon key="icon" className="w-3.5 h-3.5" />
                        }
                      </div>
                      <span className={`text-[10px] mt-1 font-medium transition-colors duration-300 ${
                        isActive ? 'text-pink-400' : 'text-white/30'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEP_META.length - 1 && (
                      <div className="h-0.5 flex-1 mx-1 rounded bg-dark-600 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-neon-500 rounded transition-all duration-500 ease-out"
                          style={{ width: currentStep > step.num ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 border-t border-white/5">

            {/* Left: form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-w-0">
              {/* Step content with slide transition */}
              <div className="flex-1 overflow-y-auto">
                <div
                  key={animKey}
                  className={`px-6 py-6 space-y-5 ${slideClass}`}
                >

                  {/* ── Step 1: When ── */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-2">
                          Date et heure
                        </label>
                        <input
                          type="datetime-local"
                          value={form.start_time}
                          onChange={e => set('start_time', e.target.value)}
                          className="wizard-input w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div>
                        <p className="text-xs text-white/35 mb-2.5 font-medium">Raccourcis</p>
                        <div className="flex flex-wrap gap-2">
                          {quickPicks.map(pick => (
                            <button
                              key={pick.label}
                              type="button"
                              onClick={() => { set('start_time', pick.getDate()); haptic(); }}
                              className="chip inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-600 text-white/60 text-sm font-medium hover:bg-dark-500 hover:text-white active:scale-95 transition-all duration-150"
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
                        <label className="block text-sm font-semibold text-white/70 mb-2">
                          Point de rendez-vous
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                            <input
                              type="text"
                              value={geoSearchQuery}
                              onChange={e => setGeoSearchQuery(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchLocation(geoSearchQuery))}
                              placeholder="Rechercher une adresse..."
                              className="wizard-input w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/25 focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => searchLocation(geoSearchQuery)}
                            disabled={geoSearching}
                            className="px-4 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-400 active:scale-95 transition-all duration-150 disabled:opacity-50 shadow-[0_4px_12px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_20px_rgba(236,72,153,0.5)]"
                          >
                            {geoSearching
                              ? <Loader2 className="w-4 h-4 animate-spin-fast" />
                              : 'Chercher'
                            }
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={useCurrentPosition}
                        disabled={geoLocating}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-500/10 text-neon-400 border border-neon-500/20 text-sm font-medium hover:bg-neon-500/20 active:scale-95 transition-all duration-150 disabled:opacity-50"
                      >
                        {geoLocating
                          ? <Loader2 className="w-4 h-4 animate-spin-fast" />
                          : <Crosshair className="w-4 h-4" />
                        }
                        {geoLocating ? 'Localisation...' : 'Utiliser ma position'}
                      </button>

                      {geoSearchResults.length > 0 && (
                        <div className="border border-white/10 rounded-xl overflow-hidden animate-slideInRight">
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
                                setGeoSearchResults([]); setGeoSearchQuery('');
                                haptic();
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-white/65 hover:bg-white/5 hover:text-white border-b last:border-b-0 border-white/6 flex items-center gap-2 transition-colors duration-100 active:bg-white/8"
                            >
                              <MapPin className="w-4 h-4 text-white/25 flex-shrink-0" />
                              {r.display_name}
                            </button>
                          ))}
                        </div>
                      )}

                      {form.location_name && (
                        <div className="p-3 rounded-xl bg-neon-500/10 border border-neon-500/20 flex items-center gap-2 text-neon-400 text-sm animate-titleFadeUp">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{form.location_name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 3: Run Settings ── */}
                  {currentStep === 3 && (
                    <div className="space-y-8">

                      {/* Distance */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <label className="text-sm font-semibold text-white/70">Distance</label>
                          </div>
                          <span className="text-2xl font-bold text-white tabular-nums transition-all duration-150">
                            {form.distance_km}
                            <span className="text-sm text-white/40 ml-1">km</span>
                          </span>
                        </div>
                        <AnimatedSlider
                          min={1} max={42} step={1}
                          value={form.distance_km}
                          onChange={v => set('distance_km', v)}
                          pctFn={v => ((v - 1) / 41) * 100}
                        />
                        <div className="flex justify-between text-xs text-white/25 mt-2">
                          <span>1 km</span><span>21 km</span><span>42 km</span>
                        </div>
                      </div>

                      {/* Pace */}
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <label className="text-sm font-semibold text-white/70">Allure</label>
                            <p className="text-xs text-white/35 mt-0.5">
                              Aide à matcher des coureurs de même niveau
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-white tabular-nums transition-all duration-150">
                            {paceToString(form.pace_seconds)}
                            <span className="text-sm text-white/40 ml-1">/km</span>
                          </span>
                        </div>
                        <AnimatedSlider
                          min={240} max={420} step={5}
                          value={form.pace_seconds}
                          onChange={v => set('pace_seconds', v)}
                          pctFn={v => ((v - 240) / 180) * 100}
                        />
                        <div className="flex justify-between text-xs text-white/25 mt-2">
                          <span>4:00/km</span><span>5:30/km</span><span>7:00/km</span>
                        </div>
                      </div>

                      {/* Max runners */}
                      <div>
                        <div className="mb-3">
                          <label className="text-sm font-semibold text-white/70">Participants max</label>
                          <p className="text-xs text-white/35 mt-0.5">
                            Limite la taille du groupe pour plus de cohésion et de sécurité
                          </p>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {MAX_RUNNERS_OPTIONS.map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => { set('max_participants', n); haptic(); }}
                              className={`py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 ${
                                form.max_participants === n
                                  ? 'bg-pink-500 text-white ring-2 ring-pink-500 ring-offset-2 ring-offset-dark-800 shadow-[0_4px_12px_rgba(236,72,153,0.35)]'
                                  : 'bg-dark-600 text-white/45 hover:bg-dark-500 hover:text-white'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Safety options */}
                      <div>
                        <div className="mb-3">
                          <label className="text-sm font-semibold text-white/70 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-neon-400" />
                            Options de sécurité
                          </label>
                          <p className="text-xs text-white/35 mt-0.5">Contrôle qui peut rejoindre ta sortie</p>
                        </div>
                        <div className="space-y-2.5">
                          {/* Women only toggle */}
                          <button
                            type="button"
                            onClick={() => { set('women_only', !form.women_only); haptic(); }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                              form.women_only
                                ? 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                                : 'bg-white/5 border-white/10 text-white/45 hover:border-white/20 hover:text-white/65'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-base">🚺</span>
                              <div className="text-left">
                                <p className="text-sm font-semibold">Femmes uniquement</p>
                                <p className="text-[11px] opacity-60">Réservé aux femmes et personnes non-binaires</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              form.women_only ? 'bg-pink-500 border-pink-500' : 'bg-transparent border-white/20'
                            }`}>
                              {form.women_only && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </button>

                          {/* Verified only toggle */}
                          <button
                            type="button"
                            onClick={() => { set('verified_only', !form.verified_only); haptic(); }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                              form.verified_only
                                ? 'bg-neon-500/10 border-neon-500/35 text-neon-400'
                                : 'bg-white/5 border-white/10 text-white/45 hover:border-white/20 hover:text-white/65'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-base">🛡️</span>
                              <div className="text-left">
                                <p className="text-sm font-semibold">Coureurs vérifiés</p>
                                <p className="text-[11px] opacity-60">Réservé aux profils avec téléphone vérifié</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              form.verified_only ? 'bg-neon-500 border-neon-500' : 'bg-transparent border-white/20'
                            }`}>
                              {form.verified_only && <Check className="w-3 h-3 text-dark-800" />}
                            </div>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ── Step 4: Details & Recap ── */}
                  {currentStep === 4 && (
                    <div className="space-y-5">

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-2">
                          Nom de la sortie{' '}
                          <span className="text-white/25 font-normal">(optionnel)</span>
                        </label>
                        <input
                          type="text"
                          value={titleEdited ? form.title : (form.title || autoTitle)}
                          onChange={e => { setTitleEdited(true); set('title', e.target.value); }}
                          placeholder={autoTitle}
                          className="wizard-input w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/25 focus:outline-none"
                        />
                        {!titleEdited && (
                          <p className="text-xs text-white/30 mt-1.5 flex items-center gap-1">
                            <Pencil className="w-3 h-3" />
                            Généré automatiquement — modifie si tu veux
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-2">
                          Description{' '}
                          <span className="text-white/25 font-normal">(optionnel)</span>
                        </label>
                        <textarea
                          value={form.description}
                          onChange={e => set('description', e.target.value)}
                          placeholder="Ajoute des détails sur ta sortie..."
                          rows={3}
                          className="wizard-input w-full px-4 py-3 rounded-xl border border-white/10 bg-dark-700 text-white placeholder:text-white/25 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Session type chips */}
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-3">
                          Type de sortie
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SESSION_TYPES.map(t => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => { set('session_type', t.value); haptic(); }}
                              className={`chip inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 ${
                                form.session_type === t.value
                                  ? 'bg-pink-500 text-white shadow-[0_4px_12px_rgba(236,72,153,0.35)]'
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
                        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm animate-titleFadeUp">
                          {error}
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/6 flex items-center justify-between flex-shrink-0">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white/45 font-medium hover:bg-white/6 hover:text-white active:scale-95 transition-all duration-150"
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-semibold active:scale-[0.97] transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_24px_rgba(236,72,153,0.5)] disabled:shadow-none"
                  >
                    Continuer
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : success ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon-500 text-dark-800 font-bold animate-successPop shadow-[0_4px_24px_rgba(163,230,53,0.45)]"
                  >
                    <Check className="w-4 h-4" />
                    Sortie publiée !
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold active:scale-[0.97] transition-all duration-150 disabled:opacity-60 shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_28px_rgba(168,85,247,0.5)]"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin-fast" /> Création...</>
                    ) : (
                      <>Publier la sortie <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Right: Live Preview (desktop only) */}
            <div className="hidden lg:flex w-64 flex-col flex-shrink-0 border-l border-white/6 p-5">
              <LivePreview form={form} autoTitle={autoTitle} pulse={previewPulse} />
            </div>

          </div>

          {/* Mobile: sticky preview strip */}
          <div className="lg:hidden px-5 py-3 bg-dark-700/40 border-t border-white/6 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-white/45 overflow-x-auto scrollbar-hide">
              <span className="font-semibold text-white/75 flex-shrink-0 truncate max-w-[140px]">
                <AnimatedValue value={form.title || autoTitle || 'Course'} />
              </span>
              <span className="text-white/20">·</span>
              <span className="flex-shrink-0"><AnimatedValue value={`${form.distance_km} km`} /></span>
              <span className="text-white/20">·</span>
              <span className="flex-shrink-0"><AnimatedValue value={`${paceToString(form.pace_seconds)}/km`} /></span>
              {form.location_name && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="flex-shrink-0 truncate max-w-[120px]">{form.location_name}</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        /* ── Modal entrance ── */
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .animate-modalIn { animation: modalIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ── Step slide transitions ── */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        .animate-slideInRight { animation: slideInRight 0.22s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animate-slideInLeft  { animation: slideInLeft  0.22s cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ── Preview card pulse ── */
        @keyframes previewPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.015); }
        }
        .animate-previewPulse { animation: previewPulse 0.28s ease-out; }

        /* ── Title / value fade-up ── */
        @keyframes titleFadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .animate-titleFadeUp { animation: titleFadeUp 0.18s ease-out both; }

        /* ── Stepper check bounce ── */
        @keyframes checkBounce {
          0%   { transform: scale(0);    }
          55%  { transform: scale(1.3);  }
          75%  { transform: scale(0.88); }
          100% { transform: scale(1);    }
        }
        .animate-checkBounce { animation: checkBounce 0.38s cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ── Success button pop ── */
        @keyframes successPop {
          0%   { transform: scale(0.9); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-successPop { animation: successPop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ── Spinner ── */
        @keyframes spinFast { to { transform: rotate(360deg); } }
        .animate-spin-fast { animation: spinFast 0.65s linear infinite; }

        /* ── Input focus glow ── */
        .wizard-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .wizard-input:focus {
          border-color: rgba(236, 72, 153, 0.6);
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12), 0 2px 8px rgba(0,0,0,0.3);
        }
        textarea.wizard-input:focus {
          border-color: rgba(236, 72, 153, 0.6);
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12), 0 2px 8px rgba(0,0,0,0.3);
        }

        /* ── Custom range slider ── */
        .wizard-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          background: linear-gradient(
            to right,
            #ec4899 0%,
            #ec4899 var(--pct, 30%),
            rgba(255,255,255,0.08) var(--pct, 30%),
            rgba(255,255,255,0.08) 100%
          );
          transition: height 0.12s ease;
        }
        .wizard-slider:active,
        .wizard-slider.is-dragging {
          height: 6px;
        }
        .wizard-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(236,72,153,0.5), 0 0 0 2px rgba(236,72,153,0.15);
          transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s ease;
        }
        .wizard-slider:active::-webkit-slider-thumb,
        .wizard-slider.is-dragging::-webkit-slider-thumb {
          transform: scale(1.3);
          cursor: grabbing;
          box-shadow: 0 4px 18px rgba(236,72,153,0.7), 0 0 0 4px rgba(236,72,153,0.2);
        }
        .wizard-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: none;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(236,72,153,0.5);
          transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
        }
        .wizard-slider:active::-moz-range-thumb {
          transform: scale(1.3);
          cursor: grabbing;
        }
        .wizard-slider::-moz-range-track {
          background: transparent;
        }

        /* ── Hide scrollbar on mobile strip ── */
        .scrollbar-hide { scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );

  const container = document.getElementById('overlay-root') || document.body;
  return createPortal(content, container);
}
