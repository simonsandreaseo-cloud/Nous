import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
export interface ContentItem {
    url: string;
    title: string;
    type: 'product' | 'collection' | 'blog' | 'static' | 'other';
    search_index: string;
    score?: number;
}

export interface ArticleConfig {
    projectName: string;
    niche: string;
    topic: string; // This is the H1
    metaTitle: string; // This is the SEO Title
    keywords: string;
    tone: string;
    wordCount: string;
    refUrls: string;
    refContent: string;
    csvData: any[]; // Full dataset
    outlineStructure?: any[]; // Passed from Strategy phase
    approvedLinks?: ContentItem[]; // New: List of approved links
    questions?: string[]; // New: Value SERP FAQs
    lsiKeywords?: string[]; // New: LSI and Autocomplete terms
    creativityLevel?: 'low' | 'medium' | 'high'; // New: Creativity level
    contextInstructions?: string; // New: Global Context Instructions
    isStrictMode?: boolean;
    strictFrequency?: number;
}

export interface VisualResource {
    brand: string;
    description: string;
    url: string;
    isImage: boolean;
}

export interface ImageGenConfig {
    style: string;
    colors: string[];
    customDimensions: { w: string, h: string }; // For featured only
    count: string; // 'auto' or '3', '5', etc.
    userPrompt: string;
}

export interface AIImageRequest {
    id: string;
    type: 'featured' | 'body';
    context: string; // Why this image exists
    prompt: string;
    alt: string;
    title: string;
    filename: string;
    placement: string; // e.g. "After H2 Intro"
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    userNotes?: string;
    aspectRatio?: string; // Only for featured
}

export interface SEOAnalysisResult {
    nicheDetected: string;
    keywordIdeas: {
        shortTail: string[];
        midTail: string[];
    };
    autocompleteLongTail: string[];
    frequentQuestions: string[];
    top10Urls: { title: string; url: string; }[];
    lsiKeywords: { keyword: string; count: string; }[];
    recommendedWords: string[];
    snippet: {
        metaTitle: string;
        h1: string; // Added H1 separate from Title
        metaDescription: string;
        slug: string;
    };
    recommendedWordCount: string;
    recommendedSchemas: string[];
    outline: {
        recommendedFocus: string;
        urlType: string;
        introNote: string;
        headers: { type: string; text: string; wordCount: string; notes?: string; }[];
    };
    suggestedInternalLinks?: ContentItem[];
}

export interface HumanizerConfig {
    niche: string;
    audience: string;
    keywords: string;
    notes?: string;
    lsiKeywords?: string[];
    links?: ContentItem[];
    isStrictMode?: boolean;
    strictFrequency?: number;
    questions?: string[];
}

// --- CENTRALIZED API CLIENT & ROTATION LOGIC ---

// Helper to check if a key is roughly valid
const isValidKey = (k: string) => k && k.trim().length > 10;

// Executor that handles rotation across multiple keys
const executeWithKeyRotation = async <T>(
    keys: string[] | string, 
    operation: (client: GoogleGenAI) => Promise<T>
): Promise<T> => {
    // Normalize to array
    const keyList = Array.isArray(keys) ? keys : [keys];
    const validKeys = keyList.filter(isValidKey);
    
    if (validKeys.length === 0) {
        // Fallback to env if available, otherwise throw
        if (process.env.API_KEY && isValidKey(process.env.API_KEY)) {
            validKeys.push(process.env.API_KEY);
        } else {
            throw new Error("API Keys faltantes o inválidas.");
        }
    }

    let lastError: any = null;

    for (let i = 0; i < validKeys.length; i++) {
        const currentKey = validKeys[i];
        try {
            const client = new GoogleGenAI({ apiKey: currentKey });
            // Attempt operation
            return await operation(client);
        } catch (e: any) {
            lastError = e;
            // Check for Quota (429) or Service Unavailable (503) or generic 500
            const isQuotaError = e.status === 429 || e.code === 429 || (e.message && e.message.includes('quota'));
            const isServerIssue = e.status === 503 || e.status === 500;
            
            if (isQuotaError || isServerIssue) {
                console.warn(`⚠️ Key ending in ...${currentKey.slice(-4)} failed (${e.status || 'Quota'}). Rotating to next key...`);
                // If this was the last key, we can't rotate.
                if (i === validKeys.length - 1) {
                    throw new Error("Todas las API Keys han agotado su cuota o fallado. Por favor añade nuevas keys.");
                }
                // Otherwise continue loop to next key
                continue;
            }
            
            // If it's a 400 (Bad Request) or 403 (Permission), it might be the key itself being invalid
            // We should also rotate if it's a key issue
             if (e.status === 400 || e.status === 403) {
                 console.warn(`⚠️ Key ending in ...${currentKey.slice(-4)} is invalid. Rotating...`);
                 if (i === validKeys.length - 1) throw e;
                 continue;
             }

            // For other errors (logic errors), throw immediately
            throw e;
        }
    }
    throw lastError;
};

