'use client';

import { useState, useMemo, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSession, CreateSessionData } from '@/lib/actions';
import RunPreviewCard from '@/components/ui/RunPreviewCard';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Search, Crosshair,
  Pencil, Calendar, Zap, Navigation, ClipboardCheck, ArrowRight,
  Rocket, X, Sun, Sunrise, Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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

export default function CreateSessionPage() {
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
        router.push('/sessions');
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
    <div className="min-h-screen bg-neu-base pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-[1160px] mx-auto">

        {/* ── HEADER ── */}
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

        {/* ── STEPPER ── */}
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
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
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

        {/* ── MOBILE PREVIEW (shown below header on small screens) ── */}
        <div className="lg:hidden mb-6">
          <RunPreviewCard
            formData={formData}
            compact
            sessionTypes={SESSION_TYPES}
            levelLabels={LEVEL_LABELS}
          />
        </div>

        {/* ── MAIN LAYOUT: split 65/35 on desktop ── */}
        <div className="flex gap-8 items-start">
          {/* LEFT COLUMN — Step content */}
          <div className="flex-1 min-w-0 lg:max-w-[65%]">
            <div className="bg-white dark:bg-dark-700 rounded-2xl border border-silver-300 dark:border-dark-600 p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSubmit}>
                {/* Animated step wrapper */}
                <div
                  key={currentStep}
                  className={stepDirection === 'forward' ? 'animate-slideInRight' : 'animate-slideInLeft'}
                >

                  {/* ═══════ STEP 1: Nom & Ambiance ═══════ */}
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
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-dark-800 placeholder:text-dark-400"
                          required
                          autoFocus
                        />
                        {/* Title suggestions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {TITLE_SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, title: s }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                formData.title === s
                                  ? 'bg-neon-700 text-white border-neon-700'
                                  : 'bg-silver-100 text-dark-600 border-silver-300 hover:border-neon-500 hover:bg-neon-50 dark:bg-dark-600 dark:text-silver-300 dark:border-dark-500 dark:hover:border-neon-600'
                              }`}
                              aria-label={`Suggestion : ${s}`}
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
                          placeholder="Decris l'ambiance, le parcours, les points de passage..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all resize-none text-dark-800 placeholder:text-dark-400"
                        />
                      </div>

                      {/* Ambiance chips */}
                      <div>
                        <span className="block text-sm font-semibold text-dark-800 mb-2">
                          Ambiance <span className="text-dark-400 font-normal">(optionnel)</span>
                        </span>
                        <div className="flex gap-2">
                          {[
                            { label: 'Tranquille', emoji: '😌' },
                            { label: 'Motivant', emoji: '💪' },
                            { label: 'Challenge', emoji: '🔥' },
                          ].map((a) => {
                            const isInDesc = formData.description?.includes(a.label);
                            return (
                              <button
                                key={a.label}
                                type="button"
                                onClick={() => {
                                  if (!isInDesc) {
                                    const prefix = formData.description ? formData.description + ' ' : '';
                                    setFormData(prev => ({ ...prev, description: prefix + `${a.emoji} ${a.label}` }));
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                  isInDesc
                                    ? 'bg-pink-500/10 text-pink-600 border-pink-500/40'
                                    : 'bg-silver-50 text-dark-600 border-silver-300 hover:border-pink-400 hover:bg-pink-50 dark:bg-dark-600 dark:text-silver-300 dark:border-dark-500'
                                }`}
                              >
                                {a.emoji} {a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══════ STEP 2: Quand + Distance ═══════ */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      {/* Quick date picks */}
                      <div>
                        <span className="block text-sm font-semibold text-dark-800 mb-2">
                          Raccourcis
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {quickPicks.map((qp) => (
                            <button
                              key={qp.label}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, start_time: qp.getDate() }))}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-silver-300 bg-silver-50 text-dark-600 hover:border-neon-500 hover:bg-neon-50 hover:text-neon-700 transition-all dark:bg-dark-600 dark:text-silver-300 dark:border-dark-500 dark:hover:border-neon-600"
                              aria-label={`Programmer pour ${qp.label}`}
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
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-dark-800"
                          required
                        />
                      </div>

                      {/* Distance - prominent */}
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">
                          Distance <span className="text-pink-500">*</span>
                        </label>
                        <div className="text-center mb-3">
                          <span className="text-5xl font-black text-dark-800 tabular-nums">
                            {formData.distance_km}
                          </span>
                          <span className="text-xl font-bold text-dark-500 ml-1">km</span>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            name="distance_km"
                            min="1"
                            max="50"
                            step="0.5"
                            value={formData.distance_km}
                            onChange={handleChange}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-silver-300 dark:bg-dark-600 accent-neon-700"
                            style={{
                              background: `linear-gradient(to right, var(--color-neon-700, #00A86B) 0%, var(--color-neon-700, #00A86B) ${((formData.distance_km - 1) / 49) * 100}%, var(--color-silver-300, #d1d5db) ${((formData.distance_km - 1) / 49) * 100}%, var(--color-silver-300, #d1d5db) 100%)`,
                            }}
                          />
                          <div className="flex justify-between text-xs text-dark-400 mt-1 font-medium">
                            <span>1 km</span>
                            <span>50 km</span>
                          </div>
                        </div>
                      </div>

                      {/* Pace with chips */}
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
                          className="w-full px-4 py-3 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-dark-800 placeholder:text-dark-400"
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
                                  : 'bg-silver-100 text-dark-600 border-silver-300 hover:border-pink-400 dark:bg-dark-600 dark:text-silver-300 dark:border-dark-500'
                              }`}
                              aria-label={`Allure ${p.label} par km`}
                            >
                              {p.label}/km
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══════ STEP 3: Type & Level ═══════ */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-1">
                          Type de sortie <span className="text-pink-500">*</span>
                        </label>
                        <p className="text-xs text-dark-400 mb-3">Choisis un type clair pour que les bons coureurs rejoignent.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {SESSION_TYPES.map((type) => {
                            const isSelected = formData.session_type === type.value;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, session_type: type.value })}
                                className={`group relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                                  isSelected
                                    ? 'border-neon-700 bg-neon-50 dark:bg-neon-900/20 shadow-md shadow-neon-700/10'
                                    : 'border-silver-300 hover:border-neon-400 hover:shadow-md hover:-translate-y-0.5 dark:border-dark-500 dark:hover:border-neon-600'
                                }`}
                                aria-pressed={isSelected}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <Check className="w-4 h-4 text-neon-700" />
                                  </div>
                                )}
                                <div className="text-3xl mb-2">{type.icon}</div>
                                <div className="text-sm font-bold text-dark-800">{type.label}</div>
                                <div className="text-xs text-dark-400 mt-0.5">{type.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">
                          Niveau requis <span className="text-pink-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((level) => {
                            const isSelected = formData.level_required === level;
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setFormData({ ...formData, level_required: level })}
                                className={`w-full p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                                  isSelected
                                    ? 'border-neon-700 bg-neon-50 dark:bg-neon-900/20 shadow-md shadow-neon-700/10'
                                    : 'border-silver-300 hover:border-neon-400 hover:shadow-sm dark:border-dark-500 dark:hover:border-neon-600'
                                }`}
                                aria-pressed={isSelected}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isSelected && <Check className="w-4 h-4 text-neon-700 shrink-0" />}
                                    <span className={`text-sm font-bold ${isSelected ? 'text-neon-700' : 'text-dark-800'}`}>
                                      {LEVEL_LABELS[level - 1]}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                          i < level
                                            ? isSelected ? 'bg-neon-700' : 'bg-pink-400'
                                            : 'bg-silver-300 dark:bg-dark-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="flex items-center gap-3 p-4 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-300 dark:border-dark-600 cursor-pointer hover:border-neon-400 transition-colors">
                        <input
                          type="checkbox"
                          name="walk_breaks_ok"
                          checked={formData.walk_breaks_ok}
                          onChange={handleChange}
                          className="w-5 h-5 accent-neon-700 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium text-dark-800">Pauses marche autorisees</span>
                          <span className="block text-xs text-dark-400 mt-0.5">Les participants peuvent alterner course et marche</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* ═══════ STEP 4: Lieu & Participants ═══════ */}
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
                          className="w-full px-4 py-3.5 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none transition-all text-dark-800 placeholder:text-dark-400"
                          required
                        />
                      </div>

                      {/* Mini map preview / placeholder */}
                      <div className="rounded-xl overflow-hidden border border-silver-300 dark:border-dark-600">
                        {formData.latitude != null && formData.longitude != null ? (
                          <div className="relative">
                            <img
                              src={`https://staticmap.thismoment.cloud/staticmap?center=${formData.latitude},${formData.longitude}&zoom=15&size=600x200&markers=${formData.latitude},${formData.longitude},red-pushpin`}
                              alt="Carte du lieu"
                              className="w-full h-[160px] object-cover bg-silver-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.nextElementSibling) {
                                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <div className="hidden w-full h-[160px] bg-gradient-to-br from-neon-700/10 to-dark-800/30 items-center justify-center">
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
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-dark-800/70 text-white flex items-center justify-center hover:bg-dark-800 transition-colors"
                              aria-label="Supprimer la position"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-[120px] bg-silver-100 dark:bg-dark-800 flex flex-col items-center justify-center text-center px-4">
                            <MapPin className="w-6 h-6 text-dark-400 mb-1.5" />
                            <p className="text-sm text-dark-400">Ajoute un lieu pour voir la carte</p>
                          </div>
                        )}
                      </div>

                      {/* GPS section */}
                      <div className="space-y-3">
                        {/* Current position */}
                        <button
                          type="button"
                          onClick={useCurrentPosition}
                          disabled={geoLocating}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-silver-300 text-dark-600 text-sm font-medium hover:border-neon-500 hover:bg-neon-50 hover:text-neon-700 transition-all disabled:opacity-50 dark:border-dark-500 dark:text-silver-300"
                        >
                          <Crosshair className="w-4 h-4" />
                          {geoLocating ? 'Localisation...' : 'Utiliser ma position'}
                        </button>

                        {/* Address search */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={geoSearchQuery}
                            onChange={(e) => setGeoSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchLocation(geoSearchQuery); } }}
                            placeholder="Rechercher une adresse..."
                            className="flex-1 px-4 py-2.5 rounded-xl border border-silver-300 bg-silver-50 dark:bg-dark-800 dark:border-dark-600 text-sm focus:border-neon-700 focus:ring-2 focus:ring-neon-700/20 outline-none text-dark-800 placeholder:text-dark-400"
                          />
                          <button
                            type="button"
                            onClick={() => searchLocation(geoSearchQuery)}
                            disabled={geoSearching}
                            className="px-4 py-2.5 rounded-xl bg-dark-800 text-white text-sm hover:bg-dark-700 transition-colors disabled:opacity-50"
                            aria-label="Rechercher"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Search results */}
                        {geoSearchResults.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-silver-300 dark:border-dark-600 p-1">
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
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-dark-700 dark:text-silver-300 hover:bg-neon-50 dark:hover:bg-neon-900/20 transition-colors"
                              >
                                {result.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Participants slider */}
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-3">
                          Participants max
                        </label>
                        <div className="text-center mb-2">
                          <span className="text-4xl font-black text-dark-800 tabular-nums">{formData.max_participants}</span>
                          <span className="text-base font-medium text-dark-500 ml-1.5">participants max</span>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            name="max_participants"
                            min="2"
                            max="20"
                            value={formData.max_participants}
                            onChange={handleChange}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-silver-300 dark:bg-dark-600 accent-neon-700"
                            style={{
                              background: `linear-gradient(to right, var(--color-neon-700, #00A86B) 0%, var(--color-neon-700, #00A86B) ${((formData.max_participants - 2) / 18) * 100}%, var(--color-silver-300, #d1d5db) ${((formData.max_participants - 2) / 18) * 100}%, var(--color-silver-300, #d1d5db) 100%)`,
                            }}
                          />
                          <div className="flex justify-between text-xs text-dark-400 mt-1 font-medium">
                            <span>2</span>
                            <span>20</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══════ STEP 5: Recap ═══════ */}
                  {currentStep === 5 && (
                    <div className="space-y-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          {/* Title + description */}
                          <div className="p-4 bg-gradient-to-br from-neon-50 to-silver-50 dark:from-neon-900/20 dark:to-dark-800 rounded-xl border border-neon-200 dark:border-neon-800/40">
                            <h3 className="text-lg font-bold text-dark-800">{formData.title}</h3>
                            {formData.description && (
                              <p className="text-sm text-dark-500 mt-1">{formData.description}</p>
                            )}
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-neon-700" />
                                <span className="text-xs text-dark-400 font-medium">Date</span>
                              </div>
                              <div className="text-sm font-semibold text-dark-800">
                                {formData.start_time ? new Date(formData.start_time).toLocaleDateString('fr-FR', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) : 'Non defini'}
                              </div>
                            </div>

                            <div className="p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                              <div className="flex items-center gap-1.5 mb-1">
                                <ArrowRight className="w-3.5 h-3.5 text-pink-500" />
                                <span className="text-xs text-dark-400 font-medium">Distance</span>
                              </div>
                              <div className="text-sm font-semibold text-dark-800">
                                {formData.distance_km} km
                                {formData.target_pace && (
                                  <span className="text-dark-400 font-normal ml-1">a {formData.target_pace}/km</span>
                                )}
                              </div>
                            </div>

                            <div className="p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Zap className="w-3.5 h-3.5 text-neon-700" />
                                <span className="text-xs text-dark-400 font-medium">Type</span>
                              </div>
                              <div className="text-sm font-semibold text-dark-800">
                                {sessionType?.icon} {sessionType?.label}
                              </div>
                            </div>

                            <div className="p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Zap className="w-3.5 h-3.5 text-pink-500" />
                                <span className="text-xs text-dark-400 font-medium">Niveau</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-dark-800">
                                  {LEVEL_LABELS[formData.level_required - 1]}
                                </span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: formData.level_required }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Location row */}
                          <div className="mt-3 p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-neon-700" />
                              <span className="text-xs text-dark-400 font-medium">Lieu</span>
                            </div>
                            <div className="text-sm font-semibold text-dark-800">{formData.location_name}</div>
                          </div>

                          {/* Participants + walk breaks */}
                          <div className="flex gap-3 mt-3">
                            <div className="flex-1 p-3 bg-silver-50 dark:bg-dark-800 rounded-xl border border-silver-200 dark:border-dark-600">
                              <div className="text-xs text-dark-400 font-medium mb-1">Participants max</div>
                              <div className="text-sm font-semibold text-dark-800">{formData.max_participants} personnes</div>
                            </div>
                            {formData.walk_breaks_ok && (
                              <div className="flex-1 p-3 bg-neon-50 dark:bg-neon-900/20 rounded-xl border border-neon-200 dark:border-neon-800/40">
                                <div className="text-xs text-neon-700 font-medium">Pauses marche</div>
                                <div className="text-sm font-semibold text-neon-700 mt-1">Autorisees</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Preview card in recap (hidden on mobile, shown on desktop when no sidebar) */}
                      </div>

                      {error && (
                        <div className="p-4 bg-pink-50 border border-pink-300 rounded-xl">
                          <p className="text-sm text-pink-600 font-medium">{error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── ACTION BAR ── */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-silver-200 dark:border-dark-600">
                  <div className="flex items-center gap-3">
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-dark-600 hover:bg-silver-100 dark:hover:bg-dark-600 transition-all text-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Precedent
                      </button>
                    ) : (
                      <Link
                        href="/sessions"
                        className="text-sm text-dark-400 hover:text-dark-600 transition-colors px-2 py-2"
                      >
                        Annuler
                      </Link>
                    )}
                  </div>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                        canProceed()
                          ? 'bg-neon-700 text-white hover:bg-neon-600 shadow-lg shadow-neon-700/25 hover:shadow-neon-700/40 hover:-translate-y-0.5'
                          : 'bg-silver-200 text-dark-400 cursor-not-allowed dark:bg-dark-600 dark:text-dark-500'
                      }`}
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-neon-700 to-neon-500 text-white font-bold text-sm shadow-lg shadow-neon-700/30 hover:shadow-neon-700/50 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {loading ? 'Creation...' : 'Publier la sortie'}
                      <Rocket className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Cancel on mobile */}
            {currentStep === 1 && (
              <div className="text-center mt-4 lg:hidden">
                <Link
                  href="/sessions"
                  className="text-sm text-dark-400 hover:text-neon-700 transition-colors"
                >
                  Annuler
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sticky Preview (desktop only) */}
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

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.25s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
