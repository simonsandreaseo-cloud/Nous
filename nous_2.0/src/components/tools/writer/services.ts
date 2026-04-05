import { GoogleGenerativeAI as GoogleGenAI, SchemaType as Type } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export { Type };

import { 
    ArticleConfig, 
    SEOAnalysisResult, 
    DeepSEOAnalysisResult, 
    CompetitorDetail, 
    ContentItem,
    HumanizerConfig,
    VisualResource,
    ImageGenConfig,
    AIImageRequest
} from "@/lib/services/writer/types";

import { runDeepSEOAnalysis as libRunDeepSEOAnalysis } from "@/lib/services/writer/seo-analyzer";
import { buildPrompt as libBuildPrompt } from "@/lib/services/writer/prompts";

export const runDeepSEOAnalysis = libRunDeepSEOAnalysis;
export const buildPrompt = libBuildPrompt;

export { type ArticleConfig, type SEOAnalysisResult, type DeepSEOAnalysisResult, type CompetitorDetail, type ContentItem, type HumanizerConfig, type VisualResource, type ImageGenConfig, type AIImageRequest };


// --- CENTRALIZED API CLIENT & ROTATION LOGIC ---
import { executeWithKeyRotation as libExecuteWithKeyRotation } from "@/lib/services/writer/ai-core";

export const executeWithKeyRotation = async <T>(
    operation: (client: GoogleGenAI, currentModel: string) => Promise<T>,
    modelName: string = 'gemini-2.5-flash',
    keys?: string[] | string
): Promise<T> => {
    return libExecuteWithKeyRotation(async (client, m) => {
        return operation(client, m);
    }, modelName, keys);
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

const extractDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return "";
    }
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

const _parseJSON = (text: string) => {
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

// --- Content Import Helpers ---
import mammoth from 'mammoth';

const _parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value; // The generated HTML
};

const _parseHtml = async (file: File): Promise<string> => {
    return await file.text();
};

// --- Semantic Retrieval & Linking ---

const retrieveContext = (allData: ContentItem[], topic: string, keywords: string) => {
    if (!allData || allData.length === 0) return { products: [], collections: [], others: [] };

    const cleanText = (topic + " " + keywords).toLowerCase();
    const terms = cleanText
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(w => w.length >= 3);

    const scoreItem = (item: ContentItem) => {
        let score = 0;
        const title = item.title || item.url || "";
        const idx = (item.search_index || `${title} ${item.type || 'page'} ${item.url}`).toLowerCase();

        if (idx.includes(topic.toLowerCase())) score += 50;

        terms.forEach(term => {
            if (idx.includes(term.toLowerCase())) score += 20;
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

export const searchMoreLinks = async (keyword: string, csvData: ContentItem[]): Promise<ContentItem[]> => {
    const prompt = `Give me 5 search terms to find relevant products in a database for the topic "${keyword}". Return CSV.`;

    return executeWithKeyRotation(async (ai, currentModel) => {
        try {
            const model = ai.getGenerativeModel({ model: currentModel || 'gemini-2.5-flash' });
            const response = await model.generateContent(prompt);
            const terms = (response.response.text() || '').split(',').map(t => t.trim());
            const extraString = terms.join(' ');

            const context = retrieveContext(csvData, keyword, extraString);
            const mix = [
                ...context.collections.slice(0, 5), 
                ...context.products.slice(0, 5),
                ...context.others.slice(0, 5)
            ];
            return mix.slice(0, 10);
        } catch (e) {
            console.error("[searchMoreLinks] GEMINI ERROR, falling back to local search:", e);
            const context = retrieveContext(csvData, keyword, "información artículo");
            return [
                ...context.collections.slice(0, 3), 
                ...context.products.slice(0, 3),
                ...context.others.slice(0, 4)
            ].slice(0, 10);
        }
    });
}


// --- Post-Generation Auto Interlinking (Optimized - Async Chunking) ---

export const autoInterlinkAsync = async (html: string, csvData: ContentItem[]): Promise<string> => {
    const candidates = csvData.filter(i => i.title && i.url);
    candidates.sort((a, b) => b.title.length - a.title.length);

    let linkedHtml = html;
    const alreadyLinked = new Set<string>();
    let linkCount = 0;

    const topCandidates = candidates.slice(0, 300);

    for (let i = 0; i < topCandidates.length; i++) {
        // Yield to main thread every 20 iterations to prevent UI freeze
        if (i > 0 && i % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const item = topCandidates[i];
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
                if (replaced) return match;
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
    if (!html) return '';
    let cleanString = html;
    
    // 1. CLEAN MARKDOWN & ARTIFACTS
    // Bold: handle **bold** and __bold__
    cleanString = cleanString.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    cleanString = cleanString.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
    
    // Headers (sometimes they slip as markdown)
    cleanString = cleanString.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    cleanString = cleanString.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    cleanString = cleanString.replace(/^# (.*$)/gm, '<h2>$1</h2>'); // No H1 in body

    return cleanString;
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

// buildPrompt body removed

// --- API Calls (Resilient) ---

export const generateArticleStream = async (model: string, prompt: string) => {

    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({
            model: currentModel || 'gemini-2.5-flash',
            systemInstruction: "Eres un redactor HTML experto. Eliges siempre etiquetas HTML (<strong>, <a>, <h2>) y NUNCA usas markdown (**, #, [link]). Generas HTML impecable.",
            generationConfig: {
                temperature: 0.7,
            }
        });
        const result = await modelObj.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // Unified stream wrapper
        return (async function* () {
            for await (const chunk of result.stream) {
                yield { text: chunk.text() };
            }
        })();
    });
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
        ? `TEXT TO REFINE (SPECIFIC SECTION):\n"${selectedText}"` 
        : `FULL ARTICLE TO REFINE:\n${currentHtml}`;
        
    const context = isSelection 
        ? `\nFULL ARTICLE CONTEXT (FOR REFERENCE ONLY):\n${currentHtml.substring(0, 3000)}` 
        : '';

    const prompt = `
    Role: Content Editor.
    Task: Refine the following ${isSelection ? 'SPECIFIC TEXT SECTION' : 'HTML article'} based strictly on user instructions.
    
    USER INSTRUCTIONS:
    "${instructions}"
    
    ${target}
    ${context}
    
    OUTPUT RULES:
    1. ${isSelection ? 'Return ONLY the refined version of the specific text provided. Do NOT return the whole article.' : 'Return valid HTML content for the whole article (inside body).'}
    2. Do NOT strip existing images or links unless instructed.
    3. Apply requested changes while maintaining tone and style.
    4. Return the result WITHOUT any markdown blocks (like \`\`\`html).
    `;

    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ model: currentModel || 'gemini-2.5-flash' });
        const response = await modelObj.generateContent(prompt);
        const resText = response.response.text() || (isSelection ? selectedText : currentHtml);
        return resText.replace(/```html/g, '').replace(/```/g, '').trim();
    }, modelName);
}

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
            model: currentModel || 'gemini-2.5-flash',
        });
        const response = await modelObj.generateContent(prompt);
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

