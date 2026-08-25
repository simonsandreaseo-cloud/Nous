'use server';


import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { aiRouter } from "@/lib/ai/router";
export type { 
    ArticleConfig, 
    SEOAnalysisResult, 
    DeepSEOAnalysisResult, 
    CompetitorDetail, 
    ContentItem,
    HumanizerConfig,
    VisualResource,
    ImageGenConfig,
    AIImageRequest,
    DeepSEOConfig
} from "@/lib/services/writer/types";
import { executeWithKeyRotation as libExecuteWithKeyRotation, executeTranslation } from "@/lib/services/writer/ai-core";
import { ResearchOrchestrator } from "@/lib/services/writer/research";
import { AI_CONFIG } from "@/lib/ai/config";
import { Type } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { safeJsonExtract } from "@/utils/json";

// --- UTILS & CONSTANTS ---


function parseModelAndProvider(modelName: string, provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string) {
    let resolvedModel = modelName;
    let resolvedProvider = provider || 'auto';

    if (modelName.endsWith('-vertex')) {
        resolvedModel = modelName.slice(0, -7);
        resolvedProvider = 'vertex-ai';
    } else if (modelName.endsWith('-gas')) {
        resolvedModel = modelName.slice(0, -4);
        resolvedProvider = 'google-ai-studio';
    }

    return { resolvedModel, resolvedProvider };
}
const ANTI_LEAKAGE_SYSTEM_BASE = `Eres un Transformador Determinista. Tu única función es procesar la entrada y devolver la salida en el formato exacto solicitado.`;

const FEW_SHOT_HTML = `
Ejemplo 1:
Entrada: "Humaniza este texto: El gato es negro."
Salida: <p>El gato es de color negro.</p>

Ejemplo 2:
Entrada: "Refina este HTML: <div>Hola</div>"
Salida: <div>Hola, ¿cómo estás?</div>
`;

const FEW_SHOT_JSON = `
Ejemplo 1:
Entrada: "Extrae links de: google.com, bing.com"
Salida: [{"url": "google.com"}, {"url": "bing.com"}]

Ejemplo 2:
Entrada: "Sugerir imágenes para: Receta de tarta"
Salida: [{"id": "body_1", "prompt": "Tarta de chocolate deliciosa"}]
`;

const FEW_SHOT_HUMANIZER_EXAMPLE = `
<<<EJEMPLO_HUMANIZACION_JSON>>>
Entrada:
"<p>Por consiguiente, el uso de calzado deportivo adecuado resulta de vital importancia para prevenir lesiones podológicas. Adicionalmente, se recomienda realizar estiramientos musculares de forma previa al inicio del entrenamiento físico.</p>"

Salida Esperada:
{
  "razonamiento_interno": "El texto es muy académico. 'Por consiguiente' y 'vital importancia' suenan robóticos. Lo pasaré a un tono más cercano e informal.",
  "html": "<p>Usar unas zapatillas correctas es clave si no quieres terminar con dolor de pies o alguna lesión que te detenga. Así que presta atención a eso y, además, no olvides estirar un poco antes de empezar a correr, que te va a salvar la vida.</p>"
}
<<<FIN_EJEMPLO>>>
`;

const HTML_RULE_INTERNAL = "ERES UN REDACTOR HUMANO. REGLA CRÍTICA: NO RESUMAS. NO OMITAS NADA. El bloque de salida debe tener el mismo número de elementos que la entrada.";

const SURGICAL_EXAMPLE = `
<<<EJEMPLO_EDICION_QUIRURGICA_JSON>>>
Entrada:
{
  "block_0": "Si te quieres ver así como bohemio ahora que llega el verano, pues puedes mezclar las cosas que saca Etnia Barcelona, que tienen ese rollo mediterráneo, y luego lo juntas con lo que hace Chloé en París."
}

Salida Esperada (Nota cómo las oraciones mantienen su estructura, solo cambian un par de palabras por oración):
{
  "block_0": "Si deseas lucir más bohemio ahora que llega el verano, puedes mezclar las piezas que lanza Etnia Barcelona, que tienen ese aire mediterráneo, y luego lo combinas con lo que crea Chloé en París."
}
<<<FIN_EJEMPLO>>>
`;


const cleanAndFormatHtml = (html: string) => {
    return html.trim();
};



const isTrivialChunk = (chunk: string): boolean => {
    const textContent = chunk.replace(/<[^>]*>/g, '').replace(/\\s/g, '');
    return textContent.length === 0;
};

// --- WRAPPERS ---

export async function executeWithKeyRotation<T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    modelName: string = 'default',
    explicitHierarchy?: string[],
    keys?: string[] | string,
    onRotation?: any,
    isStrictModel: boolean = false,
    label: string = 'Operación AI',
    timeoutMs?: number,
    providerOverride?: 'google-ai-studio' | 'vertex-ai', reasoning?: string
): Promise<T> {
    const parsed = parseModelAndProvider(modelName, providerOverride);
    return libExecuteWithKeyRotation(async (client, m) => {
        return operation(client, m);
    }, parsed.resolvedModel, explicitHierarchy, keys, onRotation, isStrictModel, label, timeoutMs, parsed.resolvedProvider as any,
      reasoning
  );
}

export async function executeHumanizerWithRetry<T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    onStatus?: (msg: string) => void,
    label: string = 'Redacción Humanización',
    modelName: string = 'gemma-4-31b-it',
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<T> {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[Humanizer-Status] ${msg}`);
    };

    const parsed = parseModelAndProvider(modelName, provider);
    let resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;

    const HUMANIZER_TIMEOUT = 180000;
    const MAX_RETRIES = 16; // 15 reintentos (intento 1 + 15 reintentos)
    let baseDelayMs = 5000; // Start with 5 seconds
    const MAX_DELAY_MS = 15 * 60 * 1000; // 15 minutos máximo

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await executeWithKeyRotation(
                 operation,
                 resolvedModel,
                 undefined,
                 undefined,
                 undefined,
                 true,
                 label,
                 HUMANIZER_TIMEOUT,
                 resolvedProvider,
        reasoning
    );
        } catch (e: any) {
            const errorMsg = e.message ? e.message.toLowerCase() : String(e).toLowerCase();
            const isRateLimit = e.status === 429 || errorMsg.includes('429') || errorMsg.includes('resource exhausted') || errorMsg.includes('quota') || errorMsg.includes('rate limit');

            if (isRateLimit && attempt < MAX_RETRIES) {
                const jitter = Math.random() * 1000;
                const sleepTime = Math.min(baseDelayMs, MAX_DELAY_MS) + jitter;
                
                safeStatus(`Error 429/Resource Exhausted detectado. Reintentando en ${(sleepTime / 1000).toFixed(1)}s... (Intento ${attempt}/${MAX_RETRIES - 1})`);
                await new Promise(resolve => setTimeout(resolve, sleepTime));
                
                if (baseDelayMs < MAX_DELAY_MS) {
                    baseDelayMs *= 2; // Exponential backoff
                }
                continue;
            }

            throw e;
        }
    }
    throw new Error("Unreachable");
};

// --- CORE ACTIONS ---

export const retrieveContext = async (keyword: string, projectId: string): Promise<{ products: any[], collections: any[], others: any[] }> => {
    if (!projectId) return { products: [], collections: [], others: [] };
    
    const rawTerms = (keyword || '').split(/\s+/).filter(w => w && w.length > 3).map(w => w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const allTerms = Array.from(new Set(rawTerms)).slice(0, 15);
    const searchRegex = allTerms.join('|');

    const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches_v3', { 
        p_project_id: projectId,
        p_base_regex: searchRegex,
        p_ask_regex: '',
        p_limit: 50
    });
    
    if (rpcError || !units) {
        console.error("[retrieveContext] RPC Error:", rpcError);
        return { products: [], collections: [], others: [] };
    }

    return {
        products: (units as any[]).filter((u: any) => u.category === 'product'),
        collections: (units as any[]).filter((u: any) => u.category === 'collection'),
        others: (units as any[]).filter((u: any) => u.category !== 'product' && u.category !== 'collection')
    };
};

export const searchMoreLinks = async (keyword: string, projectId: string): Promise<ContentItem[]> => {
    const prompt = `Give me 5 search terms to find relevant products in a database for the topic "${keyword}". Return CSV only. Sáltate todo razonamiento interno. Tu respuesta debe comenzar directamente con el CSV and terminar inmediatamente después. Queda estrictamente prohibido incluir prefacios o cualquier texto explicativo.`;

    return executeWithKeyRotation(async (ai, currentModel) => {
        try {
            const model = ai.getGenerativeModel({ model: currentModel || AI_CONFIG.groq.models.balanced });
            const response = await model.generateContent(prompt);
            const terms = (response.response.text() || '').split(',').map(t => t.trim());
            const extraString = terms.join(' ');

            const context = await retrieveContext(keyword + " " + extraString, projectId);
            const mix = [
                ...context.collections.slice(0, 5), 
                ...context.products.slice(0, 5),
                ...context.others.slice(0, 5)
            ];
            return mix.slice(0, 10);
        } catch (e) {
            console.error("[searchMoreLinks] GEMINI ERROR, falling back to local search:", e);
            const context = await retrieveContext(keyword, projectId);
            return [
                ...context.collections.slice(0, 3), 
                ...context.products.slice(0, 3),
                ...context.others.slice(0, 4)
            ].slice(0, 10);
        }
    });
};

export const runDeepSEOAnalysis = async (config: DeepSEOConfig) => {
    return ResearchOrchestrator.runDeepAnalysis(config);
};

export const generateArticleJSON = async (model: string, prompt: string, hierarchy?: string[]) => {
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({
            model: currentModel,
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Redactor Técnico y Experto en SEO.\nDIRECTRICES CRÍTICAS PARA REDACCIÓN EN CHUNKS:\n1. VE DIRECTO AL GRANO: Estás escribiendo un fragmento de un artículo más grande. NO hagas introducciones generales ("En el mundo actual...", "Hoy en día..."), NO hagas cierres ni conclusiones genéricas al final de tu respuesta.\n2. CERO REDUNDANCIA: Empieza abordando el título o tema del fragmento inmediatamente. Aporta valor, datos, y análisis profundo desde la primera línea.\n3. FORMATO: Escribe el artículo en formato HTML directo. Eliges siempre etiquetas semánticas HTML (<strong>, <a>, <h2>, <h3>) y NUNCA usas markdown ni etiquetas de imagen <img>. Generas HTML impecable para la web.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON sin tags \`\`\`json.`,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        });
        
        const finalPrompt = `INSTRUCCIONES DE REDACCIÓN:\n${prompt}\n\nIMPORTANTE: Escribe el artículo de cero siguiendo la estructura dada. NO repitas instrucciones, NO uses prefacios, NO hagas introducciones amplias, NO concluyas de forma genérica. Ve directo al grano y devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu planificación) y 'html' (el artículo completo finalizado).`;
        
        const response = await modelObj.generateContent(finalPrompt);
        
        let raw = response.response.text();
        
        let htmlOutput = "";
        try {
            const parsed = safeJsonExtract<any>(raw, {});
            htmlOutput = parsed.html || raw;
        } catch(e) {
            htmlOutput = raw;
        }
        
        return htmlOutput;
    }, model || 'default', hierarchy, undefined, undefined, false, 'Redacción Artículo JSON');
};

