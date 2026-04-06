-- Add target_country column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'US';

-- Update RLS policies if necessary (usually not needed for just a column add if CRUD already exists)
-- Just ensuring the column is available is enough for now.