const _suggestImagePlacements = async (articleHtml: string, count: string): Promise<AIImageRequest[]> => {
    const truncated = articleHtml.substring(0, 30000);
    const numImages = count === 'auto' ? "3 to 5" : count;

    const prompt = `
    Eres Director de Arte. Analiza este artículo HTML. Sugiere ${numImages} ubicaciones para imágenes en el cuerpo.
    FORMATO OUTPUT (JSON):
    [{"id": "body_1", "type": "body", "placement": "...", "context": "...", "prompt": "...", "alt": "...", "title": "...", "filename": "..."}]
    `;

    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({
            model: currentModel || 'gemini-2.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = await modelObj.generateContent(truncated + "\n\n" + prompt);
        const json = JSON.parse(response.response.text() || "[]");
        return json.map((item: any, idx: number) => ({ ...item, id: `body_${idx}`, status: 'pending' }));
    });
};

export const generateRealImage = async (basePrompt: string, config: ImageGenConfig, context: 'featured' | 'body', aspectRatio: string = '16:9'): Promise<string> => {
    const colorString = config.colors.length > 0 ? `Color Palette Hex Codes: ${config.colors.join(', ')}.` : "Auto color palette.";
    const styleString = config.style === 'Auto' ? "Hyperrealistic, editorial photography, 8k, cinematic lighting." : `${config.style} style, high quality artwork.`;
    const userInstruction = config.userPrompt ? `User Instruction: ${config.userPrompt}.` : "";

    const finalPrompt = `${basePrompt}. ${styleString} ${colorString} ${userInstruction} Minimalist composition, clean, high quality for web.`;

    return executeWithKeyRotation(async (ai, currentModel) => {
        try {
            const model = ai.getGenerativeModel({ model: currentModel || 'gemini-2.5-flash' });
            const response = await model.generateContent(finalPrompt);

            const result = await response.response;
            for (const part of result.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image generated.");
        } catch (e) {
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


export const generateSchemaMarkup = async (metadata: any, articleHtml: string, type: 'Article' | 'Product' = 'Article'): Promise<string> => {
    const prompt = `Genera JSON-LD Schema.org para este artículo. Metadata: ${JSON.stringify(metadata)}. Content Sample: ${articleHtml.substring(0, 500)}. Include 'image' placeholder. Return JSON only.`;

    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({
            model: currentModel || 'gemini-2.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = await model.generateContent(prompt);
        return response.response.text() || "{}";
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

/**
 * DataForSEO: Get organic keywords for a specific URL
 */
export const fetchDataForSEOKeywords = async (url: string): Promise<any> => {
    try {
        const response = await fetch('/api/seo/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'keywords_for_site', target: url })
        });
        const result = await response.json();
        
        // Log DataForSEO error gracefully to not break execution
        if (!response.ok || result.error) {
           console.error("[DataForSEO] Error:", result.error || response.statusText);
           return [];
        }
        return result.result || [];
    } catch (e) {
        console.error("DataForSEO Proxy Error:", e);
        return [];
    }
};

/**
 * DataForSEO: Get global search volume and difficulty for the main keyword
 * - [x] Fase 2: Mejora de Lógica en `services.ts`
    - [x] Implementar `fetchGlobalMetrics` para volumen/dificultad principal
    - [x][services.ts] Integrar métricas globales en `runDeepSEOAnalysis`
    - [x][services.ts] Validar flujo de extracción de Unstructured.io
- [/] Fase 3: Interfaz de Usuario (UI)
 */
export const fetchGlobalMetrics = async (keyword: string): Promise<{ volume: string; difficulty: string }> => {
    try {
        const response = await fetch('/api/seo/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search_volume', keyword })
        });
        
        const data = await response.json();
        const metrics = data.result?.[0];
        
        return {
            volume: metrics?.search_volume?.toString() || "0",
            difficulty: metrics?.keyword_difficulty?.toString() || "N/A"
        };
    } catch (e) {
        console.error("Global Metrics Error:", e);
        return { volume: "0", difficulty: "N/A" };
    }
};

/**
 * Unstructured.io: Extract clean text from a URL.
 * Routes through /api/unstructured proxy to avoid CORS restrictions.
 */
export const fetchUnstructuredContent = async (url: string): Promise<string> => {
    try {
        // Use server-side proxy to avoid CORS — the browser cannot call Unstructured.io directly
        const response = await fetch('/api/unstructured', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) return "";

        const data = await response.json();
        return data.text || "";
    } catch (e) {
        console.error("Unstructured Error:", e);
        return "";
    }
};

export const searchOfficialAssets = async (query: string): Promise<VisualResource[]> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
        const res = await fetch("https://google.serper.dev/images", {
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
        if (!res.ok) throw new Error("Serper Images API Error");
        const data = await res.json();
        return (data.images || []).map((img: any) => ({
            brand: query,
            description: img.title,
            url: img.imageUrl,
            isImage: true
        }));
    } catch (e) {
        return [];
    }
}

// 2. Value SERP Integration (GET)
const fetchRealSERP = async (query: string): Promise<any> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_VALUESERP_API_KEY || '';
        const url = `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&num=15&location=Spain&gl=es&hl=es&output=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("ValueSERP API Error");
        return await res.json();
    } catch (e) {
        return null;
    }
}

// 3. Jina AI Integration (GET)
const fetchJinaSearch = async (query: string): Promise<any> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_JINA_API_KEY || '';
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
const filterQualityResults = async (results: any[], keyword: string): Promise<any[]> => {
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

    return executeWithKeyRotation(async (ai) => {
        try {
            const modelObj = ai.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await modelObj.generateContent(prompt);
            let rawText = response.response.text() || "[]";
            
            // Clean markdown if present
            if (rawText.includes('```json')) rawText = rawText.split('```json')[1].split('```')[0].trim();
            else if (rawText.includes('```')) rawText = rawText.split('```')[1].split('```')[0].trim();
            
            const start = rawText.indexOf('[');
            const end = rawText.lastIndexOf(']');
            if (start !== -1 && end !== -1) rawText = rawText.substring(start, end + 1);

            const goodIds: number[] = JSON.parse(rawText || "[]");
            if (!Array.isArray(goodIds)) throw new Error("Not an array");

            const filtered = results.filter((_, index) => goodIds.includes(index));
            if (filtered.length === 0) return results.slice(0, 3);
            return filtered.slice(0, 8);
        } catch (e) {
            console.warn("Quality filter failed, using defaults:", e);
            return results.slice(0, 3);
        }
    });
}

