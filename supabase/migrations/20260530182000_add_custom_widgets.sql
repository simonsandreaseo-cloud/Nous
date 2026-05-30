-- Agregando la columna custom_widgets a projects que estaba faltando en la base de datos
-- pero que ya existía en los tipos de TypeScript
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS custom_widgets jsonb DEFAULT '[]'::jsonb;

-- Recargar el esquema de PostgREST para evitar errores de cache
NOTIFY pgrst, 'reload schema';
