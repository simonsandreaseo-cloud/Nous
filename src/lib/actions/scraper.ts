"use server";

import { aiRouter } from "@/lib/ai/router";
import * as cheerio from "cheerio";

export interface ScraperActionContext {
    contentType: string;
    searchIntent: string;
    targetH1: string;
}

export interface ScrapedSurvivor {
    url: string;
    headers: { tag: string; text: string }[];
    content: string;
    summary: string;
    wordCount: number;
}

export interface ScraperActionResult {
    success: boolean;
    survivors: ScrapedSurvivor[];
    final_useful_count: number;
    surviving_pureza: number;
    cognitive_report: string;
    error?: string;
}

/**
 * Extracts and cleans HTML using cheerio if available, otherwise falls back to regex.
 */
async function cleanHtml(html: string): Promise<{ content: string, wordCount: number, headers: { tag: string; text: string }[] }> {
    try {
        const $ = cheerio.load(html);
        
        const headers: { tag: string; text: string }[] = [];
        $('h1, h2').each((_, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t) headers.push({ tag: el.tagName.toUpperCase(), text: t });
        });

        // Remove non-content elements
        $('script, style, nav, footer, aside, header').remove();
        
        const content = $('body').text().replace(/\s+/g, ' ').trim();
        const wordCount = content.split(/\s+/).length;
        
        return { content, wordCount, headers };
    } catch (e) {
        // Regex fallback if cheerio is not installed
        let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
        clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
        clean = clean.replace(/<(nav|footer|aside|header)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
        clean = clean.replace(/<[^>]+>/g, ' '); // remove remaining tags
        const content = clean.replace(/\s+/g, ' ').trim();
        const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        
        return { content, wordCount, headers: [] };
    }
}

/**
 * Performs a single scraping operation using ScraperAPI
 */
async function executeSingleScraping(url: string, retries = 2): Promise<ScrapedSurvivor | null> {
    const scraperApiKey = process.env.SCRAPERAPI_KEY;
    if (!scraperApiKey) {
        console.warn("[ScraperAction] SCRAPERAPI_KEY is not set.");
        return null;
    }

    const apiUrl = `https://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}`;
    
    try {
        // Extended timeout via AbortController for ScraperAPI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                console.warn(`[ScraperAction] 429 Too Many Requests for ${url}. Retrying in 2000ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return executeSingleScraping(url, retries - 1);
            }
            console.warn(`[ScraperAction] ScraperAPI failed for ${url}: ${response.status} ${response.statusText}`);
            return null;
        }

        const html = await response.text();
        const { content, wordCount, headers } = await cleanHtml(html);

        if (wordCount < 200) {
            console.warn(`[ScraperAction] Filtered out ${url}: Only ${wordCount} words (needs 200+)`);
            return null;
        }

        const summary = content.substring(0, 300) + (content.length > 300 ? '...' : '');

        return {
            url,
            headers,
            content,
            summary,
            wordCount
        };
    } catch (error) {
        console.error(`[ScraperAction] Error scraping ${url}:`, error);
        return null;
    }
}

/**
 * Massively scrapes URLs and evaluates them using Gemini via aiRouter
 */