// --- Data Parsing Helpers ---

const categorizeUrl = (url: string): string => {
    if (!url) return 'other';
    const l = url.toLowerCase();
    if (l.includes('/products/') || l.includes('/producto/') || l.includes('/p/') || l.includes('/item/')) return 'product';
    if (l.includes('/collections/') || l.includes('/coleccion/') || l.includes('/category/') || l.includes('/c/')) return 'collection';
    if (l.includes('/blogs/') || l.includes('/blog/') || l.includes('/news/') || l.includes('/noticias/') || l.includes('/journal/')) return 'blog';
    if (l.includes('/pages/') || l.includes('nosotros') || l.includes('contacto') || l.includes('about')) return 'static';
    return 'other';
};

const extractTitleFromUrl = (url: string): string => {
    try {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const lastSegment = cleanUrl.split('/').pop() || "";
        let title = lastSegment.split('?')[0].replace(/\.html$/, '').replace(/\.php$/, '');
        title = title.replace(/-/g, ' ').replace(/_/g, ' ');
        return title.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
        return "Enlace";
    }
};

export const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    const parseLine = (line: string) => {
        const result = [];
        let startValueIndex = 0;
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === delimiter && !inQuotes) {
                let val = line.substring(startValueIndex, i).trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1).replace(/""/g, '"');
                }
                result.push(val);
                startValueIndex = i + 1;
            }
        }
        let lastVal = line.substring(startValueIndex).trim();
        if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
            lastVal = lastVal.slice(1, -1).replace(/""/g, '"');
        }
        result.push(lastVal);
        return result;
    };

    const data: ContentItem[] = [];
    const seenUrls = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        row.forEach(cell => {
            if (!cell || cell.length < 4) return; // Relaxed length check
            const cellContent = cell.trim();
            const isUrl = cellContent.includes('/') && (
                cellContent.startsWith('http') || 
                cellContent.startsWith('www') || 
                cellContent.startsWith('/')
            );

            if (isUrl) {
                let cleanUrl = cellContent;
                if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('/')) {
                    cleanUrl = 'https://' + cleanUrl;
                }
                if (!seenUrls.has(cleanUrl)) {
                    seenUrls.add(cleanUrl);
                    const title = extractTitleFromUrl(cleanUrl);
                    let type = categorizeUrl(cleanUrl) as any;
                    if (type === 'other' && cleanUrl.split('/').length > 4) type = 'product';
                    data.push({
                        url: cleanUrl,
                        title,
                        type,
                        search_index: `${title} ${type} ${cleanUrl}`.toLowerCase()
                    });
                }
            }
        });
    }

    if (data.length === 0) {
        throw new Error("No se detectaron URLs válidas en el archivo.");
    }
    return { headers: [], data };
};

export const parseJSON = (text: string) => {
    try {
        const data = JSON.parse(text);
        const safeData = data.map((item: any) => ({
            url: item.url || '',
            title: item.title || 'Item',
            type: item.type || categorizeUrl(item.url),
            search_index: (item.search_index || item.title || '').toLowerCase()
        }));
        return { data: safeData };
    } catch (e) {
        console.error("Invalid JSON", e);
        return { data: [] };
    }
};

// --- Semantic Retrieval & Linking ---

const retrieveContext = (allData: ContentItem[], topic: string, keywords: string) => {
    if (!allData || allData.length === 0) return { products: [], collections: [], others: [] };

    const cleanText = (topic + " " + keywords).toLowerCase();
    const terms = cleanText
        .replace(/[^\p{L}\p{N}\s]/gu, '') 
        .split(/\s+/)
        .filter(w => w.length > 3);
    
    const scoreItem = (item: ContentItem) => {
        let score = 0;
        const idx = item.search_index || "";
        
        if (idx.includes(topic.toLowerCase())) score += 100;
        
        terms.forEach(term => {
            if (idx.includes(term)) score += 20;
        });

        if (item.url.length > 150) score -= 5;
        
        if (item.type === 'collection') score += 5;
        if (item.type === 'product') score += 2;

        return score;
    };

    const scored = allData.map(item => ({ item, score: scoreItem(item) }));
    scored.sort((a, b) => b.score - a.score);
    
    const relevant = scored.filter(s => s.score > 10); 
    const resultPool = relevant.length < 5 ? scored.slice(0, 50) : relevant; 

    return {
        products: resultPool.filter(x => x.item.type === 'product').slice(0, 50).map(x => x.item),
        collections: resultPool.filter(x => x.item.type === 'collection').slice(0, 20).map(x => x.item),
        others: resultPool.filter(x => x.item.type !== 'product' && x.item.type !== 'collection').slice(0, 20).map(x => x.item)
    };
};

