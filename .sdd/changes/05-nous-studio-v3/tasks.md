# Task Breakdown: 05-nous-studio-v3 (Master Studio & Research Engine)

## Fase 1: Investigación & Scraping de Pureza (Doble Filtro)
- [ ] 1.1 Configurar el LLM Paralelo (Gemini Flash / Llama 3 8B) que lee el JSON de Serper para generar el H1 y la Intención de Búsqueda.
- [ ] 1.2 Programar la Cloudflare Worker (Browser Rendering) que inyecte un script para extraer SOLO `wordCount` y `<h>` tags (Metadata liviana).
- [ ] 1.3 Desarrollar la lógica en Supabase que filtra URLs con < 300 palabras basadas en la metadata de Cloudflare.
- [ ] 1.4 Modificar Cloudflare Worker para la Fase B: Extraer solo el contenido de `<article>` o `<main>` de las URLs ganadoras.
- [ ] 1.5 Implementar el LLM de Filtrado Cognitivo (Gemini 3.1 Pro / Groq) que reciba el HTML limpio + H1 + Intención para devolver las URLs finales.

## Fase 2: Métricas LSI & ASK
- [ ] 2.1 Implementar lógica de extracción de ASK (Argot) mediante IA probabilística.
- [ ] 2.2 Desarrollar el sistema de puntuación y colores (Semáforo de precisión para LSI y ASK).
- [ ] 2.3 Crear componentes de **Bullet Graphs** en SVG para la visualización de métricas.

## Fase 3: Nous Studio & Floating UI
- [ ] 3.1 Crear el botón flotante "Outline" y el menú contextual con navegación horizontal.
- [ ] 3.2 Integrar la librería `@chenglou/pretext` para animaciones de recolección de segmentos.
- [ ] 3.3 Rediseñar la Consola de Versiones con etiquetado de autoría y modo Preview.
- [ ] 3.4 Implementar el "Design Drawer" de auditoría con la animación "Expand & Overlay".

## Fase 4: Post-procesado & Redacción
- [ ] 4.1 Desarrollar el motor de **Inyección Quirúrgica** de keywords post-humanización.
- [ ] 4.2 Integrar los perfiles de optimización (Nous Quality, Rank Math, Yoast) con botones sticky.
- [ ] 4.3 Programar la lógica de inserción de enlaces externos (1-2 por defecto).
- [ ] 4.4 Implementar el párrafo "El Néctar" después del H1 (restricción de 40 palabras).

---
*Senior Architect: Antigravity AI (Senior Architect)*
