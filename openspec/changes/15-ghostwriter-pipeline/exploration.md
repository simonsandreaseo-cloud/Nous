## Exploration: Ghostwriter Pipeline

### Current State
Actualmente, la generación de contenido masivo corre el riesgo de saturar la ventana de contexto del LLM si se pasa un único prompt de 10.000 palabras (Outline completo). Esto bloquea procesos, aumenta las alucinaciones, reduce la calidad de la redacción (E-E-A-T) y dificulta el control sobre el uso orgánico de palabras clave. Además, el sistema actual de `BullMQ` se usa para traducciones e investigaciones, pero no orquesta la redacción granular de artículos largos integrando `RecallService` (pgvector) y `ToneShifter`.

### Affected Areas
- `src/lib/jobs/` — Se requiere un nuevo `DraftWorker` para orquestar la redacción asíncrona usando BullMQ.
- `src/lib/services/ai/` — Integración del proceso iterativo (Chunked Generation), `RecallService` para contexto, y `ToneShifter` para E-E-A-T.
- `src/lib/db/schema/` — Esquemas de la base de datos para almacenar el progreso de generación del artículo (Drafts y estado de H2s).

### Approaches
1. **Generación Monolítica (Single-Pass)** — Enviar todo el Outline al modelo y esperar la redacción del artículo completo en una sola respuesta.
   - Pros: Menor complejidad de orquestación, menos llamadas a la API.
   - Cons: Altísima degradación de la calidad, el modelo "olvida" el inicio del texto hacia la mitad, imposible controlar el SEO (Golden Keywords/LSI) granularmente, mayor riesgo de timeout y no se puede inyectar contexto vectorial específico por sección.
   - Effort: Low

2. **Generación Iterativa (Chunked Generation via BullMQ)** — El `DraftWorker` toma el Outline y lo divide en secciones (H2). Para cada H2:
   - Consulta al `RecallService` para obtener "recuerdos" (datos, citas, hechos) relevantes para ese subtema específico desde `pgvector`.
   - Genera la sección inyectando las Golden Keywords correspondientes a ese chunk.
   - Aplica `ToneShifter` u otras revisiones E-E-A-T para homogeneizar la voz.
   - Guarda el progreso en la DB (checkpoint).
   - Pros: Calidad inmensamente superior. E-E-A-T garantizado, evita alucinaciones (gracias a los "recuerdos" en contexto), excelente control de SEO. Resiliente a fallos de red gracias a BullMQ.
   - Cons: Mayor latencia total (aunque corre en background) y mayor complejidad de gestión de estado.
   - Effort: High

### Recommendation
Se recomienda enfáticamente el enfoque **Generación Iterativa (Chunked Generation via BullMQ)**. Este diseño es superior a un "prompt gigante" porque:
1. **Calidad y E-E-A-T focalizado**: Al generar sección por sección, el LLM concentra sus mecanismos de atención (*Attention Mechanism*) únicamente en un subtema.
2. **Memoria Semántica de Alta Precisión**: El uso del `RecallService` permite inyectar el contexto de la investigación (`researchDossier`) justo a tiempo. Cada H2 tiene los datos y hechos exactos que necesita, reduciendo drásticamente las alucinaciones.
3. **Resiliencia sin saturación**: `BullMQ` orquesta el trabajo en segundo plano, evitando saturar la red o los recursos del servidor. Si falla la generación de una sección, BullMQ reintenta solo esa tarea, ahorrando tokens y tiempo.
4. **Control Granular de Tono y SEO**: Permite el uso quirúrgico del `ToneShifter` y ubica de manera natural las Golden Keywords y LSI por cada fragmento, maximizando la relevancia semántica.

### Risks
- **Inconsistencia Narrativa**: Riesgo de que el LLM escriba cada sección de manera aislada y repita muletillas al inicio o fin de cada H2. (Mitigación: Pasar como contexto al LLM el último párrafo o sección generada).
- **Gestión del Estado en Fallos**: Si un job de BullMQ falla o se reinicia, el `DraftWorker` debe saber exactamente desde qué H2 reanudar para evitar redacciones duplicadas.

### Ready for Proposal
Yes — La arquitectura del "Ghostwriter Pipeline" está bien definida y lista para la fase de Propuesta.
