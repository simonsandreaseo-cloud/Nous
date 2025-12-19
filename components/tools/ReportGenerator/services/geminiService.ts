import { GoogleGenAI, Type } from "@google/genai";
import { ReportPayload, ContentBrief, SnippetOptimization } from "../types";

// 1. Dispatcher: Strict Rules for Section Inclusion
// MODIFIED: Removed 'OPORTUNIDADES_CONTENIDO_CLUSTERS' rule.
const SYSTEM_PROMPT_DISPATCHER = `Eres un "Editor Jefe" de una agencia SEO.
Tu trabajo es decidir la lista EXACTA de claves JSON para generar el informe.

REGLAS OBLIGATORIAS basadas en los datos de entrada:
1. 'ANALISIS_CONCENTRACION': Incluir si clickConcentration.items.length > 0 O impressionConcentration.items.length > 0.
2. 'ANALISIS_CAUSAS_CAIDA': Incluir si lossDiagnosis > 0.
3. 'ALERTA_CANIBALIZACION': Incluir si cannibalization > 0.
4. 'OPORTUNIDAD_STRIKING_DISTANCE': Incluir si strikingDistance > 0.
5. 'OPORTUNIDAD_NUEVAS_KEYWORDS': Incluir si newKeywords > 2.
6. 'ANALISIS_CTR': Incluir si ctrRedFlags > 0.
7. 'ANALISIS_SEGMENTOS': Incluir si segments > 0.
8. **NUNCA** incluyas 'RESUMEN_EJECUTIVO', 'CONCLUSIONES', 'ANALISIS_ESTRATEGICO' ni 'OPORTUNIDADES_CONTENIDO_CLUSTERS' aquí.

Retorna SOLO un Array JSON de strings. Ejemplo: ["ANALISIS_SEGMENTOS", "ANALISIS_CTR"]`;

// 2. Section Writer: High Density & Robust Charting
const SYSTEM_PROMPT_SECTION_WRITER = `Eres un "Diseñador de Producto Principal" para un SaaS de SEO. Genera **UN componente HTML específico**.

--- REGLA DE ORO: IDIOMA ESPAÑOL ---
Todo el texto generado, encabezados de tablas, análisis y notas DEBE estar en ESPAÑOL. No uses inglés bajo ninguna circunstancia.
Si los datos vienen en inglés (ej: "Decaying"), TRADÚCELOS (ej: "En Decadencia").

--- REGLA DE ORO: NO USAR SINTAXIS DE PLANTILLA ---
PROHIBIDO usar sintaxis como \`{{ item.value }}\` o \`{% for item in items %}\`.
Debes generar el HTML FINAL con los valores numéricos y de texto ya insertados (Hardcoded).
Si tienes una lista de 5 items en el JSON, escribe explícitamente las 5 filas \`<tr>\` con sus datos.

--- SISTEMA DE DISEÑO: "Datos de Alta Densidad" ---
1. **Diseño**: Maximiza el espacio. Usa TABLAS para casi todo. Evita tarjetas grandes con mucho espacio en blanco.
2. **Tipografía**: Usa \`text-slate-800\` para encabezados. Texto del cuerpo \`text-xs\`.
3. **Tablas**:
   - Clase: \`w-full text-left border-collapse text-xs table-fixed\`
   - Encabezados: \`bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 py-2 px-3 border-y border-slate-200\`
   - Celdas: \`border-b border-slate-50 py-2 px-3 text-slate-600 align-top\`
   - **Notas en Línea**: Si el dato necesita explicación, añade una nota en la celda: \`<div class="mt-1 text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block border border-amber-100">Nota: ...</div>\`
4. **Gráficos**: 
   Para renderizar un gráfico de líneas, imprime:
   \`<div class="chart-placeholder w-full h-24 bg-slate-50/50 rounded border border-slate-100 mt-1" data-chart-type="clicks" data-chart-url="URL_EXACTA_DEL_DATO"></div>\`
   *IMPORTANTE*: Reemplaza 'URL_EXACTA_DEL_DATO' con el string exacto del JSON.

5. **Análisis Introductorio (Marcador)**: 
   - Al PRINCIPIO (debajo del H2), imprime un contenedor con un ID único.
   - HTML: \`<div id="analysis-SECTION_ID_HERE" class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">Análisis pendiente de revisión holística...</div>\`

--- ESPECIFICACIONES POR SECCIÓN ---

- **ALERTA_CANIBALIZACION**: 
   - Usa una **Tabla**.
   - Encabezados (ESPAÑOL): "Palabra Clave" (20%) | "Volumen" (10%) | "URLs en Conflicto" (40%) | "Tendencia" (30%).
   - **Columna URLs en Conflicto**: Es CRÍTICO que las URLs no ocupen mucho espacio horizontal.
     Usa esta estructura EXACTA para cada URL:
     \`<div class="flex flex-col gap-1 max-w-[280px]"><a href="URL" class="truncate text-[10px] text-indigo-600 hover:underline block" title="URL">URL</a></div>\`
     *El 'truncate' y 'max-w' son obligatorios para no tapar el gráfico.*
   - Tendencia: Inserta el \`chart-placeholder\` aquí (altura pequeña, ej: h-16). Usa \`data-chart-type="cannibalization"\`.

- **ANALISIS_CONCENTRACION**: 
   - Diseño: Grid de 2 Columnas. Izquierda: Texto Análisis (Marcador). Derecha: Tabla.
   - Tabla Encabezados (ESPAÑOL): "URL" (50%) | "Clics" (15%) | "Distribución" (35%).
   - **Columna Distribución**: 
     Renderiza una barra visual REAL.
     HTML: \`<div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex items-center relative border border-slate-200"><div class="bg-indigo-500 h-full rounded-full" style="width: [PORCENTAJE]%"></div><span class="absolute right-1 text-[8px] font-bold text-slate-600 z-10">[PORCENTAJE]%</span></div>\`
     *Asegúrate de reemplazar [PORCENTAJE] con el número real extraído del JSON.*

- **ANALISIS_CAUSAS_CAIDA**: 
   - Tabla Encabezados (ESPAÑOL): "URL Afectada" | "Clics Perdidos" | "Diagnóstico de Palabras Clave".
   - Diagnóstico: Usa viñetas. Si la caída es > 50%, añade badge: \`<span class="text-rose-600 font-bold text-[9px] bg-rose-50 px-1 rounded border border-rose-100 uppercase">Crítico</span>\`.

- **OPORTUNIDAD_STRIKING_DISTANCE** y **OPORTUNIDAD_NUEVAS_KEYWORDS**:
   - Tabla Encabezados (ESPAÑOL): "Palabra Clave" | "Impresiones" | "Clics" | "CTR" | "Posición Media".

- **ANALISIS_CTR**:
   - Tabla Encabezados (ESPAÑOL): "Palabra Clave" | "Impresiones" | "Clics" | "CTR" | "Posición".

Salida SOLO HTML PURO. No uses Markdown (\`\`\`).`;