export const searchMoreLinks = async (apiKeys: string[] | string, keyword: string, csvData: ContentItem[]): Promise<ContentItem[]> => {
    // Use AI to find related terms to search in the CSV
    const prompt = `Give me 5 search terms to find relevant products in a database for the topic "${keyword}". Return CSV.`;
    
    return executeWithKeyRotation(apiKeys, async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            const terms = (response.text || '').split(',').map(t => t.trim());
            const extraString = terms.join(' ');
            
            const context = retrieveContext(csvData, keyword, extraString);
            const mix = [...context.collections.slice(0, 10), ...context.products.slice(0, 10)];
            return mix;
        } catch (e) {
            // Fallback logic doesn't need API
            const context = retrieveContext(csvData, keyword, "oferta catalogo");
            return [...context.collections.slice(0, 5), ...context.products.slice(0, 5)];
        }
    });
}

// --- Post-Generation Auto Interlinking (Optimized) ---

export const autoInterlink = (html: string, csvData: ContentItem[]): string => {
    const candidates = csvData.filter(i => i.type === 'product' || i.type === 'collection');
    candidates.sort((a, b) => b.title.length - a.title.length);

    let linkedHtml = html;
    const alreadyLinked = new Set<string>();
    let linkCount = 0;
    
    const topCandidates = candidates.slice(0, 300);

    for (const item of topCandidates) {
        if (linkCount >= 15) break; 
        if (item.title.length < 4) continue; 
        if (alreadyLinked.has(item.url)) continue;

        const safeTitle = escapeRegExp(item.title);
        const titleRegex = new RegExp(`(?<!<[^>]*)\\b${safeTitle}\\b`, 'i');
        
        if (titleRegex.test(linkedHtml)) {
             if (linkedHtml.includes(item.url)) {
                 alreadyLinked.add(item.url);
                 continue;
             }
             let replaced = false;
             linkedHtml = linkedHtml.replace(titleRegex, (match) => {
                 if(replaced) return match;
                 replaced = true;
                 alreadyLinked.add(item.url);
                 linkCount++;
                 return `<a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Ver ${match}">${match}</a>`;
             });
        }
    }
    return linkedHtml;
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =================================================================
// POST PROCESSING: STRICT FORMATTING & BOLDING (Programmatic)
// =================================================================

export const cleanAndFormatHtml = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. CLEAN MARKDOWN & ARTIFACTS
    let cleanString = doc.body.innerHTML;
    cleanString = cleanString.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    cleanString = cleanString.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    cleanString = cleanString.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    
    doc.body.innerHTML = cleanString;

    // 2. LIST FORMATTING
    const listItems = doc.querySelectorAll('li');
    listItems.forEach(li => {
        if (li.textContent?.includes(':') && !li.querySelector('strong')) {
            const parts = li.innerHTML.split(':');
            if (parts.length > 1) {
                const label = parts[0];
                const rest = parts.slice(1).join(':');
                li.innerHTML = `<strong>${label}</strong>:${rest}`;
            }
        }
    });

    return doc.body.innerHTML;
};

// --- Strict Style Refinement (The "Phase") ---
export const refineStyling = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. REMOVE ALL EXISTING BOLD TAGS WITHIN PARAGRAPHS
    // We want to apply the strict "4-8 words" rule cleanly.
    doc.querySelectorAll('p strong, p b').forEach(el => {
        // Replace with text content, keeping it inline
        const text = document.createTextNode(el.textContent || '');
        el.parentNode?.replaceChild(text, el);
    });

    // 2. APPLY STRICT BOLDING LOGIC
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
        // Skip blockquotes or if it already has links/bold
        if (p.closest('blockquote')) return;
        if (p.querySelector('a')) return;

        const text = p.textContent || "";
        const words = text.split(/\s+/);
        
        // Only valid for paragraphs of decent length
        if (words.length < 25) return; 

        // Rule: Not all paragraphs. 60% chance.
        if (Math.random() > 0.4) {
             // Calculate safe range to avoid start/end
             const safeStartMin = Math.floor(words.length * 0.15);
             const safeStartMax = Math.floor(words.length * 0.70);
             
             if (safeStartMax > safeStartMin) {
                const startIdx = Math.floor(Math.random() * (safeStartMax - safeStartMin)) + safeStartMin;
                // Rule: 4 to 8 words
                const length = Math.floor(Math.random() * 5) + 4; // 4,5,6,7,8
                
                const pre = words.slice(0, startIdx).join(' ');
                const target = words.slice(startIdx, startIdx + length).join(' ');
                const post = words.slice(startIdx + length).join(' ');
                
                // Only if target is not empty
                if (target.trim().length > 0) {
                    p.innerHTML = `${pre} <strong>${target}</strong> ${post}`;
                }
             }
        }
    });

    // 3. STYLE & HIERARCHY CHECKS (Programmatic cleaning)
    // Ensure h1 is h1, others follow suit.
    // (Assuming H1 is handled by main render, check internal headers)
    
    // Ensure no empty headers
    doc.querySelectorAll('h2, h3, h4').forEach(h => {
        if (!h.textContent?.trim()) h.remove();
    });

    return doc.body.innerHTML;
}

