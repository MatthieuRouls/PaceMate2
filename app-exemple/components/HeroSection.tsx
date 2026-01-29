import { Play, Users } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-block bg-[#FF6B35]/10 rounded-full px-6 py-2">
              <span className="text-sm font-semibold text-[#FF6B35]">
                🏃‍♂️ Rejoins 10,000+ runners
              </span>
            </div>

            <h1 className="text-6xl font-bold text-[#0A1F44] leading-tight">
              Trouve ton{' '}
              <span className="bg-gradient-to-r from-[#FF6B35] to-[#FF8A5C] bg-clip-text text-transparent">
                binôme
              </span>{' '}
              running
            </h1>

            <p className="text-xl text-[#0A1F44]/70 leading-relaxed max-w-lg">
              Connecte-toi avec des runners de ton niveau, partage tes sessions et progresse ensemble dans une communauté motivante.
            </p>

            <div className="flex gap-4">
              <button className="px-8 py-4 rounded-xl bg-[#FF6B35] text-white font-semibold shadow-lg hover:bg-[#FF5722] transition-all hover:scale-105 flex items-center gap-2">
                <Play className="w-5 h-5" fill="white" />
                Commencer
              </button>
              <button className="px-8 py-4 rounded-xl bg-[#0A1F44] text-white font-semibold shadow-lg hover:bg-[#0A1F44]/90 transition-all hover:scale-105 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Découvrir
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-[#FF6B35]">
                  10K+
                </div>
                <div className="text-sm text-[#0A1F44]/60">Runners actifs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#FF6B35]">
                  50K+
                </div>
                <div className="text-sm text-[#0A1F44]/60">Sessions partagées</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#FF6B35]">
                  4.8★
                </div>
                <div className="text-sm text-[#0A1F44]/60">Note moyenne</div>
              </div>
            </div>
          </div>

          {/* Right - iPhone mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 to-[#0A1F44]/20 rounded-[48px] blur-3xl"></div>
            <div className="relative bg-white rounded-[48px] shadow-2xl p-8">
              <div className="bg-gradient-to-br from-[#0A1F44] to-[#1a3a6b] rounded-[40px] p-8 aspect-[9/16] flex flex-col justify-between">
                {/* Phone header */}
                <div className="flex items-center justify-between text-white">
                  <div className="text-sm font-medium">9:41</div>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-white/30"></div>
                    <div className="w-4 h-4 rounded-full bg-white/30"></div>
                    <div className="w-4 h-4 rounded-full bg-white"></div>
                  </div>
                </div>

                {/* Phone content */}
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 space-y-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">Aujourd'hui</span>
                      <span className="text-white/70 text-sm">12 Jan</span>
                    </div>
                    <div className="text-5xl font-bold text-white">8.2 km</div>
                    <div className="flex gap-4 text-white/90">
                      <div className="text-sm">
                        <div className="font-semibold">5'12"</div>
                        <div className="text-white/60 text-xs">Pace</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold">42:15</div>
                        <div className="text-white/60 text-xs">Durée</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 flex items-center gap-3 border border-white/10">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C]"></div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">Sarah Martin</div>
                      <div className="text-white/70 text-xs">Running proche - 5 min</div>
                    </div>
                    <button className="px-4 py-2 bg-[#FF6B35] rounded-full text-sm font-medium text-white">
                      Rejoindre
                    </button>
                  </div>
                </div>

                {/* Phone nav */}
                <div className="bg-white/10 backdrop-blur-xl rounded-full p-2 flex justify-around border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white"></div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-sm bg-white/50"></div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white/50"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
