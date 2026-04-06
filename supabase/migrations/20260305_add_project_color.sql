-- Migration: Add color to projects
-- Description: Adds a color column to the projects table, to be used for visual identification in the UI.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';
