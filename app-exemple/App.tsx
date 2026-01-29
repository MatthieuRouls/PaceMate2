import { Header } from '@/app/components/Header';
import { HeroSection } from '@/app/components/HeroSection';
import { SessionCard } from '@/app/components/SessionCard';
import { ProfileDashboard } from '@/app/components/ProfileDashboard';

// Mock data for sessions
const sessions = [
  {
    title: 'Morning Run au Parc',
    distance: '10km',
    pace: '5\'15"',
    duration: '52m',
    location: 'Parc des Buttes-Chaumont',
    participants: [
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 5,
    difficulty: 3,
    time: 'Aujourd\'hui à 7:00',
  },
  {
    title: 'Interval Training',
    distance: '8km',
    pace: '4\'45"',
    duration: '38m',
    location: 'Stade Charléty',
    participants: [
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 6,
    difficulty: 4,
    time: 'Aujourd\'hui à 18:30',
  },
  {
    title: 'Weekend Long Run',
    distance: '15km',
    pace: '5\'45"',
    duration: '1h26m',
    location: 'Bois de Vincennes',
    participants: [
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 4,
    difficulty: 4,
    time: 'Samedi à 9:00',
  },
  {
    title: 'Easy Recovery Run',
    distance: '5km',
    pace: '6\'00"',
    duration: '30m',
    location: 'Seine berges',
    participants: [
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 3,
    difficulty: 2,
    time: 'Demain à 7:30',
  },
  {
    title: 'Trail Running',
    distance: '12km',
    pace: '6\'15"',
    duration: '1h15m',
    location: 'Forêt de Fontainebleau',
    participants: [
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 8,
    difficulty: 5,
    time: 'Dimanche à 10:00',
  },
  {
    title: 'Speed Work Session',
    distance: '6km',
    pace: '4\'30"',
    duration: '27m',
    location: 'Piste Porte de la Plaine',
    participants: [
      'https://images.unsplash.com/photo-1611881290245-dea287db1269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZpdG5lc3N8ZW58MXx8fHwxNzY5NjkxMzUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1768853972795-2739a9685567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYXRobGV0ZXxlbnwxfHx8fDE3Njk2OTEzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    maxParticipants: 6,
    difficulty: 5,
    time: 'Jeudi à 19:00',
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#FF6B35]/5 via-transparent to-[#0A1F44]/5 pointer-events-none"></div>
      
      {/* Decorative blurred circles */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-[#0A1F44]/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <Header />
        <HeroSection />
        
        {/* Sessions Feed Section */}
        <section className="py-20 px-8">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#0A1F44] mb-4">
                Sessions{' '}
                <span className="text-[#FF6B35]">
                  disponibles
                </span>
              </h2>
              <p className="text-lg text-[#0A1F44]/70">
                Rejoins une session ou crée la tienne
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session, index) => (
                <SessionCard key={index} {...session} />
              ))}
            </div>
          </div>
        </section>

        <ProfileDashboard />

        {/* Footer CTA */}
        <section className="py-20 px-8">
          <div className="max-w-[1440px] mx-auto">
            <div className="bg-gradient-to-br from-[#0A1F44] to-[#1a3a6b] rounded-3xl p-12 shadow-xl text-center space-y-6">
              <h2 className="text-4xl font-bold text-white">
                Prêt à rejoindre la{' '}
                <span className="text-[#FF6B35]">
                  communauté
                </span>{' '}
                ?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Des milliers de runners t'attendent pour partager leur passion et progresser ensemble.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <button className="px-8 py-4 rounded-xl bg-[#FF6B35] text-white font-semibold shadow-lg hover:bg-[#FF5722] transition-all hover:scale-105">
                  Créer mon compte
                </button>
                <button className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-semibold hover:bg-white/20 transition-all hover:scale-105">
                  En savoir plus
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-8 border-t border-gray-100">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] flex items-center justify-center text-white font-bold shadow-lg">
                  P
                </div>
                <span className="text-xl font-bold text-[#0A1F44]">
                  PaceMate
                </span>
              </div>
              
              <div className="flex gap-8 text-sm text-[#0A1F44]/70">
                <a href="#" className="hover:text-[#FF6B35] transition-colors">À propos</a>
                <a href="#" className="hover:text-[#FF6B35] transition-colors">Contact</a>
                <a href="#" className="hover:text-[#FF6B35] transition-colors">Confidentialité</a>
                <a href="#" className="hover:text-[#FF6B35] transition-colors">CGU</a>
              </div>
              
              <div className="text-sm text-[#0A1F44]/60">
                © 2026 PaceMate. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