export const generateArticleStream = async (model: string, prompt: string, hierarchy?: string[], onChunk?: (text: string) => void) => {
    return executeWithKeyRotation(async (ai, currentModel) => {
        const sysInst = `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Redactor Técnico y Experto en SEO.\nDIRECTRICES CRÍTICAS PARA REDACCIÓN EN CHUNKS:\n1. VE DIRECTO AL GRANO: Estás escribiendo un fragmento de un artículo más grande. NO hagas introducciones generales ("En el mundo actual...", "Hoy en día..."), NO hagas cierres ni conclusiones genéricas al final de tu respuesta.\n2. CERO REDUNDANCIA: Empieza abordando el título o tema del fragmento inmediatamente. Aporta valor, datos, y análisis profundo desde la primera línea.\n3. FORMATO: Escribe el artículo en formato HTML directo. Eliges siempre etiquetas semánticas HTML (<strong>, <a>, <h2>, <h3>).\nREGLA CRÍTICA: NO USES JSON. Primero, abre una etiqueta <razonamiento_interno> y escribe toda tu planificación inicial. Luego, cierra la etiqueta </razonamiento_interno> y escribe el código HTML final.`;
        const modelObj = ai.getGenerativeModel({
            model: currentModel,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        });
        
        const finalPrompt = `[SYSTEM INSTRUCTIONS]\n${sysInst}\n\n[USER INSTRUCTIONS]\nINSTRUCCIONES DE REDACCIÓN:\n${prompt}\n\nIMPORTANTE: Escribe el contenido asignado de cero siguiendo la estructura dada. NO uses saludos, NO repitas instrucciones, NO uses prefacios, NO hagas introducciones amplias, NO concluyas de forma genérica.\nRECUERDA LA ESTRUCTURA OBLIGATORIA:\n<razonamiento_interno>\n(tu análisis aquí)\n</razonamiento_interno>\n(código HTML puro aquí sin bloques markdown)`;
        
        const response = await modelObj.generateContentStream(finalPrompt);
        let fullHtml = '';
        let fullText = '';
        let emittedLength = 0;
        let mode = 'detecting'; // detecting, thinking, content
        const openTag = '<razonamiento_interno>';
        const closeTag = '</razonamiento_interno>';

        for await (const chunk of response.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            
            if (mode === 'detecting') {
                if (fullText.includes(openTag)) {
                    mode = 'thinking';
                } else if (fullText.length > 70) {
                    mode = 'content';
                }
            }
            
            if (mode === 'thinking') {
                const closeIndex = fullText.indexOf(closeTag);
                if (closeIndex !== -1) {
                    mode = 'content';
                    fullText = fullText.substring(closeIndex + closeTag.length).replace(/^\s*(```html|```)\s*/i, '');
                    emittedLength = 0;
                }
            }
            
            if (mode === 'content') {
                const newHtml = fullText.substring(emittedLength);
                if (newHtml.length > 0) {
                    fullHtml += newHtml;
                    if (onChunk) onChunk(newHtml);
                    emittedLength += newHtml.length;
                }
            }
        }
        
        if (mode === 'detecting') {
            fullHtml = fullText.replace(/^\s*(```html|```)\s*/i, '');
            if (onChunk) onChunk(fullHtml);
        }
        
        fullHtml = fullHtml.replace(/```\s*$/g, '').trim();
        return fullHtml;
    }, model || 'default', hierarchy, undefined, undefined, true, 'Redacción Artículo Stream', 180000);
};

export const refineArticleContent = async (
    currentHtml: string, 
    instructions: string, 
    modelName?: string, 
    selectedText?: string
): Promise<string> => {
    const isSelection = !!selectedText && selectedText.trim().length > 0;
    const target = isSelection 
        ? `TEXT TO REFINE (SPECIFIC SECTION):\n"${selectedText}"` 
        : `FULL ARTICLE TO REFINE:\n${currentHtml}`;
        
    const context = isSelection 
        ? `\nFULL ARTICLE CONTEXT (FOR REFERENCE ONLY):\n${currentHtml.substring(0, 3000)}` 
        : '';
  
    const prompt = `
    ${ANTI_LEAKAGE_SYSTEM_BASE}
    Role: Content Editor. Refine HTML content strictly following instructions.
    ${FEW_SHOT_HTML}

    USER INSTRUCTIONS:
    "${instructions}"

    OUTPUT RULES:
    1. ${isSelection ? 'Return ONLY the refined version of the specific text provided. Do NOT return the whole article.' : 'Return valid HTML content for the whole article (inside body).'}
    2. Do NOT strip existing images or links unless instructed.
    3. Apply requested changes while maintaining tone and style.
    4. Return WITHOUT markdown blocks.

    <<<HTML_INPUT>>>
    ${target}
    ${context}
    <<<HTML_INPUT>>>

    SALIDA HTML DIRECTA (sin prefacios ni resúmenes):`;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ model: currentModel });
        const response = await modelObj.generateContent(prompt);
        let resText = response.response.text() || (isSelection ? selectedText : currentHtml);
        resText = resText.replace(/```html/g, '').replace(/```/g, '').trim();
        const firstTag = resText.indexOf('<');
        const lastTag = resText.lastIndexOf('>');
        if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
            resText = resText.substring(firstTag, lastTag + 1);
        }
        return resText;
    }, modelName || 'default', undefined, undefined, undefined, false, 'Refinado Artículo');
};

export const findCampaignAssets = async (query: string, projectName: string, csvData?: ContentItem[], modelName?: string): Promise<VisualResource[]> => {
    const safeProjectName = projectName || "mysite";
    const excludeTerms = `-site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.com -site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.es -inurl:${safeProjectName.replace(/\s+/g, '').toLowerCase()}`;
  
    const prompt = `
    Find OFFICIAL brand assets (Press kits, Lookbooks, Campaign pages) for: "${query}".
    CRITICAL: Exclude any URL from the project "${projectName}". We need EXTERNAL official sources.
    Query Modifier: ${excludeTerms}
    Return a JSON Array: [{"brand": "Brand Name", "description": "Page Title", "url": "URL", "isImage": false}]
    Only return valid, reachable URLs.
    `;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ 
            model: currentModel || AI_CONFIG.groq.models.balanced,
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Find official brand assets and return them as a JSON array.
${FEW_SHOT_JSON}`
        });
        const response = await modelObj.generateContent(prompt + "\n\nRESULTADO JSON DIRECTO:");
        let text = response.response.text() || "[]";
        
        return safeJsonExtract(text, []);
    });
};

export const generateSchemaMarkup = async (metadata: any, articleHtml: string, type: 'Article' | 'Product' = 'Article', modelName?: string): Promise<string> => {
    const prompt = `Genera JSON-LD Schema.org para este artículo. Metadata: ${JSON.stringify(metadata)}. Content Sample: ${articleHtml.substring(0, 500)}. Include 'image' placeholder.`;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({
            model: currentModel || AI_CONFIG.groq.models.balanced,
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Generate JSON-LD Schema.org markup. Return JSON ONLY.
${FEW_SHOT_JSON}`,
            generationConfig: {}
        });
        const response = await model.generateContent(prompt + "\n\nRESULTADO JSON DIRECTO:");
        return response.response.text() || "{}";
    }, modelName);
};

export const runSEOAnalysis = async (
    keyword: string,
    projectId: string,
    projectDomain?: string,
    projectName?: string,
    serperKeyOverride?: string,
    modelName?: string,
    isIdea: boolean = false
): Promise<SEOAnalysisResult> => {
    const serperKey = serperKeyOverride || process.env.SERPER_API_KEY || process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
    
    const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches_v3', { 
        p_project_id: projectId,
        p_base_regex: keyword,
        p_ask_regex: '',
        p_limit: 50
    });
    
    const productContext = (units as any[] || []).filter((u: any) => u.category === 'product').slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n');
    const collectionContext = (units as any[] || []).filter((u: any) => u.category === 'collection').slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

    const serpContext = "No External data available. Rely on internal knowledge.";

    const schema = {
        type: Type.OBJECT,
        properties: {
            nicheDetected: { type: Type.STRING },
            keywordIdeas: {
                type: Type.OBJECT,
                properties: {
                    shortTail: { type: Type.ARRAY, items: { type: Type.STRING } },
                    midTail: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            autocompleteLongTail: { type: Type.ARRAY, items: { type: Type.STRING } },
            frequentQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            top10Urls: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }
                }
            },
            lsiKeywords: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { keyword: { type: Type.STRING }, count: { type: Type.STRING } }
                }
            },
            recommendedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedWordCount: { type: Type.STRING },
            recommendedSchemas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["nicheDetected", "keywordIdeas", "autocompleteLongTail", "frequentQuestions", "top10Urls", "recommendedWords", "recommendedWordCount", "recommendedSchemas"]
    };

    const systemPrompt = `Eres un estratega SEO experto.
        PROYECTO: ${projectName || 'Desconocido'}.
        ${isIdea ? 'LA ENTRADA ES UNA IDEA/CONCEPTO, NO UN TÍTULO FINAL. DEBES GENERAR UN TÍTULO SEO OPTIMIZADO.' : 'KEYWORD/TÍTULO OBJETIVO: "' + keyword + '"'}
        === EXTERNAL INTELLIGENCE ===
        ${serpContext}
        === INTERNAL DATABASE ===
        ${productContext}
        ${collectionContext}
        
        Tu tarea es:
        1. Analizar el nicho y la intención.
        2. Proponer keywords (Short, Mid, Long Tail).
        3. Identificar competidores y PRIORIZAR las preguntas extraídas de REAL SERP DATA (People Also Ask) para la sección de FAQs.
        
        TAREA: Analiza y extrae solo los datos brutos de investigación SEO. No generes estructuras de contenido ni metadatos en este paso.
        Retorna JSON válido.`;
  
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({
            model: modelName || 'gemma-4-31b-it',
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Analyze SEO data and return it as a structured JSON object.
${FEW_SHOT_JSON}`,
            generationConfig: {
                responseSchema: schema as any
            }
        });
  
        const response = await model.generateContent(systemPrompt + "\n\nRESULTADO JSON DIRECTO:");
        const result = response.response;
        const json = safeJsonExtract(result.text() || "{}", {});
        
        if (!json.keywordIdeas) json.keywordIdeas = { shortTail: [], midTail: [] };
        if (!json.top10Urls) json.top10Urls = [];
        if (!json.autocompleteLongTail) json.autocompleteLongTail = [];
        if (!json.frequentQuestions) json.frequentQuestions = [];
        if (!json.recommendedWords) json.recommendedWords = [];
        if (!json.recommendedSchemas) json.recommendedSchemas = [];
        json.recommendedWordCount = json.recommendedWordCount || "1500";

        return json as SEOAnalysisResult;
    }, modelName);
};

