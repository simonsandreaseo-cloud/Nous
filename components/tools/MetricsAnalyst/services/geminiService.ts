import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReportPayload, ContentBrief, SnippetOptimization, UsageMode } from "../types";

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
9. 'ANALISIS_SEGMENTOS': Include if segments > 0.
10. 'ANALISIS_TRAFICO_IA': Include if aiTraffic > 0.
11. **NEVER** include 'RESUMEN_EJECUTIVO' or 'CONCLUSIONES' here. (They are generated in the final step).

Return ONLY a JSON Array of strings. Example: ["ANALISIS_ESTRATEGICO", "ANALISIS_CTR"]`;

// 2. Section Writer: JSON Structure for Hybrid Content
const SYSTEM_PROMPT_SECTION_WRITER = `You are a "Lead Product Designer" for a Financial/SEO SaaS. 
Your task is to generate a JSON object for a specific report section.

OUTPUT FORMAT (JSON ONLY):
{
  "html": "<div class='...'> ... </div>",
  "charts": [
    {
      "type": "line" | "bar", // Choose best fit
      "title": "Chart Title",
      "metrics": [ { "label": "Clicks", "dataKey": "clicks", "color": "#6366f1" } ],
      "filter": { "urlIncludes": "https://..." } // Optional: exact URL filter
    }
  ]
}

--- DESIGN SYSTEM (For the HTML field) ---
1. **Layout**: Use \`grid grid-cols-1 md:grid-cols-2 gap-10\`. Emphasize whitespace.
2. **Typography**: Clean, executive.
3. **Tables**: Use standard Tailwind styled tables (as before).
4. **NO CHART PLACEHOLDERS IN HTML**: Do not put <div class="chart-placeholder"> in the HTML. The charts will be rendered automatically based on the "charts" array you return.

--- CHARTING LOGIC ---
- If you find a specific URL winning/losing, ADD A CHART CONFIG to the "charts" array for that URL!
- Use "urlIncludes" in the filter to target the specific data.
- Recommended colors: Clicks (#6366f1), Impressions (#8b5cf6), Position (#f43f5e - inverted logic).

--- SECTION SPECIFICS ---
- **OPORTUNIDADES_CONTENIDO_CLUSTERS**: Use a card-based grid (3 cols).
- **ALERTA_CANIBALIZACION**: MUST include a chart for every major conflict.
- **ANALISIS_ESTRATEGICO**: Focus on "Matriz de Ataque/Defensa".
- **ANALISIS_TRAFICO_IA**: Breakdown of AI sources.

Output JSON only.`;

// 3. Achievements Mode Prompt
const SYSTEM_PROMPT_ACHIEVEMENTS = `You are a "Chief Success Officer". 
Output JSON format: { "html": "...", "charts": [...] }.
Tone: Celebratory, motivational.
Focus on WINS.`;

// 4. Final Refiner
const SYSTEM_PROMPT_REFINER = `You are the Editor in Chief. 
Output JSON format: { "html": "..." } (No charts needed for summary usually, but keep format consistent).
Write the RESUMEN_EJECUTIVO (Abstract) and CONCLUSIONES sections.
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

    // Keep strict dispatcher logic
    const SYSTEM_PROMPT_DISPATCHER = `You are a "Chief Editor".
    MANDATORY RULES based on input data:
    1. 'OPORTUNIDADES_CONTENIDO_CLUSTERS': Include if topicClusters.length > 0.
    2. 'ANALISIS_CONCENTRACION': Include if clickConcentration.items.length > 0.
    3. 'ANALISIS_ESTRATEGICO': Include if strategicOverview has items.
    4. 'ANALISIS_CAUSAS_CAIDA': Include if lossDiagnosis > 0.
    5. 'ALERTA_CANIBALIZACION': Include if cannibalization > 0.
    6. 'OPORTUNIDAD_STRIKING_DISTANCE': Include if strikingDistance > 0.
    7. 'OPORTUNIDAD_NUEVAS_KEYWORDS': Include if newKeywords > 2.
    8. 'ANALISIS_CTR': Include if ctrRedFlags > 0.
    9. 'ANALISIS_SEGMENTOS': Include if segments > 0.
    10. 'ANALISIS_TRAFICO_IA': Include if aiSessions > 0.
    
    Return ONLY a JSON Array of strings. Example: ["ANALISIS_ESTRATEGICO"]`;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            `Findings: ${JSON.stringify(findingsSummary)}`,
            { systemInstruction: SYSTEM_PROMPT_DISPATCHER, responseMimeType: "application/json" }
        );
        return JSON.parse(response.text.replace(/```json|```/g, '').trim());
    } catch (e) {
        return ['ANALISIS_ESTRATEGICO', 'OPORTUNIDADES_CONTENIDO_CLUSTERS'];
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
    if (sectionName === 'ANALISIS_IMPACTO_TAREAS') sectionContext = `TASK DETAILS: ${JSON.stringify(payload.taskImpactDetails)}`;
    if (sectionName === 'ANALISIS_CONTENIDOS') sectionContext = `CONTENT DATA: ${JSON.stringify((payload as any).contentAnalysisData)}`;
    if (sectionName === 'ANALISIS_TRAFICO_IA') sectionContext = `AI DATA: ${JSON.stringify(payload.aiTrafficAnalysis)}`;

    const prompt = `
    TASK: Generate Content for section "${sectionName}".
    CONTEXT: ${payload.userContext || 'Standard Analysis'}
    ${sectionContext}
    DATA: ${JSON.stringify(writerPayload)}
    
    Recall: Output valid JSON with 'html' and 'charts' array.
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
        const json = JSON.parse(response.text.replace(/```json|```/g, '').trim());
        return {
            html: json.html || "<!-- Empty -->",
            charts: json.charts || []
        };
    } catch (e) {
        console.error("Section Gen Error", e);
        return { html: `<div class="text-red-500">Error generando sección ${sectionName}</div>`, charts: [] };
    }
};

export const generateFinalRefinement = async (
    generatedHTML: string,
    userContext: string,
    model: string,
    apiKeys: string[]
): Promise<string> => {
    // This one stays HTML-focused for simplicity in the summary, 
    // OR we can make it return JSON too. Let's keep it HTML string for now 
    // but the Prompt expects JSON so we need to parse it.

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            `CONTEXT: ${userContext}. \n CONTENT: ${generatedHTML.substring(0, 45000)}`,
            { systemInstruction: SYSTEM_PROMPT_REFINER, responseMimeType: "application/json" }
        );
        const json = JSON.parse(response.text.replace(/```json|```/g, '').trim());
        return json.html || "";
    } catch (e) {
        return `<section id="RESUMEN_EJECUTIVO"><p>Resumen no disponible.</p></section>`;
    }
};


// --- PHASE 5: TACTICAL GENERATORS ---
export const generateContentBrief = async (clusterInfo: string, apiKey: string): Promise<ContentBrief> => {
    return { title: "", targetKeyword: "", intent: "", structure: [], semanticKeywords: [], audience: "" };
};

export const optimizeSnippet = async (info: string, apiKey: string): Promise<SnippetOptimization> => {
    return { originalTitle: "", originalDesc: "", variations: [] };
};
