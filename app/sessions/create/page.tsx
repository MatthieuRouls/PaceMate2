'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Input, { Textarea } from '@/components/ui/Input';
import Card from '@/components/ui/Card';
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
    <div className="min-h-screen py-8">
      <Container maxW="2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2">Créer une sortie</h1>
          <p className="text-gray-600">
            Propose une session et trouve des partenaires de course
          </p>
        </div>

        {/* Formulaire */}
        <Card variant="glass" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message d'erreur */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">❌</span>
                  <p className="font-semibold text-red-900">Erreur</p>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Titre */}
            <div className="form-section">
              <Input
                label="Titre de la sortie"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Ex: Sortie matinale au parc"
              />
            </div>

            {/* Description */}
            <div className="form-section">
              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                maxLength={500}
                rows={4}
                placeholder="Décris l'ambiance et le parcours de la sortie..."
              />
              <p className="text-sm text-gray-500 mt-2">
                {formData.description?.length || 0}/500 caractères
              </p>
            </div>

            {/* Date/heure et Distance */}
            <div className="form-section">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Date et heure"
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Distance (km)"
                  type="number"
                  name="distance_km"
                  value={formData.distance_km.toString()}
                  onChange={handleChange}
                  required
                  min={1}
                  max={100}
                  step={0.5}
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="form-section">
              <Input
                label="Lieu de rendez-vous"
                type="text"
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                required
                placeholder="Ex: Parc de la Tête d'Or, Lyon"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </div>

            {/* Type de session */}
            <div className="form-section">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Type de sortie
              </label>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sessionTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`
                      relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200
                      ${
                        formData.session_type === type.value
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-gray-200 bg-white/40 hover:border-gray-300'
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
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                    {formData.session_type === type.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Niveau requis */}
            <div className="form-section">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Niveau requis
              </label>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => (
                  <label
                    key={level}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${
                        formData.level_required === level
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-gray-200 bg-white/40 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="level_required"
                      value={level}
                      checked={formData.level_required === level}
                      onChange={() => handleLevelChange(level)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getLevelStars(level)}</span>
                        <span className="font-semibold text-gray-900">
                          {getLevelLabel(level)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{getLevelDescription(level)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Allure et Participants */}
            <div className="form-section">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Allure cible (optionnel)"
                  type="text"
                  name="target_pace"
                  value={formData.target_pace}
                  onChange={handleChange}
                  placeholder="Ex: 5:30"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <Input
                  label="Participants max"
                  type="number"
                  name="max_participants"
                  value={formData.max_participants.toString()}
                  onChange={handleChange}
                  min={2}
                  max={20}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Format allure: min:sec (ex: 5:30 pour 5min30/km)
              </p>
            </div>

            {/* Pauses marche */}
            <div className="form-section">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-white/40 hover:bg-white/60 transition-colors">
                <input
                  type="checkbox"
                  name="walk_breaks_ok"
                  checked={formData.walk_breaks_ok}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <span className="font-semibold text-gray-900 block">
                    Pauses marche autorisées
                  </span>
                  <span className="text-sm text-gray-600">
                    Idéal pour les débutants ou sorties longues
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                variant="gradient"
                size="md"
                fullWidth
                loading={loading}
              >
                {loading ? 'Création en cours...' : 'Créer la sortie'}
              </Button>
              <Link href="/sessions" className="sm:w-auto">
                <Button type="button" variant="outline" size="md" fullWidth>
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </Container>
    </div>
  );
}
