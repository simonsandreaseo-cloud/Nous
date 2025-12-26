import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReportPayload, ContentBrief, SnippetOptimization, UsageMode } from "../types";

// 1. Dispatcher: Strict Rules for Section Inclusion (FROM INFORMES SEO - FULL LOGIC)
const SYSTEM_PROMPT_DISPATCHER = `Eres un "Editor Jefe" para una Agencia SEO. 
Tu trabajo es decidir la lista EXACTA de claves JSON para las secciones del informe a generar.

REGLAS OBLIGATORIAS basadas en datos de entrada (Revisa los valores cuidadosamente):
1. 'OPORTUNIDADES_CONTENIDO_CLUSTERS': Incluir si topicClusters.length > 0.
2. 'ANALISIS_CONCENTRACION': Incluir si clickConcentration.items.length > 0 O impressionConcentration.items.length > 0.
3. 'ANALISIS_ESTRATEGICO': Incluir si strategicOverview tiene elementos (defend/attack).
4. 'ANALISIS_CAUSAS_CAIDA': Incluir si lossDiagnosis > 0.
5. 'ALERTA_CANIBALIZACION': Incluir si cannibalization > 0.
6. 'OPORTUNIDAD_STRIKING_DISTANCE': Incluir si strikingDistance > 0.
7. 'OPORTUNIDAD_NUEVAS_KEYWORDS': Incluir si newKeywords > 2.
8. 'ANALISIS_CTR': Incluir si ctrRedFlags > 0.
9. 'ANALISIS_SEGMENTOS': Incluir si segments > 0.
10. 'ANALISIS_TRAFICO_IA': Incluir si aiTraffic > 0.
11. **NUNCA** incluyas 'RESUMEN_EJECUTIVO' o 'CONCLUSIONES' aquí. (Se generan en el paso final).

Devuelve SOLO un Array JSON de cadenas. Ejemplo: ["ANALISIS_ESTRATEGICO", "ANALISIS_CTR"]`;

// 2. Section Writer: JSON Structure for Hybrid Content
const SYSTEM_PROMPT_SECTION_WRITER = `Eres un "Diseñador de Producto Principal" para un SaaS Financiero/SEO. 
Tu tarea es generar un objeto JSON para una sección específica del informe.

FORMATO DE SALIDA (SOLO JSON):
{
  "html": "<div class='...'> ... </div>",
  "charts": [
    {
      "type": "line" | "bar", // Elige el que mejor se ajuste
      "title": "Título del Gráfico",
      "metrics": [ { "label": "Clics", "dataKey": "clicks", "color": "#6366f1" } ],
      "filter": { "urlIncludes": "https://..." } // Opcional: filtro exacto de URL
    }
  ]
}

--- SISTEMA DE DISEÑO (Para el campo HTML) ---
1. **Tipografía y Jerarquía**:
   - **Títulos (H2)**: Usa \`<h2 class="text-xl font-black text-slate-800 border-l-4 border-indigo-500 pl-4 mb-6 mt-4 tracking-tight">\`
   - **Subtítulos (H3)**: Usa \`<h3 class="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2 border-b border-indigo-50 pb-1">\`
   - **Párrafos**: Texto limpio, con espacio entre líneas cómodo (leading-relaxed).

2. **Formato de Métricas (Codificación de Color)**:
   - **Positivo/Bueno**: \`<span class="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-xs border border-emerald-100">\`.
   - **Negativo/Malo**: \`<span class="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-xs border border-rose-100">\`.
   - **Neutro/Destacado**: \`<span class="text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-xs">\`.

3. **Énfasis Narrativo ("Bold Stretches")**:
   - En aproximadamente el **50% de los párrafos**, identifica la idea central.
   - Pon en **negrita** (\`<strong>\`) una secuencia continua de **4 a 8 palabras** que resuma esa idea.
   - REGLA ESTRICTA: Máximo 1 secuencia en negrita por párrafo. No pongas todo el párrafo en negrita.

4. **Layout**:
   - Para métricas densas, usa \`grid grid-cols-1 md:grid-cols-2 gap-8\`.
   - Usa tablas limpias de Tailwind para datos.

5. **IDIOMA**: TODO EL TEXTO DEBE ESTAR EN ESPAÑOL.

--- LÓGICA DE GRÁFICOS ---
- Si encuentras una URL específica ganando/perdiendo, ¡AÑADE UNA CONFIGURACIÓN DE GRÁFICO al array "charts" para esa URL!
- Usa "urlIncludes" en el filtro para apuntar a los datos específicos.
- Colores recomendados: Clics (#6366f1), Impresiones (#8b5cf6), Posición (#f43f5e - lógica invertida).

--- ESPECIFICACIONES DE SECCIÓN ---
- **OPORTUNIDADES_CONTENIDO_CLUSTERS**: Usa una cuadrícula basada en tarjetas (3 columnas).
- **ALERTA_CANIBALIZACION**: DEBE incluir un gráfico para cada conflicto importante.
- **ANALISIS_ESTRATEGICO**: Enfócate en "Matriz de Ataque/Defensa".
- **ANALISIS_TRAFICO_IA**: Desglose de fuentes de IA.

Salida solo JSON.`;

