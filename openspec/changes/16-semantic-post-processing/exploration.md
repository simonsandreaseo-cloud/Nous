## Exploration: 16-semantic-post-processing (Sniper Bolding)

### Current State
Actualmente, el pipeline de generación de artículos (Ghostwriter / `draft-worker`) genera el contenido HTML completo y lo guarda en la base de datos (Supabase) sin un paso de post-procesamiento semántico. Esto resulta en textos planos (walls of text) que carecen de énfasis visual (`<strong>`) en conceptos clave. Resaltar conceptos es crucial para retener la atención del usuario (UX) y destacar señales semánticas para SEO, pero hacerlo pidiendo al LLM que genere todo el HTML de nuevo con las negritas es demasiado costoso en tokens y propenso a errores de formato.

### Affected Areas
- `src/lib/services/ai/semantic-highlighter.ts` (Nuevo) — Servicio encargado de la extracción, llamado al LLM (Gemini 1.5 Flash) e inyección de tags `<strong>`.
- `src/lib/jobs/draftWorker.ts` (o equivalente) — Donde se realiza el ensamblado final del HTML generado antes del `UPDATE` a Supabase. Deberá invocar al nuevo servicio.
- `package.json` — Si `cheerio` no está instalado, será necesario agregarlo como dependencia para la manipulación del DOM virtual.

### Approaches
1. **Reescritura completa del HTML con el LLM (Descartado)** — Enviar el HTML y pedir que lo devuelva con negritas.
   - Pros: Fácil de programar.
   - Cons: Altísimo consumo de tokens (input/output), muy lento, riesgo de que el LLM modifique la estructura HTML, rompa enlaces o alucine contenido extra.
   - Effort: Low

2. **Sniper Bolding con Cheerio + JSON Extraction (Recomendado)** — Extraer los párrafos más largos con `cheerio`, enviar el texto plano a Gemini 1.5 Flash pidiendo *solo* un array JSON de frases a resaltar, y usar Regex con Negative Lookbehinds para inyectar `<strong>` en el virtual DOM.
   - Pros: 
     - Mínimo consumo de tokens (el output es solo un JSON muy corto).
     - Rápido (Gemini 1.5 Flash).
     - Preciso (uso de Negative Lookbehinds para evitar romper atributos `href` o tags `<a>` existentes).
     - Procesamiento in-memory rápido gracias a `cheerio` sin hacer round-trips a la BD.
   - Cons: Requiere lógica de regex avanzada para no corromper HTML existente.
   - Effort: Medium

### Recommendation
Se recomienda el enfoque **Sniper Bolding con Cheerio + JSON Extraction**. 

**Arquitectura del Post-Procesador (`cheerio`):**
Al finalizar la redacción del borrador en el `draft-worker` (Ghostwriter), se carga el HTML final en `cheerio` (`const $ = cheerio.load(html)`). Se seleccionan los tags `<p>` y se filtran por longitud (ej. párrafos de más de 150 caracteres) para enfocar el resaltado solo en bloques densos de texto.

**Prompts de Bajo Costo (Gemini 1.5 Flash):**
Se envía un prompt con `response_mime_type: "application/json"` instruyendo a Gemini 1.5 Flash: "Extrae exactamente de 1 a 2 frases semánticamente importantes del siguiente párrafo. Devuelve un JSON array de strings exactos sin modificar las palabras". Output esperado: `["frase uno", "frase dos"]`.

**Inyección en Memoria (Regex seguras):**
Con las frases devueltas, se realiza un reemplazo en el DOM de `cheerio`. Para evitar romper enlaces (ej. `href="frase..."` o texto dentro de un `<a>`), se debe usar Regex con "Negative Lookbehinds" o "Negative Lookaheads" (o iterar sobre los nodos de texto puros de cheerio para ser aún más seguros). Si se opta por Regex en el HTML del párrafo, se debe usar un patrón que ignore todo lo contenido dentro de tags `<a...>` y atributos, inyectando los tags `<strong>` in-memory.

**Integración con Workers (`draft-worker`):**
El servicio de `SemanticHighlighter` (o `postProcessor`) se invoca al final de la ejecución del `draft-worker`. Este worker ya cuenta con el HTML ensamblado. Recibe el `finalHtml`, realiza la manipulación en memoria (con `cheerio` y llamadas batch o concurrentes a Gemini Flash por párrafo), y devuelve el `processedHtml`. Inmediatamente después, el worker ejecuta el único `UPDATE` final en Supabase con este contenido enriquecido, evitando guardados intermedios.

### Risks
- **Colisión de Regex / HTML Roto**: Si la frase devuelta por el LLM incluye partes que ya estaban en un tag `<a>`, un replace crudo con Regex podría romper el DOM. (Mitigación: Manipular solo nodos de texto (`nodeType === 3`) en cheerio en lugar de usar Regex sobre el HTML completo del párrafo, o usar Regex muy restrictiva).
- **Alucinaciones Menores del LLM**: Gemini podría devolver una frase con variaciones mínimas de puntuación o capitalización, haciendo que el `replace` falle. (Mitigación: Loggear los fallos de match y continuar silenciosamente; no es crítico si un párrafo no se resalta).

### Ready for Proposal
Yes — El diseño del "Sniper Bolding" está validado arquitectónicamente y listo para la fase de Propuesta.