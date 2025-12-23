
import { GoogleGenAI } from "@google/genai";
import { CannibalizationGroup, AiBatchOptions, TrendAnalysis, ClusterGroup, ComparisonRow, ModuleId, SeoDiagnosis, SeoAction, AutoTaskResult, AiAnalysisResult } from "../types";
import { fetchContentWithJina, fetchSerpWithJina } from "./jinaService";

export const AVAILABLE_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-pro-exp-02-05"
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Map GSC Country Names to ISO-2 Codes
const COUNTRY_ISO_MAP: Record<string, string> = {
    'united states': 'us', 'usa': 'us', 'eeuu': 'us', 'estados unidos': 'us',
    'united kingdom': 'uk', 'uk': 'uk', 'reino unido': 'uk',
    'spain': 'es', 'españa': 'es',
    'mexico': 'mx', 'méxico': 'mx',
    'argentina': 'ar',
    'colombia': 'co',
    'chile': 'cl',
    'peru': 'pe', 'perú': 'pe',
    'venezuela': 've',
    'ecuador': 'ec',
    'bolivia': 'bo',
    'uruguay': 'uy',
    'paraguay': 'py',
    'brazil': 'br', 'brasil': 'br',
    'germany': 'de', 'alemania': 'de',
    'france': 'fr', 'francia': 'fr',
    'italy': 'it', 'italia': 'it',
    'canada': 'ca', 'canadá': 'ca',
    'australia': 'au',
    'india': 'in',
    'global': 'us'
};

const getCountryCode = (countryName: string): string => {
    if (!countryName) return 'us';
    const clean = countryName.toLowerCase().trim();
    if (clean.length === 2) return clean;
    return COUNTRY_ISO_MAP[clean] || 'us';
};

// STRICT TAG CONSOLIDATION (8 Core Tags)
const TRANSLATE_TAGS_ES = (tag: string) => {
    const t = tag.toUpperCase().trim();

    if (t.includes('WINNER') || t.includes('GANADORA')) return 'GANADORA';
    if (t.includes('REDIRECT')) return 'REDIRECCIONAR 301';
    if (t.includes('MERGE') || t.includes('FUSION')) return 'FUSIONAR';
    if (t.includes('DE-OPTIMIZE') || t.includes('DESOPT')) return 'DESOPTIMIZAR';
    if (t.includes('KEEP') || t.includes('MANTENER') || t.includes('MIXED') || t.includes('MIXTO') || t.includes('IGNORAR')) return 'MANTENER';
    if (t.includes('DELETE') || t.includes('ELIMINAR') || t.includes('404')) return 'ELIMINAR (404)';
    if (t.includes('CANONICAL')) return 'CANONICALIZAR';

    // Default fallback
    return 'REVISIÓN MANUAL';
};

export const getOpportunityPriority = (
    moduleId: ModuleId,
    currentPos: number,
    currentImp: number,
    diffPos: number,
    pastImp: number = 0
): 'HIGH' | 'MEDIUM' | 'LOW' => {

    // Module Specific Priorities
    if (moduleId === 'LOST_KEYWORDS') {
        // For Lost Keywords, current metrics are 0. Use past impressions.
        if (pastImp > 500) return 'HIGH';
        if (pastImp > 100) return 'MEDIUM';
        return 'LOW';
    }

    if (moduleId === 'GHOST_KEYWORDS') {
        // High impressions, no clicks.
        if (currentImp > 1000) return 'HIGH';
        if (currentImp > 300) return 'MEDIUM';
        return 'LOW';
    }

    if (moduleId === 'STRIKING_DISTANCE') {
        // Pos 11-20
        if (currentImp > 500) return 'HIGH';
        return 'MEDIUM';
    }

    // Default Logic
    // High impact decay or very high volume keywords
    if ((currentPos < 20 && currentImp > 800) || Math.abs(diffPos) > 5) return 'HIGH';
    if (currentPos >= 20 && currentPos <= 40 && currentImp > 200) return 'MEDIUM';

    return 'LOW';
};

// --- TOKEN OPTIMIZATION: SEMANTIC COMPRESSION ---