// --- Prompt Construction ---

export const buildPrompt = (config: ArticleConfig): string => {
    const { topic, metaTitle, keywords, tone, wordCount, refUrls, refContent, csvData, outlineStructure, approvedLinks, projectName, niche, questions, lsiKeywords, creativityLevel, contextInstructions, isStrictMode, strictFrequency } = config;
    
    let linkingInstructions = "";
    if (approvedLinks && approvedLinks.length > 0) {
        const products = approvedLinks.filter(l => l.type === 'product');
        const collections = approvedLinks.filter(l => l.type === 'collection');
        const others = approvedLinks.filter(l => l.type !== 'product' && l.type !== 'collection');
        const formatList = (items: ContentItem[]) => items.map(i => `- URL: ${i.url} | Anchor ideal: ${i.title}`).join('\n');
        linkingInstructions = `
### ESTRATEGIA DE ENLAZADO INTERNO (STRICT MODE)
**PROHIBIDO INVENTAR URLs.** Solo usa estas URLs aprobadas.
COLECCIONES:
${formatList(collections)}
PRODUCTOS:
${formatList(products)}
`;
    }

    let outlineInstruction = "";
    if (outlineStructure && outlineStructure.length > 0) {
        outlineInstruction = `
### ESTRUCTURA OBLIGATORIA (Sigue este orden)
El H1 del artículo es: "${topic}" (Debe ser el título visible).
Luego sigue este esquema:
${outlineStructure.map(h => `${h.type}: ${h.text} (Objetivo: ${h.wordCount}) [Instrucción: ${h.notes || 'Normal'}]`).join('\n')}
`;
    }

    // Creativity Levels
    let formatRules = "";
    if (creativityLevel === 'low') {
        formatRules = `
        NIVEL DE CREATIVIDAD: BAJO (Conservador).
        - Usa mayormente párrafos de texto plano.
        - Usa Bullet Points solo si es imprescindible.
        - NO uses tablas ni citas. Mantén el diseño limpio y simple.
        `;
    } else if (creativityLevel === 'medium') {
        formatRules = `
        NIVEL DE CREATIVIDAD: MEDIO (Equilibrado).
        - Incluye al menos 1 Tabla Comparativa útil.
        - Usa Bullet Points para listar características.
        - Incluye 1 Cita (<blockquote>) de un experto o de la marca.
        `;
    } else {
        formatRules = `
        NIVEL DE CREATIVIDAD: ALTO (Rich Content).
        - Sorprende visualmente con HTML semántico.
        - Usa Tablas de Pros/Contras.
        - Cajas de resumen (párrafos destacados).
        - Múltiples Citas (<blockquote>).
        - Listas numéricas y desordenadas frecuentes.
        `;
    }

    // Strict Mode Instruction Block
    let strictModeInstruction = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        const faqInstruction = freq > 80 ? "YOU MUST ANSWER ALL FAQs provided." : freq < 30 ? "Answer FAQs only if very relevant." : "Answer most FAQs.";
        
        let keywordInstruction = "";
        if(freq <= 30) {
             keywordInstruction = "Ensure keywords appear naturally (1-2% density). Do not force if it hurts readability.";
        } else if (freq <= 60) {
             keywordInstruction = "Increase keyword density (3-4%). Repeat keywords in headings and first paragraphs.";
        } else {
             keywordInstruction = "MAXIMUM DENSITY. Force keywords into the text repeatedly (Keyword Stuffing). Ignore flow if necessary.";
        }
        
        strictModeInstruction = `
### MODO ESTRICTO DE REDACCIÓN (ACTIVADO)
Frecuencia/Intensidad: ${freq}%

REGLAS OBLIGATORIAS:
1. **KEYWORDS:** Debes incluir OBLIGATORIAMENTE todas las siguientes LSI y Long Tail Keywords dentro del texto:
   [${lsiKeywords?.join(', ') || 'N/A'}]
   ${keywordInstruction}
   
2. **FAQs:** ${faqInstruction}
   Lista de Preguntas: [${questions?.join(', ') || 'N/A'}]
`;
    }

    return `
Rol: Redactor SEO Senior para el proyecto "${projectName}" (Nicho: ${niche}).
Objetivo: Crear un artículo que domine la SERP.

DATOS TÉCNICOS:
- Meta Title (HTML Head): ${metaTitle}
- H1 (Header Principal): ${topic}
- Keywords Short Tail: ${keywords}
- Tono: ${tone}
- Extensión Objetivo: ${wordCount}
- Idioma: Español de España (Neutro, profesional).

${contextInstructions ? `### INSTRUCCIONES DE CONTEXTO GLOBAL (MUY IMPORTANTE):\n${contextInstructions}\n` : ''}

