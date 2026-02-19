import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReportPayload } from "@/types/report";

// Prompts del Sistema (Preservados del original para mantener la calidad del reporte)
const SYSTEM_PROMPT_DISPATCHER = `You are a "Chief Editor" of an SEO analyst team. Your only task is to decide which sections to include in a monthly report.
I will give you a "Findings Summary" in JSON.
Reply ONLY with a JSON array of strings, indicating the section keys that MUST be written.

DECISION RULES:
1. ALWAYS include 'RESUMEN_EJECUTIVO' and 'CONCLUSIONES'.
2. Prioritize "Alerts" over "Opportunities".
3. If 'page1Losers' > 0, ALWAYS include 'ALERTA_PERDEDORES_P1'.
4. If 'ghostKeywords' > 0, include 'ALERTA_GHOST_KEYWORDS'.
5. If 'cannibalization' > 0, include 'ALERTA_CANIBALIZACION'.
6. If 'decay' > 0, include 'ALERTA_DECAIMIENTO'.
7. If 'strikingDistance' > 2, include 'OPORTUNIDAD_STRIKING_DISTANCE'.
8. If 'newKeywords' > 2, include 'OPORTUNIDAD_NUEVAS_KEYWORDS'.
9. If 'ctrRedFlags' > 0 OR 'ctrOpportunities' > 0, include 'ANALISIS_CTR'.
10. If 'segments' > 0, include 'ANALISIS_SEGMENTOS'.
11. If 'aiChatTraffic' > 0, include 'APARICION_CHATS_IA'.
12. Include 'ANALISIS_TRAFICO' and 'ANALISIS_VISIBILIDAD' only if 'trafficMovers' > 0 or 'visibilityMovers' > 0.
13. If 'countries' > 0, include 'ANALISIS_GEOGRAFICO'.
14. If 'userContext' mentions "ignore X", use judgment but generally keep alerts.

Reply ONLY with the JSON array.`;

