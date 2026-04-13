# Task Breakdown: 04-sentient-layout (Sentient Layout Engine)

## Fase 1: Infraestructura de Datos & Configuración (Data & Settings)
- [ ] 1.1 Refactorizar esquema de `projects.settings` en Supabase para incluir `design` y `contents`.
- [ ] 1.2 Implementar UI del **Master Prompt Editor** en la vista de configuración del proyecto.
- [ ] 1.3 Crear el **Slot Manager** dinámico con lógica de "Smart Ratio" (vinculación de W/H) y selector de modelo.
- [ ] 1.4 Implementar sistema de "Plantillas" (Freestyle, Crypto Landing, Calculator, etc.).

## Fase 2: El Scraper de Branding (The Cloner)
- [ ] 2.1 Crear Supabase Edge Function para interactuar con Cloudflare Browser Rendering.
- [ ] 2.2 Desarrollar el script de extracción de CSS Variables, Fuentes y Layout Specs.
- [ ] 2.3 Implementar el "Design Extractor UI" (Campo de URL + Botón "Clonar Estética").

## Fase 3: Editor Inmersivo (The Canvas)
- [ ] 3.1 Refactorizar `WriterStudio` para soportar el modo "Mockup" (Inyección de estilos dinámicos).
- [ ] 3.2 Implementar el "Modo Anclaje" en Tiptap (Mapeo de clics a índices de párrafo).
- [ ] 3.3 Crear extensiones custom para Tiptap: `WidgetPlaceholder` y `LayoutBlock`.

## Fase 4: Inteligencia de Maquetación (The Brain)
- [ ] 4.1 Actualizar el `ImagePlanningService` para que respete los presets de la plantilla activa.
- [ ] 4.2 Optimizar el pipeline de inserción Bottom-Up para evitar desplazamientos de nodos.
- [ ] 4.3 Ajustar los prompts del Redactor para que se ciñan a las restricciones de la plantilla seleccionada.

---
*Senior Architect: Antigravity AI (Senior Architect)*
