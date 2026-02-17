import { invoke } from '@tauri-apps/api/core';

export interface SERPResult {
    title: string;
    url: string;
    description: string;
    rank: number;
}

export interface ScrapedContent {
    url: string;
    content: string;
    headers: any[];
    title: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const BriefingService = {
    /**
     * Fetch Google SERP results using the local Desktop Crawler
     */
    async fetchSERP(keyword: string, countryCode: string): Promise<SERPResult[]> {
        if (!isTauri) {
            console.warn("BriefingService: Not in Tauri environment. Returning mock data.");
            return [
                { rank: 1, title: `Guía Completa de ${keyword}`, url: "https://example.com/guia", description: "Aprende todo sobre..." },
                { rank: 2, title: `10 Tips para ${keyword}`, url: "https://example.com/tips", description: "Los mejores consejos..." },
                { rank: 3, title: `¿Qué es ${keyword}?`, url: "https://example.com/que-es", description: "Definición y conceptos..." },
            ];
        }

        try {
            const results: any[] = await invoke('scrape_google_serp', { keyword });
            return results.map(r => ({
                title: r.title,
                url: r.url,
                description: r.description,
                rank: r.rank
            }));
        } catch (error) {
            console.error("BriefingService: Error fetching SERP via Tauri", error);
            throw error;
        }
    },

    /**
     * Scrape full HTML content from a list of URLs using the local Desktop Crawler
     */
    async scrapeContent(urls: string[]): Promise<ScrapedContent[]> {
        if (!isTauri) {
            return urls.map(url => ({
                url,
                title: "Mock Title",
                content: "Mock Content",
                headers: []
            }));
        }

        const results: ScrapedContent[] = [];
        for (const url of urls) {
            try {
                const data: any = await invoke('start_crawl_command', { url });
                results.push({
                    url: data.url,
                    title: data.title,
                    content: data.content,
                    headers: data.headers
                });
            } catch (error) {
                console.error(`BriefingService: Error scraping ${url}`, error);
            }
        }
        return results;
    }
};
