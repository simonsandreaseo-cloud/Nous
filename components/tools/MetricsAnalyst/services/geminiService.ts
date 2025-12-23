import { GoogleGenAI } from "@google/genai";
import { ReportPayload, ContentBrief, SnippetOptimization } from "../types";

// 1. Dispatcher: Strict Rules for Section Inclusion (FROM INFORMES SEO - FULL LOGIC)
const SYSTEM_PROMPT_DISPATCHER = `You are a "Chief Editor" for an SEO Agency. 
Your job is to decide the EXACT list of JSON keys for the report sections to generate.

MANDATORY RULES based on input data (Check values carefully):
1. 'OPORTUNIDADES_CONTENIDO_CLUSTERS': Include if topicClusters.length > 0.
2. 'ANALISIS_CONCENTRACION': Include if clickConcentration.items.length > 0 OR impressionConcentration.items.length > 0.
3. 'ANALISIS_ESTRATEGICO': Include if strategicOverview has items (defend/attack).
4. 'ANALISIS_CAUSAS_CAIDA': Include if lossDiagnosis > 0.
5. 'ALERTA_CANIBALIZACION': Include if cannibalization > 0.
6. 'OPORTUNIDAD_STRIKING_DISTANCE': Include if strikingDistance > 0.
7. 'OPORTUNIDAD_NUEVAS_KEYWORDS': Include if newKeywords > 2.
8. 'ANALISIS_CTR': Include if ctrRedFlags > 0.
9. 'ANALISIS_SEGMENTOS': Include if segments > 0.
10. **NEVER** include 'RESUMEN_EJECUTIVO' or 'CONCLUSIONES' here. (They are generated in the final step).

Return ONLY a JSON Array of strings. Example: ["ANALISIS_ESTRATEGICO", "ANALISIS_CTR"]`;

// 2. Section Writer: High Density & Robust Charting (FROM INFORMES SEO)
const SYSTEM_PROMPT_SECTION_WRITER = `You are a "Lead Product Designer" for a Financial/SEO SaaS. Generate **ONE specific HTML component**.

--- DESIGN SYSTEM: "High-Density Professional" ---
1. **Layout**: Use \`grid grid-cols-1 md:grid-cols-2 gap-6\` to put data tables side-by-side with charts or text. Reduce whitespace.
2. **Typography**: Use \`text-slate-800\` for headings, \`text-slate-600\` for body. Use \`font-mono text-[10px]\` for numbers.
3. **Tables**:
   - Class: \`w-full text-left border-collapse table-fixed text-[11px]\`
   - Headers: \`bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider font-bold text-slate-500 py-1 px-2\`
   - Cells: \`border-b border-slate-50 py-1 px-2 truncate\`
   - Numbers: \`font-mono text-slate-700\`
4. **Charts**: CRITICAL. 
   To render a chart, you MUST output this EXACT HTML (do not change the structure):
   \`<div class="chart-placeholder w-full h-32 bg-slate-50/50 rounded border border-slate-100" data-chart-type="clicks" data-chart-url="EXACT_URL_FROM_DATA"></div>\`
   
   *IMPORTANT*: 
   - Replace 'EXACT_URL_FROM_DATA' with the exact string from the JSON (e.g., 'https://site.com/page'). 
   - Do NOT shorten it, do NOT add www if missing. Copy/Paste it.
   - For Cannibalization, use \`data-chart-type="cannibalization"\` and the *Keyword* as the url.

5. **No Markdown**: Output RAW HTML only.

6. **Language**: Ensure all analysis text is in **SPANISH**.

7. **COLOR CODING (CRITICAL)**:
   - For POSITIVE metrics (e.g. Growth, Improvement, Click Increase), wrap the number in \`<span class="text-emerald-600 font-bold">\` (e.g., +15%).
   - For NEGATIVE metrics (e.g. Decay, Click Loss), wrap the number in \`<span class="text-rose-600 font-bold">\` (e.g., -23%).
   - Remember: For POSITION, LESS is BETTER. So -3.2 (Position improved) is \`text-emerald-600\`, while +5.1 (Position worsened) is \`text-rose-600\`.


--- SECTION SPECIFICS ---
- **OPORTUNIDADES_CONTENIDO_CLUSTERS**: 3-col grid. Cards: \`border border-slate-200 p-2 rounded shadow-sm bg-white\`.
- **ANALISIS_ESTRATEGICO**: 2x2 Grid. Boxes with colored top borders. Dense lists.
- **ALERTA_CANIBALIZACION**: Table. Row: Keyword | URLs | Chart.
- **ANALISIS_CONCENTRACION**: 2-col layout. Left: Risk Text. Right: Dense Table (URL | % Share).
- **ANALISIS_CAUSAS_CAIDA**: Table. Cols: URL | Lost Clicks | Diagnosis.
- **ANALISIS_SEGMENTOS**: Table. Cols: Segment | Clicks Change (Color Red/Green) | Impressions Change. Use \`text-emerald-600\` for positive change and \`text-rose-600\` for negative change.

Output RAW HTML only.`;