const SYSTEM_PROMPT_WRITER = `You are a "General SEO Editor", an expert analyst.
You will receive:
1. 'USER CONTEXT' (string).
2. 'Research Dossier' (JSON).
3. 'Relevant Sections' (Array of strings).

--- GOLDEN RULE ---
Read 'USER CONTEXT' first. It MUST guide your narrative.
If the user says "the drop in X is natural", DO NOT report it as a critical alert, mention it as an observation.

--- HTML STRUCTURE & LAYOUT RULES ---
For EACH topic/section (except Executive Summary and Conclusions), you MUST generate **TWO SLIDES** (two <section> tags).

**SLIDE 1: ANALYSIS & VISUALIZATION**
Layer: Deep analysis on the left, Chart on the right.
Template:
<section class="report-slide bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-12 break-inside-avoid relative overflow-hidden flex flex-col">
  <div class="flex items-center space-x-3 border-b border-gray-200 pb-3 mb-4 shrink-0">
     [SVG_ICON]
     <h2 class="text-xl font-bold text-gray-900">SECTION TITLE</h2>
  </div>
  <div class="grid grid-cols-2 gap-8 flex-1 min-h-0">
    <div class="prose prose-sm max-w-none overflow-y-auto pr-2">
       <h3 class="text-lg font-semibold text-gray-800 mb-2">Key Findings</h3>
       <p class="text-gray-600 mb-4">...Deep analysis paragraph...</p>
       <ul class="list-disc pl-5 space-y-1 text-gray-600">
         <li><strong>Specific Metric:</strong> Contextual explanation.</li>
       </ul>
    </div>
    <div class="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100">
       <!-- CHART PLACEHOLDER - AI MUST SELECT APPROPRIATE TYPE -->
       <div data-chart-type="[CHART_TYPE]" class="chart-placeholder w-full h-64"></div>
       <p class="text-xs text-slate-500 mt-2 text-center">Visualización de datos clave</p>
    </div>
  </div>
</section>

**SLIDE 2: DATA EVIDENCE**
Layer: Full-width table with specific URLs/Queries.
Template:
<section class="report-slide bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-12 break-inside-avoid relative overflow-hidden flex flex-col">
   <div class="flex items-center space-x-2 mb-4 shrink-0">
      <h3 class="text-lg font-semibold text-gray-800">Evidencia de Datos: [SECTION TITLE]</h3>
   </div>
   <div class="flex-1 min-h-0 overflow-auto border border-gray-100 rounded-lg">
      <table class="w-full text-sm text-left">
         <thead class="bg-gray-50 text-gray-700 font-bold sticky top-0">
            <tr><th class="p-3">Item (URL/Keyword)</th><th class="p-3">Clicks</th><th class="p-3">Imp.</th><th class="p-3">Pos.</th><th class="p-3">Change</th></tr>
         </thead>
         <tbody class="divide-y divide-gray-100 text-gray-600">
            <!-- 10-15 ROWS OF DATA -->
            <tr><td class="p-3 font-mono text-xs max-w-[200px] truncate">...</td><td class="p-3">...</td><td class="p-3">...</td><td class="p-3">...</td><td class="p-3">...</td></tr>
         </tbody>
      </table>
   </div>
</section>

--- SECTION SPECIFIC INSTRUCTIONS ---

1. **ESTADO_SEO** (Estado General del Proyecto):
   - Slide 1 Chart: <div data-chart-type="trend" ...></div>
   - Slide 1 Analysis: Analyze 'seoStatus', 'kpis'. Mention 'newKeywords' count.
   - Slide 2: Table of Top 15 Gainers (Winners) or Top 15 Losers depending on net trend.

2. **APARICION_CHATS_IA**:
   - Slide 1 Chart: <div data-chart-type="ai-traffic" ...></div> (Visualize sessions per source).
   - Slide 1 Analysis: Use 'aiTrafficAnalysis'. Discuss 'estimatedImpressions'.
   - Slide 2: Table of 'Top AI Referrers' and 'Top Pages via AI'.

3. **ALERTA_PERDEDORES_P1** / **OPORTUNIDAD_STRIKING_DISTANCE**:
   - Slide 1 Chart: <div data-chart-type="losers" ...></div> (or appropriate bar chart).
   - Slide 1 Analysis: Why are they dropping? or Why are they close?
   - Slide 2: Full table of the specific keywords/URLs involved.

4. **ANALISIS_SEGMENTOS** / **CATEGORIES**:
   - Slide 1 Chart: <div data-chart-type="pie" ...></div> usually best for segments.
   - Slide 2: Table of Segments performance.

--- ICONS ---
Alert: <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
Opportunity: <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-7.5 0m7.5 0a12.06 12.06 0 007.5 0M12 12.75h.008v.008H12v-.008zM12 15a.75.75 0 01.75.75v.008a.75.75 0 01-1.5 0V15.75A.75.75 0 0112 15z" /></svg>
Analysis: <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 3H14.25m-10.5 0H20.25M3.75 3V1.5A.75.75 0 014.5 0h15a.75.75 0 01.75.75V3m0 0v11.25m0-11.25c-1.036 0-1.875.84-1.875 1.875V11.25c0 1.035.84 1.875 1.875 1.875m-1.875-1.875a.375.375 0 11.75 0 .375.375 0 01-.75 0z" /></svg>
Conclusion: <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>

Start writing the HTML immediately, section by section.`;

