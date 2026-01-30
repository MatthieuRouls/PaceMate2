'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSession, CreateSessionData } from '@/lib/actions';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

export default function CreateSessionPage() {
  const router = useRouter();

  // State du formulaire
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

  // Gestion du changement de champs
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

  // Gestion du changement de niveau (radio buttons)
  const handleLevelChange = (level: number) => {
    setFormData((prev) => ({ ...prev, level_required: level }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createSession(formData);

      if (result.success) {
        // Redirection vers le feed
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

  // Styles pour les labels d'étoiles
  const getLevelLabel = (level: number): string => {
    const labels = [
      'Débutant',
      'Débutant confirmé',
      'Intermédiaire',
      'Confirmé',
      'Expert',
    ];
    return labels[level - 1] || '';
  };

  const getLevelStars = (level: number): string => {
    return '⭐'.repeat(level);
  };

  const getLevelDescription = (level: number): string => {
    const descriptions = [
      'Première expérience en course à pied',
      'Pratique régulière depuis quelques mois',
      'Course régulière, bon niveau général',
      'Pratique intensive, objectifs compétitifs',
      'Niveau très avancé, performances élevées',
    ];
    return descriptions[level - 1] || '';
  };

  // Types de session
  const sessionTypes = [
    {
      value: 'casual',
      label: 'Sortie détente',
      icon: '🚶',
      description: 'Rythme tranquille et convivial',
    },
    {
      value: 'recovery',
      label: 'Récupération',
      icon: '🧘',
      description: 'Allure très modérée',
    },
    {
      value: 'tempo',
      label: 'Allure soutenue',
      icon: '🏃',
      description: 'Rythme challengeant',
    },
    {
      value: 'long_run',
      label: 'Sortie longue',
      icon: '🗓️',
      description: 'Endurance fondamentale',
    },
    {
      value: 'intervals',
      label: 'Fractionné',
      icon: '⚡',
      description: 'Séance intensive',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-600 mb-1">Créer une sortie</h1>
              <p className="text-gray-600">
                Propose une session et trouve des partenaires de course
              </p>
            </div>
            <Link
              href="/sessions"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              ← Retour
            </Link>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message d'erreur */}
          {error && (
            <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="font-semibold text-red-900 text-lg">Une erreur est survenue</p>
              </div>
              <p className="text-red-700 ml-13">{error}</p>
            </div>
          )}

          {/* Section 1: Informations générales */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-secondary-600">Informations générales</h2>
            </div>

            <div className="space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-secondary-600 mb-2">
                  Titre de la sortie *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Ex: Sortie matinale au parc"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-secondary-600 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Décris l'ambiance et le parcours de la sortie..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400 resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {formData.description?.length || 0}/500 caractères
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Date, Lieu et Distance */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-secondary-600">Date, lieu et distance</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Date et heure */}
              <div>
                <label className="block text-sm font-semibold text-secondary-600 mb-2">
                  Date et heure *
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600"
                />
              </div>

              {/* Distance */}
              <div>
                <label className="block text-sm font-semibold text-secondary-600 mb-2">
                  Distance (km) *
                </label>
                <input
                  type="number"
                  name="distance_km"
                  value={formData.distance_km.toString()}
                  onChange={handleChange}
                  required
                  min={1}
                  max={100}
                  step={0.5}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600"
                />
              </div>

              {/* Lieu */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-secondary-600 mb-2">
                  Lieu de rendez-vous *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Parc de la Tête d'Or, Lyon"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Type de sortie */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-secondary-600">Type de sortie</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionTypes.map((type) => (
                <label
                  key={type.value}
                  className={`
                    relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 hover:scale-105
                    ${
                      formData.session_type === type.value
                        ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-orange-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="session_type"
                    value={type.value}
                    checked={formData.session_type === type.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-3xl mb-3">{type.icon}</div>
                  <div className="font-bold text-secondary-600 mb-1">
                    {type.label}
                  </div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                  {formData.session_type === type.value && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Niveau requis */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-secondary-600">Niveau requis</h2>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <label
                  key={level}
                  className={`
                    flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${
                      formData.level_required === level
                        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-orange-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="level_required"
                    value={level}
                    checked={formData.level_required === level}
                    onChange={() => handleLevelChange(level)}
                    className="w-5 h-5 text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">{getLevelStars(level)}</span>
                      <span className="font-bold text-secondary-600 text-lg">
                        {getLevelLabel(level)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{getLevelDescription(level)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 5: Détails avancés */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-secondary-600">Paramètres avancés</h2>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Allure cible */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-600 mb-2">
                    Allure cible (optionnel)
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="target_pace"
                      value={formData.target_pace}
                      onChange={handleChange}
                      placeholder="Ex: 5:30"
                      pattern="[0-9]{1,2}:[0-9]{2}"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600 placeholder:text-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Format: min:sec (ex: 5:30 pour 5min30/km)
                  </p>
                </div>

                {/* Participants max */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-600 mb-2">
                    Participants maximum
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      name="max_participants"
                      value={formData.max_participants.toString()}
                      onChange={handleChange}
                      min={2}
                      max={20}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-secondary-600"
                    />
                  </div>
                </div>
              </div>

              {/* Pauses marche */}
              <label className="flex items-start gap-4 cursor-pointer p-5 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white">
                <input
                  type="checkbox"
                  name="walk_breaks_ok"
                  checked={formData.walk_breaks_ok}
                  onChange={handleChange}
                  className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-secondary-600 block mb-1">
                    Pauses marche autorisées
                  </span>
                  <span className="text-sm text-gray-600">
                    Idéal pour les débutants ou les sorties longues. Permet d'alterner marche et course.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création en cours...
                  </span>
                ) : (
                  'Créer la sortie'
                )}
              </button>
              <Link href="/sessions" className="sm:w-auto">
                <button
                  type="button"
                  className="w-full px-8 py-4 bg-white text-secondary-600 font-bold rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Annuler
                </button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
