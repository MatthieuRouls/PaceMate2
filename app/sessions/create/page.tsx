'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSession, CreateSessionData } from '@/lib/actions';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CreateSessionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const [formData, setFormData] = useState<CreateSessionData>({
    title: '',
    description: '',
    start_time: '',
    location_name: '',
    distance_km: 5,
    session_type: 'casual',
    level_required: 3,
    target_pace: '',
    walk_breaks_ok: false,
    max_participants: 5,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim().length > 0;
      case 2:
        return formData.start_time && formData.distance_km > 0;
      case 3:
        return formData.session_type && formData.level_required > 0;
      case 4:
        return formData.location_name.trim().length > 0;
      default:
        return true;
    }
  };

  const sessionTypes: Array<{
    value: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
    label: string;
    icon: string;
    description: string;
  }> = [
    { value: 'casual', label: 'Sortie détente', icon: '🚶', description: 'Rythme tranquille' },
    { value: 'recovery', label: 'Récupération', icon: '🧘', description: 'Allure modérée' },
    { value: 'tempo', label: 'Allure soutenue', icon: '🏃', description: 'Rythme challengeant' },
    { value: 'long_run', label: 'Sortie longue', icon: '🗓️', description: 'Endurance fondamentale' },
    { value: 'intervals', label: 'Fractionné', icon: '⚡', description: 'Séance intensive' },
  ];

  const levelLabels = ['Débutant', 'Débutant confirmé', 'Intermédiaire', 'Confirmé', 'Expert'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-forest-50 pt-20 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-500 to-forest-700 bg-clip-text text-transparent mb-2">
            Créer une sortie
          </h1>
          <p className="text-sm text-secondary-600/80">
            {currentStep === 5 ? 'Vérifie et confirme ta sortie' : 'Remplis les informations étape par étape'}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center relative flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      step < currentStep
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                        : step === currentStep
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white ring-4 ring-primary-500/30'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span className="text-xs mt-1 font-medium text-gray-600 hidden md:block">
                    {step === 1 && 'Infos'}
                    {step === 2 && 'Date'}
                    {step === 3 && 'Type'}
                    {step === 4 && 'Lieu'}
                    {step === 5 && 'Recap'}
                  </span>
                </div>
                {step < 5 && (
                  <div
                    className={`h-1 flex-1 transition-all ${
                      step < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-primary-500/20 p-6 md:p-8 min-h-[400px]">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-secondary-600 mb-4">📝 Informations de base</h2>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Titre de la sortie *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ex: Sortie matinale au parc"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Décris ta sortie, l'ambiance, les points de passage..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Date & Distance */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-secondary-600 mb-4">📅 Date et distance</h2>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Date et heure *
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Distance (km) * : {formData.distance_km} km
                  </label>
                  <input
                    type="range"
                    name="distance_km"
                    min="1"
                    max="50"
                    step="0.5"
                    value={formData.distance_km}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 km</span>
                    <span>50 km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Allure cible (optionnel)
                  </label>
                  <input
                    type="text"
                    name="target_pace"
                    value={formData.target_pace}
                    onChange={handleChange}
                    placeholder="Ex: 5'30/km"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Type & Level */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <h2 className="text-xl font-bold text-secondary-600 mb-4">🏃 Type et niveau</h2>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-3">
                    Type de sortie *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {sessionTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, session_type: type.value })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.session_type === type.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-bold text-secondary-600">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-3">
                    Niveau requis * : {levelLabels[formData.level_required - 1]}
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, level_required: level })}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          formData.level_required === level
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-secondary-600">{levelLabels[level - 1]}</span>
                          <span className="text-lg">{'⭐'.repeat(level)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="walk_breaks_ok"
                    checked={formData.walk_breaks_ok}
                    onChange={handleChange}
                    className="w-4 h-4 accent-primary-500"
                  />
                  <label className="text-sm text-secondary-600">
                    Pauses marche autorisées
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Location & Participants */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-secondary-600 mb-4">📍 Localisation</h2>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Lieu de rendez-vous *
                  </label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleChange}
                    placeholder="Ex: Entrée du parc Monceau"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-2">
                    Nombre maximum de participants : {formData.max_participants}
                  </label>
                  <input
                    type="range"
                    name="max_participants"
                    min="2"
                    max="20"
                    value={formData.max_participants}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2 personnes</span>
                    <span>20 personnes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Summary */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-xl font-bold text-secondary-600 mb-4">✅ Récapitulatif</h2>

                <div className="space-y-3">
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="font-bold text-secondary-600 mb-1">{formData.title}</div>
                    {formData.description && (
                      <div className="text-sm text-gray-600">{formData.description}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="text-sm font-medium text-secondary-600">
                        {new Date(formData.start_time).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Distance</div>
                      <div className="text-sm font-medium text-secondary-600">{formData.distance_km} km</div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Type</div>
                      <div className="text-sm font-medium text-secondary-600">
                        {sessionTypes.find((t) => t.value === formData.session_type)?.label}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Niveau</div>
                      <div className="text-sm font-medium text-secondary-600">
                        {levelLabels[formData.level_required - 1]}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Lieu</div>
                    <div className="text-sm font-medium text-secondary-600">{formData.location_name}</div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Participants max</div>
                    <div className="text-sm font-medium text-secondary-600">{formData.max_participants} personnes</div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-secondary-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                    canProceed()
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer la sortie'}
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Cancel Link */}
        <div className="text-center mt-4">
          <Link
            href="/sessions"
            className="text-sm text-gray-500 hover:text-secondary-600 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
