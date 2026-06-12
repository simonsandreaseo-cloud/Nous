'use server';


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

const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
    const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table)/gi);
    const chunks = [];
    for (let i = 0; i < elements.length; i += chunkSize) {
        chunks.push(elements.slice(i, i + chunkSize).join(''));
    }
    return chunks;
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
    label: string = 'Operación AI'
): Promise<T> {
    return libExecuteWithKeyRotation(async (client, m) => {
        return operation(client, m);
    }, modelName, explicitHierarchy, keys, onRotation, isStrictModel, label);
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

    try {
        return await executeWithKeyRotation(
            operation,
            modelName,
            undefined,
            undefined,
            undefined,
            true,
            label
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
            label
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
        const modelObj = ai.getGenerativeModel({
            model: currentModel,
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\nRole: Redactor HTML experto. Escribe el artículo en formato HTML directo. Eliges siempre etiquetas semánticas HTML (<strong>, <a>, <h2>, <h3>). NO USES JSON, devuelve únicamente el código HTML resultante.`,
            generationConfig: {
                temperature: 0.7,
            }
        });
        
        const finalPrompt = `INSTRUCCIONES DE REDACCIÓN:\n${prompt}\n\nIMPORTANTE: Escribe el artículo de cero siguiendo la estructura dada. NO repitas instrucciones, NO uses prefacios. Devuelve SOLAMENTE el texto en HTML final.`;
        
        const response = await modelObj.generateContentStream(finalPrompt);
        let fullHtml = '';
        for await (const chunk of response.stream) {
            const chunkText = chunk.text();
            fullHtml += chunkText;
            if (onChunk) onChunk(chunkText);
        }
        
        return fullHtml;
    }, model || 'default', hierarchy, undefined, undefined, false, 'Redacción Artículo Stream');
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
    const serperKey = serperKeyOverride || process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
    
    const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches_v3', { 
        p_project_id: projectId,
        p_base_regex: keyword,
        p_ask_regex: '',
        p_limit: 50
    });
    
    const productContext = (units as any[] || []).filter((u: any) => u.category === 'product').slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n');
    const collectionContext = (units as any[] || []).filter((u: any) => u.category === 'collection').slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

    let serpContext = "No External data available. Rely on internal knowledge.";

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
        let json = JSON.parse(result.text() || "{}");
        
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

    const isChunkedMode = config.mode === 'unified' || config.mode === 'duplicate_detection';
    safeStatus(`Iniciando pipeline de humanización (${isChunkedMode ? 'Modo Chunks' : 'Documento completo'}) con modelo ${modelName}...`);
    const start = Date.now();
    
    // Función auxiliar para humanizar un bloque (chunk o documento completo)
    const processContentBlock = async (contentToProcess: string, index: number, total: number) => {
        if (isTrivialChunk(contentToProcess)) {
            if (onChunk) onChunk(contentToProcess);
            return contentToProcess;
        }

        const blockLabel = isChunkedMode ? `Chunk ${index}/${total}` : 'Documento Completo';
        safeStatus(`Humanizando ${blockLabel}...`);

        try {
            const processed = await executeHumanizerWithRetry(async (ai) => {
                const model = ai.getGenerativeModel({ 
                    model: modelName, 
                    systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1. ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2. COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3. CONECTORES PROHIBIDOS: Prohíbe conectores formales y clichés de IA: "Sin embargo", "Por lo tanto", "Por otro lado", "En resumen", "En conclusión", etc.\n4. MORFOSINTAXIS: Usa oraciones predominantemente cortas. CRÍTICO: Mezcla frases cortas con algunas oraciones largas de baja frecuencia.\n5. PROHIBICIÓN DE VOZ PASIVA: Reescribe frases en voz pasiva a voz activa.\n6. PUNTUACIÓN: Prefiere comas (,) para enlazar ideas cortas en lugar de separarlas con punto y seguido constantemente.\n7. LONGITUD DEL TEXTO: NUNCA reduzcas la cantidad de palabras. Por el contrario, extiende ligeramente las oraciones agregando detalles conversacionales o redundancias naturales típicas de un humano que intenta explicar algo.\n\nREGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas HTML (como <h1>, <h2>, <p>, <table>, <tr>, <td>, <strong>, <a>). Reescribe ÚNICAMENTE el texto que está DENTRO de estas etiquetas.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
                    generationConfig: {}
                });
                
                const prompt = `${FEW_SHOT_HUMANIZER_EXAMPLE}\n\nAplica TODAS las reglas de humanización del REDACTOR MEDIOCRE al siguiente ARTÍCULO HTML: ${contentToProcess}\n\nIMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis y justificación de los defectos agregados) y 'html' (el contenido humanizado en crudo).`;
                const response = await model.generateContent(prompt);
                
                let raw = response.response.text();
                const jsonStart = raw.indexOf('{');
                const jsonEnd = raw.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    raw = raw.substring(jsonStart, jsonEnd + 1);
                }
                
                let htmlOutput = "";
                try {
                    const parsed = JSON.parse(raw);
                    htmlOutput = parsed.html || contentToProcess; 
                } catch (err) {
                    console.error("[Humanizer] Failed to parse JSON:", raw);
                    htmlOutput = contentToProcess; 
                }
                
                return cleanAndFormatHtml(htmlOutput);
            }, safeStatus, `Humanización ${blockLabel}`, modelName);
            
            if (onChunk) onChunk(processed);
            return processed;
        } catch (e: any) {
            safeStatus(`Error en ${blockLabel}: ${e.message}. Aplicando fallback de rescate...`);
            try {
                const processedFallback = await executeHumanizerWithRetry(async (ai) => {
                    const model = ai.getGenerativeModel({ 
                        model: 'gemma-4-31b-it', // Fallback model (or main if passed)
                        systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1. ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2. COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3. CONECTORES PROHIBIDOS: Prohíbe conectores formales y clichés de IA: "Sin embargo", "Por lo tanto", "Por otro lado", "En resumen", "En conclusión", etc.\n4. MORFOSINTAXIS: Usa oraciones predominantemente cortas. CRÍTICO: Mezcla frases cortas con algunas oraciones largas de baja frecuencia.\n5. PROHIBICIÓN DE VOZ PASIVA: Reescribe frases en voz pasiva a voz activa.\n6. PUNTUACIÓN: Prefiere comas (,) para enlazar ideas cortas en lugar de separarlas con punto y seguido constantemente.\n7. LONGITUD DEL TEXTO: NUNCA reduzcas la cantidad de palabras. Por el contrario, extiende ligeramente las oraciones agregando detalles conversacionales o redundancias naturales típicas de un humano que intenta explicar algo.\n\nREGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas HTML (como <h1>, <h2>, <p>, <table>, <tr>, <td>, <strong>, <a>). Reescribe ÚNICAMENTE el texto que está DENTRO de estas etiquetas.\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
                        generationConfig: {}
                    });
                    
                    const languageInstruction = config.language ? `\n\nIdioma OBLIGATORIO de salida: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español de España (Neutro, profesional)' : config.language}. Asegúrate de respetar este idioma estrictamente en el contenido generado.` : '';
                    
                    const prompt = `${FEW_SHOT_HUMANIZER_EXAMPLE}${languageInstruction}\n\nAplica TODAS las reglas de humanización del REDACTOR MEDIOCRE al siguiente ARTÍCULO HTML: ${contentToProcess}\n\nIMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis y justificación de los defectos agregados) y 'html' (el contenido humanizado en crudo).`;
                    const response = await model.generateContent(prompt);
                    
                    let raw = response.response.text();
                    const jsonStart = raw.indexOf('{');
                    const jsonEnd = raw.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        raw = raw.substring(jsonStart, jsonEnd + 1);
                    }
                    
                    let htmlOutput = "";
                    try {
                        const parsed = JSON.parse(raw);
                        htmlOutput = parsed.html || contentToProcess; 
                    } catch (err) {
                        htmlOutput = contentToProcess; 
                    }
                    
                    return cleanAndFormatHtml(htmlOutput);
                }, safeStatus, `Humanización Fallback ${blockLabel}`, 'gemma-4-31b-it');
                
                if (onChunk) onChunk(processedFallback);
                return processedFallback;
            } catch (fallbackError) {
                safeStatus(`Fallback falló en ${blockLabel}. Conservando original...`);
                if (onChunk) onChunk(contentToProcess);
                return contentToProcess;
            }
        }
    };

    let finalHtml = "";

    if (isChunkedMode) {
        // Modo Chunks (Unified o Duplicate Detection)
        const chunks = chunkHtml(html, 15); // 15 elementos HTML por chunk
        safeStatus(`Documento dividido en ${chunks.length} chunks para procesamiento dinámico.`);
        
        let processedChunksCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const processedChunk = await processContentBlock(chunks[i], i + 1, chunks.length);
            finalHtml += processedChunk + "\n";
            processedChunksCount++;
        }
        
        safeStatus(`✅ Humanización completada: Han llegado de vuelta ${processedChunksCount} de ${chunks.length} chunks correctamente.`);
        
        if (config.mode === 'duplicate_detection') {
            safeStatus(`Ejecutando detección de duplicados global (fase final)...`);
            // Fase de cohesión y verificación de duplicados global, lista para implementación futura o inmediata.
        }
    } else {
        // Modo Petición Única (no_chunks)
        finalHtml = await processContentBlock(html, 1, 1);
    }

    const duration = (Date.now() - start) / 1000;
    console.log(`[Humanizer-Perf] Completado en ${duration}s`);
    
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
};

export const executeTranslationAction = async (prompt: string, targetLanguageName: string): Promise<string> => {
    return executeTranslation(prompt, targetLanguageName);
};
