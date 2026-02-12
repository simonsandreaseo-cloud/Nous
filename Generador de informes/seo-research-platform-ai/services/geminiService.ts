import { GoogleGenAI } from "@google/genai";
import { ReportPayload } from "../types";

// Prompts
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
11. Include 'ANALISIS_TRAFICO' and 'ANALISIS_VISIBILIDAD' only if 'trafficMovers' > 0 or 'visibilityMovers' > 0.
12. If 'countries' > 0, include 'ANALISIS_GEOGRAFICO'.
13. If 'userContext' mentions "ignore X", use judgment but generally keep alerts.

Reply ONLY with the JSON array.`;

const SYSTEM_PROMPT_WRITER = `You are a "General SEO Editor", an expert analyst.
You will receive:
1. 'USER CONTEXT' (string).
2. 'Research Dossier' (JSON).
3. 'Relevant Sections' (Array of strings).

--- GOLDEN RULE ---
Read 'USER CONTEXT' first. It MUST guide your narrative.
If the user says "the drop in X is natural", DO NOT report it as a critical alert, mention it as an observation.

--- HTML DESIGN RULES ---
1. Wrap each section in: <section class="bg-white p-6 rounded-lg shadow-lg mb-6"> ... </section>
2. Section Titles:
   <div class="flex items-center space-x-3 border-b border-gray-200 pb-3 mb-4">
     [SVG_ICON]
     <h2 class="text-xl font-bold text-gray-900">SECTION TITLE</h2>
   </div>
3. Subtitles: <h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">...</h3>
4. Paragraphs: <p class="text-gray-600 mb-3">...</p>
5. Lists: Use <div class="divide-y divide-gray-100"> <div class="py-3">...</div> </div>
6. Keywords/URLs: Use <code class="text-sm font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">...</code>
7. Charts: If needed for top winners/losers, insert: <div data-chart-url="/full/url" data-chart-type="clicks" class="chart-placeholder mt-2 mb-4 h-64 w-full"></div>

--- ICONS ---
Alert: <svg class="w-6 h-6 text-red-600" ... path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" .../></svg>
Opportunity: <svg class="w-6 h-6 text-blue-600" ... path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-7.5 0m7.5 0a12.06 12.06 0 007.5 0M12 12.75h.008v.008H12v-.008zM12 15a.75.75 0 01.75.75v.008a.75.75 0 01-1.5 0V15.75A.75.75 0 0112 15z" .../></svg>
Analysis: <svg class="w-6 h-6 text-gray-700" ... path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 3H14.25m-10.5 0H20.25M3.75 3V1.5A.75.75 0 014.5 0h15a.75.75 0 01.75.75V3m0 0v11.25m0-11.25c-1.036 0-1.875.84-1.875 1.875V11.25c0 1.035.84 1.875 1.875 1.875m-1.875-1.875a.375.375 0 11.75 0 .375.375 0 01-.75 0z" .../></svg>
Conclusion: <svg class="w-6 h-6 text-green-600" ... path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" .../></svg>

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
        countries: payload.countryAnalysis.length
    };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Here is the Findings Summary:\n${JSON.stringify(findingsSummary)}`,
        config: {
            systemInstruction: SYSTEM_PROMPT_DISPATCHER,
            responseMimeType: "application/json"
        }
    });

    const text = response.text;
    if (!text) throw new Error("Dispatcher returned empty response");
    
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback cleanup in case JSON is dirty
        const match = text.match(/\[.*\]/s);
        if (match) return JSON.parse(match[0]);
        return ['RESUMEN_EJECUTIVO', 'CONCLUSIONES'];
    }
};

export const generateHTMLReport = async (payload: ReportPayload, sections: string[], apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const userPrompt = `
--- USER CONTEXT ---
${payload.userContext || 'No specific context.'}

--- RELEVANT SECTIONS ---
${JSON.stringify(sections)}

--- RESEARCH DOSSIER ---
${JSON.stringify(payload)}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT_WRITER
        }
    });

    return response.text || "<p>Error generating report text.</p>";
};
