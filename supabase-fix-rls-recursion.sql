-- ============================================
-- FIX RLS FOR CONVERSATIONS & PARTICIPANTS
-- Execute this in Supabase SQL Editor
-- ============================================

-- STEP 1: Drop ALL existing policies on conversations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON conversations';
    END LOOP;
END $$;

-- STEP 2: Drop ALL existing policies on conversation_participants
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON conversation_participants';
    END LOOP;
END $$;

-- STEP 3: Create helper functions (SECURITY DEFINER bypasses RLS)
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

-- STEP 4: Recreate clean policies for conversations
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (user_is_conversation_member(id, auth.uid()));

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 5: Recreate clean policies for conversation_participants
CREATE POLICY "conv_participants_select" ON conversation_participants
  FOR SELECT USING (user_is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "conv_participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conv_participants_update" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);
