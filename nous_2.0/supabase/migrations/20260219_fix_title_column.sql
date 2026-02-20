-- Re-asegurar que exista la columna title y refrescar caché
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'title') THEN
        ALTER TABLE public.seo_reports ADD COLUMN title text;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
