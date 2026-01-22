'use client';

import { useTheme } from '../components/providers/ThemeProvider';

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">
            PaceMate
          </h1>
          <button
            onClick={toggleTheme}
            className="btn-primary"
          >
            Thème : {theme === 'discovery' ? '🌞 Débutant' : '⚡ Expert'}
          </button>
        </div>

        {/* Demo Cards */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">
              Bienvenue sur PaceMate
            </h2>
            <p className="mb-4">
              Cette application change de design selon ton niveau de course !
            </p>
            <p className="text-sm opacity-75">
              Thème actuel : <strong>{theme === 'discovery' ? 'Discovery (Débutant)' : 'Elite (Expert)'}</strong>
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-3">Exemple de session</h3>
            <div className="space-y-2">
              <p><strong>Titre :</strong> Sortie longue dimanche matin</p>
              <p><strong>Distance :</strong> 15 km</p>
              <p><strong>Allure :</strong> {theme === 'discovery' ? 'Tranquille avec pauses' : '5:30 min/km'}</p>
              <p><strong>Niveau :</strong> {theme === 'discovery' ? '⭐ Débutant' : '⭐⭐⭐⭐⭐ Expert'}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-3">Statistiques</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                  127
                </p>
                <p className="text-sm opacity-75">km ce mois</p>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                  12
                </p>
                <p className="text-sm opacity-75">sorties</p>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                  5:45
                </p>
                <p className="text-sm opacity-75">min/km moyen</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="card border-2" style={{ borderColor: 'var(--color-primary)' }}>
            <h3 className="text-xl font-semibold mb-3">✅ Test réussi !</h3>
            <p>Clique sur le bouton en haut à droite pour basculer entre les thèmes.</p>
            <p className="mt-2 text-sm opacity-75">
              Observe comment les couleurs, les arrondis et les polices changent automatiquement.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}