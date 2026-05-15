
const FIRECRAWL_PROXY = '/api/tools/firecrawl';

// Max concurrent scrapes to avoid rate limiting
const MAX_CONCURRENT = 5;

export interface ScrapedContent {
    url: string;
    title: string;
    content: string;
    summary: string;
    headers: any[];
    wordCount: number;
}

export const ScraperService = {
    /**
     * Scrapes each URL individually in parallel via Promise.allSettled.
     * This way a single failing URL NEVER blocks the rest.
     */
    async scrapeMassive(
        competitors: {url: string, title: string, snippet?: string}[],
        taskContext: { contentType?: string, searchIntent?: string, h1?: string } = {},
        onLog?: (p: string, m: string, res?: string) => void
    ): Promise<ScrapedContent[]> {
        if (onLog) onLog("INFO", "Despliegue de Firecrawl", `Scrapeando ${competitors.length} URLs individualmente en paralelo...`);

        // Process in batches of MAX_CONCURRENT to avoid rate limits
        const results: ScrapedContent[] = [];
        const chunks: typeof competitors[] = [];

        for (let i = 0; i < competitors.length; i += MAX_CONCURRENT) {
            chunks.push(competitors.slice(i, i + MAX_CONCURRENT));
        }

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            if (onLog && chunks.length > 1) {
                onLog("INFO", "Firecrawl", `Procesando lote ${chunkIdx + 1}/${chunks.length} (${chunk.length} URLs)...`);
            }

            const settled = await Promise.allSettled(
                chunk.map(comp => ScraperService._scrapeOne(comp, onLog))
            );

            for (const result of settled) {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
                // rejected = silently skipped, other URLs are unaffected
            }
        }

        const survivors = results.filter(r => r.content && r.content.length > 200);

        if (onLog) {
            onLog("OK", "Scrape Completado", `${survivors.length} de ${competitors.length} URLs extraídas exitosamente.`);
        }

        // If nothing succeeded, fallback to SERP snippets
        if (survivors.length === 0) {
            if (onLog) onLog("WARN", "Firecrawl", "Sin resultados útiles. Usando snippets SERP como fallback.");
            return ScraperService._buildFromSnippets(competitors);
        }

        return survivors;
    },

    /**
     * Scrapes a single URL via the proxy. Returns null on any error (never throws).
     */
    async _scrapeOne(
        comp: {url: string, title: string, snippet?: string},
        onLog?: (p: string, m: string, res?: string) => void
    ): Promise<ScrapedContent | null> {
        try {
            const res = await fetch(FIRECRAWL_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'scrape', url: comp.url })
            });

            if (!res.ok) {
                console.warn(`[Firecrawl] HTTP ${res.status} for ${comp.url}`);
                return ScraperService._fromSnippet(comp);
            }

            const data = await res.json();

            if (!data.success || !data.data?.markdown || data.data.markdown.length < 200) {
                // Gracefully fall back to snippet for this URL
                return ScraperService._fromSnippet(comp);
            }

            const textContent = data.data.markdown;
            const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;

            return {
                url: comp.url,
                title: data.data.metadata?.title || comp.title,
                content: textContent,
                summary: textContent.substring(0, 300) + '...',
                headers: [],
                wordCount
            };

        } catch (e: any) {
            console.warn(`[Firecrawl] Error scraping ${comp.url}:`, e.message);
            return ScraperService._fromSnippet(comp);
        }
    },

    /** Build a ScrapedContent from a SERP snippet (last resort per-URL fallback) */
    _fromSnippet(comp: {url: string, title: string, snippet?: string}): ScrapedContent | null {
        if (!comp.snippet || comp.snippet.length < 50) return null;
        return {
            url: comp.url,
            title: comp.title,
            content: `<p>${comp.snippet}</p>`,
            summary: comp.snippet,
            headers: [],
            wordCount: comp.snippet.split(/\s+/).length
        };
    },

    /** Fallback: build list from SERP snippets when everything fails */
    _buildFromSnippets(competitors: {url: string, title: string, snippet?: string}[]): ScrapedContent[] {
        return competitors
            .map(c => ScraperService._fromSnippet(c))
            .filter((r): r is ScrapedContent => r !== null);
    },

    async scrapeAndClean(url: string, title: string, onLog?: (p: string, m: string, res?: string) => void, snippet?: string): Promise<ScrapedContent> {
        const result = await ScraperService._scrapeOne({ url, title, snippet }, onLog);
        if (result) return result;
        return {
            url, title,
            content: snippet || `<p>${title}</p>`,
            summary: snippet || title,
            headers: [],
            wordCount: snippet?.split(/\s+/).length || 0
        };
    }
};