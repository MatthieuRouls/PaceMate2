export default function RootLoading() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo mark */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-500 opacity-20 animate-ping" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-neon-500 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M13 3L6 14h6l-1 7 7-11h-6l1-7z" fill="currentColor" />
            </svg>
          </div>
        </div>
        <p className="text-dark-400 text-sm font-medium animate-pulse">Chargement…</p>
      </div>
    </div>
  );
}
