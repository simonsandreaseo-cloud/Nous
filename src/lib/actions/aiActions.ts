'use server';

import { 
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
import { executeWithKeyRotation as libExecuteWithKeyRotation } from "@/lib/services/writer/ai-core";
import { ResearchOrchestrator } from "@/lib/services/writer/research";
import { AI_CONFIG } from "@/lib/ai/config";
import { Type } from "@google/genai";
import { supabase } from "@/lib/supabase";

// --- UTILS & CONSTANTS ---
const ANTI_LEAKAGE_SYSTEM_BASE = `Eres un Transformador Determinista. Tu única función es procesar la entrada y devolver la salida en el formato exacto solicitado.
Sáltate todo razonamiento interno, análisis de constraints, prefacios, comentarios o pasos de verificación. 
Tu respuesta DEBE comenzar directamente con el primer carácter del resultado final y terminar inmediatamente después del último carácter del resultado. 
Cualquier texto fuera del formato solicitado es un error crítico. NO uses markdown.`;

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
<<<EJEMPLO_HUMANIZACION>>>
TEXTO ORIGINAL:
<p>Por consiguiente, el uso de calzado deportivo adecuado resulta de vital importancia para prevenir lesiones podológicas. Adicionalmente, se recomienda realizar estiramientos musculares de forma previa al inicio del entrenamiento físico.</p>

TEXTO HUMANIZADO:
<p>Usar unas zapatillas correctas es clave si no querés terminar con dolor de pies o alguna lesión que te pare. Así que ponete las pilas con eso y, además, no te olvides de estirar un poco antes de empezar a correr, que te va a salvar la vida.</p>
<<<EJEMPLO_HUMANIZACION>>>
`;

const stripReasoningLines = (text: string): string => {
    let cleanText = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    return cleanText
        .split('\n')
        .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return true;
            if (/^\*\s+\S/.test(trimmed) && !trimmed.startsWith('*<')) return false;
            if (/^\d+\.\s+(analysis|input|output|task|constraint|note|revision|preservation|seo|para\s)/i.test(trimmed)) return false;
            if (/^(note|here'?s|aquí|el siguiente|the following|as requested|como solicitado|result|resultado|salida|output)[:]/i.test(trimmed)) return false;
            if (/^(seo|task|input|output|constraints?|revision|preservation|no\s+links|no\s+lsi|no\s+keywords|no\s+markdown)\s*:/i.test(trimmed)) return false;
            return true;
        })
        .join('\n')
        .trim();
};

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

export const executeWithKeyRotation = async <T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    modelName: string = 'default',
    explicitHierarchy?: string[],
    keys?: string[] | string,
    onRotation?: any,
    isStrictModel: boolean = false,
    label: string = 'Operación AI'
): Promise<T> => {
    return libExecuteWithKeyRotation(async (client, m) => {
        return operation(client, m);
    }, modelName, explicitHierarchy, keys, onRotation, isStrictModel, label);
};

export const executeHumanizerWithRetry = async <T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    onStatus: (msg: string) => void,
    label: string = 'Redacción Humanización'
): Promise<T> => {
    let attempt = 1;
    while (true) {
        try {
            return await executeWithKeyRotation(
                operation,
                'gemma-4-31b-it',
                undefined,
                undefined,
                undefined,
                true,
                label
            );
        } catch (e: any) {
            console.error(\`[Humanizer-Retry] Error en ejecución de humanizador:\`, e);
            onStatus(\`⚠️ Todas las API Keys han fallado o agotado su cuota. Esperando 2 minutos antes de reintentar...\`);
            await new Promise(resolve => setTimeout(resolve, 120000));
            onStatus(\`Reanudando proceso de humanización (Intento \${++attempt})...\`);
        }
    }
};

// --- CORE ACTIONS ---

export const retrieveContext = async (keyword: string, projectId: string): Promise<{ products: any[], collections: any[], others: any[] }> => {
    if (!projectId) return { products: [], collections: [], others: [] };
    
    const rawTerms = (keyword || '').split(/\\s+/).filter(w => w && w.length > 3).map(w => w.toLowerCase().replace(/[.*+?^${}()|[\\]\\/g, '\\$&'));
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
    const prompt = \`Give me 5 search terms to find relevant products in a database for the topic "\${keyword}". Return CSV only. Sáltate todo razonamiento interno. Tu respuesta debe comenzar directamente con el CSV y terminar inmediatamente después. Queda estrictamente prohibido incluir prefacios o cualquier texto explicativo.\`;

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

export const generateArticleStream = async (model: string, prompt: string, hierarchy?: string[]) => {
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({
            model: currentModel,
            systemInstruction: \`\${ANTI_LEAKAGE_SYSTEM_BASE}
Eres un redactor HTML experto. Eliges siempre etiquetas HTML (<strong>, <a>, <h2>) y NUNCA usas markdown (**, #, [link]) ni etiquetas de imagen <img>. Generas HTML impecable. Nous procesará los enlaces e imágenes automáticamente.
\${FEW_SHOT_HTML}\`,
            generationConfig: {
                temperature: 0.7,
            }
        });
        const result = await modelObj.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt + "\\n\\nRESULTADO DIRECTO (SIN PREFACIOS):" }] }],
        });
        return result;
    }, model || 'default', hierarchy, undefined, undefined, false, 'Redacción Artículo');
};

export const refineArticleContent = async (
    apiKeys: string[] | string, 
    currentHtml: string, 
    instructions: string, 
    modelName?: string, 
    selectedText?: string
): Promise<string> => {
    const isSelection = !!selectedText && selectedText.trim().length > 0;
    const target = isSelection 
        ? \`TEXT TO REFINE (SPECIFIC SECTION):\\n"\${selectedText}"\` 
        : \`FULL ARTICLE TO REFINE:\\n\${currentHtml}\`;
        
    const context = isSelection 
        ? \`\\nFULL ARTICLE CONTEXT (FOR REFERENCE ONLY):\\n\${currentHtml.substring(0, 3000)}\` 
        : '';
  
    const prompt = \`
    \${ANTI_LEAKAGE_SYSTEM_BASE}
    Role: Content Editor. Refine HTML content strictly following instructions.
    \${FEW_SHOT_HTML}

    USER INSTRUCTIONS:
    "\${instructions}"

    OUTPUT RULES:
    1. \${isSelection ? 'Return ONLY the refined version of the specific text provided. Do NOT return the whole article.' : 'Return valid HTML content for the whole article (inside body).'}
    2. Do NOT strip existing images or links unless instructed.
    3. Apply requested changes while maintaining tone and style.
    4. Return WITHOUT markdown blocks.

    <<<HTML_INPUT>>>
    \${target}
    \${context}
    <<<HTML_INPUT>>>

    SALIDA HTML DIRECTA (sin prefacios ni resúmenes):\`;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ model: currentModel });
        const response = await modelObj.generateContent(prompt);
        let resText = response.response.text() || (isSelection ? selectedText : currentHtml);
        resText = resText.replace(/\\\`\`\`html/g, '').replace(/\\\`\`\`/g, '').trim();
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
    const excludeTerms = \`-site:\${safeProjectName.replace(/\\s+/g, '').toLowerCase()}.com -site:\${safeProjectName.replace(/\\s+/g, '').toLowerCase()}.es -inurl:\${safeProjectName.replace(/\\s+/g, '').toLowerCase()}\`;
  
    const prompt = \`
    Find OFFICIAL brand assets (Press kits, Lookbooks, Campaign pages) for: "\${query}".
    CRITICAL: Exclude any URL from the project "\${projectName}". We need EXTERNAL official sources.
    Query Modifier: \${excludeTerms}
    Return a JSON Array: [{"brand": "Brand Name", "description": "Page Title", "url": "URL", "isImage": false}]
    Only return valid, reachable URLs.
    \`;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ 
            model: currentModel || AI_CONFIG.groq.models.balanced,
            systemInstruction: \`\${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Find official brand assets and return them as a JSON array.
\${FEW_SHOT_JSON}\`
        });
        const response = await modelObj.generateContent(prompt + "\\n\\nRESULTADO JSON DIRECTO:");
        let text = response.response.text() || "[]";
        text = text.replace(/\\\`\`\`json/g, '').replace(/\\\`\`\`/g, '').trim();
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
    const prompt = \`Genera JSON-LD Schema.org para este artículo. Metadata: \${JSON.stringify(metadata)}. Content Sample: \${articleHtml.substring(0, 500)}. Include 'image' placeholder.\`;
  
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({
            model: currentModel || AI_CONFIG.groq.models.balanced,
            systemInstruction: \`\${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Generate JSON-LD Schema.org markup. Return JSON ONLY.
\${FEW_SHOT_JSON}\`,
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = await model.generateContent(prompt + "\\n\\nRESULTADO JSON DIRECTO:");
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
    
    const productContext = (units as any[] || []).filter((u: any) => u.category === 'product').slice(0, 30).map(p => \`- \${p.title} (\${p.url})\`).join('\\n');
    const collectionContext = (units as any[] || []).filter((u: any) => u.category === 'collection').slice(0, 15).map(c => \`- \${c.title} (\${c.url})\`).join('\\n');

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

    const systemPrompt = \`Eres un estratega SEO experto.
        PROYECTO: \${projectName || 'Desconocido'}.
        \${isIdea ? 'LA ENTRADA ES UNA IDEA/CONCEPTO, NO UN TÍTULO FINAL. DEBES GENERAR UN TÍTULO SEO OPTIMIZADO.' : 'KEYWORD/TÍTULO OBJETIVO: "' + keyword + '"'}
        === EXTERNAL INTELLIGENCE ===
        \${serpContext}
        === INTERNAL DATABASE ===
        \${productContext}
        \${collectionContext}
        
        Tu tarea es:
        1. Analizar el nicho y la intención.
        2. Proponer keywords (Short, Mid, Long Tail).
        3. Identificar competidores y PRIORIZAR las preguntas extraídas de REAL SERP DATA (People Also Ask) para la sección de FAQs.
        
        TAREA: Analiza y extrae solo los datos brutos de investigación SEO. No generes estructuras de contenido ni metadatos en este paso.
        Retorna JSON válido.\`;
  
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({
            model: modelName || 'gemini-2.5-flash',
            systemInstruction: \`\${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Analyze SEO data and return it as a structured JSON object.
\${FEW_SHOT_JSON}\`,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any
            }
        });
  
        const response = await model.generateContent(systemPrompt + "\\n\\nRESULTADO JSON DIRECTO:");
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
    const prompt = \`
    Act as a Master SEO Content Strategist.
    Project: \${config.projectName}. Niche: \${config.niche}.
    Topic/Keyword: "\${keyword}".
    
    ### ESTRATEGIA DE ENLAZADO INTERNO (15 Enlaces Sugeridos):
    Estos son los enlaces que HEMOS INVESTIGADO y que deben ser el eje del artículo:
    \${config.approvedLinks?.map(l => \`- [\${l.title}](\${l.url})\${l.category ? \` (Categoría: \${l.category})\` : ''}\`).join('\\n') || 'N/A'}
    
    INSTRUCCIÓN DE DISEÑO:
    Crea un Outline (Estructura de Encabezados) que esté optimizado para que estos enlaces encajen de forma orgánica y lógica. 
    Distribuye los 15 enlaces a lo largo de los H2 y H3.
    
    Requirements:
    1. Meta Title: Click-worthy, includes keyword, < 60 chars.
    2. H1: Powerful, clear, includes keyword.
    3. Slug: Short, URL-friendly.
    4. Meta Description: Compelling, < 160 chars.
    5. Outline: Array of headers (H2, H3).
    \`;
  
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
            model: 'gemini-2.5-flash',
            systemInstruction: \`\${ANTI_LEAKAGE_SYSTEM_BASE}
Task: Generate an SEO Content Strategy and Outline as JSON.
\${FEW_SHOT_JSON}\`,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any
            }
        });
  
        const response = await modelObj.generateContent(prompt + "\\n\\nRESULTADO JSON DIRECTO:");
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
    onStatus: (msg: string) => void,
    modelName: string = 'gemma-4-31b-it'
): Promise<{ html: string; metadata?: any }> => {
    const mode = config.mode || 'unified';
    onStatus(\`Iniciando pipeline de humanización en modo "\${mode}"...\`);

    if (mode === 'no_chunks') {
        const linksTextList = (config.links || []).map(l => \`- Tema/Producto: "\${l.title || l.anchor_text}" | URL: \${l.url}\`).join('\\n        ');
        const prompt = \`
            \${ANTI_LEAKAGE_SYSTEM_BASE}
            \${HTML_RULE_INTERNAL}
            --- PERSONA: REDACTOR HUMANO AUTÉNTICO ---
            Escribe de forma natural. IMPORTANTE: El texto humanizado DEBE tener la misma longitud que el original o similar. PROHIBIDO RESUMIR O ELIMINAR SECCIONES.
            Si necesitas razonar o planificar, hazlo dentro de etiquetas <thinking> ... </thinking> antes del HTML.

            --- CONTEXTO ---
            Nicho/Tópico: \${config.niche}
            Público Objetivo: \${config.audience}
            Notas Adicionales: \${config.notes || 'N/A'}

            --- REGLAS DE HUMANIZACIÓN ---
            1. ESTLO "REDACTOR COTIDIANO": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria excesiva.
            2. COHERENCIA NATURAL: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo para que se sienta humano.
            3. CONECTORES ORGÁNICOS: Evita conectores robóticos como "En consecuencia", "Por añadidura". Usa "Entonces", "Así que", "Además".
            4. MORFOSINTAXIS: Mezcla oraciones cortas con algunas oraciones largas. La longitud de las frases debe ser variable. Prefiere la voz activa.
            5. PUNTUACIÓN HUMANA: No abuses del punto y seguido. Usa comas para dar fluidez cuando las ideas estén conectadas.

            \${FEW_SHOT_HUMANIZER_EXAMPLE}

            --- TAREA (HUMANIZACIÓN Y OPTIMIZACIÓN SEO) ---
            1. Humaniza el texto DENTRO de las etiquetas HTML de todo el contenido.
            2. Mantén intacta la estructura de etiquetas (h2, h3, p, ul, li, etc.).
            3. Inserta los enlaces y keywords LSI disponibles de forma natural si el contexto lo permite.

            * ENLACES DISPONIBLES: 
            \${linksTextList || 'Ninguno'}
            * ANCHOR TEXT SEMÁNTICO: Construye frases naturales alrededor del Tema/Producto. Usa <a href="url">texto semántico</a>. NUNCA repitas enlaces.
            * LSI: Keywords a integrar si es posible: [\${config.lsiKeywords?.join(', ') || 'Ninguna'}]
        \`.trim();
        
        const finalizedHtml = await executeHumanizerWithRetry(async (ai) => {
            const model = ai.getGenerativeModel({ model: 'gemma-4-31b-it' });
            const userPrompt = \`
            \${prompt}
            ### EJECUCIÓN (MODO COMPLETO):
            Procesa el siguiente contenido HTML completo siguiendo estrictamente las instrucciones.
            <<<HTML_INPUT>>>
            \${html}
            <<<HTML_INPUT>>>
            SALIDA HTML DIRECTA (iniciando exactamente con la primera etiqueta, sin prefacios ni resúmenes):\`;
            const res = await model.generateContent(userPrompt);
            let raw = res.response.text().replace(/\\\`\`\`html/g, '').replace(/\\\`\`\`/g, '').trim();
            raw = stripReasoningLines(raw);
            return cleanAndFormatHtml(raw);
        }, onStatus, 'Redacción Humanización Completa');

        return { html: finalizedHtml };
    } else {
        const chunks = chunkHtml(html, 5);
        const finalizedChunks = await Promise.all(chunks.map(async (chunk) => {
            if (isTrivialChunk(chunk)) return chunk;
            return executeHumanizerWithRetry(async (ai) => {
                const model = ai.getGenerativeModel({ model: 'gemma-4-31b-it' });
                const response = await model.generateContent(\`Humaniza este fragmento HTML: \${chunk}\`);
                return cleanAndFormatHtml(response.response.text());
            }, onStatus, 'Redacción Humanización Unificada');
        }));
        return { html: finalizedChunks.join('\\n') };
    }
};

const HTML_RULE_INTERNAL = "ERES UN REDACTOR HUMANO. REGLA CRÍTICA: NO RESUMAS. NO OMITAS NADA. El bloque de salida debe tener el mismo número de elementos que la entrada.";

export const runSmartEditor = async (
    html: string,
    percentage: number,
    notes: string,
    onStatus: (msg: string) => void,
    isStrictMode?: boolean,
    strictFrequency?: number,
    lsiKeywords?: string[],
    questions?: string[]
): Promise<string> => {
    let strictInstructions = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        strictInstructions = \`
        MODO ESTRICTO ACTIVO (\${freq}%):
        - Asegura densidad de keywords LSI: [\${lsiKeywords?.join(', ')}]
        - Incluye respuestas a FAQs: [\${questions?.join(', '}]
        - Si la intensidad es > 80, prioriza la densidad sobre la fluidez.
        \`;
    }
    const prompt = \`
    Eres un Editor Senior. Tu tarea es mejorar este artículo HTML.
    Intensidad de edición: \${percentage}%
    Instrucciones específicas: \${notes}
    \${strictInstructions}
    
    REGLA DE ORO: Mantén intacta la estructura HTML (enlaces, imágenes, listas).
    Si necesitas razonar o planificar, hazlo dentro de etiquetas <thinking> ... </thinking> antes del HTML.
    Sáltate todo razonamiento interno. Tu respuesta debe comenzar directamente con el código HTML y terminar inmediatamente después. Queda estrictamente prohibido incluir prefacios, análisis de constraints, comentarios sobre la tarea o cualquier texto que no sea la respuesta final. NO uses markdown.
    HTML:
    \${html}
    \`;
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel });
        const response = await model.generateContent(prompt);
        let raw = response.response.text().replace(/\\\`\`\`html/g, '').replace(/\\\`\`\`/g, '').trim();
        raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
        const firstTag = raw.indexOf('<');
        const lastTag = raw.lastIndexOf('>');
        if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
            raw = raw.substring(firstTag, lastTag + 1);
        }
        return raw;
    }, 'default', undefined, undefined, false, 'Edición Inteligente');
};

export const runSEOPostProcessor = async (
    html: string,
    config: ArticleConfig,
    onStatus: (msg: string) => void
): Promise<string> => {
    const approvedLinks = config.approvedLinks || [];
    const linkList = approvedLinks.map(l => \`- URL: \${l.url} | Anchor ideal: \${l.title}\`).join('\\n');
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({
            model: currentModel,
            generationConfig: { temperature: 0.15 } 
        });
        const prompt = \`
        TASK: As a Senior SEO Editor, perform a final polish on this FULL article.
        
        CRITICAL RULES PARA NEGRILLAS (<strong>):
        1. Las negritas deben resaltar frases clave de entre 4 y 8 palabras.
        2. Máximo 1 bloque de negritas por párrafo de 40-60 palabras.
        3. Nunca pongas negritas en la primera ni última palabra de un párrafo.
        4. NO pongas negritas en encabezados (H2, H3), blockquotes ni listas.
        5. Prioriza resaltar conceptos con las palabras clave objetivo.
        
        CRITICAL RULES PARA SEO & LSI:
        1. Asegura que la palabra clave principal ("\${config.topic}") aparezca de forma natural en el primer y último párrafo si no está ya.
        2. Inserta o refuerza las siguientes palabras clave LSI y semánticas si es posible sin forzar: [\${config.lsiKeywords?.join(', ') || 'N/A'}]
        3. Mantén la densidad alta pero legible.
        
        INTEGRIDAD ESTRUCTURAL Y ENLACES (VITAL):
        1. MANTÉN INTACTOS TODOS LOS ENLACES <a> PRESENTES. No cambies sus URLs ni los elimines.
        2. PROHIBIDO: NO inventes nuevos enlaces. NO uses enlaces que empiecen por "#".
        3. Si ves un enlace que NO estaba en la versión original o que usa "#", ELIMÍNALO y deja solo el texto plano. 
        4. ESTOS SON LOS ÚNICOS ENLACES VÁLIDOS (Solo para referencia, no añadas nuevos si no están fuera del HTML ya):
           \${linkList}
        5. Mantén todas las imágenes e IDs de elementos.
        6. Sáltate todo razonamiento interno. Si necesitas razonar o planificar, usa <thinking> ... </thinking>.
        7. Tu respuesta debe comenzar directamente con el código HTML y terminar inmediatamente después. Queda estrictamente prohibido incluir prefacios o markdown (\`\`\`).
        
        FULL ARTICLE HTML TO POLISH:
        \${html}
        \`;
        const response = await model.generateContent(prompt);
        let raw = response.response.text();
        const textOnly = raw.replace(/\\\`\`\`html/g, '').replace(/\\\`\`\`/g, '').trim();
        let cleanText = textOnly.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
        const firstTag = cleanText.indexOf('<');
        if (firstTag === -1) return cleanText;
        const lastTag = cleanText.lastIndexOf('>');
        if (lastTag !== -1 && lastTag > firstTag) {
            cleanText = cleanText.substring(firstTag, lastTag + 1);
        }
        return cleanText;
    }, 'default', undefined, undefined, false, 'SEO Post-Procesado');
};
