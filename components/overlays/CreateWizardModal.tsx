'use client';

import { useState, useMemo, FormEvent, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { createSession, CreateSessionData } from '@/lib/actions';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Search, Crosshair,
  Pencil, Calendar, Zap, Navigation, ClipboardCheck, ArrowRight,
  X, Sun, Sunrise, Clock
} from 'lucide-react';

interface CreateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEP_META = [
  { num: 1, label: 'Nom', icon: Pencil },
  { num: 2, label: 'Quand', icon: Calendar },
  { num: 3, label: 'Type', icon: Zap },
  { num: 4, label: 'Lieu', icon: Navigation },
  { num: 5, label: 'Recap', icon: ClipboardCheck },
];

const TITLE_SUGGESTIONS = [
  'Sortie afterwork',
  'Footing detente',
  'Sortie longue du dimanche',
  'Fractionne piste',
  'Run social en ville',
];

const SESSION_TYPES: Array<{
  value: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
  label: string;
  icon: string;
  description: string;
}> = [
  { value: 'casual', label: 'Sortie detente', icon: '🚶', description: 'Rythme tranquille' },
  { value: 'recovery', label: 'Recuperation', icon: '🧘', description: 'Allure moderee' },
  { value: 'tempo', label: 'Allure soutenue', icon: '🏃', description: 'Rythme challengeant' },
  { value: 'long_run', label: 'Sortie longue', icon: '🗺️', description: 'Endurance fondamentale' },
  { value: 'intervals', label: 'Fractionne', icon: '⚡', description: 'Seance intensive' },
];

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getQuickPicks(): Array<{ label: string; icon: React.ReactNode; getDate: () => string }> {
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
        const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSat);
        d.setHours(9, 0, 0, 0);
        return toLocalDatetime(d);
      },
    },
    {
      label: 'Dimanche',
      icon: <Clock className="w-3.5 h-3.5" />,
      getDate: () => {
        const d = new Date();
        const daysUntilSun = (7 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSun);
        d.setHours(9, 30, 0, 0);
        return toLocalDatetime(d);
      },
    },
  ];
}

