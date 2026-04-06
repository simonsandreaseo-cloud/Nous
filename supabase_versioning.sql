
-- CONTENT HISTORY TABLE for real-time auto-saves and versioning
CREATE TABLE IF NOT EXISTS content_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_type text NOT NULL, -- 'content_draft', 'task', 'tool_state', etc.
  resource_id text NOT NULL,   -- The ID of the item being versioned
  content jsonb NOT NULL,      -- The full state/content snapshot
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_autosave boolean DEFAULT false,
  version_label text           -- Optional label for named versions
);

-- Optimize queries for history by resource
CREATE INDEX IF NOT EXISTS idx_content_history_resource ON content_history(resource_type, resource_id);

-- Enable RLS
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own history
CREATE POLICY "Users can view own content history" ON content_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content history" ON content_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional: Policy to allow project members to view history (if resource linked to project)
-- This is more complex but we can start with user-based.