// 3. Final Refiner: The "Editor in Chief" (FROM INFORMES SEO)
const SYSTEM_PROMPT_REFINER = `You are the Editor in Chief. 
Your job is to write the **Executive Abstract** and **Final Verdict**.

Input: The raw HTML content of the generated sections.

Task:
1. Analyze the content to find the "Main Story".
2. Generate TWO HTML sections (Raw HTML, NO Markdown):
   - \`<section id="RESUMEN_EJECUTIVO" class="mb-6 print:mb-4 break-inside-avoid">...</section>\`: 
     Use a "Hero" box: \`bg-[#0f172a] text-white p-5 rounded-lg shadow-sm\`.
     Title: "Resumen Ejecutivo". Text: Dense, direct, no fluff. Max 80 words. Focus on the biggest problem/opportunity. Write in SPANISH.
   
   - \`<section id="CONCLUSIONES" class="mb-6 print:mb-4 break-inside-avoid">...</section>\`: 
     Use a bordered box: \`border border-indigo-100 bg-indigo-50/30 p-4 rounded-lg\`.
     Title: "Plan de Acción Prioritario". Content: 3-4 bullet points with **bold** starts. Actionable. Write in SPANISH.

Output RAW HTML only.`;

// Helper for retry logic with Key Rotation (FROM REPORT GENERATOR)
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
    // Construct a simplified summary for the Dispatcher
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
        if (!text) return ['ANALISIS_ESTRATEGICO'];

        const cleanText = text.replace(/```json /g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Dispatcher failed", e);
        // Fallback to essential sections if dispatcher fails
        return ['ANALISIS_ESTRATEGICO', 'OPORTUNIDADES_CONTENIDO_CLUSTERS'];
    }
};

export const generateReportSection = async (
    sectionName: string,
    payload: ReportPayload & { taskImpactDetails?: any[] },
    model: string,
    apiKeys: string[],
    caseCount?: number
): Promise<string> => {

    const writerPayload = {
        ...payload,
        availableChartKeys: payload.availableChartKeys // Handshake keys
    };

    let sectionContext = "";
    if (sectionName === 'ANALISIS_IMPACTO_TAREAS') {
        sectionContext = `
        ANALYSIS GOAL: You are looking at SEO tasks completed in a specific date range. 
        TASK DETAILS: ${JSON.stringify(payload.taskImpactDetails)}
        INSTRUCTIONS: 
        1. For each task, check if the associated URL (gsc_property_url) is present in the "availableChartKeys".
        2. Analyze if there was growth or decay for these specific URLs in the period.
        3. Explain to the user the direct or indirect impact of these tasks on the metrics.
        `;
    }

    const prompt = `
    TASK: Generate HTML for section "${sectionName}".
    CONTEXT: ${payload.userContext || 'Standard Analysis'}
    ${sectionContext}
    DATA: ${JSON.stringify(writerPayload)}
    
    IMPORTANT: 
    1. Start with a <h2 class="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase tracking-tight flex items-center gap-2">
       <span class="w-2 h-2 rounded-full bg-indigo-500"></span> [Title in Spanish]
       </h2>
    2. Use the "availableChartKeys" to find exact URLs for charts.
    3. ${caseCount ? `CRITICAL: Limit your list/table to only the TOP ${caseCount} cases.` : 'Show the most important data points available.'}
    4. Write detailed analysis in professional Spanish.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            prompt,
            { systemInstruction: SYSTEM_PROMPT_SECTION_WRITER }
        );
        let html = response.text || "";
        html = html.replace(/```html /g, '').replace(/```/g, '').trim();
        return html;
    } catch (e) {
        return `<!-- Error generating ${sectionName} -->`;
    }
};

export const generateFinalRefinement = async (
    generatedHTML: string,
    userContext: string,
    model: string,
    apiKeys: string[]
): Promise<string> => {

    const prompt = `
    The report data sections have been generated.
    USER CONTEXT: ${userContext}
    
    REPORT CONTENT:
    ${generatedHTML.substring(0, 45000)} 
    
    Write the RESUMEN_EJECUTIVO (Abstract) and CONCLUSIONES sections.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            prompt,
            { systemInstruction: SYSTEM_PROMPT_REFINER }
        );
        let html = response.text || "";
        html = html.replace(/```html /g, '').replace(/```/g, '').trim();
        return html;
    } catch (e) {
        console.error("Refinement failed", e);
        return `<section id="RESUMEN_EJECUTIVO" class="mb-6"><div class="p-6 bg-slate-900 text-white rounded-xl"><h2>Informe Generado</h2><p>Resumen no disponible.</p></div></section>`;
    }
};


// --- PHASE 5: TACTICAL GENERATORS ---
export const generateContentBrief = async (clusterInfo: string, apiKey: string): Promise<ContentBrief> => {
    return { title: "", targetKeyword: "", intent: "", structure: [], semanticKeywords: [], audience: "" };
};

export const optimizeSnippet = async (info: string, apiKey: string): Promise<SnippetOptimization> => {
    return { originalTitle: "", originalDesc: "", variations: [] };
};
