-- Migration for Content Intelligence Features
-- Creates project_urls table and updates tasks table with detailed content fields

-- 1. Create project_urls table for deep inventory
CREATE TABLE IF NOT EXISTS project_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- GSC Metrics (Rolling 30 days usually)
    clicks_30d INTEGER DEFAULT 0,
    impressions_30d INTEGER DEFAULT 0,
    ctr_30d FLOAT DEFAULT 0,
    position_30d FLOAT DEFAULT 0,

    -- Intelligence
    top_query TEXT, 
    top_query_vol INTEGER DEFAULT 0,
    strategic_score INTEGER DEFAULT 0, -- 0-100 score based on opportunity
    
    status TEXT DEFAULT 'indexed', -- 'indexed', 'excluded', 'not_found'
    last_audited_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(project_id, url)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_urls_project_id ON project_urls(project_id);
CREATE INDEX IF NOT EXISTS idx_project_urls_strategic_score ON project_urls(strategic_score DESC);

-- 3. Update tasks table with JSONB fields for rich content data
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS research_dossier JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS outline_structure JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS semantic_refs JSONB DEFAULT '[]'::jsonb; -- Holds the selected top 3 competitor URLs

-- 4. Enable RLS on project_urls
ALTER TABLE project_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project_urls of their projects" ON project_urls
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

CREATE POLICY "Users can insert project_urls for their projects" ON project_urls
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

CREATE POLICY "Users can update project_urls of their projects" ON project_urls
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

CREATE POLICY "Users can delete project_urls of their projects" ON project_urls
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );
