import { MapPin, Clock, Zap } from 'lucide-react';

interface SessionCardProps {
  title: string;
  distance: string;
  pace: string;
  duration: string;
  location: string;
  participants: string[];
  maxParticipants: number;
  difficulty: number;
  time: string;
}

export function SessionCard({
  title,
  distance,
  pace,
  duration,
  location,
  participants,
  maxParticipants,
  difficulty,
  time
}: SessionCardProps) {
  return (
    <div className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer border border-gray-100">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-[#0A1F44]">{title}</h3>
            <div className="flex items-center gap-1 text-[#0A1F44]/60 text-sm">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < difficulty
                    ? 'bg-[#FF6B35]'
                    : 'bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#FF6B35]">
              {distance}
            </div>
            <div className="text-xs text-[#0A1F44]/60">Distance</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#0A1F44]">{pace}</div>
            <div className="text-xs text-[#0A1F44]/60">Allure</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#0A1F44]">{duration}</div>
            <div className="text-xs text-[#0A1F44]/60">Durée</div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-[#0A1F44]/70">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex -space-x-3">
            {participants.map((participant, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8A5C] p-0.5"
              >
                <img
                  src={participant}
                  alt="Participant"
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              </div>
            ))}
            {participants.length < maxParticipants && (
              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-[#0A1F44]">
                  +{maxParticipants - participants.length}
                </span>
              </div>
            )}
          </div>
          <button className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-medium shadow-md hover:bg-[#FF5722] transition-all group-hover:scale-105">
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}