export async function scrapeMassiveAction(urls: string[], context: ScraperActionContext): Promise<ScraperActionResult> {
    if (!urls || urls.length === 0) {
        return { success: false, survivors: [], final_useful_count: 0, surviving_pureza: 0, cognitive_report: "No URLs provided.", error: "No URLs provided" };
    }

    try {
        // 1. Concurrent scraping with Async Pool (Sliding Window)
        const CONCURRENCY_LIMIT = 5;
        const results: PromiseSettledResult<ScrapedSurvivor | null>[] = [];
        let index = 0;
        
        const worker = async () => {
            while (index < urls.length) {
                const currentIndex = index++;
                const url = urls[currentIndex];
                try {
                    const result = await executeSingleScraping(url);
                    results[currentIndex] = { status: 'fulfilled', value: result };
                } catch (error) {
                    results[currentIndex] = { status: 'rejected', reason: error };
                }
            }
        };
        
        const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, urls.length) }, () => worker());
        await Promise.all(workers);

        // 2. Extract survivors (fulfilled promises with non-null results)
        const initialSurvivors: ScrapedSurvivor[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value !== null) {
                initialSurvivors.push(result.value);
            }
        }

        if (initialSurvivors.length === 0) {
            return {
                success: false,
                survivors: [],
                final_useful_count: 0,
                surviving_pureza: 0,
                cognitive_report: "Todos los textos fueron filtrados por longitud (menor a 200 palabras) o fallaron al scrapear.",
                error: "Ninguna URL devolvió contenido útil o todas fallaron al scrapear."
            };
        }

        // 3. Cognitive Filter with Gemini
        // Prepare prompt payload mapping indices to snippets for evaluation
        // PROMPT PROTECTION: Limit to top 10 competitors to avoid token overflow
        const MAX_COMPETITORS = 10;
        const limitedSurvivors = initialSurvivors.slice(0, MAX_COMPETITORS);
        
        const evaluationPayload = limitedSurvivors.map((s, index) => {
            const headersStr = s.headers.length > 0 ? JSON.stringify(s.headers) : 'Sin encabezados';
            const truncatedSummary = s.summary.length > 500 ? s.summary.substring(0, 500) + '...' : s.summary;
            return `[Index ${index}] URL: ${s.url}\nEncabezados: ${headersStr}\nResumen: ${truncatedSummary}\n---`;
        }).join('\n');

        const systemPrompt = `Eres un auditor de calidad de contenido (Content Quality Auditor). 
Tu objetivo es evaluar si los textos scrapeados coinciden con la intención de búsqueda y el tipo de contenido.`;
        
        const prompt = `Contexto del artículo a escribir:
- Content Type: ${context.contentType}
- Search Intent: ${context.searchIntent}
- Target H1: ${context.targetH1}

Textos a evaluar:
${evaluationPayload}

Instrucción:
Evalúa si los encabezados (H1/H2) de este texto aportan información complementaria útil, ángulos distintos o respuestas para escribir un artículo sobre la Intención Maestra. Si sirve como referencia, acéptalo. Retorna un arreglo JSON con los índices de los textos que son ÚTILES. Formato: \`[0, 2, 4]\`.
Si ninguno es útil, retorna \`[]\`. Solo retorna el arreglo JSON, sin texto adicional ni markdown.`;

        let usefulIndices: number[] = [];
        let cognitiveReport = "";

        try {
            const aiResult = await aiRouter.generate({
                model: "gemini-3.1-flash-lite-preview",
                systemPrompt,
                prompt,
                jsonMode: true,
                label: "cognitive_filter"
            });

            // Parse the JSON array
            const textResponse = aiResult.text.trim();
            // Sometimes models wrap in markdown json ... 
            const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed)) {
                usefulIndices = parsed.filter(i => typeof i === 'number' && i >= 0 && i < initialSurvivors.length);
            }
            cognitiveReport = `Gemini evaluó ${initialSurvivors.length} textos y seleccionó ${usefulIndices.length} como útiles.`;
        } catch (aiError: any) {
            console.error("[ScraperAction] AI Evaluation failed:", aiError);
            throw new Error(`Fallo en el filtro cognitivo de IA: ${aiError.message}`);
        }

        const finalSurvivors = initialSurvivors.filter((_, index) => usefulIndices.includes(index));

        return {
            success: true,
            survivors: finalSurvivors,
            final_useful_count: finalSurvivors.length,
            surviving_pureza: initialSurvivors.length,
            cognitive_report: cognitiveReport
        };

    } catch (error: any) {
        console.error("[ScraperAction] Mass extraction error:", error);
        return {
            success: false,
            survivors: [],
            final_useful_count: 0,
            surviving_pureza: 0,
            cognitive_report: "Error crítico durante la extracción masiva.",
            error: error.message
        };
    }
}
