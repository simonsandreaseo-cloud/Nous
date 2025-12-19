
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
export interface ContentItem {
    url: string;
    title: string;
    type: 'product' | 'collection' | 'blog' | 'static' | 'other';
    search_index: string;
}

export interface ArticleConfig {
    projectName: string;
    niche: string;
    topic: string;
    metaTitle: string;
    keywords: string;
    tone: string;
    wordCount: string;
    refUrls: string;
    refContent: string;
    csvData: any[];
    outlineStructure?: any[];
    approvedLinks?: ContentItem[];
    questions?: string[];
    lsiKeywords?: string[];
    creativityLevel?: 'low' | 'medium' | 'high';
    contextInstructions?: string;
    isStrictMode?: boolean;
    strictFrequency?: number;
}

export interface SEOAnalysisResult {
    nicheDetected: string;
    keywordIdeas: { shortTail: string[]; midTail: string[]; };
    autocompleteLongTail: string[];
    frequentQuestions: string[];
    top10Urls: { title: string; url: string; }[];
    lsiKeywords: { keyword: string; count: string; }[];
    recommendedWordCount: string;
    suggestedInternalLinks?: ContentItem[];
}

export interface ImageGenConfig { style: string; colors: string[]; customDimensions: { w: string, h: string }; count: string; userPrompt: string; }
export interface AIImageRequest { id: string; type: 'featured' | 'body'; context: string; prompt: string; alt: string; title: string; filename: string; placement: string; status: 'pending' | 'generating' | 'done' | 'error'; imageUrl?: string; }
export interface VisualResource { brand: string; description: string; url: string; isImage: boolean; }
export interface HumanizerConfig { niche: string; audience: string; keywords: string; notes?: string; lsiKeywords?: string[]; links?: ContentItem[]; isStrictMode?: boolean; strictFrequency?: number; questions?: string[]; }

const isValidKey = (k: string) => k && k.trim().length > 10;

const executeWithKeyRotation = async <T>(keys: string[] | string, operation: (client: GoogleGenAI) => Promise<T>): Promise<T> => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const validKeys = keyList.filter(isValidKey);
    if (validKeys.length === 0) throw new Error("API Keys faltantes.");

    let lastError: any = null;
    for (let i = 0; i < validKeys.length; i++) {
        try {
            if (!validKeys[i]) continue;
            const client = new GoogleGenAI({ apiKey: validKeys[i] });
            return await operation(client);
        } catch (e: any) {
            lastError = e;
            if (e.status === 429 || e.status === 500) continue;
            throw e;
        }
    }
    throw lastError;
};

export const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim());
    const data: ContentItem[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
            data.push({ url: parts[0].trim(), title: parts[1].trim(), type: 'product', search_index: parts[1].toLowerCase() });
        }
    }
    return { data };
};

export const parseJSON = (text: string) => ({ data: JSON.parse(text) });

export const buildPrompt = (config: ArticleConfig): string => {
    const { topic, keywords, tone, wordCount, isStrictMode, strictFrequency, lsiKeywords, questions, outlineStructure } = config;

    let strictRules = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        strictRules = `
### MODO ESTRICTO SEO ACTIVADO (Densidad: ${freq}%)
1. **OBLIGATORIO:** Incluye estas palabras clave semánticas: [${lsiKeywords?.join(', ')}].
2. **FAQS:** Responde de forma directa a: [${questions?.join(', ')}].
3. **DENSIDAD:** ${freq <= 35 ? "Mantén un flujo natural (1-2% densidad)." : "Satura el contenido (3-5% densidad) priorizando el posicionamiento sobre la lírica."}
`;
    }

    return `
Rol: Redactor SEO Senior. 
Marca: ${config.projectName}. Nicho: ${config.niche}.
Objetivo: Generar un artículo que pase filtros de IA y posicione en el TOP 1 de Google.

ESTRUCTURA:
${outlineStructure?.map(h => `${h.type}: ${h.text}`).join('\n')}

REQUISITOS TÉCNICOS:
- Palabras: ${wordCount}.
- Tono: ${tone}.
- Keywords: ${keywords}.
${strictRules}

FORMATO: Retorna solo el BODY del HTML. Sin head, sin markdown.
Al final añade "<!-- METADATA_START -->" y un JSON con title, description y slug.
`;
};

export const generateArticleStream = async (apiKeys: string[] | string, model: string, prompt: string) => {
    return executeWithKeyRotation(apiKeys, async (ai) => {
        return await ai.models.generateContentStream({
            model: model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.7 }
        });
    });
};

export const runSEOAnalysis = async (apiKeys: string[] | string, keyword: string, csvData: any[], projectName: string, serperKey?: string, valueSerpKey?: string, jinaKey?: string): Promise<SEOAnalysisResult> => {
    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Actualizado a Gemini 2.5
            contents: `Analiza SEO para "${keyword}" en el nicho de ${projectName}. Retorna JSON con nicheDetected, keywordIdeas, frequentQuestions, lsiKeywords y top10Urls.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    });
};

export const generateOutlineStrategy = async (apiKeys: string[] | string, config: any, keyword: string) => {
    return executeWithKeyRotation(apiKeys, async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Actualizado a Gemini 2.5
            contents: `Genera estructura SEO (Outline) para "${keyword}". JSON con snippet (title, h1, slug, description) y outline (headers array).`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    });
};

export const cleanAndFormatHtml = (html: string): string => {
    return html.replace(/```html/g, '').replace(/```/g, '').trim();
};

export const autoInterlink = (html: string, csvData: ContentItem[]): string => {
    let linked = html;
    csvData.slice(0, 10).forEach(item => {
        const regex = new RegExp(`\\b${item.title}\\b`, 'i');
        linked = linked.replace(regex, `<a href="${item.url}" target="_blank">${item.title}</a>`);
    });
    return linked;
};

export const refineStyling = (html: string) => html;
export const runHumanizerPipeline = async (apiKeys: string[], html: string, config: any, p: number, onS: any) => ({ html });
export const runSmartEditor = async (apiKeys: string[], html: string, p: number, n: string, onS: any, isS: any, freq: any, lsi: any, q: any) => html;
export const generateSchemaMarkup = async (k: any, m: any, h: any) => "{}";
export const findCampaignAssets = async (k: any, q: any, p: any, c: any) => [];
export const suggestImagePlacements = async (k: any, h: any, c: any) => [];
export const generateRealImage = async (k: any, p: any, c: any, co: any, a: any) => "";
export const compositeWatermark = async (i: any, w: any) => "";
export const searchMoreLinks = async (k: any, key: any, d: any) => [];
export const refineArticleContent = async (k: any, h: any, i: any) => h;
