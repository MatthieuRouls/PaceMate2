-- ============================================
-- FIX RLS RECURSION FOR CONVERSATION_PARTICIPANTS
-- Execute this in Supabase SQL Editor
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view co-participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Create helper functions (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION user_is_conversation_member(conv_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_conversation_ids(uid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT conversation_id FROM conversation_participants WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using helper functions (no recursion)
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    user_is_conversation_member(id, auth.uid())
  );

-- Allow authenticated users to create conversations
CREATE POLICY "Authenticated users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    user_is_conversation_member(conversation_id, auth.uid())
  );