const compressContentForAnalysis = (markdown: string): string => {
    if (!markdown) return "No content available.";

    const lines = markdown.split('\n');
    let skeleton = "";
    let introCaptured = false;
    let introWordCount = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Always keep Headers
        if (trimmed.startsWith('#')) {
            skeleton += trimmed + "\n";
            continue;
        }

        // Keep the first ~50 words of body text as "Intro"
        if (!introCaptured) {
            skeleton += trimmed + "\n";
            introWordCount += trimmed.split(' ').length;
            if (introWordCount > 50) {
                introCaptured = true;
                skeleton += "[...Body Content Truncated for Analysis...]\n";
            }
        }
    }
    return skeleton;
};

const compressSerpContext = (serpMarkdown: string): string => {
    // Take first 3000 chars which covers top organic results usually
    return serpMarkdown.substring(0, 3000);
};

// --- HELPER: KEY ROTATION ---

const executeWithKeyRotation = async <T>(
    keys: string[],
    operation: (key: string) => Promise<T>
): Promise<T> => {
    let lastError: any = null;

    // Loop through keys. If one fails with 429, try next.
    for (const apiKey of keys) {
        try {
            return await operation(apiKey);
        } catch (error: any) {
            lastError = error;
            const msg = error.message || JSON.stringify(error);
            const isQuota = msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');

            if (isQuota) {
                console.warn(`Key ${apiKey.substring(0, 8)}... exhausted. Rotating...`);
                continue; // Try next key
            } else {
                throw error; // Other errors (e.g. invalid request) should fail immediately
            }
        }
    }

    throw lastError; // All keys failed
};

// --- MODULAR PROMPTS (Reduce Input Size) ---

const BASE_PROMPT = `
ROLE: "Simon SEO AI".
OUTPUT: JSON.
LANG: {target_lang}.
STRICT: Output MUST be in {target_lang}.
CTX:
- KW: "{keyword}"
- CTRY: {pais_code}
- METRICS: Pos {pos}, CTR {ctr}%, Time {time}s.
- MY URL: {mi_url}
- SITE CONTEXT: {site_context}

MY CONTENT SKELETON:
{mi_content_resumen}

COMPETITOR SKELETONS (TOP RANKING):
{competencia_resumen}

NEGATIVE CONSTRAINTS:
- DO NOT suggest "researching competitors". I have provided the content of the competitors. USE IT.
- DO NOT suggest "analyzing the intent". You are the analyzer. DO IT.
- DO NOT suggest "checking the SERP". I have provided the SERP URLs and content. USE IT.
- YOUR ACTIONS MUST BE DELIVERABLES (Text, Code, HTML), NOT ADVICE.
- IF GENERATING CODE (JSON-LD, HTML), INCLUDE A "CONTEXT/INSTALLATION" NOTE telling the user where to place it.
- **EXTREME CONCISENESS**: DIAGNOSIS explanation must be < 40 words. Action Titles < 10 words. Action Content must be direct and to the point.
`;

