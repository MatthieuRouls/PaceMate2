export interface Profile {
  id: string;
  email?: string;
  username: string;
  running_level: number; // 1-5
  avatar_url?: string;
  bio?: string;
  team_id?: string;
  total_distance_km?: number;
  xp_points?: number;
  best_times?: string; // JSON string with best times, ex: {"5k": "00:25:30", "10k": "00:52:15"}
  home_latitude?: number;
  home_longitude?: number;
  home_city?: string;
  created_at?: string;

  // Phone verification
  phone_number?: string;
  phone_verified?: boolean;

  // Safety
  safety_enhanced_mode?: boolean;

  // Trusted contact
  trusted_contact_name?: string;
  trusted_contact_phone?: string;
  trusted_contact_relation?: string;

  // Strava integration
  strava_connected?: boolean;
  strava_athlete_id?: number;
  strava_last_sync?: string;
  calculated_avg_pace?: string;
  calculated_weekly_km?: number;
  calculated_longest_run?: number;
  calculated_total_runs?: number;

  // Running stats (persisted, updated on run completion)
  runs_completed?: number;
  runs_hosted?: number;
  total_run_time_minutes?: number;
  people_met?: number;
  reliability_score?: number;
  active_weeks?: number;
  team_runs_contributed?: number;

  // Relations (populated via joins)
  team?: Team;
  completed_sessions_count?: number;
}

// ============================================
// RUNNING STATISTICS
// ============================================

export type BadgeType =
  | 'first_run'
  | 'community_builder'
  | 'reliable_runner'
  | 'social_runner'
  | 'team_player';

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  earned_at: string;
}

export interface RunnerConnection {
  id: string;
  user_id: string;
  other_user_id: string;
  runs_together: number;
  last_run_date: string;
  created_at: string;
  // Populated via join
  other_user?: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
}

export interface RunnerStats {
  // Personal
  runsCompleted: number;
  runsHosted: number;
  totalKm: number;
  totalRunTimeMinutes: number;
  peopleMet: number;
  reliabilityScore: number;   // 0-100
  activeWeeks: number;
  // Team
  teamStats: {
    teamName: string;
    runsCompleted: number;
    totalKm: number;
    activeMembers: number;
  } | null;
  // Social
  recentConnections: Array<{
    userId: string;
    username: string;
    avatarUrl?: string;
    runsTogether: number;
  }>;
  // Badges (earned + progress)
  badges: UserBadge[];
  badgeProgress: Record<BadgeType, { current: number; target: number }>;
}

// ============================================
// IDENTITY VERIFICATION
// ============================================

export type IdentityVerificationLevel = 0 | 1 | 2 | 3;
export type IdentityVerificationLevelName = 'basic' | 'phone_verified' | 'id_verified' | 'trusted';
export type IdDocumentType = 'passport' | 'national_id' | 'drivers_license' | 'residence_permit';

export interface IdentityVerificationRecord {
  id: string;
  user_id: string;
  level: IdentityVerificationLevel;
  level_name: IdentityVerificationLevelName;
  phone_verified: boolean;
  phone_verified_at?: string;
  id_verified: boolean;
  id_verified_at?: string;
  id_document_type?: IdDocumentType;
  id_document_country?: string;
  selfie_match_passed: boolean;
  selfie_verified_at?: string;
  admin_review_required: boolean;
  admin_review_reason?: string;
  verification_attempts: number;
  flagged_for_fraud: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  start_time: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
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
  distance_from_user?: number; // calculated distance in km from user's location
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

// ============================================
// SOCIAL SYSTEM TYPES
// ============================================

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at?: string;
  updated_at?: string;

  // Relations (populated via joins)
  user?: Profile;
  friend?: Profile;
}

export type ConversationType = 'direct' | 'team' | 'session';

export interface Conversation {
  id: string;
  type: ConversationType;
  team_id?: string;
  session_id?: string;
  created_at?: string;
  updated_at?: string;

  // Relations (populated via joins)
  team?: Team;
  session?: Session;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
  other_participant?: Profile; // For direct conversations
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at?: string;
  last_read_at?: string;
  is_muted: boolean;

  // Relations (populated via joins)
  user?: Profile;
}

export type MessageType = 'text' | 'image' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  is_edited: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;

  // Relations (populated via joins)
  sender?: Profile;
}
