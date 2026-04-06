-- Migration to fix project_id type in tasks table
-- This converts project_id from bigint to uuid to match projects(id)

BEGIN;

-- 1. Eliminar restricciones si existen
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

-- 2. Cambiar el tipo de columna. 
-- Dado que bigint no se puede convertir a uuid directamente, limpiamos los datos antiguos (que eran de una versión legacy incompatible).
ALTER TABLE public.tasks 
ALTER COLUMN project_id TYPE uuid USING NULL;

-- 3. Volver a crear la relación correcta con la tabla de proyectos UUID
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 3. Update RLS policies to remove unnecessary ::text casts where possible
-- (Optional but clean, though existing policies usually work with implicit casting if types match)

NOTIFY pgrst, 'reload schema';

COMMIT;
