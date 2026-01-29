import { Search, Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] flex items-center justify-center text-white font-bold shadow-lg">
            P
          </div>
          <span className="text-2xl font-bold text-[#0A1F44]">
            PaceMate
          </span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          <a href="#" className="text-[#0A1F44]/80 hover:text-[#FF6B35] transition-colors text-sm font-medium">
            Explorer
          </a>
          <a href="#" className="text-[#0A1F44]/80 hover:text-[#FF6B35] transition-colors text-sm font-medium">
            Sessions
          </a>
          <a href="#" className="text-[#0A1F44]/80 hover:text-[#FF6B35] transition-colors text-sm font-medium">
            Communauté
          </a>
          <a href="#" className="text-[#0A1F44]/80 hover:text-[#FF6B35] transition-colors text-sm font-medium">
            Événements
          </a>
        </nav>

        {/* User actions */}
        <div className="flex items-center gap-4">
          <button className="w-9 h-9 rounded-lg hover:bg-[#0A1F44]/5 flex items-center justify-center transition-all">
            <Search className="w-5 h-5 text-[#0A1F44]/70" />
          </button>
          <button className="w-9 h-9 rounded-lg hover:bg-[#0A1F44]/5 flex items-center justify-center transition-all relative">
            <Bell className="w-5 h-5 text-[#0A1F44]/70" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B35] rounded-full"></span>
          </button>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] p-0.5">
            <img
              src="https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="User avatar"
              className="w-full h-full rounded-lg object-cover"
            />
          </div>
          <button className="ml-2 px-5 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#FF5722] transition-all shadow-md">
            Créer une session
          </button>
        </div>
      </div>
    </header>
  );
}
