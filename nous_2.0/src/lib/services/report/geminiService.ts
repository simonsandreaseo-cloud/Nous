import { useWriterStore } from '@/store/useWriterStore';

async function queryAI(prompt: string, apiKey: string, modelId: string = 'gemini-2.5-flash', jsonResponse: boolean = false): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: modelId });
    const config: any = {};
    if (jsonResponse) config.responseMimeType = 'application/json';

    const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: config
    });

    const responseText = res.response.text();

    // Log to the debug store: phase, prompt, response
    useWriterStore.getState().addDebugPrompt(`AI Query: ${modelId}`, prompt, responseText);

    return responseText;
}


// Helper to reduce payload size intelligently without breaking JSON structure
function simplifyPayload(payload: ReportPayload): any {
    const simplified = { ...payload };

    // Relaxed Limits for "2-Slide" Deep Report
    if (simplified.segmentAnalysis) simplified.segmentAnalysis = simplified.segmentAnalysis.slice(0, 15);
    if (simplified.countryAnalysis) simplified.countryAnalysis = simplified.countryAnalysis.slice(0, 15);
    if (simplified.visibilityAnalysis?.winners) simplified.visibilityAnalysis.winners = simplified.visibilityAnalysis.winners.slice(0, 20);
    if (simplified.visibilityAnalysis?.losers) simplified.visibilityAnalysis.losers = simplified.visibilityAnalysis.losers.slice(0, 20);

    // Remove potentially large unused data if present
    // @ts-ignore
    delete simplified.chartData;

    return simplified;
}

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

const SYSTEM_PROMPT_WRITER = `You are a "Premium SEO Strategic Analyst".
You will receive:
1. 'USER CONTEXT' (string).
2. 'Research Dossier' (JSON).
3. 'Section to Write' (string).

--- GOLDEN RULE ---
Read 'USER CONTEXT' first. It MUST guide your narrative.
Your tone is professional, strategic, and "Landing Page" ready. Use clear, impactful headlines.

--- JSON OUT STRUCTURE (DATA-DRIVEN REPORTS) ---
You must generate exactly **TWO SLIDES** of data for the requested section.
Reply ONLY with a valid JSON array of objects representing the slides.

**SLIDE 1: ANALYSIS & STRATEGY**
Type: "split_analysis"
Focus: Deep insights and narrative.
{
  "type": "split_analysis",
  "sectionKey": "[SECTION_KEY]",
  "title": "[High-Impact Section Title]",
  "subtitle": "Análisis Estratégico",
  "icon": "TrendingUp",
  "analysis": "[Deep Markdown string with insights, max 2 paragraphs]",
  "metrics": [
      { "label": "[KPI Name]", "value": "[Value]", "trend": "up|down|neutral" },
      { "label": "[Metric 2]", "value": "[Value]", "trend": "up|down|neutral" }
  ],
  "chartConfig": {
      "type": "bar",
      "chartType": "[trend|ai-traffic|losers|bar]",
      "title": "Data Projection v2"
  }
}

**SLIDE 2: EVIDENCE DATASET**
Type: "table_dataset"
Focus: Raw data evidence (Top 10 max).
{
  "type": "table_dataset",
  "sectionKey": "[SECTION_KEY]",
  "title": "Evidencia: [Title]",
  "subtitle": "Desglose de métricas reales del periodo",
  "icon": "Table",
  "tableData": [
      { "key": "[URL/Keyword]", "clicks": 100, "impressions": 5000, "ctr": 2.0, "position": 1.5, "changeClicks": 10 }
  ]
}

--- SECTION SPECIFIC CHART LOGIC ---
- **ESTADO_SEO**: "chartType": "trend". Include top 5 metrics in "metrics".
- **APARICION_CHATS_IA**: "chartType": "ai-traffic". Discuss visibility in LLMs.
- **ALERTA_PERDEDORES_P1**: "chartType": "losers". Focus on immediate recovery strategy.
- **OPORTUNIDAD_STRIKING_DISTANCE**: "chartType": "bar". Focus on low-hanging fruit (Pos 11-20).

Reply ONLY with the valid JSON array containing exactly these two objects. Do not wrap in markdown \`\`\`json block.`;
export const getRelevantSections = async (payload: ReportPayload, apiKey: string): Promise<string[]> => {
    // If the payload has explicit selections, use them, otherwise use a default sequence
    let sections = ['ESTADO_SEO'];

    if (payload.topWinners && payload.topWinners.length > 0) sections.push('OPORTUNIDAD_STRIKING_DISTANCE');
    if (payload.topLosers && payload.topLosers.length > 0) sections.push('ALERTA_PERDEDORES_P1');
    if (payload.aiTrafficAnalysis && payload.aiTrafficAnalysis.sources.length > 0) sections.push('APARICION_CHATS_IA');

    return sections;
};

