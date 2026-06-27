'use server';


import * as cheerio from 'cheerio';
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
import { buildPrompt as libBuildPrompt } from "@/lib/services/writer/prompts";
import { ResearchOrchestrator } from "@/lib/services/writer/research";
import { AI_CONFIG } from "@/lib/ai/config";
import { Type } from "@google/genai";
import { supabase } from "@/lib/supabase";

// --- UTILS & CONSTANTS ---
export const buildPrompt = libBuildPrompt;
const ANTI_LEAKAGE_SYSTEM_BASE = `Eres un Transformador Determinista. Tu única función es procesar la entrada y devolver la salida en el formato exacto solicitado. No uses markdown fuera de lo estrictamente solicitado. Si necesitas planificar, razonar o verificar constraints, utiliza campos específicos como 'razonamiento_interno' dentro de estructuras JSON si el prompt te lo requiere.`;

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
    timeoutMs?: number
): Promise<T> {
    return libExecuteWithKeyRotation(async (client, m) => {
        return operation(client, m);
    }, modelName, explicitHierarchy, keys, onRotation, isStrictModel, label, timeoutMs);
}

export async function executeHumanizerWithRetry<T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    onStatus?: (msg: string) => void,
    label: string = 'Redacción Humanización',
    modelName: string = 'gemma-4-31b-it'
): Promise<T> {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[Humanizer-Status] ${msg}`);
    };

    if (modelName !== 'gemma-4-31b-it' && modelName !== 'gemma-4-26b-a4b-it') {
        safeStatus(`⚠️ Modelo ${modelName} no permitido para humanización. Forzando gemma-4-31b-it.`);
        modelName = 'gemma-4-31b-it';
    }

    // Le damos 3 minutos (180000ms) de timeout al Humanizer porque procesa HTML enorme y necesita más tiempo
    const HUMANIZER_TIMEOUT = 180000;

    try {
        return await executeWithKeyRotation(
            operation,
            modelName,
            undefined,
            undefined,
            undefined,
            true,
            label,
            HUMANIZER_TIMEOUT
        );
    } catch (e: any) {
        console.error(`[Humanizer-Retry] Error en ejecución de humanizador:`, e);
        safeStatus(`⚠️ Error con ${modelName}. Reintentando una vez con modelo alternativo...`);
        // Fallback to a safe known model instead of infinite loop
        return await executeWithKeyRotation(
            operation,
            'gemma-4-31b-it',
            undefined,
            undefined,
            undefined,
            true,
            label,
            HUMANIZER_TIMEOUT
        );
    }
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
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Redactor HTML experto. Generas el artículo basándote en la estructura indicada. Eliges siempre etiquetas semánticas HTML (<strong>, <a>, <h2>, <h3>) y NUNCA usas markdown ni etiquetas de imagen <img>. Generas HTML impecable para la web.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        });
        
        const finalPrompt = `INSTRUCCIONES DE REDACCIÓN:\n${prompt}\n\nIMPORTANTE: Escribe el artículo de cero siguiendo la estructura dada. NO repitas instrucciones, NO uses prefacios. Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu planificación) y 'html' (el artículo completo finalizado).`;
        
        const response = await modelObj.generateContent(finalPrompt);
        
        let raw = response.response.text();
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            raw = raw.substring(jsonStart, jsonEnd + 1);
        }
        
        let htmlOutput = "";
        try {
            const parsed = JSON.parse(raw);
            htmlOutput = parsed.html || raw;
        } catch(e) {
            htmlOutput = raw;
        }
        
        return htmlOutput;
    }, model || 'default', hierarchy, undefined, undefined, false, 'Redacción Artículo JSON');
};

export const generateArticleStream = async (model: string, prompt: string, hierarchy?: string[], onChunk?: (text: string) => void) => {
    return executeWithKeyRotation(async (ai, currentModel) => {
        const sysInst = `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Redactor HTML experto. Escribe el artículo en formato HTML directo. Eliges siempre etiquetas semánticas HTML (<strong>, <a>, <h2>, <h3>). NO USES JSON, devuelve únicamente el código HTML resultante.`;
        const modelObj = ai.getGenerativeModel({
            model: currentModel,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        });
        
        const finalPrompt = `[SYSTEM INSTRUCTIONS]\n${sysInst}\n\n[USER INSTRUCTIONS]\nINSTRUCCIONES DE REDACCIÓN:\n${prompt}\n\nIMPORTANTE: Escribe el artículo de cero siguiendo la estructura dada. NO repitas instrucciones, NO uses prefacios. Devuelve SOLAMENTE el texto en HTML final.`;
        
        const response = await modelObj.generateContentStream(finalPrompt);
        let fullHtml = '';
        for await (const chunk of response.stream) {
            const chunkText = chunk.text();
            fullHtml += chunkText;
            if (onChunk) onChunk(chunkText);
        }
        
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
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }
        const json = JSON.parse(text);
        if (!Array.isArray(json)) return [];
        return json.filter((item: any) => item.url && item.url.startsWith('http'));
    });
};

export const generateSchemaMarkup = async (metadata: any, articleHtml: string, type: 'Article' | 'Product' = 'Article'): Promise<string> => {
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
        const json = JSON.parse(result.text() || "{}");
        
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
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            rawText = rawText.substring(start, end + 1);
        }
        return JSON.parse(rawText);
    });
};

export const runHumanizerPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemma-4-31b-it', 
    onChunk?: (chunkHtml: string) => void
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[Humanizer-Status] ${msg}`);
    };

    if (modelName !== 'gemma-4-31b-it' && modelName !== 'gemma-4-26b-a4b-it') {
        modelName = 'gemma-4-31b-it';
    }

    safeStatus(`Iniciando humanización estructural con Cheerio y modelo ${modelName}...`);
    const start = Date.now();
    
    const $ = cheerio.load(html, { decodeEntities: false }, false);
    const textBlocks: Record<string, string> = {};
    let counter = 0;

    const blockSelectors = 'p, li, td, th';
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
        const processedBlocks = await executeHumanizerWithRetry(async (ai) => {
            const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- CONTEXTO ---\nNicho/Tópico: ${config.niche || 'N/A'}\nPúblico Objetivo: ${config.audience || 'N/A'}\nNotas Adicionales: ${config.notes || 'N/A'}\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1.  ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2.  COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3.  CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.\n4.  MORFOSINTAXIS (EXPLOSIVIDAD):\n    * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).\n    * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.\n5.  IDIOMA: Usa español neutro panhispánico.\n6.  PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.\n7.  PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.\n8.  LONGITUD Y DESARROLLO (VITAL): BAJO NINGUNA CIRCUNSTANCIA debes resumir o acortar la cantidad original de palabras. Si el texto original tiene 50 palabras, tu versión debe tener al menos 60 o 70.\n\nREGLA CRÍTICA DE ESTRUCTURA (JSON DICTIONARY):\nTe entregaré un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.\nMANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).\nDEBES devolver UNICAMENTE un objeto JSON con la misma estructura exacta, donde las claves son los mismos IDs y los valores son los fragmentos humanizados. No devuelvas markdown ni otra cosa.`;

            const model = ai.getGenerativeModel({ 
                model: modelName, 
                systemInstruction: systemInstructionStr,
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });
            
            const languageInstruction = config.language ? `\nIdioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}.` : '';
            
            const prompt = `JSON DE ENTRADA CON BLOQUES:\n${JSON.stringify(textBlocks)}\n\n${languageInstruction}\nDEVUELVE SOLO EL JSON DE SALIDA. RESPETA ESTRICTAMENTE LA ESTRUCTURA.`;
            
            const response = await model.generateContent(prompt);
            const raw = response.response.text();
            
            let cleaned = raw;
            cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            const jsonStart = cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
            }
            
            try {
                return JSON.parse(cleaned);
            } catch (e) {
                console.error("[Humanizer-Parser] Fallo catastrófico al parsear JSON. Raw preview:", cleaned.substring(0, 100) + "...");
                throw e;
            }
        }, safeStatus, `Humanización de ${numBlocks} bloques`, modelName);
        
        safeStatus(`Reconstruyendo el HTML...`);
        for (const [id, humanizedText] of Object.entries(processedBlocks as Record<string, string>)) {
            const el = $(`[data-humanize-id="${id}"]`);
            if (el.length > 0 && typeof humanizedText === 'string') {
                el.html(humanizedText);
            }
        }

    } catch (e: any) {
        safeStatus(`Error durante la humanización: ${e.message}. Devolviendo original.`);
    }

    $('[data-humanize-id]').removeAttr('data-humanize-id');
    const finalHtml = $.html();
    
    if (onChunk) onChunk(finalHtml);

    const duration = (Date.now() - start) / 1000;
    console.log(`[Humanizer-Perf] Completado en ${duration}s`);
    
    return { html: cleanAndFormatHtml(finalHtml) };
};

export const runSurgicalEditorPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemini-3.1-flash-lite-preview', 
    onChunk?: (chunkHtml: string) => void
): Promise<{ html: string; metadata?: any }> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[SurgicalEditor-Status] ${msg}`);
    };

    if (modelName !== 'gemini-3.1-flash-lite-preview') {
        modelName = 'gemini-3.1-flash-lite-preview';
    }

    safeStatus(`Iniciando edición quirúrgica estructural con Cheerio y modelo ${modelName}...`);
    const start = Date.now();
    
    const $ = cheerio.load(html, { decodeEntities: false }, false);
    const textBlocks: Record<string, string> = {};
    let counter = 0;

    const blockSelectors = 'p, li, td, th';
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

    // Calcular el límite matemático para el prompt
    const allText = Object.values(textBlocks).map(t => t.replace(/<[^>]*>/g, '')).join(' ');
    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
    const editLimit = Math.max(1, Math.floor(wordCount * 0.20));

    safeStatus(`Se extrajeron ${numBlocks} bloques. Límite de edición: ${editLimit} palabras. Enviando al modelo...`);

    try {
        const processedBlocks = await libExecuteWithKeyRotation(async (ai) => {
            const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}
--- PERSONA: EDITOR QUIRÚRGICO ---
Actúa como un editor experto. Tu objetivo es hacer una EDICIÓN QUIRÚRGICA MINIMALISTA de un texto que fue previamente "humanizado".
El texto actual puede tener oraciones torpes o excesivamente informales, pero no queremos perder su esencia humana.

--- REGLA DE PRESUPUESTO ESTRICTO (VITAL) ---
TIENES UN LÍMITE ESTRICTO DEL 20% (máximo ${editLimit} palabras modificadas).
Para lograr esto, DEBES APLICAR ESTA REGLA LÓGICA DE EDICIÓN:
Haz MICRO-EDICIONES distribuidas a lo largo de TODO el fragmento.
OBLIGATORIO: Debes hacer AL MENOS UN (1) cambio pequeño en CADA ORACIÓN del fragmento (cambiar una palabra por un sinónimo, eliminar una muletilla, arreglar un conector).
Mantén la estructura original de todas las oraciones intacta, solo "pule" palabras individuales.

--- PROHIBICIÓN ABSOLUTA ---
1. ESTÁ PROHIBIDO REESCRIBIR ORACIONES COMPLETAS. Si cambias la estructura estructural de las frases, fallarás la tarea. Solo puedes hacer cambios a nivel de palabra.
2. ESTÁ PROHIBIDO DEVOLVER EL TEXTO 100% IGUAL. No puedes dejar ninguna oración exactamente igual a la original. Tienes que pulir cada una de ellas.
3. ESTÁ PROHIBIDO CAMBIAR EL TONO HUMANO O HACERLO SONAR ROBÓTICO.

--- CONTEXTO ---
Nicho/Tópico: ${config.niche || 'N/A'}
Público Objetivo: ${config.audience || 'N/A'}

REGLA CRÍTICA DE ESTRUCTURA (JSON DICTIONARY):
Te entregaré un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.
MANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).
DEBES devolver UNICAMENTE un objeto JSON con la misma estructura exacta, donde las claves son los mismos IDs y los valores son los fragmentos editados. No devuelvas markdown ni otra cosa.`;

            const model = ai.getGenerativeModel({ 
                model: modelName, 
                systemInstruction: systemInstructionStr,
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });
            
            const languageInstruction = config.language ? `\nIdioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}.` : '';
            
            const prompt = `JSON DE ENTRADA CON BLOQUES:\\n${JSON.stringify(textBlocks)}\\n\\n${languageInstruction}\\nDEVUELVE SOLO EL JSON DE SALIDA. RESPETA ESTRICTAMENTE LA ESTRUCTURA. RECUERDA: SÓLO PUEDES MODIFICAR ${editLimit} PALABRAS.`;
            
            safeStatus(`[DEBUG] Enviando Prompt. Modelo: ${modelName}, Límite editLimit: ${editLimit}`);
            
            let response;
            try {
                response = await model.generateContent(prompt);
            } catch (apiError: any) {
                safeStatus(`[DEBUG-ERROR] Falló la llamada a la API de Google/Groq: ${apiError.message}`);
                throw apiError; // Re-lanzar para que key rotation funcione
            }

            const raw = response.response.text();
            
            safeStatus(`[DEBUG] RAW RESPONSE (primeros 200 chars): ${raw.substring(0, 200)}...`);
            
            let cleaned = raw;
            cleaned = cleaned.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
            
            const jsonStart = cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
            }
            
            try {
                const parsed = JSON.parse(cleaned);
                safeStatus(`[DEBUG] JSON parseado correctamente con ${Object.keys(parsed).length} bloques.`);
                return parsed;
            } catch (e: any) {
                console.error("[SurgicalEditor-Parser] Fallo catastrófico al parsear JSON. Raw preview:", cleaned.substring(0, 100) + "...");
                safeStatus(`[DEBUG-ERROR] Falló parseo JSON: ${e.message}. RAW: ${cleaned.substring(0, 50)}...`);
                throw e;
            }
        }, modelName, undefined, undefined, undefined, true, `Edición Quirúrgica de ${numBlocks} bloques`, 180000);
        
        safeStatus(`Reconstruyendo el HTML...`);
        for (const [id, editedText] of Object.entries(processedBlocks as Record<string, string>)) {
            const el = $(`[data-surgical-id="${id}"]`);
            if (el.length > 0 && typeof editedText === 'string') {
                el.html(editedText);
            }
        }

    } catch (e: any) {
        safeStatus(`Error durante la edición quirúrgica: ${e.message}. Devolviendo original.`);
    }

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

export const runFinalCleaningLayer = async (
    html: string,
    onStatus?: (msg: string) => void
): Promise<string> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[FinalCleaning-Status] ${msg}`);
    };

    safeStatus(`Iniciando capa de limpieza final con Gemini 3.1 Flash Lite...`);
    
    try {
        const processed = await executeWithKeyRotation(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({
                model: currentModel,
                systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Editor de Limpieza de HTML.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
                generationConfig: { 
                    temperature: 0.1
                } 
            });
            
            const prompt = `
            TASK: Elimina toda la basura y texto generado por IA que no pertenezca al contenido principal del artículo. Limita tu respuesta estrictamente al contenido de valor.
            
            IMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis breve de lo que eliminaste) y 'html' (el artículo limpio final).
            
            ARTÍCULO HTML TO CLEAN:
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
        }, AI_CONFIG.gemini.models.flash3_1_lite || 'gemini-3.1-flash-lite-preview', undefined, undefined, false, `Limpieza Final Gemini 3.1 Flash Lite`);
        
        console.log("\n==========================================");
        console.log("=== LIMPIEZA INTELIGENTE (ANTES) ===");
        console.log("==========================================");
        console.log(html);
        console.log("\n==========================================");
        console.log("=== LIMPIEZA INTELIGENTE (DESPUÉS) ===");
        console.log("==========================================");
        console.log(processed);
        console.log("==========================================\n");

        return processed;
    } catch (e: any) {
        safeStatus(`Error en limpieza final: ${e.message}. Devolviendo original por seguridad.`);
        return html;
    }
};;

export const executeTranslationAction = async (prompt: string, targetLanguageName: string): Promise<string> => {
    return executeTranslation(prompt, targetLanguageName);
};

export const runContentCleaning = async (html: string, onStatus?: (msg: string) => void): Promise<string> => {
    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[Content-Cleaning] ${msg}`);
    };

    safeStatus('Iniciando limpieza inteligente del contenido (eliminando ruido IA)...');

    try {
        const cleanContent = await executeWithKeyRotation(async (ai, currentModel) => {
            const modelObj = ai.getGenerativeModel({
                model: currentModel || 'gemini-3.1-flash-lite-preview',
                systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nEres un editor de HTML. Tu única tarea es eliminar toda la basura y texto generado por IA que no pertenezca al contenido principal del artículo. Mantén intacta toda la estructura HTML válida (h2, p, ul, etc.). Devuelve únicamente un objeto JSON con 'razonamiento_interno' y 'html'.`,
                generationConfig: {
                    temperature: 0.1,
                }
            });

            const prompt = `Elimina toda la basura que no pertenezca al contenido principal de este artículo HTML.\n\nARTÍCULO HTML:\n${html}`;

            const response = await modelObj.generateContent(prompt);
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
        }, AI_CONFIG.gemini.models.flash3_1_lite || 'gemini-3.1-flash-lite-preview', undefined, undefined, undefined, true, 'Limpieza Contenido');

        console.log("\n==========================================");
        console.log("=== LIMPIEZA CONTENIDO (ANTES) ===");
        console.log("==========================================");
        console.log(html);
        console.log("\n==========================================");
        console.log("=== LIMPIEZA CONTENIDO (DESPUÉS) ===");
        console.log("==========================================");
        console.log(cleanContent);
        console.log("==========================================\n");

        safeStatus('✅ Limpieza completada.');
        return cleanContent;
    } catch (e: any) {
        safeStatus(`⚠️ Error en limpieza: ${e.message}. Devolviendo original.`);
        return html;
    }
};
