-- CHAT IMPROVEMENTS: EDIT AND DELETE MESSAGES WITH ROLES

-- 1. Add is_edited and updated_at to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Update RLS for Delete
DROP POLICY IF EXISTS "Delete messages" ON messages;
CREATE POLICY "Delete messages" ON messages
  FOR DELETE USING (
    -- User can delete their own messages
    auth.uid() = sender_id 
    OR 
    -- Admin/Owner can delete any message in the project
    (
      project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM projects WHERE id = messages.project_id AND owner_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM project_members WHERE project_id = messages.project_id AND user_id = auth.uid() AND role = 'admin')
      )
    )
  );

-- 3. Update RLS for Update (Editing)
-- Users can only edit THEIR OWN messages.
-- Admins should NOT be able to edit others' messages (as per user request).
DROP POLICY IF EXISTS "Update own messages" ON messages;
CREATE POLICY "Update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 4. Enable Realtime for Delete and Update on messages table
-- This is often already enabled but good to ensure
alter publication supabase_realtime add table messages;
comment on table messages is e'@realtime *';
