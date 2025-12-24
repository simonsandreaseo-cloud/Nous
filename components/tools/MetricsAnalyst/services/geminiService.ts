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

// 2. Section Writer: High Density & Robust Charting (FROM INFORMES SEO)
const SYSTEM_PROMPT_SECTION_WRITER = `You are a "Lead Product Designer" for a Financial/SEO SaaS. Generate **ONE specific HTML component** that feels premium, minimalist, and clean.

--- DESIGN SYSTEM: "Premium Minimalist" ---
1. **Layout**: Use \`grid grid-cols-1 md:grid-cols-2 gap-10\`. Emphasize whitespace (\`p-8\`). Avoid visual clutter.
2. **Typography**: 
   - Headers: \`font-bold tracking-tight text-slate-900\`.
   - Body: \`text-slate-600 font-medium leading-relaxed max-w-prose\`.
   - Data: Use \`<span class="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">\` for technical values.
3. **Visual Indicators**:
   - Use color sparingly but effectively (Emerald for growth, Rose for decay, Amber for warning).
   - Use icons consistently.
4. **Tables**:
   - Class: \`w-full text-left border-collapse text-[13px] bg-white rounded-xl border border-slate-100 overflow-hidden\`
   - Headers: \`bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-400 py-4 px-6\`
   - Cells: \`border-b border-slate-50 py-4 px-6 font-medium text-slate-600\`
   - Last Row: Remove border.
5. **Charts (VITAL)**:
   - Output charts for any URL or Keyword being analyzed.
   - HTML: \`<div class="chart-placeholder w-full h-16" data-chart-type="clicks" data-chart-url="EXACT_KEY_FROM_DATA"></div>\` (Sparkline style)
   
--- SECTION SPECIFICS ---
- **OPORTUNIDADES_CONTENIDO_CLUSTERS**: Use a card-based grid (3 cols). Cards should be flat with a subtle border: \`border border-slate-200 rounded-xl p-6 hover:border-indigo-200 transition\`.
- **ALERTA_CANIBALIZACION**: Must include a chart for every major keyword conflict.
- **ANALISIS_ESTRATEGICO**: Focus on "Matriz de Ataque/Defensa". Bold headers, clean lists.
- **ANALISIS_IMPACTO_TAREAS**: Show a before/after comparison.
- **ANALISIS_TRAFICO_IA**: Breakdown of AI sources.
- **ANALISIS_CONTENIDOS**: 
  - **Dashboard**: A clean grid of 4 stats (Total Clicks, Imp, etc.).
  - **Table**: Include a dedicated column for the Sparkline Chart.

Output RAW HTML only. Avoid any Markdown. All content in professional Spanish.`;

// 3. Achievements Mode Prompt (Celebratory Tone)
const SYSTEM_PROMPT_ACHIEVEMENTS = `You are a "Chief Success Officer". Your job is to create a "Hall of Fame" report derived from SEO data.
OBJECTIVE: Highlight WINS, GROWTH, and RESILIENCE. Ignore minor drops unless they are catastrophic.
TONE: Celebratory, motivational, energetic. Use emojis like 🏆, 🚀, 🌟, 💪.

--- DESIGN SYSTEM: "Victory Mode" ---
1. **Layout**: Use cards and prominent headers.
2. **Typography**: Use optimistic language. Instead of "Traffic fell", say "Opportunity for recovery detected".
3. **Visuals**:
   - Winners: Use <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 font-bold">🏆 [Winner Content]</div>
   - Charts: VITAL. Comparison charts showing growth (P2 > P1) should be highlighted.
4. **Content Rules**:
   - Focus on Top Winners.
   - For "ANALISIS_ESTRATEGICO", focus on "Defend" (Retaining Wins) and "Attack" (New Wins).
   - "ANALISIS_IMPACTO_TAREAS": Focus on tasks that brought positive ROI.

Output RAW HTML only.`;

// 4. Final Refiner: The "Editor in Chief" (FROM INFORMES SEO)

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

const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemma-3-27b', 'gemini-2.5-flash'];