const MODULE_INSTRUCTIONS: Record<string, string> = {
    'GHOST_KEYWORDS': `
    TASK: High Imp, 0 Clicks.
    1. Compare my Title vs Competitor Titles.
    2. Identify why they click them and not me.
    3. REWRITE my Title Tag to be more clickable (emotional/stat-driven).
    4. WRITE a new Intro Hook matching user intent found in Competitor Content.
    OUTPUT:
    - RootCause: INTENT or CONTENT_QUALITY.
    - Action 1: "New Title Candidates" (List 3).
    - Action 2: "New Intro Hook" (The actual text).
    `,
    'SEO_DECAY': `
    TASK: Position Drop.
    1. Compare my headers vs Competitor headers. What H2/H3 do they have that I miss?
    2. Check Freshness in competitor content (dates, years).
    3. GENERATE the missing section.
    OUTPUT:
    - RootCause: FRESHNESS or CONTENT_QUALITY.
    - Action 1: "Missing Section" (Write the actual H2 + Paragraph content).
    - Action 2: "Update Plan" (Specific bullet points).
    `,
    'LOSERS_PAGE_1': `
    TASK: Fell from Pg1.
    1. Identify the specific sub-topic (H2) the Top 3 have that I don't.
    2. DRAFT that missing H2 section completely.
    OUTPUT:
    - RootCause: CONTENT_QUALITY.
    - Action: "New Content Section" (HTML format <h2>...</h2><p>...</p>).
    `,
    'CTR_RED_FLAGS': `
    TASK: Low CTR on Top 5.
    1. Look at the Competitor Titles and Descriptions.
    2. GENERATE a new Meta Description that is punchy and includes a CTA.
    3. GENERATE JSON-LD Schema (FAQ or Article) if relevant.
    OUTPUT:
    - RootCause: TECHNICAL (Schema) or COPYWRITING.
    - Action 1: "New Meta Description".
    - Action 2: "JSON-LD Code" (The actual code block + Context: "Paste in <head>").
    `,
    'STRIKING_DISTANCE': `
    TASK: Push Pos 11-20 to Pg1.
    1. Find missing semantic entities/keywords in my headers vs competitors.
    2. Create a new H2 integrating missing entities.
    OUTPUT:
    - RootCause: CONTENT_QUALITY (Depth).
    - Action: "Content Expansion" (The actual H2 and text to add).
    `,
    'NEW_KEYWORDS': `
    TASK: New ranking term.
    1. Confirm if intent matches current URL.
    2. Optimize H2 or suggest simpler outline.
    OUTPUT:
    - RootCause: INTENT.
    - Action: "Optimization" (Exact H2 text change) OR "Outline" (Bullet points only).
    `,
    'CTR_OPPORTUNITIES': `
    TASK: High CTR on Pg2.
    1. User wants this content.
    2. Suggest Aggressive On-Page optimization (Title front-loading).
    OUTPUT:
    - RootCause: CONTENT_QUALITY.
    - Action: "Title & Header Optimization" (Specific text changes).
    `,
    'LOST_KEYWORDS': `
    TASK: Keywords Disappeared.
    1. Did we delete content?
    2. RECREATE the paragraph that likely targeted this keyword based on Competitor usage.
    OUTPUT:
    - RootCause: CONTENT_QUALITY (Removed).
    - Action: "Restored Content" (Write a paragraph targeting this keyword).
    `
};

const getModulePrompt = (moduleId: string, context: Record<string, string>) => {
    const specificInstructions = MODULE_INSTRUCTIONS[moduleId] || "Analyze SEO gap and generate missing content.";
    let p = BASE_PROMPT + "\n### INSTRUCTIONS:\n" + specificInstructions;

    // Interpolate
    Object.keys(context).forEach(key => {
        p = p.replace(new RegExp(`{${key}}`, 'g'), context[key]);
    });

    p += `
    \n### JSON RESPONSE FORMAT:
    {
      "diagnosis": {
        "status": "CRITICAL" | "IMPROVABLE" | "OPTIMAL",
        "rootCause": "INTENT" | "TECHNICAL" | "CONTENT_QUALITY" | "FRESHNESS",
        "explanation": "Concise reason.",
        "referenceCompetitors": ["url1", "url2"]
      },
      "actions": [
        {
          "type": "TEXT" | "CODE" | "INSTRUCCION",
          "title": "Action Title",
          "content": "The actual deliverable as a SINGLE STRING. Do not nest objects here. If Code, write the context comment inside the string."
        }
      ]
    }
    `;
    return p;
};

