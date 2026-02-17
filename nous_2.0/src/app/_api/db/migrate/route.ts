import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST() {
    try {
        const migrationSQL = `
-- Migration for Content Intelligence Features
-- Creates project_urls table and updates content_tasks table with detailed content fields

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

-- 3. Update content_tasks table with missing fields and rich content data
ALTER TABLE content_tasks 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS target_keyword TEXT,
ADD COLUMN IF NOT EXISTS target_url_slug TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS volume INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS viability TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ai_percentage INTEGER,
ADD COLUMN IF NOT EXISTS docs_url TEXT,
ADD COLUMN IF NOT EXISTS layout_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS research_dossier JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS outline_structure JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS semantic_refs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS url TEXT;

-- 4. Enable RLS on project_urls
ALTER TABLE project_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project_urls of their projects" ON project_urls;
CREATE POLICY "Users can view project_urls of their projects" ON project_urls
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can insert project_urls for their projects" ON project_urls;
CREATE POLICY "Users can insert project_urls for their projects" ON project_urls
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can update project_urls of their projects" ON project_urls;
CREATE POLICY "Users can update project_urls of their projects" ON project_urls
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can delete project_urls of their projects" ON project_urls;
CREATE POLICY "Users can delete project_urls of their projects" ON project_urls
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );
        `;

        // Execute the migration using Supabase admin client
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migrationSQL
        });

        if (error) {
            console.error('Migration error:', error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Content Intelligence tables created successfully',
            data
        });

    } catch (error: any) {
        console.error('Migration execution error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