// Helper for retry logic with Key Rotation & Model Fallback (ROBUST - USING STANDARDIZED SDK)
async function generateWithRetry(apiKeys: string[], requestedModel: string, promptText: string, config: any) {
    let lastError;
    const modelsToTry = Array.from(new Set([requestedModel, ...FALLBACK_MODELS]));

    // Iterate through models
    for (const model of modelsToTry) {
        // Iterate through keys
        for (let k = 0; k < apiKeys.length; k++) {
            const currentKey = apiKeys[k];

            try {
                // Initialize Client per key
                const genAI = new GoogleGenerativeAI(currentKey);

                // Configure Model
                const modelConfig: any = {
                    model: model,
                };

                // Extract system instruction if present (SDK handles it at model init)
                if (config?.systemInstruction) {
                    modelConfig.systemInstruction = config.systemInstruction;
                }

                const generativeModel = genAI.getGenerativeModel(modelConfig);

                // Configure Generation Options
                const generationConfig: any = {};
                if (config?.responseMimeType) {
                    generationConfig.responseMimeType = config.responseMimeType;
                }

                // Try up to 3 times per key/model pair for network issues
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
                        const msg = innerE.message || "";

                        // Handle 503 (Transient)
                        if (status === 503) {
                            const delay = 2000 * Math.pow(2, i);
                            await new Promise(r => setTimeout(r, delay));
                            continue;
                        }
                        throw innerE; // Propagate to key loop handler
                    }
                }

            } catch (e: any) {
                lastError = e;
                const msg = e.message || "";

                // 404: Model not found. BREAK KEY LOOP -> Next Model
                if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
                    console.warn(`⚠️ Model ${model} not found (404) with key ${k}. Switching model...`);
                    k = apiKeys.length; // Abort key loop for this model
                    break;
                }

                // 429: Quota. Continue to NEXT KEY.
                if (msg.includes('429') || msg.includes('Quota') || msg.includes('exhausted')) {
                    console.warn(`⚠️ API Key ${k} exhausted for ${model}. Rotating...`);
                    continue; // Next key
                }

                // 400/401: Invalid Key. Continue to NEXT KEY.
                if (msg.includes('400') || msg.includes('401') || msg.includes('API key')) {
                    console.warn(`⚠️ API Key ${k} invalid. Rotating...`);
                    continue;
                }

                // If undefined error, try next key just in case
                console.warn(`⚠️ Unknown error with key ${k}: ${msg}. Rotating...`);
            }
        }
    }
    throw lastError || new Error("All API keys and fallback models exhausted.");
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
        segments: payload.segmentAnalysis.length,
        aiSessions: payload.aiTrafficAnalysis ? payload.aiTrafficAnalysis.sources.length : 0
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
    caseCount?: number,
    mode: UsageMode = 'default'
): Promise<string> => {

    // Exclude taskImpactDetails from the main data payload to avoid duplication/overhead
    const { taskImpactDetails, ...cleanPayload } = payload;

    const writerPayload = {
        ...cleanPayload,
        availableChartKeys: payload.availableChartKeys // Handshake keys
    };

    let sectionContext = "";
    if (sectionName === 'ANALISIS_IMPACTO_TAREAS') {
        sectionContext = `
        ANALYSIS GOAL: You are looking at SEO tasks (from project management) and their potential impact on traffic.
        TASK DETAILS: ${JSON.stringify(payload.taskImpactDetails)}
        INSTRUCTIONS: 
        1. List ALL distinct tasks provided in 'TASK DETAILS'. 
        2. For each task:
           - Display its Title and Completion Date.
           - Check if the task's URL (gsc_property_url) exists in "availableChartKeys".
           - IF EXISTS: Plot a chart using data-chart-url="URL" and describe the trend (Growth/Decay).
           - IF NOT EXISTS: State "Indirect Impact / URL data not top-ranked" and provide a theoretical impact analysis based on the task description.
        3. Conclude with a "Correlation Score" (High/Medium/Low) based on the observation.
        `;
    }

    if (sectionName === 'ANALISIS_CONTENIDOS') {
        sectionContext = `
        ANALYSIS GOAL: Evaluate the performance of a specific group of content (Monthly Calendar or Selected Articles).
        CONTENT DATA: ${JSON.stringify((payload as any).contentAnalysisData)}
        INSTRUCTIONS:
        1. **Content Dashboard**: Create a <div class="grid grid-cols-4 gap-4 mb-8"> with the 4 key metrics from 'overview' (Total Clicks, Total Imp, Avg Pos, Count). Use large bold numbers.
        2. **Detailed Table**: Create a table with these columns:
           - **Content**: Title and URL (Target Key in subtext).
           - **Metrics**: Clicks, Imp, Pos.
           - **Trend**: A Sparkline Chart Column! Insert <div class="chart-placeholder w-32 h-10" data-chart-type="clicks" data-chart-url="URL"></div> here.
           - **Analysis**: Brief insight.
        3. Identify specific wins/losses.
        `;
    }

    if (sectionName === 'ANALISIS_TRAFICO_IA') {
        sectionContext = `
        ANALYSIS GOAL: Analyze the impact of Artificial Intelligence sources (ChatGPT, Gemini, etc.) on the site's traffic.
        AI DATA: ${JSON.stringify(payload.aiTrafficAnalysis)}
        INSTRUCTIONS:
        1. "AI Traffic Overview": Summary with Total Sessions from AI and Growth/Decay.
        2. "Sources Breakdown": Table with the Top AI Sources (Source Name, Sessions, Change).
        3. "Trend Analysis": Include a chart with data-chart-type="ai-trend" and data-chart-url="ai-sessions". Explain the trend (ascending? spiking?).
        4. "Strategy": Provide recommendations. Should we optimize more for AI answers?
        `;
    }

    const prompt = `
    TASK: Generate HTML for section "${sectionName}".
    CONTEXT: ${payload.userContext || 'Standard Analysis'}
    ${sectionContext}
    DATA: ${JSON.stringify(writerPayload)}
    
    IMPORTANT: 
    1. Start with a <h2 class="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 uppercase tracking-tight flex items-center gap-3">
       <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> [Title in Spanish]
       </h2>
    2. Use the "availableChartKeys" to find exact URLs for charts.
    3. ${caseCount ? `CRITICAL: Limit your list/table to only the TOP ${caseCount} cases.` : 'Show the most important data points available.'}
    4. Write detailed analysis in professional Spanish.
    5. Always prefer using a table alongside a chart placeholder if data is available.
    `;

    try {
        const response = await generateWithRetry(
            apiKeys,
            model,
            prompt,
            prompt,
            { systemInstruction: mode === 'achievements' ? SYSTEM_PROMPT_ACHIEVEMENTS : SYSTEM_PROMPT_SECTION_WRITER }
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