export default function CreateWizardModal({ isOpen, onClose, onSuccess }: CreateWizardModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState<CreateSessionData>({
    title: '',
    description: '',
    start_time: '',
    location_name: '',
    latitude: undefined,
    longitude: undefined,
    distance_km: 5,
    session_type: 'casual',
    level_required: 3,
    target_pace: '',
    walk_breaks_ok: false,
    max_participants: 5,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [geoSearchResults, setGeoSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  const quickPicks = useMemo(() => getQuickPicks(), []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeoSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      setGeoSearchResults(data);
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
        setFormData(prev => ({ ...prev, latitude, longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          if (data.display_name && !formData.location_name) {
            const short = [data.address?.road, data.address?.city || data.address?.town || data.address?.village].filter(Boolean).join(', ');
            setFormData(prev => ({ ...prev, location_name: short || data.display_name.split(',').slice(0, 2).join(',') }));
          }
        } catch { /* ignore */ }
        setGeoLocating(false);
      },
      () => setGeoLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [formData.location_name]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createSession(formData);
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

  const nextStep = () => currentStep < totalSteps && setCurrentStep(currentStep + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.trim().length > 0;
      case 2: return formData.start_time && formData.distance_km > 0;
      case 3: return formData.session_type && formData.level_required > 0;
      case 4: return formData.location_name.trim().length > 0;
      default: return true;
    }
  };

  const sessionType = SESSION_TYPES.find(t => t.value === formData.session_type);

  // Don't render during SSR or before mount
  if (!mounted || !isOpen) return null;

  const content = (
    <>
      {/* Glass Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          className="bg-white dark:bg-dark-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto animate-modalIn"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-silver-200 dark:border-dark-700">
            <div>
              <h2 className="text-xl font-bold text-dark-800 dark:text-white">Créer une sortie</h2>
              <p className="text-sm text-dark-500">Étape {currentStep}/{totalSteps}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-silver-100 dark:hover:bg-dark-600 transition-colors"
            >
              <X className="w-5 h-5 text-dark-500" />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-6 py-4 bg-silver-50 dark:bg-dark-700/50">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {STEP_META.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;
                return (
                  <div key={step.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all ${
                          isCompleted
                            ? 'bg-neon-600 text-white'
                            : isActive
                            ? 'bg-pink-500 text-white ring-4 ring-pink-500/20'
                            : 'bg-silver-200 text-dark-400 dark:bg-dark-600'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-pink-500' : 'text-dark-400'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEP_META.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 rounded ${currentStep > step.num ? 'bg-neon-600' : 'bg-silver-300 dark:bg-dark-600'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 overflow-y-auto max-h-[45vh]">
              {/* Step 1: Title */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Nom de ta sortie
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Ex: Sortie afterwork au parc"
                      className="w-full px-4 py-3 rounded-xl border border-silver-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TITLE_SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, title: s }))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.title === s
                            ? 'bg-pink-500 text-white'
                            : 'bg-silver-100 dark:bg-dark-600 text-dark-600 dark:text-silver-300 hover:bg-silver-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleChange}
                      placeholder="Decris ta sortie..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-silver-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: When */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Date et heure
                    </label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-silver-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickPicks.map(pick => (
                      <button
                        key={pick.label}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, start_time: pick.getDate() }))}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-silver-100 dark:bg-dark-600 text-dark-600 dark:text-silver-300 text-sm font-medium hover:bg-pink-100 hover:text-pink-600 transition-colors"
                      >
                        {pick.icon}
                        {pick.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Distance: {formData.distance_km} km
                    </label>
                    <input
                      type="range"
                      name="distance_km"
                      min="1"
                      max="42"
                      value={formData.distance_km}
                      onChange={handleChange}
                      className="w-full accent-pink-500"
                    />
                    <div className="flex justify-between text-xs text-dark-400 mt-1">
                      <span>1 km</span>
                      <span>21 km</span>
                      <span>42 km</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Type */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-3">
                      Type de sortie
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {SESSION_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, session_type: type.value }))}
                          className={`p-4 rounded-xl text-left transition-all ${
                            formData.session_type === type.value
                              ? 'bg-pink-500 text-white ring-2 ring-pink-500 ring-offset-2'
                              : 'bg-silver-50 dark:bg-dark-700 hover:bg-silver-100 dark:hover:bg-dark-600'
                          }`}
                        >
                          <span className="text-2xl mb-1 block">{type.icon}</span>
                          <span className="font-semibold block">{type.label}</span>
                          <span className={`text-xs ${formData.session_type === type.value ? 'text-white/80' : 'text-dark-500'}`}>
                            {type.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Niveau requis: {formData.level_required}
                    </label>
                    <input
                      type="range"
                      name="level_required"
                      min="1"
                      max="5"
                      value={formData.level_required}
                      onChange={handleChange}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Location */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-700 dark:text-silver-300 mb-2">
                      Point de rendez-vous
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        type="text"
                        value={geoSearchQuery}
                        onChange={e => setGeoSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchLocation(geoSearchQuery))}
                        placeholder="Rechercher une adresse..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-silver-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useCurrentPosition}
                    disabled={geoLocating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-100 text-neon-700 font-medium hover:bg-neon-200 transition-colors disabled:opacity-50"
                  >
                    <Crosshair className="w-4 h-4" />
                    {geoLocating ? 'Localisation...' : 'Utiliser ma position'}
                  </button>
                  {geoSearchResults.length > 0 && (
                    <div className="border border-silver-200 dark:border-dark-600 rounded-xl overflow-hidden">
                      {geoSearchResults.map((result, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              location_name: result.display_name.split(',').slice(0, 2).join(', '),
                              latitude: parseFloat(result.lat),
                              longitude: parseFloat(result.lon),
                            }));
                            setGeoSearchResults([]);
                            setGeoSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-silver-50 dark:hover:bg-dark-700 border-b last:border-b-0 border-silver-200 dark:border-dark-600"
                        >
                          <MapPin className="w-4 h-4 inline mr-2 text-dark-400" />
                          {result.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.location_name && (
                    <div className="p-4 rounded-xl bg-neon-50 dark:bg-neon-900/20 border border-neon-200 dark:border-neon-800">
                      <div className="flex items-center gap-2 text-neon-700">
                        <MapPin className="w-5 h-5" />
                        <span className="font-semibold">{formData.location_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Recap */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-5 text-white">
                    <h3 className="text-xl font-bold mb-3">{formData.title}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formData.start_time && new Date(formData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {formData.location_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {sessionType?.label} • {formData.distance_km} km
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-silver-200 dark:border-dark-700 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-dark-600 dark:text-silver-300 font-medium hover:bg-silver-100 dark:hover:bg-dark-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modalIn {
          animation: modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </>
  );

  const container = document.getElementById('overlay-root') || document.body;
  return createPortal(content, container);
}
