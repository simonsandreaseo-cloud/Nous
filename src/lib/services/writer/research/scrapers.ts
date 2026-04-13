import { supabase } from "@/lib/supabase";

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
        
        if (onLog) onLog("INFO", "Despliegue de Rastreadores Nous", `Escaneando la web profunda: procesando ${urls.length} fuentes en paralelo...`);

        try {
            const { data, error } = await supabase.functions.invoke('research-engine', {
                body: { 
                    urls,
                    contentType: taskContext.contentType || "Blog Post",
                    searchIntent: taskContext.searchIntent || "",
                    targetH1: taskContext.h1 || ""
                },
                headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                }
            });

            if (error || !data?.success) {
                console.error("[ScraperService] Mass Extraction failed:", error || data);
                if (onLog) onLog("WARN", "Aviso de Sistema", `Ajustando estrategia. Error subyacente: ${data?.error || error?.message || 'Desconocido'}`);
                return [];
            }

            const survivors = data.survivors || [];
            if (onLog) {
                onLog("OK", "Auditoria de Calidad", `Se descartaron contenidos de bajo valor. ${data.surviving_pureza} fuentes superaron el estandar de calidad estricto.`);
                onLog("IA", "Analisis Cognitivo Nous", `Se seleccionaron ${data.final_useful_count} referencias de alto valor estrategico para la redaccion.`);
            }

            if (typeof window !== 'undefined') {
                (window as any)._lastCognitiveReport = data.cognitive_report;
            }

            return survivors.map((survivor: any) => {
                const comp = competitors.find(c => c.url === survivor.url) || { title: "Desconocido", snippet: "" };
                
                // Fallback robusto para calcular palabras y extractos
                const textContent = survivor.text || (survivor.html ? survivor.html.replace(/<[^>]+>/g, ' ') : '') || '';
                const computedWordCount = survivor.wordCount || textContent.split(/\s+/).filter((w: string) => w.length > 0).length || 0;
                
                return {
                    url: survivor.url,
                    title: comp.title,
                    content: survivor.html || textContent || comp.snippet || `<p>${comp.title}</p>`, 
                    summary: survivor.summary || (textContent ? textContent.substring(0, 300) + '...' : comp.snippet || comp.title),
                    headers: survivor.headers || [],
                    wordCount: computedWordCount
                };
            });

        } catch (e: any) {
            console.error("[ScraperService] Mass Extraction exception:", e);
            return [];
        }
    },

    async scrapeAndClean(url: string, title: string, onLog?: (p: string, m: string, res?: string) => void, snippet?: string): Promise<ScrapedContent> {
        try {
            if (onLog) onLog("INFO", `${title.substring(0, 20)}...`, "Extrayendo HTML via Supabase Edge...");

            const { data, error } = await supabase.functions.invoke('research-engine', {
                body: { urls: [url], isSingleExtraction: true }
            });

            if (data && onLog) {
                onLog("INFO", `${title.substring(0, 20)}...`, `Edge Function responde: ${data.ok ? "SUCCESS" : "FAIL"} (${(data.html || "").length} chars)`);
            }

            if (error || !data?.ok) {
                const errMsg = error?.message || data?.error || "Extraction failed";
                const httpStatus = data?.status;
                
                if (onLog) onLog("WARN", `${title.substring(0, 20)}...`, `Bloqueado (${httpStatus || 'ERR'}) en ${url} - usando snippet como fallback`);
                
                return {
                    url,
                    title,
                    content: snippet || `<p>${title}</p>`,
                    summary: snippet || title,
                    headers: [],
                    wordCount: snippet?.split(/\s+/).length || 0
                };
            }

            const textContent = data.text || (data.html ? data.html.replace(/<[^>]+>/g, ' ') : '') || '';
            const computedWordCount = data.wordCount || textContent.split(/\s+/).filter((w: string) => w.length > 0).length || 0;

            return {
                url,
                title,
                content: data.html || textContent || snippet || `<p>${title}</p>`,
                summary: data.summary || (textContent ? textContent.substring(0, 300) + '...' : snippet || title),
                headers: data.headers || [],
                wordCount: computedWordCount
            };

        } catch (error: any) {
            return {
                url,
                title,
                content: snippet || `<p>${title}</p>`,
                summary: snippet || title,
                headers: [],
                wordCount: snippet?.split(/\s+/).length || 0
            };
        }
    }
};