-- Add missing columns for Metrics Analyst Task Impact feature to TASKS table

-- 1. Add gsc_property_url if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'gsc_property_url') THEN
        ALTER TABLE tasks ADD COLUMN gsc_property_url text;
    END IF;
END $$;

-- 2. Add secondary_url if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'secondary_url') THEN
        ALTER TABLE tasks ADD COLUMN secondary_url text;
    END IF;
END $$;

-- 3. Add completed_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at timestamp with time zone;
    END IF;
END $$;

-- 4. Backfill completed_at for existing DONE tasks using updated_at
UPDATE tasks 
SET completed_at = updated_at 
WHERE status = 'done' AND completed_at IS NULL;

-- 5. (Optional) Backfill gsc_property_url from associated_url if available and empty
-- This ensures existing tasks with associated_url are picked up
UPDATE tasks 
SET gsc_property_url = associated_url 
WHERE gsc_property_url IS NULL AND associated_url IS NOT NULL;
