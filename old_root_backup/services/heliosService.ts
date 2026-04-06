import { GoogleGenerativeAI } from "@google/generative-ai";
import { HeliosConfig } from '../components/tools/Helios/types/heliosSchema';

const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemma-3-27b', 'gemini-2.5-flash'];

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

        const result = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: generationConfig
        });
        const response = await result.response;
        return { text: response.text() };
      } catch (e: any) {
        lastError = e;
        if ((e.message || "").includes('404')) { k = apiKeys.length; break; }
        const status = e.status || e.response?.status;
        if (status === 503 || status === 429) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }
  throw lastError || new Error("All API keys and fallback models exhausted.");
}

const cleanAndParseJSON = (text: string): any => {
  // 1. First attempt: Simple Clean (Markdown removal)
  let clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    // 2. Second attempt: Extract JSON object from text
    // Sometimes the model adds chatting before/after despite instructions
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      const extracted = clean.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extracted);
      } catch (e2) {
        // 3. Third attempt: Repair common syntax errors (Single quotes for keys)
        // This is risky but solves the "Expected double-quoted property name" error
        // We only target keys: 'key': -> "key":
        try {
          const repaired = extracted.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
            .replace(/'/g, '"'); // Very aggressive, use with caution or better regex
          return JSON.parse(repaired);
        } catch (e3) {
          console.error("JSON Critical Parse Failure", { original: text, extracted });
          throw e;
        }
      }
    }
    throw e;
  }
};