${strictModeInstruction}

### REQUISITOS DE CONTENIDO ESTRICTOS:

1. **RESPUESTA DIRECTA (ZERO CLICK):**
   - Justo debajo del H1, escribe un párrafo de **MÁXIMO 50 PALABRAS** que responda la intención de búsqueda principal.
   - NO escribas introducciones genéricas ("En este artículo...").

2. **FORMATO Y ESTRUCTURA:**
   ${formatRules}

3. **INTEGRACIÓN DE PREGUNTAS (FAQs):**
   - Responde: [${questions?.join(', ') || 'N/A'}]

ESTILO Y FORMATO HTML (CRÍTICO):
1. **RETORNA SOLO EL CONTENIDO DENTRO DEL BODY.** No incluyas <head>, <html>, ni markdown (\`\`\`).
2. **NEGRILLAS:** NO PONGAS NEGRILLAS (<strong>). El sistema las pondrá automáticamente después.
3. **LISTAS/TABLAS:** Usa etiquetas HTML estándar.
4. **ENLACES:** <a href="..." target="_blank">Anchor</a>.

${refUrls ? `Referencias Competencia Reales: ${refUrls}` : ''}
${refContent ? `Notas Estrategia: ${refContent}` : ''}

${outlineInstruction}

${linkingInstructions}

METADATOS JSON (FINAL):
Al terminar el artículo, añade EXACTAMENTE esta cadena separatoria: "<!-- METADATA_START -->"
Seguido inmediatamente de un objeto JSON válido con este formato:
{
  "title": "${metaTitle}",
  "description": "Meta Description Generada",
  "slug": "slug-generado",
  "excerpt": "Breve extracto del artículo para blog (2 frases)"
}
`;
};

// --- API Calls (Resilient) ---

export const generateArticleStream = async (apiKeys: string[] | string, model: string, prompt: string) => {
    return executeWithKeyRotation(apiKeys, async (ai) => {
        const stream = await ai.models.generateContentStream({
            // Force Flash model regardless of input to avoid 429 on Pro models
            model: model, // Use selected model
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7, 
                systemInstruction: "Eres un redactor HTML experto. Generas HTML limpio.",
            }
        });
        return stream;
    });
};

export const refineArticleContent = async (apiKeys: string[] | string, currentHtml: string, instructions: string): Promise<string> => {
    const prompt = `
    Role: Content Editor.
    Task: Refine the following HTML article based strictly on user instructions.
    
    USER INSTRUCTIONS:
    "${instructions}"
    
    Current Article:
    ${currentHtml}
    
    OUTPUT RULES:
    1. Return valid HTML content only (inside body).
    2. Do NOT strip existing images or links unless instructed.
    3. Apply the requested changes while maintaining tone and style.
    `;
    
    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        let resText = response.text || currentHtml;
        return resText.replace(/```html/g, '').replace(/```/g, '');
    });
}

export const findCampaignAssets = async (apiKeys: string[] | string, query: string, projectName: string, csvData?: ContentItem[]): Promise<VisualResource[]> => {
    const safeProjectName = projectName || "mysite";
    const excludeTerms = `-site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.com -site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.es -inurl:${safeProjectName.replace(/\s+/g, '').toLowerCase()}`;

    const prompt = `
    Find OFFICIAL brand assets (Press kits, Lookbooks, Campaign pages) for: "${query}".
    CRITICAL: Exclude any URL from the project "${projectName}". We need EXTERNAL official sources.
    Query Modifier: ${excludeTerms}
    Return a JSON Array: [{"brand": "Brand Name", "description": "Page Title", "url": "URL", "isImage": false}]
    Only return valid, reachable URLs.
    `;

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            tools: [{ googleSearch: {} }],
        });
        let text = response.text || "[]";
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

export const suggestImagePlacements = async (apiKeys: string[] | string, articleHtml: string, count: string): Promise<AIImageRequest[]> => {
    const truncated = articleHtml.substring(0, 30000); 
    const numImages = count === 'auto' ? "3 to 5" : count;

    const prompt = `
    Eres Director de Arte. Analiza este artículo HTML. Sugiere ${numImages} ubicaciones para imágenes en el cuerpo.
    FORMATO OUTPUT (JSON):
    [{"id": "body_1", "type": "body", "placement": "...", "context": "...", "prompt": "...", "alt": "...", "title": "...", "filename": "..."}]
    `;

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: truncated + "\n\n" + prompt,
            config: { responseMimeType: "application/json" }
        });
        const json = JSON.parse(response.text);
        return json.map((item: any, idx: number) => ({ ...item, id: `body_${idx}`, status: 'pending' }));
    });
};