// Helper to generate a single section as JSON
async function generateSection(
    sectionKey: string,
    payload: ReportPayload,
    apiKey: string,
    modelId: string
): Promise<any[]> {
    const simplifiedPayload = simplifyPayload(payload);

    const safePayload = JSON.stringify(simplifiedPayload);

    const prompt = `[System]: ${SYSTEM_PROMPT_WRITER}

[UserContext]: ${payload.userContext || 'No specific context.'}
[Section]: ${sectionKey}
[Data]: ${safePayload}`;

    try {
        console.log(`[GEMINI-SERVICE] Generating JSON section: ${sectionKey}`);
        let text = await queryAI(prompt, apiKey, modelId, true);

        // Clean markdown backticks if Gemini includes them despite instructions
        const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (match && match[1]) {
            text = match[1].trim();
        } else {
            if (text.startsWith('```json')) text = text.replace('```json', '');
            if (text.startsWith('```')) text = text.replace('```', '');
            text = text.trim();
            if (text.endsWith('```')) text = text.slice(0, -3).trim();
        }

        const jsonSlides = JSON.parse(text);

        // Ensure sectionKey is injected if Gemini forgot
        if (Array.isArray(jsonSlides)) {
            jsonSlides.forEach(slide => slide.sectionKey = sectionKey);
            return jsonSlides;
        }

        return [jsonSlides]; // fallback array wrapper
    } catch (e: any) {
        console.warn(`[GEMINI-SERVICE] JSON Section ${sectionKey} failed with ${modelId}:`, e.message);
        throw e;
    }
}

export const generateJSONReportState = async (payload: ReportPayload, sections: string[], apiKey: string): Promise<any[]> => {
    const models = [
        'gemini-2.5-flash'
    ];

    let allSlides: any[] = [];

    // Add built-in Title Slide
    allSlides.push({
        type: "title_slide",
        title: "Informe SEO Inteligente",
        subtitle: "Estrategia, análisis y rendimiento propulsado por IA corporativa.",
        date: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
    });

    console.log(`[GEMINI-SERVICE] Starting Chunked JSON Generation for ${sections.length} sections.`);

    for (const section of sections) {
        let sectionSlides: any[] = [];
        let success = false;

        for (const modelId of models) {
            try {
                // Now returns a JSON array of slide objects
                sectionSlides = await generateSection(section, payload, apiKey, modelId);
                if (Array.isArray(sectionSlides)) {
                    success = true;
                    break;
                }
            } catch (e) {
                console.warn(`[GEMINI-SERVICE] Retrying section ${section} with fallback model...`);
            }
        }

        if (success) {
            allSlides = allSlides.concat(sectionSlides);
        } else {
            // Error slide fallback
            allSlides.push({
                type: "error_slide",
                title: `Error: ${section}`,
                message: "No se pudo generar el análisis estructurado para esta sección."
            });
        }
    }

    return allSlides;
};

// Legacy method for backward compatibility if needed, or to be deprecated
export const generateHTMLReport = async (payload: ReportPayload, sections: string[], apiKey: string): Promise<string> => {
    throw new Error("generateHTMLReport is deprecated. Use generateJSONReportState.");
};

export const identifyAiTrafficSources = async (sources: string[], apiKey: string): Promise<string[]> => {
    if (sources.length === 0) return [];

    // Fallback regex first (faster, saves tokens)
    const regex = /chatgpt|openai|bard|gemini|claud|bing|copilot|perplexity|you\.com|poe\.com/i;
    const candidates = sources.filter(s => regex.test(s));

    // If we have explicit AI sources, we might trust regex, but Gemini is smarter for ambiguous ones.
    // Let's use Gemini for the full list to catch new ones.

    const promptText = `[System]: Analyze this list of web traffic sources/referrers.
Return a JSON array of strings containing ONLY the sources that are AI Chatbots, LLMs, or AI Search Assistants.
Examples to include: "chatgpt", "openai", "bard", "gemini", "bing chat", "copilot", "perplexity", "claude", "anthropic", "you.com".
Examples to ignore: "google", "bing", "facebook", "twitter", "direct", "(not set)", "organic".

[Data]: ${JSON.stringify(sources)}`;

    try {
        const text = await queryAI(promptText, apiKey, 'gemini-2.5-flash', true);
        if (!text) return candidates;

        const aiSources = JSON.parse(text);
        return Array.from(new Set([...candidates, ...aiSources])); // Merge regex + AI results

    } catch (e) {
        console.warn("AI Source Identification failed", e);
        return candidates;
    }
};

export const generateContent = async (prompt: string, context: string = '', apiKey: string): Promise<string> => {
    const systemPrompt = `You are an SEO Content Assistant for a Report Editor.
    Your task is to generate or improve HTML content for an SEO report based on the user's prompt.
    Return ONLY valid HTML (elements like <p>, <h3>, <ul>, <table>).
    Do not wrap in <html> or <body> tags.
    Do not use markdown backticks.
    Use Tailwind CSS classes matching the report style (text-gray-600, font-bold, etc.) where appropriate.`;

    const fullPrompt = `[System]: ${systemPrompt}\n\n[Context]: ${context}\n\n[User]: ${prompt}`;

    try {
        const text = await queryAI(fullPrompt, apiKey);
        // Strip markdown code blocks if present
        return text.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e: any) {
        console.warn("[GEMINI-SERVICE] generateContent failed:", e.message);
        throw new Error("Error generating content with AI.");
    }
};
export const generateInsightAnalysis = async (context: string, apiKey: string): Promise<string> => {
    const systemPrompt = `You are a Senior SEO Data Analyst.
    Analyze the provided SEO metrics context.
    - Focus on finding patterns, opportunities, and anomalies.
    - Be concise and direct.
    - Output formatted HTML (paragraphs <p>, lists <ul>/<li>, bold values <strong>).
    - Do NOT output a full report, just the specific analysis for this data section.
    - Language: Spanish.`;

    const fullPrompt = `[System]: ${systemPrompt}\n\n[Data]: ${context}`;

    try {
        const text = await queryAI(fullPrompt, apiKey);
        return text.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e: any) {
        console.warn("[GEMINI-SERVICE] generateInsightAnalysis failed:", e.message);
        return "No se pudo generar el análisis.";
    }
};
