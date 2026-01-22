'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/providers/ThemeProvider';
import { createSession, CreateSessionData } from '@/lib/actions';

// Désactiver la pré-génération statique
export const dynamic = 'force-dynamic';

export default function CreateSessionPage() {
  const router = useRouter();
  const { theme } = useTheme();

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
      '⭐ Débutant',
      '⭐⭐ Débutant confirmé',
      '⭐⭐⭐ Intermédiaire',
      '⭐⭐⭐⭐ Confirmé',
      '⭐⭐⭐⭐⭐ Expert',
    ];
    return labels[level - 1] || '';
  };

  // Libellés des types de session
  const sessionTypeLabels: Record<string, string> = {
    casual: 'Sortie détente',
    recovery: 'Récupération',
    tempo: 'Allure soutenue',
    long_run: 'Sortie longue',
    intervals: 'Fractionné',
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Créer une sortie</h1>
          <p className="opacity-75">Propose une nouvelle session de running à la communauté</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Message d'erreur */}
          {error && (
            <div
              className="p-4 rounded-lg border-2 border-red-500 bg-red-50 text-red-700"
              style={
                theme === 'elite'
                  ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgb(239, 68, 68)' }
                  : {}
              }
            >
              <p className="font-semibold">❌ Erreur</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Titre */}
          <div>
            <label htmlFor="title" className="block font-semibold mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Ex: Sortie matinale au parc"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block font-semibold mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              maxLength={500}
              rows={4}
              placeholder="Décris l'ambiance et le parcours de la sortie..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
            <p className="text-sm opacity-75 mt-1">
              {formData.description?.length || 0}/500 caractères
            </p>
          </div>

          {/* Date et heure */}
          <div>
            <label htmlFor="start_time" className="block font-semibold mb-2">
              Date et heure <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
          </div>

          {/* Lieu */}
          <div>
            <label htmlFor="location_name" className="block font-semibold mb-2">
              Lieu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="location_name"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              required
              placeholder="Ex: Parc de la Tête d'Or, Lyon"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
          </div>

          {/* Distance */}
          <div>
            <label htmlFor="distance_km" className="block font-semibold mb-2">
              Distance (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="distance_km"
              name="distance_km"
              value={formData.distance_km}
              onChange={handleChange}
              required
              min={1}
              max={100}
              step={0.5}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
          </div>

          {/* Type de session */}
          <div>
            <label htmlFor="session_type" className="block font-semibold mb-2">
              Type de session
            </label>
            <select
              id="session_type"
              name="session_type"
              value={formData.session_type}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            >
              {Object.entries(sessionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Niveau requis */}
          <div>
            <label className="block font-semibold mb-3">
              Niveau requis <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <label
                  key={level}
                  className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all hover:bg-gray-50"
                  style={{
                    borderRadius: 'var(--radius)',
                    borderColor:
                      formData.level_required === level
                        ? 'var(--color-primary)'
                        : theme === 'elite'
                        ? 'rgba(167, 139, 250, 0.2)'
                        : '#e5e7eb',
                    borderWidth: formData.level_required === level ? '2px' : '1px',
                    backgroundColor:
                      formData.level_required === level
                        ? theme === 'elite'
                          ? 'rgba(167, 139, 250, 0.1)'
                          : 'rgba(34, 197, 94, 0.05)'
                        : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="level_required"
                    value={level}
                    checked={formData.level_required === level}
                    onChange={() => handleLevelChange(level)}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span className="flex-1">{getLevelLabel(level)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Allure cible */}
          <div>
            <label htmlFor="target_pace" className="block font-semibold mb-2">
              Allure cible (optionnel)
            </label>
            <input
              type="text"
              id="target_pace"
              name="target_pace"
              value={formData.target_pace}
              onChange={handleChange}
              placeholder="Ex: 5:30 (5min30/km)"
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
            <p className="text-sm opacity-75 mt-1">Format: min:sec (ex: 5:30 pour 5min30/km)</p>
          </div>

          {/* Pauses marche autorisées */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="walk_breaks_ok"
                checked={formData.walk_breaks_ok}
                onChange={handleChange}
                className="w-5 h-5 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="font-semibold">Pauses marche autorisées</span>
            </label>
          </div>

          {/* Nombre max de participants */}
          <div>
            <label htmlFor="max_participants" className="block font-semibold mb-2">
              Nombre maximum de participants
            </label>
            <input
              type="number"
              id="max_participants"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              min={2}
              max={20}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : undefined,
              }}
            />
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Création en cours...' : '✨ Créer la sortie'}
            </button>
            <Link
              href="/sessions"
              className="flex-1 px-6 py-3 text-center rounded-lg font-medium border-2 transition-all hover:bg-gray-50"
              style={{
                borderRadius: 'var(--radius)',
                borderColor: theme === 'elite' ? 'rgba(167, 139, 250, 0.3)' : '#d1d5db',
              }}
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
