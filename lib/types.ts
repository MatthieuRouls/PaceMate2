export interface Profile {
  id: string;
  username: string;
  running_level: number; // 1-5
  avatar_url?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  start_time: string;
  location_name: string;
  target_pace?: string; // Format: "5:30" (min/km)
  distance_km: number;
  level_required: number; // 1-5
  max_participants: number;
  session_type?: 'casual' | 'recovery' | 'tempo' | 'long_run' | 'intervals';
  walk_breaks_ok: boolean;
  created_at?: string;

  // Relations (populated via joins)
  creator?: Profile;
  participants_count?: number;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  city: string;
  created_at?: string;
}