export const validateGeminiKey = async (key: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Hi',
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const analyzeSeoCase = async (
    row: ComparisonRow | CannibalizationGroup,
    moduleId: ModuleId,
    options: AiBatchOptions,
    preferredUrl?: string
): Promise<AutoTaskResult | null> => {
    if (options.apiKeys.length === 0) throw new Error("API Key required");

    let keyword = row.query;
    let url = '';
    let pos = 0;
    let ctr = 0;
    let time = 0;
    let engagement = 'Unknown';
    let country = 'Global';

    if ('urls' in row) {
        return null;
    } else {
        const metrics = row.periodB;
        url = preferredUrl || row.urlBreakdown[0]?.url || '';
        pos = metrics.position;
        ctr = metrics.ctr;
        time = metrics.sessionDuration || 0;
        country = row.dominantCountry;
        if (metrics.bounceRate) {
            engagement = metrics.bounceRate < 0.6 ? 'High' : 'Low';
        }
    }

    if (!url) return null;

    let myContent = '';
    let competitorsContext = '';
    let competitorUrls: string[] = [];

    // Check if we have any enabled provider key
    const hasExternalKey = options.externalKeys.jina || options.externalKeys.firecrawl || options.externalKeys.tavily || options.externalKeys.serper;

    try {
        if (hasExternalKey) {
            const isoCountry = getCountryCode(country);

            // 1. Fetch My Content
            const myContentPromise = fetchContentWithJina(url, options.externalKeys, options.providerConfig.reader);

            // 2. Fetch SERP to get Competitor URLs
            const serpResult = await fetchSerpWithJina(keyword, isoCountry, options.lang, options.externalKeys, options.providerConfig.serp);

            // 3. Extract Top 3-5 Competitors from SERP Result
            competitorUrls = serpResult.urls.slice(0, 3); // Top 3 is usually enough context and saves tokens/time

            // 4. Fetch Competitor Content in Parallel
            const competitorPromises = competitorUrls.map(u => fetchContentWithJina(u, options.externalKeys, options.providerConfig.reader));

            const [myC, ...compCs] = await Promise.all([myContentPromise, ...competitorPromises]);

            myContent = compressContentForAnalysis(myC);

            competitorsContext = compCs.map((c, i) => {
                return `COMPETITOR ${i + 1} (${competitorUrls[i]}):\n${compressContentForAnalysis(c)}\n---\n`;
            }).join('\n');

            // Fallback if content fetch fails but we have SERP markdown
            if (!competitorsContext && serpResult.markdown) {
                competitorsContext = compressSerpContext(serpResult.markdown);
            }
        }
    } catch (e) {
        console.warn("External content fetch failed", e);
    }

    const targetLang = options.lang === 'es' ? 'SPANISH' : 'ENGLISH';

    const prompt = getModulePrompt(moduleId, {
        target_lang: targetLang,
        case_module: moduleId,
        pais_code: country,
        keyword: keyword,
        pos: pos.toFixed(1),
        ctr: ctr.toFixed(2),
        engagement: engagement,
        time: time.toFixed(0),
        mi_url: url,
        site_context: options.siteContext || "General Website",
        mi_content_resumen: myContent || "No content fetched. Infer based on URL.",
        competencia_resumen: competitorsContext || "No Competitor data. Infer typical competitors."
    });

    return await executeWithKeyRotation(options.apiKeys, async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: options.model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return null;

        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);

        const json = JSON.parse(cleaned);

        // SANITIZATION: Ensure content is string to prevent React error #31
        if (json.actions && Array.isArray(json.actions)) {
            json.actions = json.actions.map((action: any) => {
                if (typeof action.content === 'object' && action.content !== null) {
                    // Flatten object to string
                    const keys = Object.keys(action.content);
                    const contextKey = keys.find(k => k.toUpperCase().includes('CONTEXT') || k.toUpperCase().includes('INSTALLATION'));
                    const codeKey = keys.find(k => k.toUpperCase().includes('CODE') || k.toUpperCase().includes('CONTENT'));

                    let str = '';
                    if (contextKey) str += `CONTEXT: ${action.content[contextKey]}\n\n`;
                    if (codeKey) str += action.content[codeKey];
                    else if (!contextKey) str = JSON.stringify(action.content, null, 2);

                    action.content = str;
                }
                // Ensure it is strictly a string
                action.content = String(action.content || '');
                return action;
            });
        }

        return {
            query: keyword,
            url,
            moduleId,
            priority: 'HIGH',
            diagnosis: {
                ...json.diagnosis,
                referenceCompetitors: competitorUrls.length > 0 ? competitorUrls : (json.diagnosis.referenceCompetitors || [])
            },
            actions: json.actions
        };
    });
};

