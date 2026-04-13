import { fetchSerperSearch } from "@/lib/services/serper";

/**
 * SERP Provider Service
 * Handles communication with Search Engine Result Page providers.
 */
export const SerpProvider = {
    /**
     * Fetches real SERP data via ValueSERP.
     */
    async fetchRealSERP(query: string): Promise<any> {
        try {
            const apiKey = process.env.NEXT_PUBLIC_VALUESERP_API_KEY || '';
            const url = `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&num=15&location=Spain&gl=es&hl=es&output=json`;
            const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
            if (!res.ok) throw new Error("ValueSERP API Error");
            return await res.json();
        } catch (e) {
            console.error("[SerpProvider] ValueSERP Error:", e);
            return null;
        }
    },

    /**
     * Fetches search results via Serper.dev.
     * Includes resiliency and basic filtering.
     */
    async fetchSerperSearch(query: string): Promise<any[]> {
        try {
            // Reverted to 20 results as requested
            const res = await fetchSerperSearch(query, "es", "es", 30);
            
            if (res && Array.isArray(res)) {
                return res.map((r: any) => ({
                    title: r.title,
                    url: r.link || r.url,
                    snippet: r.snippet
                })).filter(r => {
                    const url = r.url;
                    if (!url) return false;
                    
                    // AUDIT: Optimized regex to avoid false positives in paths
                    // Now matches extensions (pdf/doc) or specific social subdomains, 
                    // but NOT common words like 'download' inside a legitimate blog path.
                    const isBanned = /\.(pdf|docx|zip|exe|epub)(\?|$)/i.test(url) || 
                                   /youtube\.com|vimeo\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|pinterest\.com|linkedin\.com/i.test(url) ||
                                   /(\/download\/|\/resource\/)/i.test(url); // Only if they are directory-like patterns
                    
                    return !isBanned;
                });
            }
            return [];
        } catch (e) {
            console.error(`[SerpProvider] Serper Error for query "${query}":`, e);
            return [];
        }
    },

    /**
     * Executes multiple searches (Multiplexing) to gain different angles of a keyword.
     */
    async multiplexSearch(queries: string[], onLog?: (p: string, m: string) => void): Promise<any[]> {
        const rawResults: any[] = [];
        const uniqueUrls = new Set<string>();

        for (const q of queries.slice(0, 4)) {
            if (onLog) onLog("Buscando Serper", `Query: ${q}`);
            
            // Sequential search with delay for proxy resiliency
            if (rawResults.length > 0) await new Promise(r => setTimeout(r, 600));
            
            const results = await this.fetchSerperSearch(q);
            results.forEach(r => {
                if (!uniqueUrls.has(r.url)) {
                    uniqueUrls.add(r.url);
                    rawResults.push(r);
                    if (onLog) onLog("INFO", "Descubierto", r.url);
                }
            });
        }

        return rawResults;
    }
};
