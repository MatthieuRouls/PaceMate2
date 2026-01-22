export interface Profile {
  id: string;
  username: string;
  running_level: number; // 1-5
  avatar_url?: string;
  bio?: string;
  team_id?: string;
  total_distance_km?: number;
  xp_points?: number;
  best_times?: string; // JSON string with best times, ex: {"5k": "00:25:30", "10k": "00:52:15"}
  created_at?: string;

  // Relations (populated via joins)
  team?: Team;
  completed_sessions_count?: number;
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  rating?: number; // 1-5 stars
  created_at?: string;

  // Relations (populated via joins)
  session?: Session;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  city?: string;
  total_distance?: number;
  created_at?: string;

  // Relations (populated via joins)
  members_count?: number;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: 'captain' | 'member';
  created_at?: string;
}
