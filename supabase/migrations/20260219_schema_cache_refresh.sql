-- Refresca la caché de PostgREST después de los cambios manuales en seo_reports
COMMENT ON TABLE public.seo_reports IS 'Tabla para informes SEO generados por IA - Cache Refresh 2026-02-19';

-- Asegurar permisos por si acaso
GRANT ALL ON TABLE public.seo_reports TO authenticated;
GRANT ALL ON TABLE public.seo_reports TO service_role;
