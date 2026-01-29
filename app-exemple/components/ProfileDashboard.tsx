import { Trophy, Target, Flame, TrendingUp, Star } from 'lucide-react';

export function ProfileDashboard() {
  const level = 4;
  const currentXP = 7850;
  const nextLevelXP = 10000;
  const progress = (currentXP / nextLevelXP) * 100;

  return (
    <section className="py-20 px-8 bg-gradient-to-br from-[#0A1F44]/5 to-[#FF6B35]/5">
      <div className="max-w-[1440px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#0A1F44] mb-4">
            Ton{' '}
            <span className="text-[#FF6B35]">
              Dashboard
            </span>
          </h2>
          <p className="text-lg text-[#0A1F44]/70">
            Suis ta progression et atteins tes objectifs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-white rounded-2xl p-8 shadow-md border border-gray-100">
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] p-1">
                  <img
                    src="https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Profile"
                    className="w-full h-full rounded-2xl object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0A1F44]">Emma Rousseau</h3>
                  <p className="text-sm text-[#0A1F44]/60">@emma_runs</p>
                </div>
              </div>

              {/* Level */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0A1F44]">Niveau {level}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < level
                            ? 'text-[#FF6B35] fill-[#FF6B35]'
                            : 'text-gray-300 fill-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF6B35] to-[#FF8A5C] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-[#0A1F44]/60">
                  <span>{currentXP.toLocaleString()} XP</span>
                  <span>{nextLevelXP.toLocaleString()} XP</span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#0A1F44]/70">Followers</span>
                  <span className="font-semibold text-[#0A1F44]">1,247</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#0A1F44]/70">Following</span>
                  <span className="font-semibold text-[#0A1F44]">589</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#0A1F44]/70">Sessions ce mois</span>
                  <span className="font-semibold text-[#0A1F44]">18</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
            {/* Distance Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-[#0A1F44]">247.8 km</div>
                <div className="text-sm text-[#0A1F44]/60">Distance totale</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-medium">+12.5%</span>
                <span className="text-[#0A1F44]/60">vs. mois dernier</span>
              </div>
            </div>

            {/* Sessions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#0A1F44] flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-[#0A1F44]">156</div>
                <div className="text-sm text-[#0A1F44]/60">Sessions complétées</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-medium">+8.3%</span>
                <span className="text-[#0A1F44]/60">vs. mois dernier</span>
              </div>
            </div>

            {/* XP Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8A5C] to-[#FFD700] flex items-center justify-center">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-[#0A1F44]">7,850 XP</div>
                <div className="text-sm text-[#0A1F44]/60">Points d'expérience</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500 font-medium">+245 XP</span>
                <span className="text-[#0A1F44]/60">cette semaine</span>
              </div>
            </div>

            {/* Streak Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFD700] flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl">🔥</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-[#0A1F44]">12 jours</div>
                <div className="text-sm text-[#0A1F44]/60">Streak actuelle</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#FF6B35] font-medium">Record: 23 jours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
