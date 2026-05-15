

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
            const apiKey = process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY || 'fc-1a6816cc1b414aacbb04e101d5da6479';
            
            const startRes = await fetch('https://api.firecrawl.dev/v1/batch/scrape', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    urls,
                    formats: ["markdown"]
                })
            });
            const startData = await startRes.json();
            
            if (!startData.success) throw new Error("Fallo al iniciar Firecrawl: " + JSON.stringify(startData));

            const jobId = startData.id;
            if (onLog) onLog("INFO", "Firecrawl Batch", `Job ID: ${jobId}. Esperando completado de extracción...`);

            let completed = false;
            let finalData: any = null;
            let attempts = 0;
            
            while (!completed && attempts < 60) { // 3 minutos max
                await new Promise(r => setTimeout(r, 3000));
                attempts++;
                const pollRes = await fetch(`https://api.firecrawl.dev/v1/batch/scrape/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const pollData = await pollRes.json();
                
                if (pollData.status === "completed") {
                    completed = true;
                    finalData = pollData;
                } else if (pollData.status === "failed") {
                    throw new Error("Firecrawl Job failed: " + JSON.stringify(pollData));
                }
            }

            if (!finalData || !finalData.data) throw new Error("Timeout o error obteniendo resultados de Firecrawl.");

            const survivors = finalData.data.filter((d: any) => d.markdown && d.markdown.length > 500);

            if (onLog) {
                onLog("OK", "Scrape Completado", `Se extrajeron exitosamente ${survivors.length} URLs útiles de ${urls.length} solicitadas.`);
            }

            return survivors.map((survivor: any) => {
                const sourceUrl = survivor.metadata?.sourceURL || survivor.metadata?.url;
                // Buscar competidor original
                const comp = competitors.find(c => c.url === sourceUrl || sourceUrl?.includes(c.url)) || { title: survivor.metadata?.title || "Desconocido", snippet: "" };
                
                const textContent = survivor.markdown || '';
                const computedWordCount = survivor.metadata?.wordCount || textContent.split(/\s+/).filter((w: string) => w.length > 0).length || 0;
                
                return {
                    url: sourceUrl || comp.url || "",
                    title: comp.title,
                    originalPosition: (comp as any).originalPosition || null,
                    content: textContent, 
                    summary: textContent.substring(0, 300) + '...',
                    headers: [], // Firecrawl maneja markdown nativo
                    wordCount: computedWordCount
                };
            });

        } catch (e: any) {
            console.error("[ScraperService] Mass Extraction exception:", e);
            throw e;
        }
    },

    async scrapeAndClean(url: string, title: string, onLog?: (p: string, m: string, res?: string) => void, snippet?: string): Promise<ScrapedContent> {
        try {
            if (onLog) onLog("INFO", `${title.substring(0, 20)}...`, "Extrayendo vía Firecrawl...");

            const apiKey = process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY || 'fc-1a6816cc1b414aacbb04e101d5da6479';

            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, formats: ["markdown"] })
            });
            const data = await res.json();

            if (!data.success || !data.data?.markdown) {
                if (onLog) onLog("WARN", `${title.substring(0, 20)}...`, `Firecrawl sin contenido para ${url} — usando snippet`);
                return {
                    url, title,
                    content: snippet || `<p>${title}</p>`,
                    summary: snippet || title,
                    headers: [],
                    wordCount: snippet?.split(/\s+/).length || 0
                };
            }

            const textContent = data.data.markdown;
            const computedWordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;

            return {
                url,
                title: data.data.metadata?.title || title,
                content: textContent,
                summary: textContent.substring(0, 300) + '...',
                headers: [],
                wordCount: computedWordCount
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