export const runSEOAnalysis = async (
    keyword: string,
    csvData: any[],
    projectName?: string,
    serperKeyOverride?: string,
    modelName?: string,
    isIdea: boolean = false
): Promise<SEOAnalysisResult> => {
    const serperKey = serperKeyOverride || process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
    // 1. Context Retrieval (Internal Data)
    const context = retrieveContext(csvData, keyword, "");
    const productContext = context.products.slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n');
    const collectionContext = context.collections.slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

    // 2. GATHER EXTERNAL INTEL (SERP)
    let serpContext = "";

    if (serperKey) {
        const intentPrompt = `
        Constraint: Build a Google Search query to find Articles, Blogs or Guides about "${keyword}". 
        Project filter (exclude): ${projectName || ''}
        Format: ONLY the query string, NO explanation.
        `;

        let smartQuery = "";
        try {
            // Use key rotation for this generative step
            await executeWithKeyRotation(async (ai) => {
                const modelObj = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const queryResponse = await modelObj.generateContent(intentPrompt);
                smartQuery = queryResponse.response.text()?.trim().replace(/^"|"$/g, '') || `${keyword} blog tendencias`;
            });

            // Moderate exclusions - don't over-filter
            if (!smartQuery.includes('-site:amazon')) {
                smartQuery += " -site:amazon.* -site:ebay.* -site:zalando.* -inurl:cart";
            }

            // Fallback strategy: Serper > ValueSERP > Jina AI
            let realSerpData = null;
            let source = "serper";

            console.log(`[SEO-Analytic] Searching Serper with: "${smartQuery}"`);
            realSerpData = await fetchSerperSearch(smartQuery, serperKey);

            // AUTO-RETRY: If smartQuery (restrictive) returns no organic results, try with raw keyword
            if (realSerpData && (!realSerpData.organic || realSerpData.organic.length === 0)) {
                console.warn(`[SEO-Analytic] SmartQuery returned 0 results. Retrying with raw keyword: "${keyword}"`);
                realSerpData = await fetchSerperSearch(keyword, serperKey);
            }

            if (!realSerpData) {
                const vsKey = process.env.NEXT_PUBLIC_VALUESERP_API_KEY;
                if (vsKey) {
                    console.log(`[SEO-Analytic] Falling back to ValueSERP for: "${keyword}"`);
                    realSerpData = await fetchRealSERP(keyword);
                    source = "valueserp";
                }
            }

            if (!realSerpData) {
                const jKey = process.env.NEXT_PUBLIC_JINA_API_KEY;
                if (jKey) {
                    console.log(`[SEO-Analytic] Falling back to Jina AI for: "${keyword}"`);
                    realSerpData = await fetchJinaSearch(keyword);
                    source = "jina";
                }
            }

            if (source === 'serper' && realSerpData && realSerpData.organic) {
                const filteredCompetitors = await filterQualityResults(realSerpData.organic, keyword);
                // CRITICAL: Rename 'link' to 'url' in context so Gemini maps it correctly to schema
                const competitorsContext = filteredCompetitors.map((r: any) => ({ 
                    title: r.title, 
                    url: r.link, // Mapped to url
                    snippet: r.snippet 
                }));
                serpContext = `REAL SERP DATA (Serper): \n Competitors: ${JSON.stringify(competitorsContext)} \n People Also Ask: ${JSON.stringify(realSerpData?.peopleAlsoAsk || [])}`;
            } else if (source === 'valueserp' && realSerpData && realSerpData.organic_results) {
                const filteredCompetitors = await filterQualityResults(realSerpData.organic_results, keyword);
                const competitorsContext = filteredCompetitors.map((r: any) => ({ 
                    title: r.title, 
                    url: r.link, // Mapped to url
                    snippet: r.snippet 
                }));
                serpContext = `REAL SERP DATA (ValueSERP): \n Competitors: ${JSON.stringify(competitorsContext)} \n Related: ${JSON.stringify(realSerpData?.related_searches || [])} \n PAA: ${JSON.stringify(realSerpData?.people_also_ask || [])}`;
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
            recommendedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedWordCount: { type: Type.STRING },
            recommendedSchemas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
            "nicheDetected", "keywordIdeas", "autocompleteLongTail", 
            "nicheDetected", "keywordIdeas", "autocompleteLongTail", 
            "frequentQuestions", "top10Urls", "recommendedWords", "recommendedWordCount", "recommendedSchemas"
        ]
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
        // 1. Analizar el nicho y la intención.
        2. Proponer keywords (Short, Mid, Long Tail).
        3. Identificar competidores y PRIORIZAR las preguntas extraídas de REAL SERP DATA (People Also Ask) para la sección de FAQs.
        
        TAREA: Analiza y extrae solo los datos brutos de investigación SEO. No generes estructuras de contenido ni metadatos en este paso.
        Retorna JSON válido.`;

    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({
            model: modelName || 'gemini-2.5-flash', // Use current stable model
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any
            }
        });

        const response = await model.generateContent(systemPrompt);
        const result = response.response;
        let json: any = {};
        let rawText = "";

        try {
            rawText = result.text() || "{}";
            console.log("[runSEOAnalysis] Raw Gemini text:", rawText);
            
            let cleanText = rawText.trim();
            // Handle markdown blocks
            if (cleanText.includes('```json')) {
                cleanText = cleanText.split('```json')[1].split('```')[0].trim();
            } else if (cleanText.includes('```')) {
                cleanText = cleanText.split('```')[1].split('```')[0].trim();
            }
            
            // Extract innermost JSON object/array if conversational wrapper exists
            const start = Math.min(
                cleanText.indexOf('{') === -1 ? Infinity : cleanText.indexOf('{'),
                cleanText.indexOf('[') === -1 ? Infinity : cleanText.indexOf('[')
            );
            const end = Math.max(
                cleanText.lastIndexOf('}'),
                cleanText.lastIndexOf(']')
            );
            
            if (start !== Infinity && end !== -1 && end >= start) {
                cleanText = cleanText.substring(start, end + 1);
            }
            
            json = JSON.parse(cleanText);
        } catch (e) {
            console.error("[runSEOAnalysis] JSON Parse Error.", e, "Raw Text:", rawText);
            json = {};
        }

        // Deep defaults to avoid empty UI
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
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema as any
            }
        });

        const response = await modelObj.generateContent(prompt);
        let rawText = response.response.text() || "{}";
        
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end >= start) {
            rawText = rawText.substring(start, end + 1);
        }
        
        return JSON.parse(rawText);
    });
};