export const generateOutlineStrategy = async (config: ArticleConfig, keyword: string, rawSeoData: SEOAnalysisResult, modelName?: string) => {
    const prompt = `
    Act as a Master SEO Content Strategist.
    Project: ${config.projectName}. Niche: ${config.niche}.
    Topic/Keyword: "${keyword}".
    
    ### ESTRATEGIA DE ENLAZADO INTERNO (15 Enlaces Sugeridos):
    Estos son los enlaces que HEMOS INVESTIGADO y que deben ser el eje del artículo:
    ${config.approvedLinks?.map(l => `- [${l.title}](${l.url})${l.category ? ` (Categoría: ${l.category})` : ''}`).join('\n') || 'N/A'}
    
    INSTRUCCIÓN DE DISEÑO:
    Crea un Outline (Estructura de Encabezados) que esté optimizado para que estos enlaces encajen de forma orgánica y lógica. 
    Distribuye los 15 enlaces a lo largo de los H2 y H3.
    
    Requirements:
    1. Meta Title: Click-worthy, includes keyword, < 60 chars.
    2. H1: Powerful, clear, includes keyword.
    3. Slug: Short, URL-friendly.
    4. Meta Description: Compelling, < 160 chars.
    5. Outline: Array of headers (H2, H3).
    `;
  
    const schema = {
        type: Type.OBJECT,
        properties: {
            snippet: {
                type: Type.OBJECT,
                properties: {
                    metaTitle: { type: Type.STRING },
                    h1: { type: Type.STRING },
                    metaDescription: { type: Type.STRING },
                    slug: { type: Type.STRING }
                },
                required: ["metaTitle", "h1", "metaDescription", "slug"]
            },
            outline: {
                type: Type.OBJECT,
                properties: {
                    introNote: { type: Type.STRING },
                    headers: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ["H2", "H3", "H4"] },
                                text: { type: Type.STRING },
                                wordCount: { type: Type.STRING },
                                notes: { type: Type.STRING }
                            },
                            required: ["type", "text", "wordCount"]
                        }
                    }
                },
                required: ["introNote", "headers"]
            }
        },
        required: ["snippet", "outline"]
    };
  
    return executeWithKeyRotation(async (ai) => {
        const modelObj = ai.getGenerativeModel({ 
            model: 'gemma-4-31b-it',
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nTask: Generate an SEO Content Strategy and Outline as JSON.\n${FEW_SHOT_JSON}`,
            generationConfig: {}
        });
  
        const response = await modelObj.generateContent(prompt + "\n\nRESULTADO JSON DIRECTO:");
        let rawText = response.response.text() || "{}";
        
        return safeJsonExtract(rawText, {});
    });
};

export const runHumanizerPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemma-4-31b-it', 
    onChunk?: (chunkHtml: string) => void,
    onProgress?: (percent: number) => void,
    providerOverride?: 'google-ai-studio' | 'vertex-ai' | 'auto',
    reasoning?: string
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[Humanizer-Status] ${msg}`);
    };

    const parsed = parseModelAndProvider(modelName);
    let resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;



    safeStatus(`Iniciando humanización estructural con Cheerio y modelo ${resolvedModel}...`);
    const start = Date.now();
    
    const $ = cheerio.load(html, { decodeEntities: false }, false);
    const textBlocks: Record<string, string> = {};
    let counter = 0;

    const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, q, cite, li, td, th';
    $(blockSelectors).each((_, el) => {
        if ($(el).children(blockSelectors).length === 0) {
            const innerHtml = $(el).html()?.trim();
            if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
                const id = `block_${counter++}`;
                textBlocks[id] = innerHtml;
                $(el).attr('data-humanize-id', id);
            }
        }
    });

    const numBlocks = Object.keys(textBlocks).length;
    if (numBlocks === 0) {
        safeStatus(`No se encontraron bloques de texto válidos. Devolviendo original.`);
        if (onChunk) onChunk(html);
        return { html: cleanAndFormatHtml(html) };
    }

    safeStatus(`Se extrajeron ${numBlocks} bloques. Enviando al modelo...`);

    try {
        const entries = Object.entries(textBlocks);
        const chunkSize = config.chunkSize || 2;
        let allProcessedBlocks: Record<string, string> = {};

        for (let i = 0; i < entries.length; i += chunkSize) {
            const chunkEntries = entries.slice(i, i + chunkSize);
            const chunkObj = Object.fromEntries(chunkEntries);
            
            safeStatus(`Procesando fragmento ${Math.floor(i/chunkSize) + 1} de ${Math.ceil(entries.length/chunkSize)} (${chunkEntries.length} bloques)...`);
            
            const processedChunk = await executeHumanizerWithRetry(async (ai, currentModel) => {
                const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- CONTEXTO ---\nNicho/Tópico: ${config.niche || 'N/A'}\nPúblico Objetivo: ${config.audience || 'N/A'}\nNotas Adicionales: ${config.notes || 'N/A'}\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1. ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2. COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3. CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.\n4. MORFOSINTAXIS (EXPLOSIVIDAD):\n   * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).\n   * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.\n5. IDIOMA: Usa español neutro panhispánico.\n6. PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.\n7. PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.\n\nREGLA CRÍTICA DE ESTRUCTURA (JSON DICTIONARY):\nTe entregaré un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.\nMANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).\nDEBES devolver UNICAMENTE un objeto JSON con la clave obligatoria 'razonamiento_interno' (tu análisis y justificación) y luego las claves originales (ej 'block_1', etc) con los valores humanizados en crudo.`;

                const model = ai.getGenerativeModel({ 
                    model: resolvedModel, 
                    systemInstruction: systemInstructionStr,
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                });
                
                const languageInstruction = config.language ? `\nIdioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}.` : '';
                
                const prompt = `JSON DE ENTRADA CON BLOQUES:\n${JSON.stringify(chunkObj)}\n\n${languageInstruction}\nDEVUELVE SOLO EL JSON DE SALIDA. RESPETA ESTRICTAMENTE LA ESTRUCTURA.`;
                
                const response = await model.generateContent(prompt);
                let raw = response.response.text();
                
                try {
                    const parsed = safeJsonExtract<any>(raw, null);
                    if (!parsed) throw new Error("safeJsonExtract returned null");
                    return parsed;
                } catch (e) {
                    console.error("[Humanizer-Parser] Fallo catastrófico al parsear JSON. Raw preview:", raw.substring(0, 100) + "...");
                    console.error(e);
                    throw new Error("El modelo falló al devolver un JSON válido. Intentando de nuevo.");
                }
            }, safeStatus, `Humanización de fragmento de ${chunkEntries.length} bloques`, resolvedModel, resolvedProvider);
            
            allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };
            for (const [id, humanizedText] of Object.entries(processedChunk as any)) {
                if (id === 'razonamiento_interno') continue;
                const el = $(`[data-humanize-id="${id}"]`);
                if (el.length > 0 && typeof humanizedText === 'string') {
                    if (el.closest('h1, h2, h3, h4, h5, h6, blockquote, q, cite').length > 0) {
                        continue;
                    }
                    try {
                        // En lugar de usar el.html() que a veces falla con strings primitivos en Cheerio
                        // o crear un sub-documento que pierde el contexto, usamos replaceWith si es un bloque 
                        // o simplemente seteamos el texto si es solo texto.
                        const isHtml = /<[a-z][\s\S]*>/i.test(humanizedText);
                        if (isHtml) {
                            el.empty().append(humanizedText);
                        } else {
                            el.text(humanizedText);
                        }
                    } catch (err) {
                        console.warn(`[Cheerio-Fix] Error inyectando bloque ${id}:`, err);
                        try { el.html(humanizedText); } catch(e) {} // Ultimo recurso
                    }
                }
            }
            if (onChunk) onChunk($.html());
            if (onProgress) {
                const percent = Math.min(100, Math.round(((i + chunkSize) / entries.length) * 100));
                onProgress(percent);
            }
        }

        $('[data-humanize-id]').removeAttr('data-humanize-id');
        const finalHtml = $.html();
        
        if (onChunk) onChunk(finalHtml);

        const duration = (Date.now() - start) / 1000;
        console.log(`[Humanizer-Perf] Completado en ${duration}s`);
        
        return { html: cleanAndFormatHtml(finalHtml) };

    } catch (e: any) {
        safeStatus(`Error durante la humanización: ${e.message}. Devolviendo original.`);
        return { html: cleanAndFormatHtml(html) };
    }

};

export const runMiniHumanizerPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemini-3.5-flash', 
    onChunk?: (chunkHtml: string) => void,
    onLog?: (msg: string) => void,
    mode: string = 'standard',
    onProgress?: (percent: number) => void,
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else onLog?.(`[MiniHumanizer-Status] ${msg}`) || console.log(`[MiniHumanizer-Status] ${msg}`);
    };

    if (modelName.startsWith('gemma') && !modelName.endsWith('-it')) {
        modelName += '-it';
    }
    


    safeStatus(`Iniciando mini-humanización estructural con Cheerio (Modo: ${mode}) y modelo ${modelName}...`);
    const start = Date.now();
    
    // --- PROTECCIÓN DETERMINISTA DE ENCABEZADOS Y TABLAS ---
    const $pre = cheerio.load(html, { decodeEntities: false }, false);
    
    // 1. Proteger Encabezados y Citas
    const protectedHeaders: Record<string, string> = {};
    $pre('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const id = `hdr_${i}`;
        $pre(el).attr('data-sys-hdr', id);
        protectedHeaders[id] = $pre(el).html() || '';
    });
    
    const protectedQuotes: Record<string, string> = {};
    $pre('blockquote, q, cite').each((i, el) => {
        const id = `quote_${i}`;
        $pre(el).attr('data-sys-quote', id);
        protectedQuotes[id] = $pre(el).html() || '';
    });
    
    // 2. Proteger Tablas (Extracción total)
    const protectedTables: Record<string, string> = {};
    $pre('table').each((i, el) => {
        const id = `tbl_${i}`;
        protectedTables[id] = $pre.html(el);
        $pre(el).replaceWith(`<div data-sys-tbl="${id}">[TABLA PROTEGIDA: ${id}]</div>`);
    });

    const protectedHtml = $pre.html();
    
    // CONVERSIÓN A MARKDOWN PARA EL PROMPT
    const turndownService = new TurndownService({ headingStyle: 'atx' });
    let currentMd = turndownService.turndown(protectedHtml);
    // ----------------------------------------------
    
    try {
        const languageInstruction = config.language ? `\n\n[Idioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}]` : '';

        const executeStep = async (stepMd: string, systemInstruction: string, stepName: string): Promise<string> => {
            safeStatus(`Ejecutando ${stepName}...`);
            return await executeHumanizerWithRetry(async (ai, currentModel) => {
                const model = ai.getGenerativeModel({ 
                    model: modelName, 
                    systemInstruction: systemInstruction,
                });
                
                const prompt = `Devuelve el texto procesado completo sin comentarios ni razonamientos:\n\n${stepMd}${languageInstruction}`;
                
                if (onLog) {
                    onLog(`=== [MINI-HUMANIZADOR] ENVIANDO A LA IA (${stepName}) ===\n` +
                          'System Instruction:\n' + systemInstruction + 
                          '\n\nPrompt:\n' + prompt + 
                          '\n============================================');
                }

                const response = await model.generateContent(prompt);
                let raw = response.response.text();
                
                if (onLog) {
                    onLog(`=== [MINI-HUMANIZADOR] RESPUESTA CRUDA DE LA IA (${stepName}) ===\n` + 
                          raw + 
                          '\n====================================================');
                }
                
                const mdBlockMatch = raw.match(/```(?:markdown|md)\s*([\s\S]*?)```/i);
                
                if (mdBlockMatch && mdBlockMatch[1]) {
                    raw = mdBlockMatch[1].trim();
                } else {
                    raw = raw.replace(/```text[\s\S]*?```/gi, '').trim();
                    raw = raw.replace(/```(?:markdown|md)\n?/gi, '').replace(/```\n?/g, '').trim();
                }
                
                if (!raw) throw new Error(`El modelo devolvió una respuesta vacía en ${stepName}.`);
                return raw;
            }, safeStatus, stepName, modelName, provider);
        };

        if (mode === 'standard') {
            safeStatus(`Ejecutando Modo JSON Dictionary (Flujo Principal)...`);
            const $ = cheerio.load(protectedHtml, { decodeEntities: false }, false);
            const textBlocks: Record<string, string> = {};
            let counter = 0;
            
            const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, q, cite, li, td, th';
            $(blockSelectors).each((_, el) => {
                if ($(el).children(blockSelectors).length === 0) {
                    const innerHtml = $(el).html()?.trim();
                    if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
                        const id = `block_${counter++}`;
                        textBlocks[id] = innerHtml;
                        $(el).attr('data-humanize-id', id);
                    }
                }
            });
            
            const numBlocks = Object.keys(textBlocks).length;
            if (numBlocks === 0) {
                safeStatus(`No se encontraron bloques de texto válidos.`);
                return { html: protectedHtml };
            }
            
            safeStatus(`Se extrajeron ${numBlocks} bloques. Enviando al modelo...`);
            
            const entries = Object.entries(textBlocks);
            const chunkSize = config.chunkSize || 2;
            let allProcessedBlocks: Record<string, string> = {};

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunkEntries = entries.slice(i, i + chunkSize);
                const chunkObj = Object.fromEntries(chunkEntries);
                
                safeStatus(`Procesando fragmento ${Math.floor(i/chunkSize) + 1} de ${Math.ceil(entries.length/chunkSize)} (${chunkEntries.length} bloques)...`);
                
                const processedChunk = await executeHumanizerWithRetry(async (ai, currentModel) => {
                    const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizar la simplicidad sobre la elegancia.\n\n--- CONTEXTO ---\nNicho/Tópico: ${config.niche || 'N/A'}\nPúblico Objetivo: ${config.audience || 'N/A'}\nNotas Adicionales: ${config.notes || 'N/A'}\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1. ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria y la sensibilidad, el texto no debe ser emocionante, debe ser plano, aburrido y objetivo.\n2. COHERENCIA ROTA: Usa 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3. CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," etc.\n4. MORFOSINTAXIS (EXPLOSIVIDAD):\n   * Usa oraciones cortas (Sujeto-Verbo-Predicado) más que largas.\n   * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas, algunas simples y otras, con baja frecuencia. La longitud de las frases debe ser variable e impredecible.\n5. IDIOMA: Usa español neutro panhispánico.\n6. PROHIBICIÓN DE VOZ PASIVA: Reescribe el 80% de las frases en voz pasiva a voz activa.\n7. PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido.\n8. CONSERVACIÓN SEMÁNTICA: no resumas, no omitas ideas, no reduzcas el tamaño del texto, en caso tal aumentalo.\n\nREGLA CRÍTICA DE ESTRUCTURA (JSON DICTIONARY):\nTe entregaré un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.\nMANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).\nDEBES devolver UNICAMENTE un objeto JSON que incluya obligatoriamente una clave "razonamiento_interno" con tu análisis inicial (Chain-of-Thought), y luego el resto de claves deben ser exactamente los mismos IDs originales con sus valores humanizados en crudo.`;
                    
                    const model = ai.getGenerativeModel({ 
                        model: modelName, 
                        systemInstruction: systemInstructionStr,
                        generationConfig: {
                            responseMimeType: 'application/json'
                        }
                    });
                    
                    const prompt = `${FEW_SHOT_HUMANIZER_EXAMPLE}\n\nJSON DE ENTRADA CON BLOQUES:\n${JSON.stringify(chunkObj)}\n${languageInstruction}\nIMPORTANTE: Devuelve un objeto JSON con la clave obligatoria 'razonamiento_interno' (tu análisis y justificación) y luego las claves originales (ej 'block_1', etc) con los valores humanizados en crudo.`;
                    
                    if (onLog) {
                        onLog(`=== [MINI-HUMANIZADOR JSON] ENVIANDO A LA IA ===\nPrompt:\n${prompt}\n============================================`);
                    }
                    
                    const response = await model.generateContent(prompt);
                    let raw = response.response.text();
                    
                    if (onLog) {
                        onLog(`=== [MINI-HUMANIZADOR JSON] RESPUESTA ===\n${raw}\n===========================================`);
                    }
                    
                    let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const jsonStart = cleaned.indexOf('{');
                    const jsonEnd = cleaned.lastIndexOf('}');
                    
                    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
                    }
                    
                    try {
                        return JSON.parse(cleaned);
                    } catch (e) {
                        console.error("[Humanizer-Parser] Fallo catastrófico al parsear JSON.", e);
                        throw e;
                    }
                }, safeStatus, `Humanización de fragmento de ${chunkEntries.length} bloques`, modelName);
                
                allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };
                for (const [id, humanizedText] of Object.entries(processedChunk as any)) {
                    if (id === 'razonamiento_interno') continue;
                    const el = $(`[data-humanize-id="${id}"]`);
                    if (el.length > 0 && typeof humanizedText === 'string') {
                        if (el.closest('h1, h2, h3, h4, h5, h6, blockquote, q, cite').length > 0) {
                            continue;
                        }
                        el.html(humanizedText);
                    }
                }
                if (onChunk) {
                    const currentHtml = $.html();
                    const tmp = cheerio.load(currentHtml, { decodeEntities: false }, false);
                    tmp('[data-sys-hdr]').each((_, el) => {
                        const id = tmp(el).attr('data-sys-hdr');
                        if (id && protectedHeaders[id] !== undefined) {
                            tmp(el).html(protectedHeaders[id]);
                            tmp(el).removeAttr('data-sys-hdr');
                        }
                    });
                    tmp('[data-sys-quote]').each((_, el) => {
                        const id = tmp(el).attr('data-sys-quote');
                        if (id && protectedQuotes[id] !== undefined) {
                            tmp(el).html(protectedQuotes[id]);
                            tmp(el).removeAttr('data-sys-quote');
                        }
                    });
                    tmp('[data-sys-tbl]').each((_, el) => {
                        const id = tmp(el).attr('data-sys-tbl');
                        if (id && protectedTables[id] !== undefined) {
                            tmp(el).html(protectedTables[id]);
                            tmp(el).removeAttr('data-sys-tbl');
                        }
                    });
                    tmp('[data-humanize-id]').removeAttr('data-humanize-id');
                    onChunk(tmp.html());
                }
                if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + chunkSize) / entries.length) * 100));
                    onProgress(percent);
                }
            }
            
            safeStatus(`Reconstruyendo el HTML...`);
            for (const [id, humanizedText] of Object.entries(allProcessedBlocks)) {
                const el = $(`[data-humanize-id="${id}"]`);
                if (el.length > 0 && typeof humanizedText === 'string') {
                    if (el.closest('h1, h2, h3, h4, h5, h6, blockquote, q, cite').length > 0) {
                        continue;
                    }
                    el.html(humanizedText);
                }
            }
            $('[data-humanize-id]').removeAttr('data-humanize-id');
            const legacyHtmlOutput = $.html();
            
            const $post = cheerio.load(legacyHtmlOutput, { decodeEntities: false }, false);
            
            $post('[data-sys-hdr]').each((_, el) => {
                const id = $post(el).attr('data-sys-hdr');
                if (id && protectedHeaders[id] !== undefined) {
                    $post(el).html(protectedHeaders[id]);
                    $post(el).removeAttr('data-sys-hdr');
                }
            });
            
            $post('[data-sys-quote]').each((_, el) => {
                const id = $post(el).attr('data-sys-quote');
                if (id && protectedQuotes[id] !== undefined) {
                    $post(el).html(protectedQuotes[id]);
                    $post(el).removeAttr('data-sys-quote');
                }
            });
            
            $post('[data-sys-tbl]').each((_, el) => {
                const id = $post(el).attr('data-sys-tbl');
                if (id && protectedTables[id] !== undefined) {
                    $post(el).replaceWith(protectedTables[id]);
                }
            });
            
            const finalHtml = $post.html();
            if (onChunk) onChunk(finalHtml);
            const duration = (Date.now() - start) / 1000;
            console.log(`[Humanizer-Perf] Completado en ${duration}s`);
            return { html: cleanAndFormatHtml(finalHtml) };

        } else if (mode === 'lipograma_1') {
            const baseContext = `REGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas MD. Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de estas etiquetas.
--- CONTEXTO ---
Nicho/Tópico: ${config.niche || 'N/A'}
Público Objetivo: ${config.audience || 'N/A'}
Notas Adicionales: ${config.notes || 'N/A'}`;

            const layer1Rules = `${baseContext}

--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) —
1. ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria y la sensibilidad, el texto no debe ser emocionante, debe ser plano, aburrido y objetivo.
2. CONSERVACIÓN SEMÁNTICA: no resumas, no omitas ideas, no reduzcas el tamaño del texto, en caso tal aumentalo.
3. LONGITUD ASIMÉTRICA OBLIGATORIA (Word-Count Forcing): De cada tres oraciones que escribas, una de ellas DEBE tener exactamente 5 palabras o menos. Ni una más. Las otras dos oraciones que la rodean deben tener longitudes completamente diferentes entre sí.
4. EL TABÚ DE LAS TERMINACIONES (Sufix Lipogram): Queda ESTRICTAMENTE PROHIBIDO usar cualquier palabra que termine con el sufijo '-mente' (ej: rápidamente, exactamente) y está prohibido usar más de una palabra por párrafo que termine en '-ción'. Debes reescribir esas ideas usando verbos crudos.`;

            currentMd = await executeStep(currentMd, layer1Rules, "Capa 1/3 (Esqueleto)");

        } else if (mode === 'lipograma_2') {
            const baseContext = `REGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas MD. Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de estas etiquetas.
--- CONTEXTO ---
Nicho/Tópico: ${config.niche || 'N/A'}
Público Objetivo: ${config.audience || 'N/A'}
Notas Adicionales: ${config.notes || 'N/A'}`;

            const layer2Rules = `${baseContext}

--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) —
Aplica estas reglas sobre el texto que recibes.
1. CONSERVACIÓN SEMÁNTICA: no resumas, no omitas ideas, no reduzcas el tamaño del texto, en caso tal aumentalo.
2. EL MANDATO DE LAS 3 MUTACIONES: Identifica exactamente 3 palabras clave en cada oración (adjetivos, verbos o sustantivos) y reemplázalas por los sinónimos más inusuales y de muy baja frecuencia estadística que encajen perfectamente en el contexto. El texto NO debe quedar vulgar ni coloquial, simplemente inusual y profesional. Jamás uses lenguaje académico corporativo.
3. EL BLOQUEO DEL SUJETO INICIAL (Syntax Lipogram): Exactamente la MITAD (50%) de tus oraciones NO pueden comenzar con el sujeto directo de la acción. Debes empezarlas con un verbo, un adverbio, una preposición o una circunstancia de tiempo/lugar. La otra mitad puede empezar normal.`;

            currentMd = await executeStep(currentMd, layer2Rules, "Capa 2/3 (Anomalías)");

        } else if (mode === 'lipograma_3') {
            const baseContext = `REGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas MD. Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de estas etiquetas.
--- CONTEXTO ---
Nicho/Tópico: ${config.niche || 'N/A'}
Público Objetivo: ${config.audience || 'N/A'}
Notas Adicionales: ${config.notes || 'N/A'}`;

            const layer3Rules = `${baseContext}

--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) —
Aplica esta regla sobre el texto que recibes.
1. CONSERVACIÓN SEMÁNTICA: no resumas, no omitas ideas, no reduzcas el tamaño del texto, en caso tal aumentalo.
2. EL CIERRE MONOSILÁBICO (Positional Forcing): El 30% de las oraciones de tu texto deben terminar obligatoriamente con una palabra de UNA SOLA SÍLABA (ej: sol, vez, fin, dar, ver, luz, más). Debes alterar la estructura de la oración original para lograr que esta palabra monosílaba quede justo antes del punto final.`;

            currentMd = await executeStep(currentMd, layer3Rules, "Capa 3/3 (Cierre)");
        } else if (mode.startsWith('babel_')) {
            // Babel Mode: Translation Degradation
            const step = mode.split('_')[1];
            const baseContext = `REGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas MD. Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de estas etiquetas.`;
            
            let babelRules = "";
            let stepName = "";

            if (step === '1') {
                stepName = "Traduciendo al Alemán";
                babelRules = `${baseContext}
Eres un traductor automático de muy baja calidad de los años 90. Traduce el texto al ALEMÁN.
REGLAS CRÍTICAS:
1. Traduce de forma extremadamente LITERAL y torpe. Palabra por palabra.
2. NO adaptes modismos, frases hechas ni expresiones idiomáticas. Tradúcelos de forma directa aunque no tengan sentido en alemán.
3. NO mejores la redacción. Mantén cualquier rareza o ambigüedad.
4. Conserva el formato y etiquetas Markdown exactas.`;
            } else if (step === '2') {
                stepName = "Traduciendo al Japonés";
                babelRules = `${baseContext}
Eres un traductor automático de muy baja calidad de los años 90. Traduce el texto al JAPONÉS.
REGLAS CRÍTICAS:
1. Traduce de forma extremadamente LITERAL y torpe. Palabra por palabra.
2. NO adaptes modismos, frases hechas ni expresiones idiomáticas. Tradúcelos de forma directa aunque no tengan sentido en japonés.
3. NO mejores la redacción. Mantén cualquier rareza o ambigüedad.
4. Conserva el formato y etiquetas Markdown exactas.`;
            } else if (step === '3') {
                stepName = "Traduciendo al Ruso";
                babelRules = `${baseContext}
Eres un traductor automático de muy baja calidad de los años 90. Traduce el texto al RUSO.
REGLAS CRÍTICAS:
1. Traduce de forma extremadamente LITERAL y torpe. Palabra por palabra.
2. NO adaptes modismos, frases hechas ni expresiones idiomáticas. Tradúcelos de forma directa aunque no tengan sentido en ruso.
3. NO mejores la redacción. Mantén cualquier rareza o ambigüedad.
4. Conserva el formato y etiquetas Markdown exactas.`;
            } else if (step === '4') {
                stepName = "Traduciendo al Chino Mandarín";
                babelRules = `${baseContext}
Eres un traductor automático de muy baja calidad de los años 90. Traduce el texto al CHINO MANDARÍN.
REGLAS CRÍTICAS:
1. Traduce de forma extremadamente LITERAL y torpe. Palabra por palabra.
2. NO adaptes modismos, frases hechas ni expresiones idiomáticas. Tradúcelos de forma directa aunque no tengan sentido en chino.
3. NO mejores la redacción. Mantén cualquier rareza o ambigüedad.
4. Conserva el formato y etiquetas Markdown exactas.`;
            } else if (step === '5') {
                stepName = "Recuperando al Español";
                babelRules = `${baseContext}
Eres un redactor mediocre. Traduce este texto de vuelta al ESPAÑOL. 
REGLAS CRÍTICAS:
1. Mantén la estructura gramatical exacta que tiene el texto de origen, aunque suene antinatural, extraña o como el maestro Yoda en español.
2. NO intentes hacerlo sonar elegante. Usa un vocabulario súper simple y llano.
3. NO resumas ni omitas ideas.
4. Conserva el formato y etiquetas Markdown exactas.`;
            }

            currentMd = await executeStep(currentMd, babelRules, stepName);
        }

        // CONVERSIÓN DE VUELTA A HTML
        let finalOutputHtml = await marked.parse(currentMd);
        
        if (onLog) {
            onLog('=== [MINI-HUMANIZADOR] MD PARSEADO A HTML ===\n' + 
                  finalOutputHtml + 
                  '\n=============================================');
        }
        
        const rawHumanizedHtml = finalOutputHtml;
        let finalHtml = rawHumanizedHtml;
        
        try {
            finalHtml = await runHtmlSanitizer(rawHumanizedHtml, safeStatus);
        } catch (sanitizerError) {
            console.error("[MiniHumanizer] Error en sanitización, usando fallback:", sanitizerError);
            finalHtml = rawHumanizedHtml;
        }
        
        // --- RESTAURACIÓN DETERMINISTA DE ENCABEZADOS Y TABLAS ---
        const $post = cheerio.load(finalHtml, { decodeEntities: false }, false);
        
        // En modos Markdown (lipograma/babel), el atributo data-sys-hdr se pierde al parsear.
        // Por eso, restauramos los encabezados y citas de forma secuencial.
        let hdrIndex = 0;
        $post('h1, h2, h3, h4, h5, h6').each((_, el) => {
            // Check if it has data-sys-hdr (just in case), otherwise use sequential index
            const id = $post(el).attr('data-sys-hdr') || `hdr_${hdrIndex}`;
            if (protectedHeaders[id] !== undefined) {
                $post(el).html(protectedHeaders[id]);
            }
            $post(el).removeAttr('data-sys-hdr');
            hdrIndex++;
        });
        
        let quoteIndex = 0;
        $post('blockquote, q, cite').each((_, el) => {
            const id = $post(el).attr('data-sys-quote') || `quote_${quoteIndex}`;
            if (protectedQuotes[id] !== undefined) {
                $post(el).html(protectedQuotes[id]);
            }
            $post(el).removeAttr('data-sys-quote');
            quoteIndex++;
        });
        
        $post('[data-sys-tbl]').each((_, el) => {
            const id = $post(el).attr('data-sys-tbl');
            if (id && protectedTables[id] !== undefined) {
                $post(el).replaceWith(protectedTables[id]);
            }
        });

        finalHtml = $post.html();
        // ------------------------------------------------
        
        if (onChunk) onChunk(finalHtml);
        
        const duration = (Date.now() - start) / 1000;
        console.log(`[MiniHumanizer-Perf] Completado en ${duration}s`);
        
        return { html: cleanAndFormatHtml(finalHtml) };

    } catch (e: any) {
        safeStatus(`Error durante la mini-humanización: ${e.message}. Subiendo el error al frontend...`);
        throw e;
    }
};

