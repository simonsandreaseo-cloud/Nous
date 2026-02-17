# Plan Maestro: Motor de Inteligencia de Contenidos Nous (Content Engine)

Este documento detalla la arquitectura, flujos de datos y etapas de implementación para transformar a Nous en una suite de contenidos de nivel empresarial, integrando investigación real, validación semántica e inteligencia de datos.

## 1. Visión General
El objetivo es crear un flujo continuo desde la **Estrategia** (GSC + DataForSEO) hasta la **Ejecución** (Writer + Humanizer), donde cada pieza de contenido nace de datos reales y se valida contra métricas de mercado.

### El "Diferencial Nous"
1.  **Investigación Híbrida**: App de Escritorio (Scraping Real) + DataForSEO (Volúmenes) + GSC (Histórico Propio).
2.  **Validación Semántica**: No tomamos el Top 3 ciegamente. La IA selecciona las 3 referencias *más relevantes* según la intención (e.g., ignorando Amazon si escribimos un blog).
3.  **Auditoría Constante**: Las URLs del proyecto se monitorean para detectar oportunidades de "Striking Distance".

---

## 2. Arquitectura de Datos (Supabase)

Necesitamos expandir el esquema actual para soportar la granularidad de URLs y Querys.

### A. Tabla `project_urls` (Inventario de Contenidos)
Almacena cada URL descubierta en el sitemap o GSC.
```sql
CREATE TABLE project_urls (
  id TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id),
  url TEXT NOT NULL,
  
  -- Métricas GSC (30 días)
  clicks_30d INTEGER DEFAULT 0,
  impressions_30d INTEGER DEFAULT 0,
  ctr_30d FLOAT DEFAULT 0,
  position_30d FLOAT DEFAULT 0,
  
  -- Inteligencia
  top_query TEXT, -- La keyword principal que trae tráfico
  top_query_vol INTEGER, -- Volumen de esa keyword (DataForSEO)
  
  strategic_score FLOAT, -- 0-100 (Calculado por AI: Oportunidad vs Esfuerzo)
  status TEXT DEFAULT 'indexed', -- indexed, excluded, etc.
  last_audited_at TIMESTAMP WITH TIME ZONE,
  
  PRIMARY KEY (project_id, url)
);
```

### B. Actualización en `tasks` (El Dossier)
La tabla `tasks` (o una nueva `content_briefs` vinculada) contendrá el "Cerebro" del artículo.
```sql
ALTER TABLE tasks ADD COLUMN research_dossier JSONB;
/* Estructura del JSONB research_dossier:
{
  "target_keyword": "...",
  "intent": "informative",
  "serp_snapshot": [ ...top 20 results... ],
  "selected_references": [ ...3 urls elegidas semánticamente... ],
  "competitor_analysis": {
     "common_headers": ["...", "..."],
     "missing_topics": ["..."],
     "avg_word_count": 1200
  },
  "dataforseo_keywords": [
     { "term": "...", "vol": 1000, "difficulty": 45, "relevance": "high" }
  ]
}
*/

ALTER TABLE tasks ADD COLUMN outline_structure JSONB; 
/* Estructura del Outline aprobado */

ALTER TABLE tasks ADD COLUMN quality_checklist JSONB;
/* Estado de los requisitos en tiempo real */
```

---

## 3. Flujos de Trabajo (Workflows)

### Flujo 1: "El Radar" (Auditoría de Proyecto)
**Objetivo**: Identificar qué optimizar.
1.  **Ingesta**: Importar Sitemap completo a `project_urls`.
2.  **Enriquecimiento GSC**:
    *   Para cada URL, consultar API GSC: `page: url`. obtener métricas.
    *   Consultar API GSC: `page: url` + `query` dimension (ordenada por clicks/impr). Obtener Top Query.
3.  **Análisis de Oportunidad (Striking Distance)**:
    *   Si `position` está entre 4 y 20 Y `impressions` son altas -> **Candidato a Optimización**.
    *   Si `position` > 20 pero `impressions` > 1000 -> **Falta de Contenido / Canibalización**.

### Flujo 2: "El Investigador" (Preparación del Contenido)
**Objetivo**: Generar el `research_dossier`.
1.  **Trigger**: Usuario crea tarea o selecciona una del "Radar".
2.  **Scraping (Desktop App)**:
    *   Busca Keyword en Google (Top 20).
    *   Extrae: Título, URL, Snippet, Schema Type.
3.  **Filtrado Semántico (IA)**:
    *   Prompt: *"Dado que mi contenido es 'Guía Informativa', elimina del Top 20: E-commerce puro, PDFs gubernamentales, Foros. Elige los 3 mejores competidores directos."*
4.  **Minería de Datos (DataForSEO)**:
    *   Para las **3 URLs elegidas**: Llamar a `ranked_keywords`.
    *   Recibe miles de keywords.
5.  **Limpieza de Keywords (IA)**:
    *   Filtra keywords de marca ajena, irrelevantes o duplicadas.
    *   Agrupa por intención (H2 potential).

### Flujo 3: "El Arquitecto" (Outline Builder)
**Objetivo**: Crear la estructura perfecta.
1.  **UI**: Panel de 2 columnas.
    *   Izquierda: "Insights" (Headers competidores, PAA, Keywords DataForSEO).
    *   Derecha: Editor de Outline (Drag & Drop).
2.  **Asistente**: Botón "Generar Estructura".
    *   Usa los datos de izquierda para proponer H1, H2, H3.
3.  **Validación**:
    *   Dashboard de "Requisitos" (v1.0 del Semáforo).

---

## 4. Componentes de UI a Desarrollar

*   **`ProjectUrlManager`**: Tabla/Grid para ver todas las URLs del proyecto con sus métricas y Scores.
*   **`ResearchPanel`**: Widget en el Calendario/Writer para ver el estado de la investigación.
*   **`OutlineEditor`**: Componente complejo de listas anidadas y drag-and-drop.
*   **`KeywordCurator`**: Interfaz para revisar/aprobar las keywords que trajo DataForSEO antes de pasarlas al Writer.

---

## 5. Plan de Ejecución

### Fase 1: Cimientos de Datos (Días 1-2)
- [ ] Script SQL para `project_urls` y actualizaciones a `tasks`.
- [ ] Servicio `ProjectIntelligenceService` (GSC Fetcher recursivo).

### Fase 2: Conexión con la Realidad (Días 3-4)
- [ ] Implementar `DataForSeoService.getRankedKeywords`.
- [ ] Actualizar `DesktopApp` para scraping de SERP con metadata.
- [ ] Crear lógica de "Selección Semántica" con Gemini.

### Fase 3: La Interfaz de Estrategia (Días 5-7)
- [ ] Construir `OutlineEditor`.
- [ ] Integrar datos de investigación en el `WriterSidebar`.

### Fase 4: Integración Final (Días 8-9)
- [ ] Conectar el botón "Investigar" del Calendario con todo el pipeline.
- [ ] Pruebas de flujo completo.
