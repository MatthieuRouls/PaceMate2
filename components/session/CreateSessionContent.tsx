'use client';

import { useState, useMemo, FormEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, CreateSessionData } from '@/lib/actions';
import RunPreviewCard from '@/components/ui/RunPreviewCard';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Search, Crosshair,
  Pencil, Calendar, Zap, Navigation, ClipboardCheck, ArrowRight,
  Rocket, X, Sun, Sunrise, Clock
} from 'lucide-react';

interface CreateSessionContentProps {
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const STEP_META = [
  { num: 1, label: 'Nom', icon: Pencil, motivation: 'Donne envie aux autres de te rejoindre.' },
  { num: 2, label: 'Quand', icon: Calendar, motivation: 'Choisis le meilleur moment pour courir ensemble.' },
  { num: 3, label: 'Type', icon: Zap, motivation: 'Quel run proposes-tu ?' },
  { num: 4, label: 'Lieu', icon: Navigation, motivation: 'Ou tout le monde se retrouve ?' },
  { num: 5, label: 'Recap', icon: ClipboardCheck, motivation: 'Verifie et publie ta sortie.' },
];

const TITLE_SUGGESTIONS = [
  'Sortie afterwork',
  'Footing detente',
  'Sortie longue du dimanche',
  'Fractionne piste',
  'Run social en ville',
];

const PACE_SUGGESTIONS = [
  { label: "6'00", value: "6:00" },
  { label: "5'30", value: "5:30" },
  { label: "5'00", value: "5:00" },
  { label: "4'45", value: "4:45" },
  { label: "4'10", value: "4:10" },
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

const LEVEL_LABELS = ['Debutant', 'Debutant confirme', 'Intermediaire', 'Confirme', 'Expert'];

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
      label: 'Samedi matin',
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

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateSessionContent({
  onDirtyChange,
  onSuccess,
  onCancel
}: CreateSessionContentProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const totalSteps = 5;

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

  // Track dirty state
  useEffect(() => {
    const isDirty = formData.title.trim().length > 0 ||
                    (formData.description?.trim().length ?? 0) > 0 ||
                    formData.start_time.length > 0 ||
                    formData.location_name.trim().length > 0;
    onDirtyChange?.(isDirty);
  }, [formData, onDirtyChange]);

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
      () => { setGeoLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [formData.location_name]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createSession(formData);
      if (result.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/sessions');
        }
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setStepDirection('forward');
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setStepDirection('backward');
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.trim().length > 0;
      case 2: return formData.start_time && formData.distance_km > 0;
      case 3: return formData.session_type && formData.level_required > 0;
      case 4: return formData.location_name.trim().length > 0;
      default: return true;
    }
  };

  const meta = STEP_META[currentStep - 1];
  const sessionType = SESSION_TYPES.find(t => t.value === formData.session_type);

  return (
    <div className="bg-neu-base min-h-full">
      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInRight { animation: slideInRight 0.25s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.25s ease-out; }
      `}</style>

      <div className="max-w-[1160px] mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="mb-2 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-800">
            Creer une sortie
          </h1>
          <p className="text-sm text-dark-500 mt-1">
            Etape {currentStep}/{totalSteps} &mdash; {meta.label}
          </p>
          <p className="text-xs text-neon-700 mt-0.5 font-medium">
            {meta.motivation}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {STEP_META.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.num;
              const isActive = currentStep === step.num;
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center relative flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-neon-700 text-white shadow-lg shadow-neon-700/30'
                          : isActive
                          ? 'bg-pink-500 text-white ring-4 ring-pink-500/25 shadow-lg shadow-pink-500/20'
                          : 'bg-silver-200 text-dark-400 dark:bg-dark-600 dark:text-dark-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs mt-1.5 font-semibold transition-colors hidden sm:block ${
                      isActive ? 'text-pink-500' : isCompleted ? 'text-neon-700' : 'text-dark-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEP_META.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded-full transition-all duration-500 mx-1 ${
                      currentStep > step.num ? 'bg-neon-700' : 'bg-silver-300 dark:bg-dark-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Preview */}
        <div className="lg:hidden mb-6">
          <RunPreviewCard
            formData={formData}
            compact
            sessionTypes={SESSION_TYPES}
            levelLabels={LEVEL_LABELS}
          />
        </div>

        {/* Main Layout */}
        <div className="flex gap-8 items-start">
          {/* Left Column */}
          <div className="flex-1 min-w-0 lg:max-w-[65%]">
            <div className="bg-white dark:bg-dark-700 rounded-2xl border border-silver-300 dark:border-dark-600 p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSubmit}>
                <div
                  key={currentStep}
                  className={stepDirection === 'forward' ? 'animate-slideInRight' : 'animate-slideInLeft'}
                >
                  {/* Step content - abbreviated for space, same as original */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-dark-800 mb-2">
                          Titre de la sortie <span className="text-pink-500">*</span>
                        </label>
                        <input
                          id="title"
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Donne un nom accrocheur..."
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-dark-800"
                          required
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          {TITLE_SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, title: s }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                formData.title === s
                                  ? 'bg-neon-700 text-white border-neon-700'
                                  : 'bg-silver-100 text-dark-600 border-silver-300 hover:border-neon-500 hover:bg-neon-50'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-dark-800 mb-2">
                          Description <span className="text-dark-400 font-normal">(optionnel)</span>
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Decris l'ambiance..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all resize-none text-dark-800"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <span className="block text-sm font-semibold text-dark-800 mb-2">Raccourcis</span>
                        <div className="flex flex-wrap gap-2">
                          {quickPicks.map((qp) => (
                            <button
                              key={qp.label}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, start_time: qp.getDate() }))}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-silver-300 bg-silver-50 text-dark-600 hover:border-neon-500 hover:bg-neon-50"
                            >
                              {qp.icon}
                              {qp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="start_time" className="block text-sm font-semibold text-dark-800 mb-2">
                          Date et heure <span className="text-pink-500">*</span>
                        </label>
                        <input
                          id="start_time"
                          type="datetime-local"
                          name="start_time"
                          value={formData.start_time}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none text-dark-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">Distance <span className="text-pink-500">*</span></label>
                        <div className="text-center mb-3">
                          <span className="text-5xl font-black text-dark-800 tabular-nums">{formData.distance_km}</span>
                          <span className="text-xl font-bold text-dark-500 ml-1">km</span>
                        </div>
                        <input
                          type="range"
                          name="distance_km"
                          min="1"
                          max="50"
                          step="0.5"
                          value={formData.distance_km}
                          onChange={handleChange}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-silver-300 accent-neon-700"
                        />
                      </div>
                      <div>
                        <label htmlFor="target_pace" className="block text-sm font-semibold text-dark-800 mb-2">
                          Allure cible <span className="text-dark-400 font-normal">(optionnel)</span>
                        </label>
                        <input
                          id="target_pace"
                          type="text"
                          name="target_pace"
                          value={formData.target_pace}
                          onChange={handleChange}
                          placeholder="Ex: 5:30"
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 bg-silver-50 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none text-dark-800"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {PACE_SUGGESTIONS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, target_pace: p.value }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                formData.target_pace === p.value
                                  ? 'bg-pink-500 text-white border-pink-500'
                                  : 'bg-silver-100 text-dark-600 border-silver-300 hover:border-pink-400'
                              }`}
                            >
                              {p.label}/km
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">Type de sortie <span className="text-pink-500">*</span></label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {SESSION_TYPES.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, session_type: type.value })}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${
                                formData.session_type === type.value
                                  ? 'border-neon-700 bg-neon-50 shadow-md'
                                  : 'border-silver-300 hover:border-neon-400 hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="text-3xl mb-2">{type.icon}</div>
                              <div className="text-sm font-bold text-dark-800">{type.label}</div>
                              <div className="text-xs text-dark-400">{type.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">Niveau requis <span className="text-pink-500">*</span></label>
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setFormData({ ...formData, level_required: level })}
                              className={`w-full p-3.5 rounded-xl border-2 transition-all text-left ${
                                formData.level_required === level
                                  ? 'border-neon-700 bg-neon-50 shadow-md'
                                  : 'border-silver-300 hover:border-neon-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-dark-800">{LEVEL_LABELS[level - 1]}</span>
                                <div className="flex gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < level ? 'bg-pink-400' : 'bg-silver-300'}`} />
                                  ))}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-3 p-4 bg-silver-50 rounded-xl border border-silver-300 cursor-pointer hover:border-neon-400 transition-colors">
                        <input
                          type="checkbox"
                          name="walk_breaks_ok"
                          checked={formData.walk_breaks_ok}
                          onChange={handleChange}
                          className="w-5 h-5 accent-neon-700 rounded"
                        />
                        <span className="text-sm font-medium text-dark-800">Pauses marche autorisees</span>
                      </label>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="location_name" className="block text-sm font-semibold text-dark-800 mb-2">
                          Lieu de rendez-vous <span className="text-pink-500">*</span>
                        </label>
                        <input
                          id="location_name"
                          type="text"
                          name="location_name"
                          value={formData.location_name}
                          onChange={handleChange}
                          placeholder="Ex: Entree du parc Monceau"
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none text-dark-800"
                          required
                        />
                      </div>
                      <div className="rounded-xl overflow-hidden border border-silver-300">
                        {formData.latitude != null && formData.longitude != null ? (
                          <div className="relative">
                            <div className="h-[120px] bg-gradient-to-br from-neon-700/10 to-dark-800/30 flex items-center justify-center">
                              <div className="text-center">
                                <MapPin className="w-8 h-8 text-neon-700 mx-auto mb-1" />
                                <p className="text-sm font-medium text-dark-700">
                                  {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }))}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-dark-800/70 text-white flex items-center justify-center hover:bg-dark-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-[100px] bg-silver-100 flex flex-col items-center justify-center">
                            <MapPin className="w-6 h-6 text-dark-400 mb-1" />
                            <p className="text-sm text-dark-400">Ajoute un lieu pour voir la carte</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={useCurrentPosition}
                          disabled={geoLocating}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-silver-300 text-dark-600 text-sm font-medium hover:border-neon-500 hover:bg-neon-50 disabled:opacity-50"
                        >
                          <Crosshair className="w-4 h-4" />
                          {geoLocating ? 'Localisation...' : 'Utiliser ma position'}
                        </button>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={geoSearchQuery}
                            onChange={(e) => setGeoSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchLocation(geoSearchQuery); } }}
                            placeholder="Rechercher une adresse..."
                            className="flex-1 px-4 py-2.5 rounded-xl border border-silver-300 bg-silver-50 text-sm focus:border-neon-700 outline-none text-dark-800"
                          />
                          <button
                            type="button"
                            onClick={() => searchLocation(geoSearchQuery)}
                            disabled={geoSearching}
                            className="px-4 py-2.5 rounded-xl bg-dark-800 text-white text-sm hover:bg-dark-700 disabled:opacity-50"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        </div>
                        {geoSearchResults.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-silver-300 p-1">
                            {geoSearchResults.map((result, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    latitude: parseFloat(result.lat),
                                    longitude: parseFloat(result.lon),
                                    location_name: prev.location_name || result.display_name.split(',').slice(0, 2).join(',').trim(),
                                  }));
                                  setGeoSearchResults([]);
                                  setGeoSearchQuery('');
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-dark-700 hover:bg-neon-50"
                              >
                                {result.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">Participants max</label>
                        <div className="text-center mb-2">
                          <span className="text-4xl font-black text-dark-800 tabular-nums">{formData.max_participants}</span>
                          <span className="text-base font-medium text-dark-500 ml-1.5">participants max</span>
                        </div>
                        <input
                          type="range"
                          name="max_participants"
                          min="2"
                          max="20"
                          value={formData.max_participants}
                          onChange={handleChange}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-silver-300 accent-neon-700"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-5">
                      <div className="p-4 bg-gradient-to-br from-neon-50 to-silver-50 rounded-xl border border-neon-200">
                        <h3 className="text-lg font-bold text-dark-800">{formData.title}</h3>
                        {formData.description && <p className="text-sm text-dark-500 mt-1">{formData.description}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-silver-50 rounded-xl">
                          <div className="text-xs text-dark-400 mb-1">Date</div>
                          <div className="text-sm font-semibold text-dark-800">
                            {formData.start_time ? new Date(formData.start_time).toLocaleDateString('fr-FR', {
                              weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                            }) : 'Non defini'}
                          </div>
                        </div>
                        <div className="p-3 bg-silver-50 rounded-xl">
                          <div className="text-xs text-dark-400 mb-1">Distance</div>
                          <div className="text-sm font-semibold text-dark-800">
                            {formData.distance_km} km {formData.target_pace && `a ${formData.target_pace}/km`}
                          </div>
                        </div>
                        <div className="p-3 bg-silver-50 rounded-xl">
                          <div className="text-xs text-dark-400 mb-1">Type</div>
                          <div className="text-sm font-semibold text-dark-800">{sessionType?.icon} {sessionType?.label}</div>
                        </div>
                        <div className="p-3 bg-silver-50 rounded-xl">
                          <div className="text-xs text-dark-400 mb-1">Niveau</div>
                          <div className="text-sm font-semibold text-dark-800">{LEVEL_LABELS[formData.level_required - 1]}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-silver-50 rounded-xl">
                        <div className="text-xs text-dark-400 mb-1">Lieu</div>
                        <div className="text-sm font-semibold text-dark-800">{formData.location_name}</div>
                      </div>
                      <div className="p-3 bg-silver-50 rounded-xl">
                        <div className="text-xs text-dark-400 mb-1">Participants max</div>
                        <div className="text-sm font-semibold text-dark-800">{formData.max_participants} personnes</div>
                      </div>
                      {error && (
                        <div className="p-4 bg-pink-50 border border-pink-300 rounded-xl">
                          <p className="text-sm text-pink-600 font-medium">{error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-silver-200">
                  <div>
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-dark-600 hover:bg-silver-100 text-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Precedent
                      </button>
                    ) : onCancel ? (
                      <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm text-dark-400 hover:text-dark-600 px-2 py-2"
                      >
                        Annuler
                      </button>
                    ) : null}
                  </div>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        canProceed()
                          ? 'bg-neon-700 text-white hover:bg-neon-600 shadow-lg shadow-neon-700/25'
                          : 'bg-silver-200 text-dark-400 cursor-not-allowed'
                      }`}
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-neon-700 to-neon-500 text-white font-bold text-sm shadow-lg shadow-neon-700/30 hover:shadow-neon-700/50 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Creation...' : 'Publier la sortie'}
                      <Rocket className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="hidden lg:block w-[35%] shrink-0">
            <div className="sticky top-24">
              <div className="mb-3">
                <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Apercu en direct</span>
              </div>
              <RunPreviewCard
                formData={formData}
                sessionTypes={SESSION_TYPES}
                levelLabels={LEVEL_LABELS}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