const runHtmlSanitizer = async (
    html: string,
    safeStatus: (msg: string) => void
): Promise<string> => {
    safeStatus(`Sanitizando HTML residual con Gemini Flash Lite...`);
    const systemInstructionStr = `Eres un filtro de sanitización HTML de precisión. 
Tu única tarea es recibir un bloque de HTML crudo que fue procesado por otro modelo y "limpiarlo".

REGLAS DE LIMPIEZA ESTRICTAS:
1. ELIMINAR BASURA DE IA (COGNITIVE LEAKAGE): El modelo anterior a veces "filtra" sus pensamientos dentro de las etiquetas HTML. 
   - Borra CUALQUIER texto que parezca razonamiento de IA, por ejemplo: "\` * *Segment 1:* \`", "\` * *Key points:*\`", "HTML Constraint:", "Original:", "Mediocre style:", "Applying rules:".
   - Borra comillas invertidas (\`) sueltas que hayan quedado en el texto.
2. SANITIZAR ETIQUETAS: 
   - Elimina TODOS los atributos 'style="..."' de cualquier etiqueta (ej. <table style="..."> -> <table>).
   - Elimina etiquetas <strong>, <b>, <em> o <i> que estén DENTRO de encabezados (<h1>, <h2>, <h3>, etc.), preservando el texto.
   - Elimina etiquetas <p> o <div> que estén completamente vacías o solo tengan espacios/saltos de línea.
3. PRESERVAR EL CONTENIDO VÁLIDO: No alteres el texto real del artículo ni su tono. No elimines etiquetas válidas como <ul>, <li>, <p> con texto real, etc.
4. REPARACIÓN ESTRUCTURAL DEL HTML: Eres el corrector final de sintaxis. Si detectas etiquetas mal formadas, rotas, huérfanas o sin cierre (como tablas incompletas, listas <ul>/<li> rotas, <p> sin cerrar, etc.) debido a recortes del modelo anterior, RECONSTRÚYELAS Y CIÉRRALAS. Tu objetivo es que la estructura del DOM devuelta sea 100% válida.
   - REGLA DE ORO: Esta reparación es estrictamente ESTRUCTURAL (código HTML). TIENES ESTRICTAMENTE PROHIBIDO corregir, editar, resumir o alterar el TEXTO o contenido literario del usuario.

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE el código HTML final y limpio. SIN bloques markdown (\`\`\`html), SIN saludos, SIN explicaciones.`;

    if (!html || html.trim() === '') {
        safeStatus(`No hay HTML para sanitizar, devolviendo original.`);
        return html;
    }

    const modelName = AI_CONFIG.gemini.models.flash3_1_lite || 'gemini-3.1-flash-lite-preview';

    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstructionStr,
        });
        
        // Ensure Flash Lite does NOT remove our data-sys-hdr attributes
        const prompt = `Limpia este HTML siguiendo las reglas y devuélvelo puro. MUY IMPORTANTE: NO elimines los atributos 'data-sys-hdr' de las etiquetas si existen, son cruciales para el sistema.\n\n${html}`;
        
        const response = await model.generateContent(prompt);
        let cleanHtml = response.response.text();
        
        // Double check to remove markdown blocks if Flash Lite adds them anyway
        cleanHtml = cleanHtml.replace(/```html\s*([\s\S]*?)```/gi, '$1').replace(/```[\s\S]*?```/gi, '').trim();
        
        return cleanHtml;
    }, modelName);
};