/**
 * Helper to split HTML into chunks of elements
 */
function chunkHtml(htmlString: string, chunkSize: number): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;
    
    // Obtenemos solo los hijos directos del body (p, h1, h2, table, etc.)
    const allElements = Array.from(body.children);
    const chunks = [];
    
    for (let i = 0; i < allElements.length; i += chunkSize) {
        const chunkElements = allElements.slice(i, i + chunkSize);
        
        // Convertimos estos elementos de nuevo a string HTML
        const chunkHtmlText = chunkElements.map(el => el.outerHTML).join('\n');
        chunks.push(chunkHtmlText);
    }
    
    return chunks;
}

export const runHumanizerPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus: (msg: string) => void,
    modelName: string = 'gemini-2.5-flash'
): Promise<{ html: string; metadata?: any }> => {
    // ---------------------------------------------
    // FASE 0: PREPARACIÓN Y CHUNKING
    // ---------------------------------------------
    const CHUNK_SIZE = 5; // Bloques pequeños para evitar resúmenes
    const htmlChunks = chunkHtml(html, CHUNK_SIZE);
    onStatus(`Iniciando humanización en ${htmlChunks.length} bloques...`);

    const SYSTEM_PROMPT_BASE = "Tu salida debe ser solo el bloque de HTML procesado, sin explicaciones ni prefacios. Solo el código HTML.";
    const HTML_RULE = "ERES UN REDACTOR HUMANO. REGLA CRÍTICA: NO RESUMAS. NO OMITAS NADA. El bloque de salida debe tener el mismo número de elementos que la entrada.";

    // ---------------------------------------------
    // FASE 1: HUMANIZACIÓN (Chunk-wise)
    // ---------------------------------------------
    const buildPhase1Prompt = () => `
        ${SYSTEM_PROMPT_BASE}
        ${HTML_RULE}

        --- PERSONA: REDACTOR HUMANO AUTÉNTICO ---
        Escribe de forma natural. IMPORTANTE: El texto humanizado DEBE tener la misma longitud que el original. PROHIBIDO ACORTAR.

        --- CONTEXTO ---
        Nicho/Tópico: ${config.niche}
        Público Objetivo: ${config.audience}
        Notas Adicionales: ${config.notes || 'N/A'}

        --- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---
        1.  ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.
        2.  COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.
        3.  CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.
        4.  MORFOSINTAXIS (EXPLOSIVIDAD):
            * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).
            * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.
        5.  IDIOMA: Usa español neutro panhispánico.
        6.  PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.
        7.  PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.

        --- TAREA ---
        Aplica TODAS las reglas de humanización al texto DENTRO de las etiquetas HTML del siguiente bloque. SÉ AGRESIVO al reescribir. Abandona la estructura de la oración original.
    `.trim();

    const humanizedChunks: string[] = [];
    for (let i = 0; i < htmlChunks.length; i++) {
        onStatus(`Fase 1: Humanizando bloque ${i + 1}/${htmlChunks.length}...`);
        const chunkResult = await executeWithKeyRotation(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({ 
                model: currentModel || modelName,
                systemInstruction: buildPhase1Prompt()
            });
            const res = await model.generateContent(htmlChunks[i]);
            const raw = res.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
            return cleanAndFormatHtml(raw);
        }, modelName);
        humanizedChunks.push(chunkResult);
    }

    const humanizedHtml = humanizedChunks.join('\n');

    // ---------------------------------------------
    // FASE 2: SEO Y REVISIÓN (Llamada Única)
    // ---------------------------------------------
    onStatus("Fase 2: Optimizando SEO y revisión final...");
    const linksText = config.links?.map(l => l.anchor_text ? `[${l.anchor_text}](${l.url})` : `[${l.title}](${l.url})`).join(', ');
    
    const buildPhase2Prompt = () => `
        ${SYSTEM_PROMPT_BASE}
        ${HTML_RULE}

        --- TAREA COMBINADA: SEO Y REVISIÓN FINAL ---
        El siguiente bloque HTML es el documento COMPLETO, que ya fue humanizado (estilo "mediocre" y caótico). Tu trabajo es realizar DOS tareas en UNA SOLA PASADA:
        1.  TAREA SEO: Inserta los elementos SEO de forma natural.
        2.  TAREA REVISIÓN: Corrige ÚNICAMENTE errores gramaticales graves o de sentido que hagan el texto incomprensible.

        --- REGLAS CRÍTICAS ---
        * REGLA DE ORO: NO CORRIJAS EL ESTILO "defectuoso" intencional (frases cortas, falta de conectores, estilo simple). Tu objetivo es insertar SEO, no "mejorar" la redacción.
        * REGLA DE ENLACES: Inserta los enlaces de la lista DONDE SEAN MÁS PERTINENTES en TODO el documento. NO repitas el mismo enlace a menos que el anchor sea diferente.
        * REGLA DE LSI/NEGRITAS: Inserta las LSI y aplica <strong> a frases clave de forma natural y comedida.

        --- CONTEXTO SEO (PARA TODO EL DOCUMENTO) ---
        LSI Keywords a integrar: [${config.lsiKeywords?.join(', ') || 'Ninguna'}]
        Enlaces/Anchors a insertar: ${linksText || 'Ninguno'}
    `.trim();

    const finalizedHtml = await executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ 
            model: currentModel || modelName,
            systemInstruction: buildPhase2Prompt(),
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.4
            }
        });
        const res = await model.generateContent(humanizedHtml);
        const raw = res.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
        return cleanAndFormatHtml(raw);
    }, modelName);

    onStatus("✅ ¡Humanización completada!");
    return { html: finalizedHtml };
};

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
    onStatus("Ejecutando editor inteligente...");
    
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

    const prompt = `
    Eres un Editor Senior. Tu tarea es mejorar este artículo HTML.
    Intensidad de edición: ${percentage}%
    Instrucciones específicas: ${notes}
    ${strictInstructions}
    
    REGLA DE ORO: Mantén intacta la estructura HTML (enlaces, imágenes, listas).
    HTML:
    ${html}
    `;

    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);
        return response.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    });
};

