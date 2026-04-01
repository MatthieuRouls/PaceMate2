import RunningStatsSection from '@/components/ui/RunningStatsSection';

export const dynamic = 'force-dynamic';

export default function ProfileStatsPage() {
  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Mes statistiques</h1>
          <p className="text-dark-400 mt-1">Progression, badges et connexions</p>
        </div>
        <RunningStatsSection />
      </div>
    </div>
  );
}
