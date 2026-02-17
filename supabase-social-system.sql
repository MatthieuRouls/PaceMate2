-- ============================================
-- PACEMATE SOCIAL SYSTEM - DATABASE SCHEMA
-- Tables: friendships, conversations, conversation_participants, messages
-- ============================================

-- ============================================
-- TABLE: friendships
-- Manages friend relationships between users
-- ============================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================
-- TABLE: conversations
-- Parent table for all chat contexts (direct, team, session)
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'team', 'session')),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_conversation_type CHECK (
    (type = 'direct' AND team_id IS NULL AND session_id IS NULL) OR
    (type = 'team' AND team_id IS NOT NULL AND session_id IS NULL) OR
    (type = 'session' AND session_id IS NOT NULL AND team_id IS NULL)
  )
);

CREATE INDEX idx_conversations_team_id ON conversations(team_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_type ON conversations(type);

-- ============================================
-- TABLE: conversation_participants
-- Tracks who can access each conversation
-- ============================================
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,

  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- ============================================
-- TABLE: messages
-- Stores all chat messages
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of" ON friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Helper function to check conversation membership (bypasses RLS)
CREATE OR REPLACE FUNCTION user_is_conversation_member(conv_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's conversation IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_conversation_ids(uid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT conversation_id FROM conversation_participants WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    user_is_conversation_member(id, auth.uid())
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Conversation participants policies (no recursion)
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    user_is_conversation_member(conversation_id, auth.uid())
  );

CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- ============================================
-- TRIGGERS: Auto-create conversations
-- ============================================

-- Auto-create team conversation when team is created
CREATE OR REPLACE FUNCTION create_team_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  INSERT INTO conversations (type, team_id) VALUES ('team', NEW.id)
  RETURNING id INTO conv_id;

  -- Add team creator as first participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION create_team_conversation();

-- Auto-create session conversation when session is created
CREATE OR REPLACE FUNCTION create_session_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  INSERT INTO conversations (type, session_id) VALUES ('session', NEW.id)
  RETURNING id INTO conv_id;

  -- Add session creator as first participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, NEW.creator_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_created
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION create_session_conversation();

-- Auto-add team members to team conversation
CREATE OR REPLACE FUNCTION add_team_member_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT id INTO conv_id FROM conversations WHERE team_id = NEW.team_id AND type = 'team';
  IF conv_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_membership_created
  AFTER INSERT ON team_memberships
  FOR EACH ROW EXECUTE FUNCTION add_team_member_to_conversation();

-- Auto-add session participants to session conversation
CREATE OR REPLACE FUNCTION add_session_participant_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  IF NEW.status = 'confirmed' THEN
    SELECT id INTO conv_id FROM conversations WHERE session_id = NEW.session_id AND type = 'session';
    IF conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conv_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_participant_added
  AFTER INSERT OR UPDATE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION add_session_participant_to_conversation();

-- Update conversation timestamp when message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Update friendships timestamp on update
CREATE OR REPLACE FUNCTION update_friendship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friendship_updated
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friendship_timestamp();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE friendships;

-- ============================================
-- CREATE CONVERSATIONS FOR EXISTING TEAMS/SESSIONS
-- (Run this only once to backfill)
-- ============================================

-- Create conversations for existing teams
INSERT INTO conversations (type, team_id)
SELECT 'team', id FROM teams
WHERE NOT EXISTS (
  SELECT 1 FROM conversations WHERE team_id = teams.id
);

-- Create conversations for existing sessions
INSERT INTO conversations (type, session_id)
SELECT 'session', id FROM sessions
WHERE NOT EXISTS (
  SELECT 1 FROM conversations WHERE session_id = sessions.id
);

-- Add existing team members to their team conversations
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM conversations c
JOIN team_memberships tm ON tm.team_id = c.team_id
WHERE c.type = 'team'
ON CONFLICT DO NOTHING;

-- Add existing session participants to their session conversations
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, sp.user_id
FROM conversations c
JOIN session_participants sp ON sp.session_id = c.session_id
WHERE c.type = 'session' AND sp.status = 'confirmed'
ON CONFLICT DO NOTHING;

-- Add session creators to their session conversations
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, s.creator_id
FROM conversations c
JOIN sessions s ON s.id = c.session_id
WHERE c.type = 'session'
ON CONFLICT DO NOTHING;