export const analyzeWithHelios = async (
  payload: any,
  config: HeliosConfig,
  model: string,
  apiKeys: string[]
): Promise<any> => {

  // 1. Construct System Prompt based on Config
  let moduleInstructions = "";

  if (config.modules.task_impact) {
    moduleInstructions += `
        - **TASK IMPACT ANALYSIS**: 
          You have a list of 'Completed Tasks' in the data. Correlate them with traffic changes.
          DID a task cause an uplift? Or a drop? 
          Create a specific section for this. Use a 'table' to show: Task Name, Date, Predicted Impact, Actual Result.
        `;
  }

  if (config.modules.content_performance) {
    moduleInstructions += `
        - **CONTENT PERFORMANCE**:
          Identify Top 5 Winners and Top 5 Losers based on clicks/impressions.
          Use a 'table' with proper trend indicators (category='{"trend": 15}') to show changes.
        `;
  }

  if (config.modules.traffic_anomalies) {
    moduleInstructions += `
        - **ANOMALIES**:
          Look for sudden spikes or drops globally.
          Use 'line' charts to visualize these anomalies over time.
        `;
  }

  if (config.modules.concentration) {
    moduleInstructions += `
        - **CONCENTRATION RISK**:
          Analyze 'concentrationAnalysis' data.
          Highlight if too few pages drive most traffic.
          Use a 'table' to show the top contributor URLs and their % share.
        `;
  }

  if (config.modules.new_keywords) {
    moduleInstructions += `
        - **NEW KEYWORDS**:
          Analyze 'newKeywordDiscovery' data.
          Identify promising new terms with high impressions.
          Use a 'table' to list these terms with their initial performance.
        `;
  }

  if (config.modules.segment_analysis) {
    moduleInstructions += `
        - **SEGMENT ANALYSIS**:
          Analyze 'segmentAnalysis'.
          Compare performance of different URL patterns/folders.
          Use a 'bar' or 'table' chart to compare segments.
        `;
  }

  if (config.modules.cannibalization) {
    moduleInstructions += `
        - **CANNIBALIZATION ALERTS**:
          Analyze 'keywordCannibalizationAlerts'.
          Identify keywords where multiple URLs are competing/flipping.
          Use bullet points to list the Keyword and the Competing URLs.
          Recommend a Canonical Strategy or Content Merge.
        `;
  }

  if (config.modules.keyword_decay) {
    moduleInstructions += `
        - **KEYWORD DECAY**:
          Analyze 'keywordDecayAlerts'.
          Highlight keywords that have lost significant positions.
          Use a 'table' to show: Keyword, Old Pos, New Pos, Drop.
          Suggest Content Refresh or Search Intent update.
        `;
  }

  if (config.modules.strategic_overview) {
    moduleInstructions += `
        - **STRATEGIC MATRIX**:
          Analyze 'strategicOverview' (Defend, Attack, Expand, Prune).
          Create a 'table' for EACH quadrant (Defend, Attack, etc) or one big table.
          Focus on high volume opportunities.
        `;
  }

  if (config.modules.ctr_opportunities) {
    moduleInstructions += `
        - **CTR & GHOST KEYWORDS**:
          Analyze 'ctrAnalysis' and 'ghostKeywordAlerts'.
          Identify "Ghost Keywords" (High Impressions, Zero Clicks).
          Identify "Low CTR" opportunities (Good Position < 10, but bad CTR).
          Prioritize quick wins (Meta Title/Desc optimization).
        `;
  }

  // PITCH MODE LOGIC
  let styleInstructions = "LANGUAGE: SPANISH (Professional, Strategic, Detailed Analysis).";
  let structureInstructions = "";

  if (config.reportType === 'pitch') {
    styleInstructions = `
        LANGUAGE: SPANISH (Concise, Punchy, Presentation Style).
        - TEXT: Maximum 2-3 sentences per section. Use bullet points heavily.
        - FOCUS: High-level trends and big numbers.
        - STRUCTURE: 
          - SECTION 1 MUST BE "GENERAL DASHBOARD" containing a 'table' of Key Metrics (Clicks, Imp, CTR, Pos) and a 'line' chart of "Traffic Trend".
        `;
  } else {
    // Standard
    styleInstructions += `
         - Provide deep insights and actionable recommendations.
         `;
  }

  const HELIOS_SYSTEM_PROMPT = `
    You are Helios, a Sovereign SEO Intelligence Engine.
    Your goal is to analyze SEO data and produce a DETERMINISTIC JSON report based on the user's configuration.
    
    CRITICAL VISUALIZATION RULES:
    1. **Tables**: Use type "table" for dense data. 
       - **MANDATORY**: You MUST provide 'tableColumns' definition for every table.
       - 'tableColumns': Array of objects { "key": "field_name", "label": "Header Name", "format": "text"|"number"|"percent"|"trend", "trendKey": "optional_field_for_color" }.
       - 'data': Array of objects where keys match the 'tableColumns' keys.
    2. **Line Charts**: Use type "line" for trends over time. 
       - Use 'colorScheme': 'success' for positive trends, 'alert' for negative.
    
    JSON SCHEMA:
    {
      "executiveSummary": "High level summary...",
      "sections": [
        {
          "title": "Section Title",
          "summary": "...",
          "charts": [
            {
               "id": "c1",
               "title": "Top Winners",
               "type": "table",
               "tableColumns": [
                  { "key": "keyword", "label": "Keyword", "format": "text" },
                  { "key": "clicks", "label": "Clicks", "format": "number" },
                  { "key": "change", "label": "Trend", "format": "trend", "trendKey": "change" }
               ],
               "data": [{ "keyword": "foo", "clicks": 100, "change": 12 }]
            }
          ]
        }
      ]
    }
    
    MODULES REQUESTED:
    ${moduleInstructions}
    
    STYLE & FORMAT:
    ${styleInstructions}

    CRITICAL JSON FORMATTING:
    - START your response with '{' and END with '}'.
    - DO NOT use markdown code blocks (triple backticks).
    - **ALWAYS use DOUBLE QUOTES for keys and string values.** (e.g. "key": "value", NOT 'key': 'value').
    - Do not add comments // inside the JSON.
    `;

  // 2. Prepare Data Payload
  // We filter payload based on config if needed, or just warn AI to focus.
  const prompt = `
    ANALYZE THIS DATA:
    ${JSON.stringify(payload).substring(0, 95000)}

  CONFIGURATION:
    ${JSON.stringify(config)}
    
    Create a report focusing ONLY on the requested modules.
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
    return json;
  } catch (e) {
    console.error("Helios Engine Failed:", e);
    throw e;
  }
};