export const analyzeCannibalizationMaster = async (
    group: CannibalizationGroup,
    options: AiBatchOptions
): Promise<AiAnalysisResult | null> => {
    if (options.apiKeys.length === 0) throw new Error("API Key required");

    const hasExternalKey = options.externalKeys.jina || options.externalKeys.firecrawl || options.externalKeys.tavily || options.externalKeys.serper;
    const topUrls = group.urls.slice(0, 2);
    let contextStr = "";

    if (hasExternalKey) {
        try {
            const isoCountry = getCountryCode(group.dominantCountry);
            for (const u of topUrls) {
                const c = await fetchContentWithJina(u.url, options.externalKeys, options.providerConfig.reader);
                const skeleton = compressContentForAnalysis(c);
                contextStr += `URL: ${u.url}\nContent Structure:\n${skeleton}\n\n`;
            }
            const serp = await fetchSerpWithJina(group.query, isoCountry, options.lang, options.externalKeys, options.providerConfig.serp);
            contextStr += `SERP:\n${compressSerpContext(serp.markdown)}\n`;
        } catch (e) {
            console.warn("External fetch error", e);
        }
    }

    const prompt = `
     Task: Solve Cannibalization. Query: "${group.query}".
     Lang: ${options.lang === 'es' ? 'SPANISH' : 'ENGLISH'} (STRICT).
     Site Context: ${options.siteContext || "General Website"}.

     My URLs:
     ${group.urls.map(u => `- ${u.url} (Pos: ${u.position.toFixed(1)}, Clicks: ${u.clicks})`).join('\n')}

     Context (Headers & SERP):
     ${contextStr}

     Steps:
     1. Identify SERP Intent Slots (Info/Trans).
     2. Match My URLs content structure to slots.
     3. Decision. STRICTLY CHOOSE ONE TAG FROM THIS LIST ONLY:
        - WINNER
        - REDIRECT 301
        - MERGE
        - DE-OPTIMIZE
        - KEEP
        - DELETE (404)
        - CANONICALIZE
        - MANUAL REVIEW
     
     Output JSON:
     {
       "query": "${group.query}",
       "market_analysis": "Brief reasoning.",
       "classifications": [ { "url": "...", "tag": "WINNER" | "REDIRECT 301" | "MERGE" | "DE-OPTIMIZE" | "KEEP" | "DELETE (404)" | "CANONICALIZE" | "MANUAL REVIEW" } ]
     }
     `;

    return await executeWithKeyRotation(options.apiKeys, async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: options.model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return null;
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);

        const result = JSON.parse(cleaned) as AiAnalysisResult;

        if (options.lang === 'es') {
            result.classifications.forEach(c => {
                c.tag = TRANSLATE_TAGS_ES(c.tag);
            });
        }
        return result;
    });
};

export const analyzeBatchWithAi = async (
    groups: CannibalizationGroup[],
    options: AiBatchOptions
): Promise<AiAnalysisResult[]> => {
    if (options.apiKeys.length === 0) throw new Error("API Key is required");
    const results: AiAnalysisResult[] = [];
    for (const group of groups) {
        try {
            const res = await analyzeCannibalizationMaster(group, options);
            if (res) results.push(res);
        } catch (e) {
            console.error("Batch Item Failed", e);
            // Continue to next item even if one fails
        }
        await delay(500);
    }
    return results;
};

export const auditConflictsWithAi = async (
    conflicts: { url: string, contexts: { query: string, currentTag: string, stats: string }[] }[],
    options: AiBatchOptions
): Promise<any[]> => { return []; }

export const analyzeKeywordTrend = async (
    query: string,
    apiKey: string,
    lang: 'es' | 'en'
): Promise<TrendAnalysis> => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Context: Traffic drop for "${query}". Verdict: SEASONAL or SEO_ISSUE? Output JSON: { "query": "${query}", "verdict": "...", "reason": "..." }`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as TrendAnalysis;
    } catch (e) {
        return { query, verdict: 'UNKNOWN', reason: 'Error analyzing trend.' };
    }
}

// --- VOYAGE AI & CLUSTERING UTILS ---

const fetchVoyageEmbeddings = async (texts: string[], apiKey: string): Promise<number[][]> => {
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            input: texts,
            model: "voyage-3-lite"
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Voyage API Error: ${response.status} - ${err}`);
    }

    const json = await response.json();
    return json.data.map((d: any) => d.embedding);
};

// Cosine Similarity
const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);

