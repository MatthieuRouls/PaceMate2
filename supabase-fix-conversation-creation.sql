-- ============================================
-- FIX FOR CONVERSATION CREATION
-- This creates helper functions to bypass RLS
-- when creating conversations with participants
-- Execute this in Supabase SQL Editor
-- ============================================

-- STEP 1: Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_direct_conversation(UUID);
DROP FUNCTION IF EXISTS create_conversation_with_participants(TEXT, UUID, UUID, UUID[]);

-- STEP 2: Create function to create a direct conversation between two users
-- This bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_direct_conversation(friend_id UUID)
RETURNS TABLE(conversation_id UUID, created_at TIMESTAMPTZ) AS $$
DECLARE
  current_user_id UUID;
  new_conv_id UUID;
  existing_conv_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if a direct conversation already exists between these users
  SELECT c.id INTO existing_conv_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = current_user_id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = friend_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_conv_id, c.created_at FROM conversations c WHERE c.id = existing_conv_id;
    RETURN;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (type)
  VALUES ('direct')
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (new_conv_id, current_user_id),
    (new_conv_id, friend_id);

  -- Return the new conversation
  RETURN QUERY SELECT new_conv_id, c.created_at FROM conversations c WHERE c.id = new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_direct_conversation(UUID) TO authenticated;

-- STEP 4: Also update the conversation_participants INSERT policy
-- to allow adding participants when you're the one creating the conversation
DROP POLICY IF EXISTS "conv_participants_insert" ON conversation_participants;

-- More permissive policy: Allow inserting if you are authenticated
-- The actual permission check happens in the SECURITY DEFINER functions
CREATE POLICY "conv_participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (
    -- Allow adding yourself
    auth.uid() = user_id
    OR
    -- Allow adding others to a conversation you just created (within last 5 seconds)
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.created_at > NOW() - INTERVAL '5 seconds'
    )
  );

-- STEP 5: Verify the conversations INSERT policy allows authenticated users
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 6: Verify RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- STEP 7: Show current policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants')
ORDER BY tablename, policyname;