// 3. Holistic Reviewer: The "Senior Consultant"
const SYSTEM_PROMPT_HOLISTIC_REVIEWER = `Eres un Consultor SEO Senior.
Tu tarea es revisar un informe HTML generado y proporcionar una "Mejora Holística" en ESPAÑOL.

ENTRADA: El cuerpo HTML completo del informe + Contexto del Usuario.

TAREA:
1. **Entender el Panorama General**: Identifica patrones globales.
2. **Reescribir Análisis de Sección**:
   - Para CADA sección, escribe un NUEVO párrafo introductorio en **ESPAÑOL**.
   - Usa tono profesional y directivo.
3. **Escribir Resumen Ejecutivo y Conclusiones**: En ESPAÑOL.
   - **IMPORTANTE**: El Resumen Ejecutivo debe usar fondo claro (\`bg-white\` o \`bg-slate-50\`) y texto oscuro (\`text-slate-800\`) para garantizar legibilidad.

SALIDA:
Retorna un Objeto JSON (NO Markdown) con esta estructura:
{
  "resumen_ejecutivo": "<section id='RESUMEN_EJECUTIVO' class='mb-8 break-inside-avoid bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-800'><h2>Resumen Ejecutivo</h2>...</section>",
  "conclusiones": "<section id='CONCLUSIONES' class='mt-12 pt-8 border-t border-slate-200 break-inside-avoid'>...</section>",
  "section_enhancements": {
     "analysis-ALERTA_CANIBALIZACION": "<div id='analysis-ALERTA_CANIBALIZACION' class='mb-4 p-4 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-900 leading-relaxed shadow-sm'><strong>⚠️ Problema Crítico:</strong>...</div>"
  }
}
`;

// Helper for retry logic with Key Rotation
async function generateWithRetry(apiKeys: string[], model: string, contents: any, config: any) {
    let lastError;
    
    // Iterate through all provided keys
    for (let k = 0; k < apiKeys.length; k++) {
        const currentKey = apiKeys[k];
        const ai = new GoogleGenAI({ apiKey: currentKey });
        
        // Try up to 3 times per key for transient network errors
        for (let i = 0; i < 3; i++) {
            try {
                return await ai.models.generateContent({
                    model,
                    contents,
                    config
                });
            } catch (e: any) {
                lastError = e;
                const status = e.status || e.code;
                const msg = e.message || "";
                
                // If it's a Quota Limit (429) or Service Unavailable (503), we handle specially
                const isQuota = status === 429 || msg.includes('429') || msg.includes('Quota') || msg.includes('Resource has been exhausted');
                
                if (isQuota) {
                    // Break inner loop (retries) and Continue outer loop (next key)
                    console.warn(`⚠️ API Key index ${k} exhausted. Rotating to next key...`);
                    break; 
                }
                
                // If it's a transient 503, wait and retry with SAME key
                if (status === 503) {
                     const delay = 2000 * Math.pow(2, i);
                     await new Promise(r => setTimeout(r, delay));
                     continue;
                }
                
                // Other errors (400, 401 invalid key, etc) -> try next key just in case
                if (status === 400 || status === 401) {
                    console.warn(`⚠️ API Key index ${k} invalid. Rotating...`);
                    break;
                }
                
                throw e; // Unknown fatal error
            }
        }
    }
    throw lastError || new Error("All API keys exhausted or failed.");
}