export const generateRealImage = async (apiKeys: string[] | string, basePrompt: string, config: ImageGenConfig, context: 'featured' | 'body', aspectRatio: string = '16:9'): Promise<string> => {
    const colorString = config.colors.length > 0 ? `Color Palette Hex Codes: ${config.colors.join(', ')}.` : "Auto color palette.";
    const styleString = config.style === 'Auto' ? "Hyperrealistic, editorial photography, 8k, cinematic lighting." : `${config.style} style, high quality artwork.`;
    const userInstruction = config.userPrompt ? `User Instruction: ${config.userPrompt}.` : "";

    let finalPrompt = `${basePrompt}. ${styleString} ${colorString} ${userInstruction} Minimalist composition, clean, high quality for web.`;
    
    return executeWithKeyRotation(apiKeys, async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: finalPrompt }]
                }
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image generated.");
        } catch(e) {
             throw e;
        }
    });
};

// --- Watermark Compositing (Client Side) ---
export const compositeWatermark = (base64Image: string, base64Watermark: string): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const mainImg = new Image();
        const watermark = new Image();

        if (!ctx) { resolve(base64Image); return; }

        mainImg.onload = () => {
            canvas.width = mainImg.width;
            canvas.height = mainImg.height;
            ctx.drawImage(mainImg, 0, 0);

            watermark.onload = () => {
                const wmWidth = canvas.width * 0.15;
                const wmAspect = watermark.height / watermark.width;
                const wmHeight = wmWidth * wmAspect;
                
                const x = canvas.width - wmWidth - (canvas.width * 0.05);
                const y = canvas.height - wmHeight - (canvas.height * 0.05);

                ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            watermark.src = base64Watermark;
        };
        mainImg.src = base64Image;
    });
};


export const generateSchemaMarkup = async (apiKeys: string[] | string, metadata: any, articleHtml: string, type: 'Article' | 'Product' = 'Article'): Promise<string> => {
    const prompt = `Genera JSON-LD Schema.org para este artículo. Metadata: ${JSON.stringify(metadata)}. Content Sample: ${articleHtml.substring(0,500)}. Include 'image' placeholder. Return JSON only.`;
    
    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text || "{}";
    });
}

// --- SERP INTEGRATIONS ---

// 1. Serper.dev Integration (POST)
const fetchSerperSearch = async (query: string, apiKey: string): Promise<any> => {
    try {
        const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: query,
                gl: "es",
                hl: "es"
            })
        });
        if (!res.ok) throw new Error("Serper API Error");
        return await res.json();
    } catch (e) {
        return null;
    }
}