/**
 * PHASE: SEO & STYLE POST-PROCESSING
 * Refines bolds, LSI density, and link integration.
 */
export const runSEOPostProcessor = async (
    html: string,
    config: ArticleConfig,
    onStatus: (msg: string) => void
): Promise<string> => {
    onStatus("Optimizando densidad SEO y estilos de negritas...");
    
    const approvedLinks = config.approvedLinks || [];
    const linkList = approvedLinks.map(l => `- URL: ${l.url} | Anchor ideal: ${l.title}`).join('\n');
    
    const prompt = `
    TASK: As a Senior SEO Editor, perform a final polish on this article HTML.
    
    CRITICAL RULES PARA NEGRILLAS (<strong>):
    1. Las negritas deben resaltar frases clave de entre 4 y 8 palabras.
    2. Máximo 1 bloque de negritas por párrafo de 40-60 palabras.
    3. Nunca pongas negritas en la primera ni última palabra de un párrafo.
    4. NO pongas negritas en encabezados (H2, H3), blockquotes ni listas.
    5. Prioriza resaltar conceptos con las palabras clave objetivo.

    CRITICAL RULES PARA SEO & LSI:
    1. Asegura que la palabra clave principal ("${config.topic}") aparezca de forma natural en el primer y último párrafo si no está ya.
    2. Inserta o refuerza las siguientes palabras clave LSI y semánticas si es posible sin forzar: [${config.lsiKeywords?.join(', ') || 'N/A'}]
    3. Mantén la densidad alta pero legible.

    INTEGRIDAD ESTRUCTURAL Y ENLACES (VITAL):
    1. MANTÉN INTACTOS TODOS LOS ENLACES <a> PRESENTES. No cambies sus URLs ni los elimines.
    2. PROHIBIDO: NO inventes nuevos enlaces. NO uses enlaces que empiecen por "#".
    3. Si ves un enlace que NO estaba en la versión original o que usa "#", ELIMÍNALO y deja solo el texto plano. 
    4. ESTOS SON LOS ÚNICOS ENLACES VÁLIDOS (Solo para referencia, no añadas nuevos si no están fuera del HTML ya):
       ${linkList}
    5. Mantén todas las imágenes e IDs de elementos.
    6. Retorna ÚNICAMENTE código HTML puro (body content). Sin explicaciones.

    HTML A PULIR:
    ${html}
    `;

    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);
        return response.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    });
};

