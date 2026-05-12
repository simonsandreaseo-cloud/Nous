# Exploration: Vector Memory Engine (03)

Exploración técnica para la implementación de memoria semántica utilizando pgvector en Supabase y embeddings de Gemini.

## 1. Supabase Setup: pgvector
Para habilitar el soporte de vectores en la base de datos, se debe ejecutar el siguiente comando en el SQL Editor de Supabase:

```sql
-- Habilitar la extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector
WITH SCHEMA extensions;
```

Esto habilita el tipo de dato `vector` y los operadores de búsqueda de proximidad (coseno, euclídea, producto interno).

## 2. Modelo de Embeddings: Gemini text-embedding-004
Utilizaremos el modelo más reciente de Google para embeddings.

### Payload de Respuesta
La respuesta de la API (endpoint `embedContent`) tiene la siguiente estructura:

```json
{
  "embedding": {
    "values": [
      0.0123, -0.0876, 0.0456, ... // Lista de floats
    ]
  }
}
```

### Características Técnicas
- **Dimensiones**: 768 por defecto.
- **Matryoshka Embeddings**: Permite truncar el vector (ej. a 256 o 512) sin pérdida crítica de información semántica, ideal para ahorrar espacio en DB si el volumen crece.
- **Task Types**: Soporta `RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`, `SEMANTIC_SIMILARITY`, etc.

## 3. Estrategia "Slim" y Knowledge Base

### Diseño de Tabla
Diseñamos una tabla minimalista pero extensible:

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content_fragment TEXT NOT NULL,
  embedding VECTOR(768), -- Match con Gemini v4
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas (HNSW es preferible para escalas KB)
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

### Estrategia de Chunking (Fragmentación)
Para no saturar la DB y mantener la relevancia:
- **Recursive Character Splitting**: Fragmentos de **500-800 tokens**.
- **Overlap (Solapamiento)**: **15% (aprox 75-100 tokens)** para mantener el contexto entre fragmentos adyacentes.
- **Markdown-Aware**: Si el contenido tiene estructura, fragmentar por encabezados (H2, H3) para preservar la unidad lógica.

## 4. Integración con Workers (research-worker.ts)
El `research-worker.ts` (ubicado conceptualmente en `src/lib/jobs/worker.ts`) procesa investigaciones SEO pesadas.

### Flujo de Vectorización Asíncrona
Para no retrasar el proceso principal de investigación:
1. **Side-Effect Pattern**: El worker realiza su tarea principal (ej: extraer keywords).
2. **Buffer de Fragmentos**: A medida que genera secciones del `NeuralOutline` o analiza competidores, los fragmentos se envían a un `VectorService`.
3. **Fire-and-forget (o Sub-job)**: El `VectorService` puede encolar un nuevo job en una cola de baja prioridad (`vector-queue`) o simplemente realizar la llamada a Gemini en paralelo (`Promise.all`) antes de finalizar el job principal, asegurando que la data esté persistida.

```typescript
// Ejemplo de integración en research-worker.ts
const fragments = chunkContent(researchResult.text);
await Promise.all(fragments.map(f => VectorService.upsertFragment(projectId, f)));
```

Este diseño garantiza que la inteligencia de "Nous 3.0" tenga memoria a largo plazo sin comprometer la velocidad de respuesta del sistema de colas.