// 3. Achievements Mode Prompt
const SYSTEM_PROMPT_ACHIEVEMENTS = `Eres un "Director de Éxito del Cliente". 
Formato de salida JSON: { "html": "...", "charts": [...] }.
Tono: Celebratorio, motivador.
Enfócate en las VICTORIAS.
Aplica las mismas reglas de diseño (H2, H3, colores métricas, negritas).
IDIOMA: TODO EL TEXTO DEBE ESTAR EN ESPAÑOL.`;

// 4. Final Refiner
const SYSTEM_PROMPT_REFINER = `Eres el Editor en Jefe. 
Formato de salida JSON: { "html": "..." } (No se necesitan gráficos para el resumen usualmente, pero mantén el formato consistente).
Escribe las secciones RESUMEN_EJECUTIVO (Abstract) y CONCLUSIONES.
Utiliza las mismas reglas de estilo:
- H2 con borde izquierdo índigo.
- Métricas positivas en verde (fondo suave), negativas en rojo.
- Negritas en frases clave (4-8 palabras).
IDIOMA: TODO EL TEXTO DEBE ESTAR EN ESPAÑOL.
`;

const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemma-3-27b', 'gemini-2.5-flash'];

// ... generateWithRetry remains same ...
async function generateWithRetry(apiKeys: string[], requestedModel: string, promptText: string, config: any) {
    let lastError;
    const modelsToTry = Array.from(new Set([requestedModel, ...FALLBACK_MODELS]));

    for (const model of modelsToTry) {
        for (let k = 0; k < apiKeys.length; k++) {
            const currentKey = apiKeys[k];
            try {
                const genAI = new GoogleGenerativeAI(currentKey);
                const modelConfig: any = { model: model };
                if (config?.systemInstruction) modelConfig.systemInstruction = config.systemInstruction;
                const generativeModel = genAI.getGenerativeModel(modelConfig);
                const generationConfig: any = {};
                if (config?.responseMimeType) generationConfig.responseMimeType = config.responseMimeType;

                for (let i = 0; i < 3; i++) {
                    try {
                        const result = await generativeModel.generateContent({
                            contents: [{ role: 'user', parts: [{ text: promptText }] }],
                            generationConfig: generationConfig
                        });
                        const response = await result.response;
                        return { text: response.text() };
                    } catch (innerE: any) {
                        const status = innerE.status || innerE.response?.status;
                        if (status === 503 || status === 429) {
                            await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i)));
                            continue;
                        }
                        throw innerE;
                    }
                }
            } catch (e: any) {
                lastError = e;
                if ((e.message || "").includes('404')) { k = apiKeys.length; break; } // Model not found
            }
        }
    }
    throw lastError || new Error("All API keys and fallback models exhausted.");
}

