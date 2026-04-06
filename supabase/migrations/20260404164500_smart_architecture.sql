-- Add architecture settings to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS architecture_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS architecture_instructions TEXT;

-- Add category to project_urls for better segmentation
ALTER TABLE project_urls 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for category search
CREATE INDEX IF NOT EXISTS idx_project_urls_category ON project_urls(category);
