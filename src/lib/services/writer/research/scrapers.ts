
const FIRECRAWL_PROXY = '/api/tools/firecrawl';

export interface ScrapedContent {
    url: string;
    title: string;
    content: string;
    summary: string;
    headers: any[];
    wordCount: number;
}

export const ScraperService = {
    async scrapeMassive(competitors: {url: string, title: string, snippet?: string}[], taskContext: { contentType?: string, searchIntent?: string, h1?: string } = {}, onLog?: (p: string, m: string, res?: string) => void): Promise<ScrapedContent[]> {
        const urls = competitors.map(c => c.url);
        
        if (onLog) onLog("INFO", "Despliegue de Firecrawl", `Iniciando batch scrape para ${urls.length} fuentes en paralelo...`);

        try {
            // 1. Start batch via internal proxy (server-side → no CORS)
            const startRes = await fetch(FIRECRAWL_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'batch_start', urls })
            });
            const startData = await startRes.json();
            
            // Firecrawl "unsupported site" or other API errors — fallback to snippets
            if (!startData.success) {
                console.warn("[ScraperService] Firecrawl batch failed, using SERP snippets:", startData.error);
                if (onLog) onLog("WARN", "Firecrawl", `Fallback a snippets SERP. Razón: ${(startData.error || 'Error desconocido').substring(0, 80)}`);
                return ScraperService._buildFromSnippets(competitors);
            }

            const jobId = startData.id;
            if (onLog) onLog("INFO", "Firecrawl Batch", `Job iniciado (${jobId}). Procesando ${urls.length} URLs...`);

            // 2. Poll until completed (max 3 min, every 3s)
            let finalData: any = null;
            let attempts = 0;
            
            while (attempts < 60) {
                await new Promise(r => setTimeout(r, 3000));
                attempts++;
                
                const pollRes = await fetch(FIRECRAWL_PROXY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'batch_poll', jobId })
                });
                const pollData = await pollRes.json();
                
                if (pollData.status === "completed") {
                    finalData = pollData;
                    break;
                } else if (pollData.status === "failed") {
                    console.warn("[ScraperService] Firecrawl job failed, using snippets");
                    return ScraperService._buildFromSnippets(competitors);
                }
                
                if (onLog && attempts % 3 === 0) {
                    onLog("INFO", "Firecrawl Batch", `Procesando... (${pollData.completed || 0}/${urls.length} completadas)`);
                }
            }

            if (!finalData?.data) {
                console.warn("[ScraperService] Firecrawl timeout, using snippets");
                return ScraperService._buildFromSnippets(competitors);
            }

            // 3. Filter pages with enough content (>500 chars markdown)
            const survivors = finalData.data.filter((d: any) => d.markdown && d.markdown.length > 500);

            if (survivors.length === 0) {
                if (onLog) onLog("WARN", "Firecrawl", "Ningún resultado con contenido suficiente. Usando snippets SERP.");
                return ScraperService._buildFromSnippets(competitors);
            }

            if (onLog) {
                onLog("OK", "Scrape Completado", `${survivors.length} de ${urls.length} URLs extraídas con éxito.`);
            }

            return survivors.map((survivor: any) => {
                const sourceUrl = survivor.metadata?.sourceURL || survivor.metadata?.url || '';
                const comp = competitors.find(c => sourceUrl.includes(c.url) || c.url.includes(sourceUrl)) 
                    || { title: survivor.metadata?.title || "Desconocido", snippet: "" };
                
                const textContent = survivor.markdown || '';
                const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;
                
                return {
                    url: sourceUrl,
                    title: (comp as any).title || survivor.metadata?.title || 'Sin título',
                    originalPosition: (comp as any).originalPosition || null,
                    content: textContent,
                    summary: textContent.substring(0, 300) + '...',
                    headers: [],
                    wordCount
                };
            });

        } catch (e: any) {
            console.error("[ScraperService] Mass Extraction exception:", e);
            if (onLog) onLog("WARN", "Scraper Error", `Error en extracción. Continuando con datos SERP: ${e.message?.substring(0, 60)}`);
            return ScraperService._buildFromSnippets(competitors);
        }
    },

    // Fallback: build ScrapedContent from SERP snippets when scraping fails entirely
    _buildFromSnippets(competitors: {url: string, title: string, snippet?: string}[]): ScrapedContent[] {
        return competitors
            .filter(c => c.snippet && c.snippet.length > 50)
            .map(c => ({
                url: c.url,
                title: c.title,
                content: `<p>${c.snippet}</p>`,
                summary: c.snippet || c.title,
                headers: [],
                wordCount: (c.snippet || '').split(/\s+/).length
            }));
    },

    async scrapeAndClean(url: string, title: string, onLog?: (p: string, m: string, res?: string) => void, snippet?: string): Promise<ScrapedContent> {
        try {
            if (onLog) onLog("INFO", `${title.substring(0, 20)}...`, "Extrayendo vía Firecrawl...");

            const res = await fetch(FIRECRAWL_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'scrape', url })
            });
            const data = await res.json();

            if (!data.success || !data.data?.markdown) {
                if (onLog) onLog("WARN", `${title.substring(0, 20)}...`, `Sin contenido — usando snippet`);
                return {
                    url, title,
                    content: snippet || `<p>${title}</p>`,
                    summary: snippet || title,
                    headers: [],
                    wordCount: snippet?.split(/\s+/).length || 0
                };
            }

            const textContent = data.data.markdown;
            const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;

            return {
                url,
                title: data.data.metadata?.title || title,
                content: textContent,
                summary: textContent.substring(0, 300) + '...',
                headers: [],
                wordCount
            };

        } catch (error: any) {
            return {
                url, title,
                content: snippet || `<p>${title}</p>`,
                summary: snippet || title,
                headers: [],
                wordCount: snippet?.split(/\s+/).length || 0
            };
        }
    }
};