export const getRelevantSections = async (payload: ReportPayload, model: string, apiKeys: string[]): Promise<string[]> => {
    // ... same summary construction ...
    const findingsSummary = {
        period1Name: payload.period1Name,
        period2Name: payload.period2Name,
        userContext: payload.userContext,
        clickConcentration: payload.concentrationAnalysis?.clickConcentration,
        impressionConcentration: payload.concentrationAnalysis?.impressionConcentration,
        strategicOverview: payload.strategicOverview?.attack?.length + payload.strategicOverview?.defend?.length || 0,
        topicClusters: payload.topicClusters || [],
        lossDiagnosis: payload.lossCauseAnalysis?.length || 0,
        cannibalization: payload.keywordCannibalizationAlerts.length,
        ctrRedFlags: payload.ctrAnalysis.redFlags.length,
        strikingDistance: payload.strikingDistanceOpportunities.length,
        newKeywords: payload.newKeywordDiscovery.length,
        segments: payload.segmentAnalysis.length,
        aiSessions: payload.aiTrafficAnalysis ? payload.aiTrafficAnalysis.sources.length : 0
    };

    // Mantener lógica estricta de dispatcher
    // The SYSTEM_PROMPT_DISPATCHER is now a global constant and already translated.
    // The duplicate definition below is removed as per the instruction.

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            `Findings: ${JSON.stringify(findingsSummary)}`,
            { systemInstruction: SYSTEM_PROMPT_DISPATCHER, responseMimeType: "application/json" }
        );
        return cleanAndParseJSON(response.text);
    } catch (e) {
        return ['ANALISIS_ESTRATEGICO', 'OPORTUNIDADES_CONTENIDO_CLUSTERS'];
    }
};

const cleanAndParseJSON = (text: string): any => {
    try {
        // 1. Remove Markdown code blocks
        let clean = text.replace(/```json|```/g, '').trim();

        // 2. Fix potential unescaped newlines in strings
        // This is a naive fix but handles the most common AI error: literal newlines inside JSON strings
        // We assume valid JSON structure otherwise.
        // A safer way is to rely on the model obeying strict JSON, but we can try to sanitize control chars if we are careful.
        // clean = clean.replace(/\n/g, "\\n"); // CAREFUL: This might break actual structure specific formatting.
        // Instead, let's rely on a second parse attempt if first fails.

        return JSON.parse(clean);
    } catch (e) {
        // Retry with aggressive cleaning for control characters
        try {
            let clean = text.replace(/```json|```/g, '').trim();
            // Escape newlines that are not close to a quote or brace? Hard to regex correctly.
            // Simple approach: Use a specialized regex to find unescaped newlines in string properties? Too complex.
            // Fallback: Just try to strip invalid chars if simple parse fails.
            clean = clean.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // Remove control characters
            return JSON.parse(clean);
        } catch (e2) {
            console.error("JSON Parse Failed:", e2);
            // Return null or throw
            throw e2;
        }
    }
};

export const generateReportSection = async (
    sectionName: string,
    payload: ReportPayload & { taskImpactDetails?: any[] },
    model: string,
    apiKeys: string[],
    caseCount?: number,
    mode: UsageMode = 'default'
): Promise<{ html: string, charts: any[] }> => {

    const { taskImpactDetails, ...cleanPayload } = payload;
    const writerPayload = { ...cleanPayload, availableChartKeys: payload.availableChartKeys };

    // ... Context logic (same as before, just passed in prompt) ...
    let sectionContext = "";
    if (sectionName === 'ANALISIS_IMPACTO_TAREAS') sectionContext = `DETALLES TAREAS: ${JSON.stringify(payload.taskImpactDetails)}`;
    if (sectionName === 'ANALISIS_CONTENIDOS') sectionContext = `DATOS CONTENIDOS: ${JSON.stringify((payload as any).contentAnalysisData)}`;
    if (sectionName === 'ANALISIS_TRAFICO_IA') sectionContext = `DATOS IA: ${JSON.stringify(payload.aiTrafficAnalysis)}`;

    const prompt = `
    TAREA: Generar contenido para la sección "${sectionName}".
    CONTEXTO: ${payload.userContext || 'Análisis Estándar'}
    ${sectionContext}
    DATOS: ${JSON.stringify(writerPayload)}
    
    Recordatorio: Salida JSON válido con 'html' y array 'charts'. 
    IMPORTANTE: TODO EL TEXTO DEBE ESTAR EN ESPAÑOL.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            prompt,
            {
                systemInstruction: mode === 'achievements' ? SYSTEM_PROMPT_ACHIEVEMENTS : SYSTEM_PROMPT_SECTION_WRITER,
                responseMimeType: "application/json"
            }
        );
        const json = cleanAndParseJSON(response.text);
        return {
            html: json.html || "<!-- Empty -->",
            charts: json.charts || []
        };
    } catch (e) {
        console.error("Section Gen Error", e);
        return { html: `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded">Error generando sección ${sectionName}.</div>`, charts: [] };
    }
};