const clusterVectors = (items: { text: string; vector: number[] }[], threshold: number = 0.85): ClusterGroup[] => {
    const clusters: ClusterGroup[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < items.length; i++) {
        const itemA = items[i];
        if (assigned.has(itemA.text)) continue;

        const clusterKeywords = [itemA.text];
        assigned.add(itemA.text);

        for (let j = i + 1; j < items.length; j++) {
            const itemB = items[j];
            if (assigned.has(itemB.text)) continue;

            const sim = dotProduct(itemA.vector, itemB.vector);
            if (sim >= threshold) {
                clusterKeywords.push(itemB.text);
                assigned.add(itemB.text);
            }
        }

        // Determine Name (Shortest Keyword)
        const name = clusterKeywords.reduce((a, b) => a.length <= b.length ? a : b);
        clusters.push({
            name: name,
            intent: "Pending...", // Will be updated by SERP check
            keywords: clusterKeywords
        });
    }

    return clusters;
};


export const clusterKeywordsWithAi = async (
    keywords: string[],
    options: AiBatchOptions
): Promise<ClusterGroupResult> => {

    let clusters: ClusterGroup[] = [];

    // BRANCH: USE VOYAGE AI (VECTOR CLUSTERING)
    if (options.providerConfig.clustering === 'VOYAGE' && options.externalKeys.voyage) {
        try {
            // Voyage accepts batch inputs. Max 128 per request usually, so chunk it.
            const BATCH_SIZE = 128;
            const allEmbeddings: number[][] = [];

            for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
                const chunk = keywords.slice(i, i + BATCH_SIZE);
                const chunkEmbeddings = await fetchVoyageEmbeddings(chunk, options.externalKeys.voyage);
                allEmbeddings.push(...chunkEmbeddings);
            }

            const items = keywords.map((k, i) => ({ text: k, vector: allEmbeddings[i] }));
            clusters = clusterVectors(items);

        } catch (e) {
            console.error("Voyage Clustering Failed", e);
            throw e;
        }
    } else {
        // BRANCH: USE GEMINI (GENERATIVE CLUSTERING)
        const prompt = `Group keywords by Intent. Keywords: ${keywords.join(', ')}. Output JSON: { "clusters": [ { "name": "...", "intent": "...", "keywords": [...] } ] }`;
        const result = await executeWithKeyRotation(options.apiKeys, async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: options.model,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const text = response.text;
            if (!text) throw new Error("No response");
            let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
            return JSON.parse(cleaned) as ClusterGroupResult;
        });
        clusters = result.clusters;
    }

    // POST-PROCESSING: ENRICH INTENT WITH SERP
    // We check the SERP for the *cluster name* (main keyword) to determine real intent
    if (options.externalKeys.jina || options.externalKeys.tavily || options.externalKeys.serper) {
        // Process top 5 largest clusters to save time/tokens, or all if small count
        const clustersToCheck = clusters.sort((a, b) => b.keywords.length - a.keywords.length).slice(0, 5);

        for (const cluster of clustersToCheck) {
            try {
                const serp = await fetchSerpWithJina(cluster.name, 'us', options.lang, options.externalKeys, options.providerConfig.serp);
                const serpSummary = compressSerpContext(serp.markdown);

                const intentPrompt = `
                Based on this SERP for "${cluster.name}", classify intent:
                - INFORMATIONAL (Guides, Wiki, Blogs)
                - TRANSACTIONAL (Buy, Shop, Price)
                - COMMERCIAL (Best, Top, Reviews)
                - NAVIGATIONAL (Specific Brand Login/Home)
                
                SERP:
                ${serpSummary}
                
                OUTPUT: Just the word.
                `;

                const intentRes = await executeWithKeyRotation(options.apiKeys, async (key) => {
                    const ai = new GoogleGenAI({ apiKey: key });
                    const r = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: intentPrompt });
                    return r.text?.trim().toUpperCase() || "UNKNOWN";
                });

                if (intentRes && intentRes.length < 20) {
                    cluster.intent = intentRes;
                }
            } catch (e) {
                // Ignore SERP failures for clustering, fallback to heuristic or basic
            }
        }
    }

    return { clusters };
};

export interface ClusterGroupResult {
    clusters: ClusterGroup[];
}