/**
 * UTILITY: Selects the top N most relevant links from a large inventory.
 */
export function selectTopRelevantLinks(topic: string, csvData: ContentItem[], count: number = 20): ContentItem[] {
    if (!csvData || csvData.length === 0) return [];
    const terms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    
    return csvData
        .map(item => {
            let score = 0;
            const fullText = (item.title + ' ' + (item.url || '')).toLowerCase();
            terms.forEach(term => { if (fullText.includes(term)) score += 1; });
            // Small bonus for collection types
            if (item.type === 'collection') score += 0.5;
            return { ...item, _score: score };
        })
        .filter(item => item._score > 0 || (item.type === 'collection'))
        .sort((a, b) => (b._score || 0) - (a._score || 0))
        .slice(0, count)
        .map(({ _score, ...rest }: any) => rest as ContentItem);
}

// --- Export to Google Docs ---
export async function exportToGoogleDoc(title: string, htmlContent: string, sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                action: 'create_doc',
                title: title,
                content: htmlContent
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to export');
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Export Error:', error);
        throw error;
    }
}

/**
 * TF-IDF Calculation for LSI Keywords from competitor content
 */
export const calculateTFIDF = (documents: string[]): { keyword: string; score: number }[] => {
    const stopwords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'a', 'y', 'o', 'que', 'con', 'por', 'sobre', 'para', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'mi', 'tu', 'su', 'nuestro', 'vuestro', 'sus', 'como', 'más', 'pero', 'cuando', 'si', 'sin', 'todo', 'cada', 'bien', 'muy', 'tan', 'así', 'donde', 'ser', 'estar', 'hacer', 'tener', 'poder', 'decir', 'ver', 'ir', 'dar', 'saber', 'querer', 'venir', 'deber', 'entre', 'dentro', 'fuera', 'después', 'antes', 'entonces', 'ahora', 'aquí', 'allí', 'siempre', 'nunca', 'también', 'tampoco', 'solo', 'ya', 'hasta', 'desde', 'durante', 'mientras', 'contra', 'según', 'bajo', 'ante', 'cabe', 'so', 'tras', 'vía', 'versus', 'mediante', 'durante', 'dondequiera', 'además', 'asimismo', 'entretanto', 'ojalá', 'incluso', 'inclusive', 'quizás', 'acaso', 'tal', 'vez', 'posiblemente', 'probablemente', 'seguramente', 'verdaderamente', 'completamente', 'totalmente', 'parcialmente', 'casualmente', 'finalmente', 'actualmente', 'recientemente', 'últimamente', 'próximamente', 'inmediatamente', 'ahora', 'luego', 'después', 'anteayer', 'ayer', 'hoy', 'mañana', 'pasado', 'mañana', 'siempre', 'nunca', 'jamás', 'temprano', 'tarde', 'pronto', 'siempre', 'todavía', 'aún', 'ya', 'despacio', 'deprisa', 'así', 'bien', 'mal', 'apenas', 'casi', 'solo', 'solamente', 'tanto', 'tan', 'mucho', 'poco', 'muy', 'más', 'menos', 'bastante', 'demasiado', 'nada', 'algo', 'así', 'bastante', 'medio', 'extremadamente', 'sumamente']);

    const tokenize = (text: string) => text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));

    const docTokens = documents.map(tokenize);
    const allTokens = Array.from(new Set(docTokens.flat()));
    
    const idf: Record<string, number> = {};
    allTokens.forEach(token => {
        const count = docTokens.filter(doc => doc.includes(token)).length;
        idf[token] = Math.log(documents.length / (1 + count));
    });

    const scores: Record<string, number> = {};
    docTokens.forEach(tokens => {
        const tf: Record<string, number> = {};
        tokens.forEach(token => tf[token] = (tf[token] || 0) + 1);
        
        Object.keys(tf).forEach(token => {
            scores[token] = (scores[token] || 0) + (tf[token] / tokens.length) * idf[token];
        });
    });

    return Object.entries(scores)
        .map(([keyword, score]) => ({ keyword, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);
};

/**
 * AI Filter: Selects the top 5 most relevant competitors based on content snippets
 */
async function selectTopCompetitorsViaAI(keyword: string, competitors: CompetitorDetail[]): Promise<string[]> {
    const list = competitors.map((c, i) => ({
        index: i,
        url: c.url,
        title: c.title,
        snippet: c.content?.substring(0, 3000) || "Sin contenido extraído"
    }));

    const prompt = `
    Analiza la relevancia de estos 10 competidores para la palabra clave: "${keyword}".
    Tu objetivo es seleccionar los 5 competidores que ofrecen el contenido editorial más útil, pertinente y de alta calidad para servir como referencia en la redacción de un nuevo artículo.
    
    CRITERIOS DE SELECCIÓN:
    1. Relevancia Directa: El contenido trata específicamente el tema de la keyword.
    2. Calidad Editorial: Prefiere artículos, guías y blogs sobre foros, sitios de afiliados de baja calidad o páginas de error.
    3. Riqueza de Información: Selecciona aquellos con estructuras claras y datos útiles.

    COMPETIDORES:
    ${JSON.stringify(list, null, 2)}

    RETORNA UNICAMENTE UN ARRAY JSON CON LAS 5 URLS SELECCIONADAS:
    Ejemplo: ["https://sitio1.com", "https://sitio2.com", ...]
    `;

    try {
        const result = await executeWithKeyRotation(async (ai) => {
            const model = ai.getGenerativeModel({ 
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await model.generateContent(prompt);
            const text = response.response.text();
            
            // Extract JSON array
            const match = text.match(/\[[\s\S]*?\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
            throw new Error("Formato de respuesta inválido");
        });
        
        if (Array.isArray(result)) return result.slice(0, 5);
        return competitors.slice(0, 5).map(c => c.url);
    } catch (e) {
        console.error("[selectTopCompetitorsViaAI] Error, falling back to first 5:", e);
        return competitors.slice(0, 5).map(c => c.url);
    }
}



async function selectSemanticInternalLinks(keyword: string, pool: any[]): Promise<any[]> {
    if (pool.length === 0) return [];
    
    const prompt = `Actúa como un experto en SEO On-page. Dado este título/idea de artículo: "${keyword}" 
    Y esta lista de URLs candidatas de mi propio sitio web:
    ${pool.map((p, i) => `${i+1}. Título: ${p.title} | URL: ${p.url}`).join('\n')}
    
    Selecciona las 5 mejores URLs para enlazar internamente que tengan la mayor relevancia semántica y aporten valor al lector de mi nuevo artículo. 

    === REGLA DE ORO DE INTEGRIDAD ===
    SOLO puedes seleccionar URLs que estén en la lista de arriba. 
    PROHIBIDO inventar URLs o proponer URLs que no estén textualmente en la lista.
    Si ninguna es relevante, devuelve una lista vacía [].

    Responde exclusivamente en formato JSON con la siguiente estructura:
    [{"url": "...", "title": "..."}]`;

    try {
        const resultText = await executeWithKeyRotation(async (client) => {
            const model = client.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        }, "gemini-2.5-flash");

        let cleaned = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Extract array if conversational text exists
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end >= start) {
            cleaned = cleaned.substring(start, end + 1);
        }

        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("[selectSemanticInternalLinks] Error, falling back to manual ranking:", e);
        return pool.slice(0, 5).map(p => ({ url: p.url, title: p.title }));
    }
}

/**
 * runDeepSEOAnalysis: The mega-orchestrator
 */
// runDeepSEOAnalysis body removed

// --- Briefing Generation Helper ---
export function generateBriefingText(seoData: SEOAnalysisResult): string {
    const { top10Urls, lsiKeywords, frequentQuestions, competitors } = seoData;
    
    let brief = `# Briefing Estratégico de Investigación SEO\n\n`;
    
    if (top10Urls && top10Urls.length > 0) {
        brief += `## Análisis de Competidores (Top 10)\n`;
        top10Urls.forEach((comp: any, i: number) => {
            brief += `${i + 1}. [${comp.title}](${comp.url})\n`;
        });
        brief += `\n`;
    }

    if (competitors && competitors.length > 0) {
        brief += `## Inteligencia Competitiva (Snippets Seleccionados)\n`;
        competitors.slice(0, 5).forEach((comp, idx) => {
            if (comp.content) {
                const snippet = comp.content.substring(0, 800) + '...';
                brief += `### [${idx + 1}] ${comp.title}\n${snippet}\n\n`;
            }
        });
        brief += `\n`;
    }
    
    if (lsiKeywords && lsiKeywords.length > 0) {
        brief += `## Palabras Clave LSI & Semánticas\n`;
        lsiKeywords.forEach((k: any) => {
            brief += `- ${k.keyword}\n`;
        });
        brief += `\n`;
    }
    
    if (frequentQuestions && frequentQuestions.length > 0) {
        brief += `## Preguntas Frecuentes (PAA)\n`;
        frequentQuestions.forEach((q: string) => {
            brief += `- ${q}\n`;
        });
        brief += `\n`;
    }
    
    brief += `\n---\n*Generado automáticamente por Nous Research Engine.*`;
    
    return brief.trim();
}

// --- Export to Google Sheets ---
export async function exportToGoogleSheet(title: string, data: any[][], sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                action: 'create_sheet',
                title: title,
                data: data
            })
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to export');
        }

        const result = await response.json();
        return result.url;
    } catch (error) {
        console.error('Export Error:', error);
        throw error;
    }
}

// --- Export to Google Slides ---
export async function exportToGoogleSlides(title: string, slidesData: { title: string, content: string[] }[], sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                action: 'create_slides',
                title: title,
                data: slidesData
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to export');
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Export Error:', error);
        throw error;
    }
}