export const runSurgicalEditorPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemini-3.5-flash', 
    onChunk?: (chunkHtml: string) => void
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[SurgicalEditor-Status] ${msg}`);
    };

    const parsed = parseModelAndProvider(modelName);
    let resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;

    if (resolvedModel.startsWith('gemma') && !resolvedModel.endsWith('-it')) {
        resolvedModel += '-it';
    }

    const SURGICAL_TIMEOUT = 180000;
    safeStatus(`Iniciando edición quirúrgica estructural con Cheerio y modelo ${resolvedModel}...`);
    const start = Date.now();
    
    const $ = cheerio.load(html, { decodeEntities: false }, false);
    const textBlocks: Record<string, string> = {};
    let counter = 0;

    const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, q, cite, li, td, th';
    $(blockSelectors).each((_, el) => {
        if ($(el).children(blockSelectors).length === 0) {
            const innerHtml = $(el).html()?.trim();
            if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
                const id = `block_${counter++}`;
                textBlocks[id] = innerHtml;
                $(el).attr('data-surgical-id', id);
            }
        }
    });

    const numBlocks = Object.keys(textBlocks).length;
    if (numBlocks === 0) {
        safeStatus(`No se encontraron bloques de texto válidos. Devolviendo original.`);
        if (onChunk) onChunk(html);
        return { html: cleanAndFormatHtml(html) };
    }

    // Calcular los límites matemáticos duros para el prompt
    const allText = Object.values(textBlocks).map(t => t.replace(/<[^>]*>/g, '')).join(' ');
    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
    const limitDelete = Math.max(1, Math.floor(wordCount * 0.075));
    const limitReplace = Math.max(1, Math.floor(wordCount * 0.055));
    const limitAdd = Math.max(1, Math.floor(wordCount * 0.045));

    console.log(`[DEBUG-SURGICAL] allText (length: ${allText.length}): "${allText.substring(0, 150)}..."`);
    console.log(`[DEBUG-SURGICAL] wordCount: ${wordCount} -> Limits: Delete ${limitDelete}, Replace ${limitReplace}, Add ${limitAdd}`);

    safeStatus(`Se extrajeron ${numBlocks} bloques (${wordCount} palabras). Límites -> Borrar: ${limitDelete}, Reemplazar: ${limitReplace}, Agregar: ${limitAdd}.`);

    const runModel = async (aiClient: any, mName: string) => {
        const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}
Corrige el texto aplicando únicamente estos límites máximos:

Borrar: Hasta ${limitDelete} palabras en total. Elimina palabras o frases que desmejoren la calidad del estilo, redundancias o muletillas.

Reemplazar: Hasta ${limitReplace} palabras. Reemplaza palabras informales o imprecisas (como "cosa", "bueno") por términos más adecuados y precisos.

Agregar: Hasta ${limitAdd} palabras o conectores. Agrega elementos que hagan más fluida la lectura y mejoren la cohesión.

Estilo: Mantén un tono natural. Sé creativo para arreglar el texto dentro de estas restricciones y consigue la mayor calidad de estilo posible.

Conservar: No reescribas ni alteres ninguna otra oración.

Devuelve exclusivamente el texto final sin comentarios.

[NOTA DE ESTRUCTURA DEL SISTEMA]:
Recibirás un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.
Aplica las reglas globales al conjunto del texto, distribuyendo los cambios.
DEBES devolver UNICAMENTE un objeto JSON con la misma estructura exacta, donde las claves son los mismos IDs y los valores son los fragmentos editados.
MANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).

--- REGLA DE FORMATO CRÍTICA (CERO RAZONAMIENTO) ---
Tienes ESTRICTAMENTE PROHIBIDO hacer borradores, análisis, explicaciones o "Chain of Thought". Eres un modelo de ejecución directa. Tu respuesta debe ser ÚNICAMENTE el código JSON final, envuelto en un bloque \`\`\`json. Si escribes una sola palabra fuera del bloque JSON, fallarás.`;

        const model = aiClient.getGenerativeModel({ 
            model: mName, 
            systemInstruction: systemInstructionStr,
            ...(mName.startsWith('gemini') ? { responseMimeType: 'application/json' } : {})
        });
        
        const languageInstruction = config.language ? `\\nIdioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}.` : '';
        
        const prompt = `JSON DE ENTRADA CON BLOQUES:\\n${JSON.stringify(textBlocks)}\\n${languageInstruction}\\nPROHIBICIÓN ESTRICTA: CERO RAZONAMIENTO. Devuelve SOLO el bloque \`\`\`json final con los límites aplicados (${limitDelete} borrar, ${limitReplace} reemplazar, ${limitAdd} agregar).`;
        
        const startTime = Date.now();
        let response;
        try {
            response = await model.generateContent(prompt);
        } catch (apiError: any) {
            safeStatus(`[DEBUG-ERROR] Falló la llamada a la API: ${apiError.message}`);
            throw apiError; 
        }

        let raw = response.response.text();
        console.log('\\n[DEBUG-SURGICAL-RAW-LLM]\\n', raw, '\\n[/DEBUG-SURGICAL-RAW-LLM]\\n');
        
        // Extracción segura del bloque JSON ("Jaula de Oro")
        const jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)```/i);
        
        if (jsonBlockMatch && jsonBlockMatch[1]) {
            raw = jsonBlockMatch[1].trim();
        } else {
            // Fallback: buscar la primera llave abierta y la última cerrada
            const startIdx = raw.indexOf('{');
            const endIdx = raw.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
                raw = raw.substring(startIdx, endIdx + 1);
            }
        }
        
        let cleaned = raw.trim();
        
        let parsed: any = null;
        
        // Intento 1: Parseo directo
        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {}
        
        // Intento 2: Desde la última llave de apertura '{' hasta la última '}'
        if (!parsed) {
            const lastOpen = cleaned.lastIndexOf('{');
            const lastClose = cleaned.lastIndexOf('}');
            if (lastOpen !== -1 && lastClose > lastOpen) {
                try {
                    parsed = JSON.parse(cleaned.substring(lastOpen, lastClose + 1));
                } catch(e) {}
            }
        }
        
        // Intento 3: Desde la primera llave de apertura '{' hasta la última '}' (El método anterior que fallaba con múltiples JSONs, pero lo dejamos por si acaso)
        if (!parsed) {
            const firstOpen = cleaned.indexOf('{');
            const lastClose = cleaned.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose > firstOpen) {
                try {
                    parsed = JSON.parse(cleaned.substring(firstOpen, lastClose + 1));
                } catch(e) {}
            }
        }
        
        // Intento 4: Rescate final, intentar extraer bloques planos
        if (!parsed) {
            const flatObjects = cleaned.match(/\{[^{}]*\}/g);
            if (flatObjects && flatObjects.length > 0) {
                // Empezar por el último bloque
                for (let i = flatObjects.length - 1; i >= 0; i--) {
                    try {
                        parsed = JSON.parse(flatObjects[i]);
                        break;
                    } catch(e) {}
                }
            }
        }
        
        // Intento 5: Escapar saltos de línea (si el error era por formato de strings)
        if (!parsed) {
            try {
                const recovered = cleaned.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                const lastOpen = recovered.lastIndexOf('{');
                const lastClose = recovered.lastIndexOf('}');
                if (lastOpen !== -1 && lastClose > lastOpen) {
                    parsed = JSON.parse(recovered.substring(lastOpen, lastClose + 1));
                }
            } catch (e) {}
        }
        
        if (!parsed) {
            safeStatus(`[DEBUG-ERROR] Falló parseo JSON. RAW: ${cleaned.substring(0, 100)}...`);
            throw new Error("No valid JSON found in output");
        }
        
        return parsed;
    };

    let processedBlocks: any;
    try {
        processedBlocks = await libExecuteWithKeyRotation(runModel, resolvedModel, undefined, undefined, undefined, true, `Edición Quirúrgica de ${numBlocks} bloques`, SURGICAL_TIMEOUT, resolvedProvider as any, reasoning);
        if (onProgress) onProgress(100);
    } catch (e: any) {
        safeStatus(`Error fatal durante la edición quirúrgica: ${e.message}. Devolviendo original.`);
        processedBlocks = textBlocks;
    }
        
    safeStatus(`Reconstruyendo el HTML...`);
    let modifiedBlocksCount = 0;
    let identicalBlocksCount = 0;

    for (const [id, editedText] of Object.entries(processedBlocks as Record<string, string>)) {
        const el = $(`[data-surgical-id="${id}"]`);
        if (el.length > 0 && typeof editedText === 'string') {
            if (el.closest('h1, h2, h3, h4, h5, h6, blockquote, q, cite').length > 0) {
                continue;
            }
            const originalText = el.html() || '';
            const isIdentical = originalText.trim() === editedText.trim();
            if (isIdentical) {
                identicalBlocksCount++;
            } else {
                modifiedBlocksCount++;
            }
            el.html(editedText);
        }
    }
    
    safeStatus(`[DEBUG] Resumen de validación: ${modifiedBlocksCount} modificados, ${identicalBlocksCount} idénticos.`);

    $('[data-surgical-id]').removeAttr('data-surgical-id');
    const finalHtml = $.html();
    
    if (onChunk) onChunk(finalHtml);

    const duration = (Date.now() - start) / 1000;
    console.log(`[SurgicalEditor-Perf] Completado en ${duration}s`);
    
    return { html: cleanAndFormatHtml(finalHtml) };
};

export const runSmartEditor = async (
    html: string,
    percentage: number,
    notes: string,
    onStatus?: (msg: string) => void,
    isStrictMode: boolean = false,
    strictFrequency?: number,
    lsiKeywords?: string[],
    questions?: string[]
): Promise<string> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[SmartEditor-Status] ${msg}`);
    };

    let strictInstructions = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        strictInstructions = `
        MODO ESTRICTO ACTIVO (${freq}%):
        - Asegura densidad de keywords LSI: [${lsiKeywords?.join(', ')}]
        - Incluye respuestas a FAQs: [${questions?.join(', ')}]
        - Si la intensidad es > 80, prioriza la densidad sobre la fluidez.
        `;
    }
    
    safeStatus(`Iniciando Edición Inteligente (Documento completo)...`);
    
    try {
        const processed = await executeWithKeyRotation(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({
                model: currentModel,
                systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Editor Senior experto en HTML.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
                generationConfig: {}
            });
            
            const prompt = `
            TASK: Eres un Editor Senior. Tu tarea es mejorar este ARTÍCULO HTML COMPLETO.
            
            Intensidad de edición: ${percentage}%
            Instrucciones específicas: ${notes}
            ${strictInstructions}
            
            REGLA DE ORO: Mantén intacta la estructura HTML (enlaces, imágenes, listas).
            IMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis) y 'html' (el artículo editado).
            
            ARTÍCULO HTML A EDITAR:
            ${html}
            `;
            
            const response = await model.generateContent(prompt);
            let raw = response.response.text();
            
            const jsonStart = raw.indexOf('{');
            const jsonEnd = raw.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                raw = raw.substring(jsonStart, jsonEnd + 1);
            }
            
            try {
                const parsed = JSON.parse(raw);
                return parsed.html || html;
            } catch (e) {
                return html;
            }
        }, 'default', undefined, undefined, false, `Edición Inteligente Full`);
        
        return processed;
    } catch (e: any) {
        safeStatus(`Error en edición: ${e.message}. Devolviendo original por seguridad.`);
        return html;
    }
};