export const generateFinalRefinement = async (
    generatedHTML: string,
    userContext: string,
    model: string,
    apiKeys: string[]
): Promise<string> => {
    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            `CONTEXTO: ${userContext}. \n CONTENIDO: ${generatedHTML.substring(0, 45000)}`,
            { systemInstruction: SYSTEM_PROMPT_REFINER, responseMimeType: "application/json" }
        );
        const json = cleanAndParseJSON(response.text);
        return json.html || "";
    } catch (e) {
        return `<section id="RESUMEN_EJECUTIVO"><p>Resumen no disponible.</p></section>`;
    }
};



// --- HELIOS V2 ENGINE ---
export const analyzeWithHelios = async (
    payload: any,
    model: string,
    apiKeys: string[]
): Promise<any> => {

    // System Prompt for Helios - Strict JSON
    const HELIOS_SYSTEM_PROMPT = `
    You are Helios, a Sovereign SEO Intelligence Engine.
    Your goal is to analyze SEO data and produce a DETERMINISTIC JSON report.
    
    CRITICAL RULES:
    1. Output MUST be valid JSON conforming to the schema.
    2. NO MARKDOWN formatting outside the JSON string values.
    3. Do NOT "hallucinate" numbers. Use the provided data.
    4. Text should be professional, strategic, and in SPANISH.
    
    JSON SCHEMA:
    {
      "title": "Analytic Report Title",
      "executiveSummary": "High level summary...",
      "sections": [
        {
          "id": "strategy",
          "title": "Strategic Analysis",
          "summary": "...",
          "charts": [
            {
               "id": "chart_1",
               "title": "Click Trend",
               "type": "line",
               "data": [{ "label": "Jan", "value": 100 }, ...],
               "colorScheme": "brand"
            }
          ]
        }
      ]
    }
    `;

    const prompt = `
    ANALYZE THIS DATA:
    ${JSON.stringify(payload).substring(0, 100000)} 
    
    Produce a comprehensive report with at least 3 sections:
    1. Strategic Overview (Trends)
    2. Opportunities (Growth)
    3. Risks (Declines)
    
    Include relevant CHARTS for each section based on the data.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            prompt,
            {
                systemInstruction: HELIOS_SYSTEM_PROMPT,
                responseMimeType: "application/json"
            }
        );
        const json = cleanAndParseJSON(response.text);

        // Basic Validation
        if (!json.sections || !Array.isArray(json.sections)) {
            // attempt simple recovery if sections is missing but object is valid
            if (json.html || json.charts) {
                // Legacy format detected?
                return { title: "Legacy Report", sections: [] };
            }
            throw new Error("Invalid Helios Response Structure");
        }

        return json;
    } catch (e) {
        console.error("Helios Engine Failed:", e);
        throw e;
    }
};


export const optimizeOpportunities = async (
    opportunities: any[],
    model: string,
    apiKeys: string[]
): Promise<any> => {
    const PROMPT = `
    ACT AS: Senior SEO Strategist.
    TASK: Analyze these "Striking Distance" keywords (Pos 11-20) and suggest specific optimizations to push them to Page 1.
    
    DATA:
    ${JSON.stringify(opportunities.slice(0, 50))} 
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "opportunities": [
        {
          "keyword": "...",
          "url": "...",
          "currentPosition": 12,
          "difficulty": "easy", 
          "actionableInsight": "CHANGE Title tag to include X. ADD internal link from Y."
        }
      ]
    }
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            PROMPT,
            { responseMimeType: "application/json" }
        );
        return cleanAndParseJSON(response.text);
    } catch (e) {
        console.error("Opportunity Optimization Failed", e);
        return { opportunities: [] };
    }
};

// --- PHASE 5: TACTICAL GENERATORS ---
export const generateContentBrief = async (clusterInfo: string, apiKey: string): Promise<ContentBrief> => {
    return { title: "", targetKeyword: "", intent: "", structure: [], semanticKeywords: [], audience: "" };
};

export const optimizeSnippet = async (info: string, apiKey: string): Promise<SnippetOptimization> => {
    return { originalTitle: "", originalDesc: "", variations: [] };
};