// 2. Value SERP Integration (GET)
const fetchRealSERP = async (query: string, apiKey: string): Promise<any> => {
    try {
        const url = `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&num=15&location=Spain&gl=es&hl=es&output=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("ValueSERP API Error");
        return await res.json();
    } catch (e) {
        return null;
    }
}

// 3. Jina AI Integration (GET)
const fetchJinaSearch = async (query: string, apiKey: string): Promise<any> => {
    try {
        const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Retain-Images': 'none'
            }
        });
        if (!res.ok) throw new Error("Jina AI Error");
        const text = await res.text();
        return {
            organic_results: [],
            raw_text: text, 
            source: 'jina'
        };
    } catch (e) {
        return null;
    }
}

// --- AI FILTERING GATEKEEPER ---
const filterQualityResults = async (apiKeys: string[] | string, results: any[], keyword: string): Promise<any[]> => {
    if (!results || results.length === 0) return [];
    
    const candidates = results.map((r, i) => ({
        id: i,
        title: r.title,
        snippet: r.snippet,
        link: r.link
    })).slice(0, 15);

    const prompt = `
    TASK: You are an Editor. We are writing a HIGH QUALITY BLOG POST about "${keyword}".
    Filter out "Junk" URLs.
    - KEEP: Blogs, News, Guides, Reviews, Informational Articles.
    - DISCARD: Product pages (Add to cart), Login pages.
    Return a JSON Array of IDs that are GOOD references. Example: [0, 2, 5, 8]
    Candidates: ${JSON.stringify(candidates)}
    `;

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const goodIds: number[] = JSON.parse(response.text);
        const filtered = results.filter((_, index) => goodIds.includes(index));
        if (filtered.length === 0) return results.slice(0, 3);
        return filtered.slice(0, 8); 
    });
}

export const runSEOAnalysis = async (apiKeys: string[] | string, keyword: string, csvData: any[], projectName?: string, serperKey?: string, valueSerpKey?: string, jinaKey?: string): Promise<SEOAnalysisResult> => {
     // 1. Context Retrieval (Internal Data)
     const context = retrieveContext(csvData, keyword, "");
     const productContext = context.products.slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n'); 
     const collectionContext = context.collections.slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

     // 2. GATHER EXTERNAL INTEL (SERP)
     let serpContext = "";
     
     if ((serperKey && serperKey.length > 5) || (valueSerpKey && valueSerpKey.length > 5) || (jinaKey && jinaKey.length > 5)) {
        const intentPrompt = `
        Construct a search query to find LONG-FORM CONTENT (Articles, Blogs, Guides) about "${keyword}".
        Constraint: Exclude e-commerce product pages. Exclude project: ${projectName}.
        Output: ONLY the query string.
        `;
        
        let smartQuery = "";
        try {
            // Use key rotation for this generative step
            await executeWithKeyRotation(apiKeys, async (ai) => {
                const queryResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: intentPrompt
                });
                smartQuery = queryResponse.text?.trim().replace(/^"|"$/g, '') || `${keyword} blog guía`;
            });
            
            if (!smartQuery.includes('-site:amazon')) smartQuery += " -site:amazon.es -site:zalando.es -inurl:cart";

            // Fallback strategy: Serper > ValueSERP > Jina AI
            let realSerpData = null;
            let source = "";

            if (serperKey && serperKey.length > 5) {
                realSerpData = await fetchSerperSearch(smartQuery, serperKey);
                source = "serper";
            }
            
            if (!realSerpData && valueSerpKey && valueSerpKey.length > 5) {
                realSerpData = await fetchRealSERP(smartQuery, valueSerpKey);
                source = "valueserp";
            } 
            
            if (!realSerpData && jinaKey && jinaKey.length > 5) {
                realSerpData = await fetchJinaSearch(smartQuery, jinaKey);
                source = "jina";
            }
            
            if (source === 'serper' && realSerpData && realSerpData.organic) {
                const filteredCompetitors = await filterQualityResults(apiKeys, realSerpData.organic, keyword);
                serpContext = `REAL SERP DATA (Serper): \n Competitors: ${JSON.stringify(filteredCompetitors.map((r:any) => ({title: r.title, link: r.link, snippet: r.snippet})))} \n People Also Ask: ${JSON.stringify(realSerpData?.peopleAlsoAsk || [])}`;
            } else if (source === 'valueserp' && realSerpData && realSerpData.organic_results) {
                const filteredCompetitors = await filterQualityResults(apiKeys, realSerpData.organic_results, keyword);
                serpContext = `REAL SERP DATA (ValueSERP): \n Competitors: ${JSON.stringify(filteredCompetitors.map((r:any) => ({title: r.title, link: r.link, snippet: r.snippet})))} \n Related: ${JSON.stringify(realSerpData?.related_searches || [])} \n PAA: ${JSON.stringify(realSerpData?.people_also_ask || [])}`;
            } else if (source === 'jina' && realSerpData) {
                serpContext = `REAL SERP DATA (Jina AI): \n Context from top results: ${realSerpData.raw_text.substring(0, 15000)}`;
            } else {
                serpContext = "External tools failed. Relying on AI internal knowledge.";
            }

        } catch (e) {
            serpContext = "No External data available (Error). Rely on internal knowledge.";
        }
     } else {
        serpContext = "No external API keys. Rely on internal knowledge.";
     }

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
            suggestedInternalLinks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        url: { type: Type.STRING },
                        type: { type: Type.STRING }
                    }
                }
            },
            recommendedWordCount: { type: Type.STRING }
        },
        required: [
            "nicheDetected", "keywordIdeas", "autocompleteLongTail", "frequentQuestions", "top10Urls", 
            "lsiKeywords", "suggestedInternalLinks"
        ]
    };

    const systemPrompt = `Eres un estratega SEO experto.
        PROYECTO: ${projectName || 'Desconocido'}.
        KEYWORD OBJETIVO: "${keyword}".
        === EXTERNAL INTELLIGENCE ===
        ${serpContext}
        === INTERNAL DATABASE ===
        ${productContext}
        ${collectionContext}
        
        TAREA: Analiza y extrae solo los datos brutos.
        Retorna JSON válido.`;

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        const json = JSON.parse(response.text);
        
        if (!json.keywordIdeas) json.keywordIdeas = { shortTail: [], midTail: [] };
        if (!json.top10Urls) json.top10Urls = [];
        if (!json.suggestedInternalLinks) json.suggestedInternalLinks = [];
        if (!json.autocompleteLongTail) json.autocompleteLongTail = [];
        if (!json.frequentQuestions) json.frequentQuestions = [];
        if (!json.lsiKeywords) json.lsiKeywords = [];
        
        json.recommendedWordCount = json.recommendedWordCount || "1500";
        json.snippet = { metaTitle: "", h1: "", metaDescription: "", slug: "" };
        json.outline = { headers: [] };

        return json as SEOAnalysisResult;
    });
};

export const generateOutlineStrategy = async (apiKeys: string[] | string, config: ArticleConfig, keyword: string) => {
    const prompt = `
    Act as an SEO Strategist.
    Project: ${config.projectName}. Niche: ${config.niche}.
    Topic/Keyword: "${keyword}".
    Competitors/References: ${config.refUrls.substring(0, 1000)}.
    Target Word Count: ${config.wordCount}.
    Tone: ${config.tone}.
    
    Task: Create a winning content structure (Outline) and Meta Data.
    
    Requirements:
    1. Meta Title: Click-worthy, includes keyword, < 60 chars.
    2. H1: Powerful, clear, includes keyword.
    3. Slug: Short, URL-friendly.
    4. Meta Description: Compelling, < 160 chars.
    5. Outline: Array of headers (H2, H3). For each, give estimated word count and a brief note on what to cover.
    
    Output JSON format only.
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
                    introNote: { type: Type.STRING, description: "Instructions for the introduction" },
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

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        return JSON.parse(response.text);
    });
};