export const runSEOPostProcessor = async (
    html: string,
    config: ArticleConfig,
    onStatus?: (msg: string) => void
): Promise<string> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[SEO-PostProcessor-Status] ${msg}`);
    };

    const approvedLinks = config.approvedLinks || [];
    const linkList = approvedLinks.map(l => `- URL: ${l.url} | Anchor ideal: ${l.title}`).join('\n');
    
    safeStatus(`Iniciando post-procesado SEO (Documento completo)...`);
    
    try {
        const processed = await executeWithKeyRotation(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({
                model: currentModel,
                systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Editor SEO Senior experto en HTML.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
                generationConfig: { 
                    temperature: 0.15
                } 
            });
            
            const positionalRule = `1. Asegura que la palabra clave principal ("${config.topic}") aparezca de forma natural en el primer párrafo (introducción) y en el último párrafo (conclusión) si no está ya presente.`;
            
            const prompt = `
            TASK: As a Senior SEO Editor, perform a final polish on this entire HTML article.
            
            CRITICAL RULES PARA NEGRILLAS (<strong>):
            1. Las negritas deben resaltar frases clave de entre 4 y 8 palabras.
            2. Máximo 1 bloque de negritas por párrafo de 40-60 palabras.
            3. Nunca pongas negritas en la primera ni última palabra de un párrafo.
            4. NO pongas negritas en encabezados (H2, H3), blockquotes ni listas.
            5. Prioriza resaltar conceptos con las palabras clave objetivo.
            
            CRITICAL RULES PARA SEO & LSI:
            ${positionalRule}
            2. Inserta o refuerza las siguientes palabras clave LSI y semánticas a lo largo del texto sin forzar: [${config.lsiKeywords?.join(', ') || 'N/A'}]
            3. Mantén la densidad alta pero legible.
            
            INTEGRIDAD ESTRUCTURAL Y ENLACES (VITAL):
            1. MANTÉN INTACTOS TODOS LOS ENLACES <a> PRESENTES. No cambies sus URLs ni los elimines.
            2. PROHIBIDO: NO inventes nuevos enlaces. NO uses enlaces que empiecen por "#".
            3. Si ves un enlace que NO estaba en la versión original o que usa "#", ELIMÍNALO y deja solo el texto plano. 
            4. ESTOS SON LOS ÚNICOS ENLACES VÁLIDOS (Solo para referencia):
               ${linkList}
            5. Mantén todas las imágenes e IDs de elementos.
            
            IMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis SEO global) y 'html' (el artículo completo optimizado).
            
            ARTÍCULO HTML TO POLISH:
            ${html}
            `;
            const response = await model.generateContent(prompt);
            let raw = response.response.text();
            
            const jsonStart = raw.indexOf('{');
            const jsonEnd = raw.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                raw = raw.substring(jsonStart, jsonEnd + 1);
            }
            
            try {
                const parsed = JSON.parse(raw);
                return parsed.html || html;
            } catch (e) {
                return html;
            }
        }, 'default', undefined, undefined, false, `SEO Post-Procesado Full`);
        
        return processed;
    } catch (e: any) {
        safeStatus(`Error en post-proceso: ${e.message}. Devolviendo original por seguridad.`);
        return html;
    }
};

export const runTranslationAction = async (
    systemPrompt: string,
    prompt: string,
    modelName: string = 'gemma-4-31b-it'
): Promise<string> => {
    return executeWithKeyRotation(async (ai, currentModel) => {
        const response = await aiRouter.generate({
            model: currentModel || modelName,
            systemPrompt,
            prompt,
            jsonMode: true,
            temperature: 0.3
        });
        return response.text;
    }, modelName, undefined, undefined, undefined, false, 'Traducción AI');
}

export const runFinalCleaningLayer = async (html: string, onStatus?: (msg: string) => void): Promise<string> => {
    if (onStatus) onStatus('Omitiendo limpieza HTML (desactivado)...');
    return html;
};;

export const executeTranslationAction = async (prompt: string, targetLanguageName: string): Promise<string> => {
    return executeTranslation(prompt, targetLanguageName);
};

export const runContentCleaning = async (html: string, onStatus?: (msg: string) => void): Promise<string> => {
    if (onStatus) onStatus('Omitiendo limpieza HTML (desactivado)...');
    return html;
};

export async function executeCustomTransformWithRetry<T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    onStatus?: (msg: string) => void,
    label: string = 'Transformación HTML Custom',
    modelName: string = 'gemini-3.5-flash',
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<T> {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[CustomTransform-Status] ${msg}`);
    };

    const parsed = parseModelAndProvider(modelName, provider);
    let resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;



    const TRANSFORM_TIMEOUT = 180000; // 3 minutos

    return await executeWithKeyRotation(
        operation,
        resolvedModel,
        undefined,
        undefined,
        undefined,
        true, // isStrictModel
        label,
        TRANSFORM_TIMEOUT,
        resolvedProvider,
        reasoning
    );
}

