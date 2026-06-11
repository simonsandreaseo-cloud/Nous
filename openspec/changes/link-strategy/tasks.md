# Tasks: Link Strategy Matrix

## Fase 1: Base de Datos y API
- [ ] Verificar o crear restricción única `project_id_url` en `project_urls` vía migración Supabase (o usar lógica de fallback de deduplicación en el endpoint).
- [ ] Crear el endpoint `/api/projects/urls/upload` para recibir el array de URLs manuales y hacer un `upsert` por lotes (batch 5000) en Supabase.

## Fase 2: Componentes UI de Configuración
- [ ] Diseñar el `SmartURLUploaderModal.tsx` con soporte para CSV/XLSX, mapeo de columnas y advertencias de sobrescritura.
- [ ] Crear `ProjectLinkStrategyView.tsx` como el contenedor principal en Settings. Fetch a `rpc('get_unique_categories')`.
- [ ] Crear `LinkStrategyEditor.tsx` para renderizar el panel derecho (Modo Estricto, Sliders de categorías, URLs VIP).

## Fase 3: Integración en el Planificador / Layout
- [ ] Añadir la pestaña "Estrategia de Enlazado" en la interfaz principal de settings (`ProjectSettingsModal` o donde sea que vivan).

## Fase 4: Core (RCP Integration)
- [ ] En `src/lib/services/writer/research/index.ts`, leer la configuración `project.settings.link_strategy.per_content_type[task.content_type]`.
- [ ] Implementar el filtrado de **Modo Estricto** antes de procesar las `combinedUnits`.
- [ ] Implementar el **Reordenamiento por Multiplicador de Prioridad** (score * prioridad / 5).
- [ ] Inyectar **URLs VIP** al inicio del listado `combinedUnits` con un score artificial alto para forzarlas arriba de todo.
- [ ] Refinar el `profilePrompt` de Gemini para que respete estrictamente estas directivas de jerarquía.