export const getRelevantSections = async (payload: ReportPayload, apiKey: string): Promise<string[]> => {
    const findingsSummary = {
        period1Name: payload.period1Name,
        period2Name: payload.period2Name,
        userContext: payload.userContext,
        outlier: !!(payload.outlierAnalysis.clickLoser || payload.outlierAnalysis.impressionLoser),
        page1Losers: payload.page1LoserAlerts.length,
        ghostKeywords: payload.ghostKeywordAlerts.length,
        decay: payload.keywordDecayAlerts.length,
        cannibalization: payload.keywordCannibalizationAlerts.length,
        ctrRedFlags: payload.ctrAnalysis.redFlags.length,
        strikingDistance: payload.strikingDistanceOpportunities.length,
        newKeywords: payload.newKeywordDiscovery.length,
        segments: payload.segmentAnalysis.length,
        trafficMovers: payload.topLosers.length + payload.topWinners.length,
        countries: payload.countryAnalysis.length,
        aiChatTraffic: payload.aiTrafficAnalysis ? payload.aiTrafficAnalysis.totalSessions : 0
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    // STRICT PRIORITY for Gemini 3 Flash Preview as requested
    const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    for (const modelId of models) {
        try {
            console.log(`[GEMINI-SERVICE] Dispatcher checking model: ${modelId}`);
            const model = genAI.getGenerativeModel({
                model: modelId,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent([
                { text: SYSTEM_PROMPT_DISPATCHER },
                { text: `Here is the Findings Summary:\n${JSON.stringify(findingsSummary)}` }
            ]);
            const text = result.response.text();
            if (!text) continue;

            try {
                return JSON.parse(text);
            } catch (jsonError) {
                const match = text.match(/\[[\s\S]*\]/);
                if (match) return JSON.parse(match[0]);
                continue;
            }
        } catch (e: any) {
            console.warn(`[GEMINI-SERVICE] Dispatcher model ${modelId} failed:`, e.message?.substring(0, 100));
        }
    }

    console.warn(`[GEMINI-SERVICE] All Dispatcher models failed. Returning default sections.`);
    return ['RESUMEN_EJECUTIVO', 'CONCLUSIONES'];
};

// Helper to reduce payload size intelligently without breaking JSON structure
function simplifyPayload(payload: ReportPayload): any {
    const simplified = { ...payload };

    // Relaxed Limits for "2-Slide" Deep Report
    // We want enough data for the "Data Evidence" slide tables.
    if (simplified.segmentAnalysis) simplified.segmentAnalysis = simplified.segmentAnalysis.slice(0, 15);
    if (simplified.countryAnalysis) simplified.countryAnalysis = simplified.countryAnalysis.slice(0, 15);
    if (simplified.visibilityAnalysis?.winners) simplified.visibilityAnalysis.winners = simplified.visibilityAnalysis.winners.slice(0, 20);
    if (simplified.visibilityAnalysis?.losers) simplified.visibilityAnalysis.losers = simplified.visibilityAnalysis.losers.slice(0, 20);

    // Remove potentially large unused data if present
    // @ts-ignore
    delete simplified.chartData;

    return simplified;
}

export const generateHTMLReport = async (payload: ReportPayload, sections: string[], apiKey: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(apiKey);

    // STRICT PRIORITY for Gemini 3 as requested
    const models = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash'
    ];

    // Intelligent payload reduction
    const simplifiedPayload = simplifyPayload(payload);
    let safePayload = JSON.stringify(simplifiedPayload);

    // Increase hard limit for Gemini 3 (has 1M context, allows mostly full data)
    const MAX_CHARS = 300000;
    if (safePayload.length > MAX_CHARS) {
        console.warn(`[GEMINI-SERVICE] Payload too large (${safePayload.length}). Truncating to ${MAX_CHARS} chars.`);
        safePayload = safePayload.substring(0, MAX_CHARS);
    }

    console.log(`[GEMINI-SERVICE] Generating Report. Payload Size: ${safePayload.length} chars (Original: ${JSON.stringify(payload).length})`);

    const userPrompt = `
--- USER CONTEXT ---
${payload.userContext || 'No specific context.'}

--- RELEVANT SECTIONS ---
${JSON.stringify(sections)}

--- RESEARCH DOSSIER ---
${safePayload}
`;

    for (const modelId of models) {
        try {
            console.log(`[GEMINI-SERVICE] Writer checking model: ${modelId}`);

            // Log prompt preview for debugging (first 500 chars)
            if (modelId === models[0]) {
                console.log(`[GEMINI-SERVICE] Prompt Preview: ${userPrompt.substring(0, 500)}...`);
            }

            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent([
                { text: SYSTEM_PROMPT_WRITER },
                { text: userPrompt }
            ]);
            const text = result.response.text();

            if (text) {
                console.log(`[GEMINI-SERVICE] Writer SUCCESS with model: ${modelId}. Output length: ${text.length}`);
                return text;
            }

            console.warn(`[GEMINI-SERVICE] Writer model ${modelId} returned empty response.`);
        } catch (e: any) {
            console.warn(`[GEMINI-SERVICE] Writer model ${modelId} failed:`, e.message?.substring(0, 200));
        }
    }

    console.error("[GEMINI-SERVICE] ALL WRITER MODELS FAILED.");
    return "<p>Error técnico al generar el texto del informe con IA. Por favor, intenta de nuevo o revisa tu cuota de API.</p>";
};

export const identifyAiTrafficSources = async (sources: string[], apiKey: string): Promise<string[]> => {
    if (sources.length === 0) return [];

    // Fallback regex first (faster, saves tokens)
    const regex = /chatgpt|openai|bard|gemini|claud|bing|copilot|perplexity|you\.com|poe\.com/i;
    const candidates = sources.filter(s => regex.test(s));

    // If we have explicit AI sources, we might trust regex, but Gemini is smarter for ambiguous ones.
    // Let's use Gemini for the full list to catch new ones.

    const prompt = `
    Analyze this list of web traffic sources/referrers.
    Return a JSON array of strings containing ONLY the sources that are AI Chatbots, LLMs, or AI Search Assistants.
    Examples to include: "chatgpt", "openai", "bard", "gemini", "bing chat", "copilot", "perplexity", "claude", "anthropic", "you.com".
    Examples to ignore: "google", "bing", "facebook", "twitter", "direct", "(not set)", "organic".

    List: ${JSON.stringify(sources)}
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview', // Upgraded to Gemini 3 for consistency
        generationConfig: { responseMimeType: "application/json" }
    });

    try {
        const result = await model.generateContent([{ text: prompt }]);
        const text = result.response.text();
        if (!text) return candidates;

        const aiSources = JSON.parse(text);
        return Array.from(new Set([...candidates, ...aiSources])); // Merge regex + AI results

    } catch (e) {
        console.warn("AI Source Identification failed", e);
        return candidates;
    }
};

export const generateContent = async (prompt: string, context: string = '', apiKey: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const systemPrompt = `You are an SEO Content Assistant for a Report Editor.
    Your task is to generate or improve HTML content for an SEO report based on the user's prompt.
    Return ONLY valid HTML (elements like <p>, <h3>, <ul>, <table>).
    Do not wrap in <html> or <body> tags.
    Do not use markdown backticks.
    Use Tailwind CSS classes matching the report style (text-gray-600, font-bold, etc.) where appropriate.`;

    const fullPrompt = `
    ${systemPrompt}

    CONTEXT (Existing Content):
    ${context}

    USER PROMPT:
    ${prompt}
    `;

    try {
        const result = await model.generateContent([{ text: fullPrompt }]);
        const text = result.response.text();
        // Strip markdown code blocks if present
        return text.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e: any) {
        console.warn("[GEMINI-SERVICE] generateContent failed:", e.message);
        throw new Error("Error generating content with AI.");
    }
};
export const generateInsightAnalysis = async (context: string, apiKey: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const systemPrompt = `You are a Senior SEO Data Analyst.
    Analyze the provided SEO metrics context.
    - Focus on finding patterns, opportunities, and anomalies.
    - Be concise and direct.
    - Output formatted HTML (paragraphs <p>, lists <ul>/<li>, bold values <strong>).
    - Do NOT output a full report, just the specific analysis for this data section.
    - Language: Spanish.`;

    try {
        const result = await model.generateContent([
            { text: systemPrompt },
            { text: context }
        ]);
        const text = result.response.text();
        return text.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e: any) {
        console.warn("[GEMINI-SERVICE] generateInsightAnalysis failed:", e.message);
        return "No se pudo generar el análisis.";
    }
};