export const getRelevantSections = async (payload: ReportPayload, model: string, apiKeys: string[]): Promise<string[]> => {
    const findingsSummary = {
        period1Name: payload.period1Name,
        period2Name: payload.period2Name,
        userContext: payload.userContext,
        clickConcentration: payload.concentrationAnalysis?.clickConcentration,
        impressionConcentration: payload.concentrationAnalysis?.impressionConcentration,
        topicClusters: payload.topicClusters || [], 
        lossDiagnosis: payload.lossCauseAnalysis?.length || 0, 
        cannibalization: payload.keywordCannibalizationAlerts.length,
        ctrRedFlags: payload.ctrAnalysis.redFlags.length,
        strikingDistance: payload.strikingDistanceOpportunities.length,
        newKeywords: payload.newKeywordDiscovery.length,
        segments: payload.segmentAnalysis.length
    };
    
    try {
        const response = await generateWithRetry(
            apiKeys, 
            model, 
            `Based on these findings, return the JSON array of DATA sections (exclude summary/conclusion):\n${JSON.stringify(findingsSummary)}`, 
            {
                systemInstruction: SYSTEM_PROMPT_DISPATCHER,
                responseMimeType: "application/json"
            }
        );
        const text = response.text;
        if (!text) return ['ANALISIS_CAUSAS_CAIDA']; // Default fallback reduced
        
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Dispatcher failed", e);
        return ['ANALISIS_CAUSAS_CAIDA'];
    }
};

export const generateReportSection = async (
    sectionName: string, 
    payload: ReportPayload, 
    model: string, 
    apiKeys: string[]
): Promise<string> => {
    
    const writerPayload = {
        ...payload,
        availableChartKeys: payload.availableChartKeys
    };

    const prompt = `
    TAREA: Generar HTML para la sección "${sectionName}".
    CONTEXTO: ${payload.userContext || 'Análisis Estándar'}
    SECTION_ID: analysis-${sectionName}
    DATOS: ${JSON.stringify(writerPayload)}
    
    IMPORTANTE: 
    1. Empieza con un <h2 class="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
       <span class="w-1.5 h-4 bg-indigo-500 rounded-sm"></span> [Título en Español]
       </h2>
    2. RECUERDA: NO uses sintaxis de plantillas ({{}}). Escribe el HTML final.
    3. RECUERDA: Traduce todos los términos al ESPAÑOL.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys, 
            model, 
            prompt, 
            { systemInstruction: SYSTEM_PROMPT_SECTION_WRITER }
        );
        let html = response.text || "";
        html = html.replace(/```html/g, '').replace(/```/g, '').trim();
        return html;
    } catch (e) {
        return `<!-- Error generating ${sectionName} -->`;
    }
};

export interface HolisticReviewResult {
    resumen_ejecutivo: string;
    conclusiones: string;
    section_enhancements: Record<string, string>;
}

export const performHolisticReview = async (
    fullHtmlBody: string,
    userContext: string,
    model: string,
    apiKeys: string[]
): Promise<HolisticReviewResult> => {
    
    const prompt = `
    FASE DE REVISIÓN:
    CONTEXTO DEL USUARIO: ${userContext}
    
    CUERPO DEL INFORME HTML:
    ${fullHtmlBody.substring(0, 90000)} 
    
    Genera el Resumen Ejecutivo, Conclusiones, y REESCRIBE los bloques de análisis introductorios para que estén conectados y en perfecto ESPAÑOL.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys, 
            model, 
            prompt, 
            { 
                systemInstruction: SYSTEM_PROMPT_HOLISTIC_REVIEWER,
                responseMimeType: "application/json"
            }
        );
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Holistic Review failed", e);
        return {
            resumen_ejecutivo: `<section id="RESUMEN_EJECUTIVO" class="mb-6"><div class="p-6 bg-slate-900 text-white rounded-xl"><h2>Informe Generado</h2><p>Resumen no disponible.</p></div></section>`,
            conclusiones: `<section id="CONCLUSIONES" class="mt-8"><p>No conclusions.</p></section>`,
            section_enhancements: {}
        };
    }
};