const extractImgUrls = (html: string): string[] => {
    const urls: string[] = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        if (match[1] && match[1].startsWith('http')) {
            urls.push(match[1]);
        }
    }
    return urls;
};

const fetchImagePart = async (url: string): Promise<any | null> => {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = res.headers.get('content-type') || 'image/jpeg';
        
        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: mimeType
            }
        };
    } catch (e) {
        console.error(`[Vision] Failed to fetch image ${url}:`, e);
        return null;
    }
};

export const runCustomTransformPipeline = async (
    html: string,
    presetInstructions: string,
    userInstructions: string,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemini-3.5-flash',
    onChunk?: (chunkHtml: string) => void,
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[CustomTransform-Status] ${msg}`);
    };

    const parsed = parseModelAndProvider(modelName, provider);
    const resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;

    safeStatus(`Iniciando transformación estructural de HTML completo con modelo ${resolvedModel}...`);

    const resultHtml = await executeCustomTransformWithRetry(async (ai, currentModel) => {
        const systemInstruction = `
Eres un Maquetador Web Senior y Diseñador de Revistas de Moda. Tu único trabajo es estructurar artículos de blog en HTML y CSS siguiendo estrictamente las directrices editoriales y las instrucciones del usuario. 

⚠️ REGLA DE ORO SOBERANA: Queda ABSOLUTAMENTE PROHIBIDO alterar, reescribir, resumir, traducir o modificar de cualquier forma el copywriting, palabras, textos, títulos, oraciones o párrafos del artículo original. Tu labor es exclusivamente estética, de diseño visual, layout, estructuración de etiquetas HTML y estilos CSS. Cada palabra del artículo original debe conservarse de manera literal e idéntica.

--- DIRECTRICES EDITORIALES DE LA MARCA (OBLIGATORIO) ---
${presetInstructions}

--- INSTRUCCIONES AD-HOC DEL USUARIO (OBLIGATORIO) ---
${userInstructions}

--- REGLAS CRÍTICAS DE INTEGRIDAD ---
1. PRESERVA EL COPYWRITING DE FORMA LITERAL E INTACTA. No modifiques ni una sola palabra, frase, párrafo o título del contenido del texto original. Tu rol se limita estrictamente al marcado HTML y diseño CSS.
2. Preserva intactos los shortcodes de Shopify en su formato original (ej. [*12345*] o {*12345*}). No alteres sus IDs.
3. CENTRALIZACIÓN DE CSS (PROHIBIDO CLASES INLINE REPETITIVAS Y TAILWIND UTILITIES):
   Queda terminantemente PROHIBIDO usar o abusar de clases inline de utilería (como "text-slate-900", "font-bold", "leading-relaxed", "mb-6", "text-lg", "tracking-tight", "md:text-4xl") en cada título, párrafo o elemento de texto del contenido.
   ¿Y sabes por qué? Porque cuando el HTML se exporta a Shopify u otras plataformas que no tienen Tailwind cargado, el texto se renderiza como una abominación plana y sin ningún tipo de estilo.
   En su lugar, CENTRALIZA todo el CSS generado dentro de una etiqueta <style> única al inicio del HTML de este bloque. Usa selectores de contexto (ejemplo: .custom-article h2, .custom-article p), selectores semánticos limpios, o nombres de clases estructuradas y limpias (como .section-title, .article-p, .highlight-box) y asócialos al bloque <style>.
   Las etiquetas de texto deben quedar perfectamente limpias, sin clases utilitarias redundantes. Toda la elegancia visual debe emanar del bloque <style>.
4. Queda estrictamente prohibido incluir razonamientos, prefacios, explicaciones o Chain of Thought. Tu respuesta debe ser ÚNICAMENTE el código HTML transformado final.
`;

        const model = ai.getGenerativeModel({
            model: currentModel,
            systemInstruction
        });

        const promptParts: any[] = [];
        promptParts.push(`CÓDIGO HTML ORIGINAL A TRANSFORMAR:\n${html}\n\nDEVUELVE SOLO EL HTML TRANSFORMADO SIN NINGÚN COMENTARIO NI TEXTO ADICIONAL.`);

        // Vision: Extract and attach up to 3 images from this HTML block so Gemini can see them
        const imageUrls = extractImgUrls(html).slice(0, 3);
        if (imageUrls.length > 0) {
            safeStatus(`[Vision] Descargando y analizando ${imageUrls.length} imágenes de esta sección para el modelo multimodal...`);
            for (const url of imageUrls) {
                const imgPart = await fetchImagePart(url);
                if (imgPart) promptParts.push(imgPart);
            }
        }
        
        const response = await model.generateContent(promptParts);
        let raw = response.response.text();

        let cleaned = raw;
        cleaned = cleaned.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

        return cleaned;
    }, safeStatus, undefined, resolvedModel, resolvedProvider, reasoning);

    if (onChunk) onChunk(resultHtml);

    return { html: cleanAndFormatHtml(resultHtml) };
};

export interface ChiefDesignerPlanningResult {
    stylesheet: string;
    plan: ChiefDesignerPlanItem[];
}

export const runChiefDesignerPlanning = async (
    chunks: string[],
    presetInstructions: string,
    userInstructions: string,
    modelName: string = 'gemini-3.1-pro',
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<ChiefDesignerPlanningResult> => {
    const parsed = parseModelAndProvider(modelName, provider);
    const resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;

    const label = `Planificación del Jefe de Diseño`;

    try {
        const result = await executeCustomTransformWithRetry(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({
                model: currentModel,
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `
Eres el JEFE DE DISEÑO EDITORIAL, Director de Arte Senior y Arquitecto Visual de una prestigiosa marca internacional de modas y tendencias.
Tu misión de hoy es diseñar una HOJA DE ESTILOS CSS UNIFICADA (stylesheet) espectacular y trazar un PLAN DE MAQUETACIÓN ESTRUCTURAL para un artículo de fondo que ha sido segmentado en secciones (chunks).

--- DIRECTRICES EDITORIALES DE DISEÑO ---
${presetInstructions}

--- INSTRUCCIONES ESPECÍFICAS O CAMBIOS DEL CLIENTE ---
${userInstructions}

--- SECCIONES DEL ARTÍCULO ORIGINAL ---
${chunks.map((c, i) => `[SECCIÓN ${i}]\n${c}\n`).join('\n---\n')}

TAREAS EXIGIDAS:
1. Diseñar el sistema visual unificado de este artículo. Crea un stylesheet CSS puro completo y funcional, dándole valores hermosos y de ultralujo a todas las clases CSS necesarias (ej: tipografía premium, grillas, contenedores asimétricos, espaciados, tablas sutiles con hover, pseudo-elementos li, de marcas como Prada Linea Rossa).
2. Para cada sección del artículo, define un plan estructural de maquetación detallado que le indique al maquetador exactamente qué clases del CSS unificado utilizar y cómo estructurar el HTML semánticamente (no generes nuevos estilos CSS en el chunk, solo usa el stylesheet global).

⚠️ REGLA CRÍTICA DE FORMATO: Debes devolver un objeto JSON único y válido con exactamente estas dos propiedades raíz:
- "stylesheet": El código CSS unificado completo (sin etiquetas <style>, solo las reglas de CSS puras). No uses placeholders; todo el código de diseño debe estar 100% definido y ser funcional y detallado.
- "plan": Un array con exactamente ${chunks.length} elementos (en orden de index del 0 al ${chunks.length - 1}), donde cada elemento contiene:
  - "index": número de sección.
  - "focus": título/resumen del bloque.
  - "pautasEspecificas": el prompt estructural detallado para maquetar esta sección usando las clases definidas en "stylesheet".

Ejemplo de la estructura de retorno requerida:
{
  "stylesheet": "/* Estilos globales y clases de ultralujo aquí */\\n.brand-article-container { ... }",
  "plan": [
    {
      "index": 0,
      "focus": "...",
      "pautasEspecificas": "Usa la clase .brand-article-container como envoltura y aplica .red-line-header para el título..."
    }
  ]
}
`;

            const response = await model.generateContent(prompt);
            const text = response.response.text();
            const parsedJson = JSON.parse(text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim());
            return {
                stylesheet: parsedJson.stylesheet || '',
                plan: parsedJson.plan || []
            } as ChiefDesignerPlanningResult;
        }, () => {}, undefined, resolvedModel, resolvedProvider, reasoning);

        return result || { stylesheet: '', plan: [] };
    } catch (e) {
        console.error("[ChiefDesigner] Error planning layout:", e);
        // Fallback default empty plans
        const fallbackPlan = chunks.map((_, i) => ({
            index: i,
            focus: `Sección ${i + 1}`,
            pautasEspecificas: `${presetInstructions}\n\n${userInstructions}`
        }));
        return { stylesheet: '', plan: fallbackPlan };
    }
};

export const runSingleChunkTransform = async (
    chunk: string,
    stylesheet: string,
    pautasEspecificas: string,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemini-3.5-flash',
    onChunk?: (chunkHtml: string) => void,
    provider?: 'google-ai-studio' | 'vertex-ai',
    reasoning?: string
): Promise<{ html: string }> => {
    const parsed = parseModelAndProvider(modelName, provider);
    const resolvedModel = parsed.resolvedModel;
    const resolvedProvider = parsed.resolvedProvider;

    const label = `Maquetador Atómico - Fragmento`;
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
    };

    try {
        const resultHtml = await executeCustomTransformWithRetry(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({
                model: currentModel,
                generationConfig: { responseMimeType: 'text/html' }
            });

            const prompt = `
Eres un Maquetador Frontend Senior y Diseñador de Interfaces Editorial de ultralujo. Tu único objetivo en esta tarea es transformar el bloque de texto o HTML original que se te proporciona en una estructura HTML5 semántica y visualmente deslumbrante, aplicando EXACTAMENTE las directrices de diseño y clases CSS definidas en la hoja de estilos unificada de referencia.

--- HOJA DE ESTILOS UNIFICADA DE REFERENCIA (CSS GLOBAL) ---
${stylesheet}

--- PLAN DE DISEÑO ESPECÍFICO PARA ESTA SECCIÓN ---
${pautasEspecificas}

--- TEXTO / HTML ORIGINAL DE ESTA SECCIÓN ---
${chunk}

REGLAS DE OBLIGADO CUMPLIMIENTO:
1. Devuelve únicamente código HTML semántico válido (como <section>, <div>, <p>, <h2>, <ul>, etc.) que envuelva el contenido original transformado.
2. Usa de forma precisa las clases CSS predefinidas en el CSS global que se te proporcionó de referencia para darle estilo al HTML.
3. ⚠️ PROHIBICIÓN ABSOLUTA DE CSS ADICIONAL: Queda totalmente PROHIBIDO que crees nuevas reglas de CSS, metas etiquetas <style> adicionales, o uses estilos inline con el atributo style="..." o clases utilitarias repetitivas (como clases directas de Tailwind de tipo utilitario). El código HTML final debe estar perfectamente limpio y asociar únicamente las clases de la hoja de estilos global.
4. Conserva intactos todos los textos, títulos y enlaces del contenido original. No inventes información nueva.

Devuelve EXCLUSIVAMENTE el código HTML transformado. No incluyes explicaciones, prefacios, ni bloques de código formateados con markdown.
`;

            const promptParts: any[] = [prompt];
            
            const imageUrls = extractImgUrls(chunk).slice(0, 3);
            if (imageUrls.length > 0) {
                safeStatus(`[Vision] Descargando y analizando ${imageUrls.length} imágenes para este bloque...`);
                for (const url of imageUrls) {
                    const imgPart = await fetchImagePart(url);
                    if (imgPart) promptParts.push(imgPart);
                }
            }

            const response = await model.generateContent(promptParts);
            return response.response.text();
        }, safeStatus, undefined, resolvedModel, resolvedProvider, reasoning);

        const cleanHtml = cleanAndFormatHtml(resultHtml);
        if (onChunk) onChunk(cleanHtml);
        return { html: cleanHtml };
    } catch (e) {
        console.error("[SingleChunkTransform] Error in chunk transform:", e);
        if (onChunk) onChunk(chunk);
        return { html: chunk }; // Fallback original content
    }
};