export const runHumanizerPipeline = async (
    apiKeys: string[] | string, 
    html: string, 
    config: HumanizerConfig, 
    intensity: number, 
    onStatus: (msg: string) => void
): Promise<{html: string}> => {
    onStatus("Analyzing content patterns...");
    
    // STRICT MODE LOGIC
    let strictInstructions = "";
    if (config.isStrictMode) {
        const freq = config.strictFrequency || 30;
        let keywordInstruction = "";
        if(freq <= 30) {
             keywordInstruction = "Ensure keywords appear naturally (1-2% density). Do not force if it hurts readability.";
        } else if (freq <= 60) {
             keywordInstruction = "Increase keyword density (3-4%). Repeat keywords in headings and first paragraphs.";
        } else {
             keywordInstruction = "MAXIMUM DENSITY. Force keywords into the text repeatedly (Keyword Stuffing). Ignore flow if necessary.";
        }

        strictInstructions = `
        STRICT SEO MODE ACTIVE (Intensity: ${freq}/100):
        1. YOU MUST PRESERVE OR ADD the following keywords: [${config.lsiKeywords?.join(', ')}].
        2. ${keywordInstruction}
        3. Do NOT remove specific FAQ answers if present.
        `;
    }

    const prompt = `
    Role: Senior Editor & Copywriter.
    Task: "Humanize" this HTML content. Remove AI patterns, repetitive structures, and generic transitions.
    
    Configuration:
    - Niche: ${config.niche}
    - Audience: ${config.audience}
    - Intensity: ${intensity}% (Where 100% is completely rewritten in a natural, erratic human flow).
    - Style Notes: ${config.notes || "Natural, conversational, varied sentence length."}
    
    ${strictInstructions}
    
    Strict Rules:
    1. KEEP HTML TAGS INTACT (Links, lists, tables). Only change the text inside paragraphs and headers.
    2. Vary sentence length significantly.
    3. Use idiomatic expressions where appropriate for Spanish (Spain).
    4. Avoid "En conclusión", "En resumen", "Por otro lado" unless natural.
    
    Content:
    ${html}
    `;

    onStatus("Rewriting text (AI De-patterning)...");

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        let newHtml = response.text || html;
        // Clean markdown block if present
        newHtml = newHtml.replace(/```html/g, '').replace(/```/g, '');
        
        onStatus("Final Polish...");
        return { html: newHtml };
    });
};

export const runSmartEditor = async (
    apiKeys: string[] | string, 
    html: string, 
    percentage: number, 
    notes: string, 
    onStatus: (msg: string) => void,
    isStrictMode?: boolean,
    strictFrequency?: number,
    lsiKeywords?: string[],
    questions?: string[]
): Promise<string> => {
    onStatus("Applying editorial changes...");
    
    // STRICT MODE LOGIC
    let strictInstructions = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        let keywordInstruction = "";
        if(freq <= 30) {
             keywordInstruction = "Ensure keywords appear naturally (1-2% density).";
        } else if (freq <= 60) {
             keywordInstruction = "Ensure high keyword density (3-4%).";
        } else {
             keywordInstruction = "Force keyword stuffing (>5%).";
        }

        strictInstructions = `
        STRICT SEO MODE ACTIVE (Intensity: ${freq}/100):
        1. MANDATORY: Ensure these keywords appear in the text: [${lsiKeywords?.join(', ')}].
        2. ${keywordInstruction}
        3. ${freq > 80 ? "Answer these FAQs explicitly if missing:" : "Ensure these FAQs are covered:"} [${questions?.join(', ')}].
        `;
    }

    const prompt = `
    Role: Content Editor.
    Task: Edit the following HTML content based on specific instructions.
    
    Edit Strength: ${percentage}% of the text should be touched.
    Instructions: ${notes}
    
    ${strictInstructions}
    
    Constraint: maintain the HTML structure (images, tables, lists). Return full valid HTML body.
    
    Input HTML:
    ${html}
    `;

    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        let resText = response.text || html;
        return resText.replace(/```html/g, '').replace(/```/g, '');
    });
};