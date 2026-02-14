
// This service communicates with the local Nous Desktop App via HTTP
const DESKTOP_API_URL = "http://localhost:3001/api";

export interface SERPResult {
    title: string;
    url: string;
    snippet: string;
    position: number;
}

export interface ScrapedContent {
    url: string;
    html: string;
    title: string;
    // Potentially headers structured: { h1: string, h2s: string[], h3s: string[] }
}

export const BriefingService = {
    /**
     * Fetch Google SERP results for a keyword and country
     */
    async fetchSERP(keyword: string, countryCode: string): Promise<SERPResult[]> {
        try {
            // Desktop app should expose a /serp endpoint
            // Payload: { query: keyword, gl: countryCode, num: 10 }
            const response = await fetch(`${DESKTOP_API_URL}/serp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: keyword, gl: countryCode }),
            });

            if (!response.ok) throw new Error("Failed to fetch SERP from Desktop App");

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error("BriefingService: Error fetching SERP", error);
            // Fallback or mock if desktop app is not running?
            // For now, let's return mock data if fetch fails for testing purposes
            console.warn("Returning mock SERP data");
            return [
                { position: 1, title: `Guía Completa de ${keyword}`, url: "https://example.com/guia", snippet: "Aprende todo sobre..." },
                { position: 2, title: `10 Tips para ${keyword}`, url: "https://example.com/tips", snippet: "Los mejores consejos..." },
                { position: 3, title: `¿Qué es ${keyword}?`, url: "https://example.com/que-es", snippet: "Definición y conceptos..." },
            ];
        }
    },

    /**
     * Scrape full HTML content from a list of URLs
     */
    async scrapeContent(urls: string[]): Promise<ScrapedContent[]> {
        try {
            // Desktop app /scrape endpoint
            // Payload: { urls: string[] }
            const response = await fetch(`${DESKTOP_API_URL}/scrape-batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls }),
            });

            if (!response.ok) throw new Error("Failed to scrape content via Desktop App");

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error("BriefingService: Error scraping content", error);
            console.warn("Returning mock Scrape data");
            return urls.map(url => ({
                url,
                title: "Mock Title for " + url,
                html: `<h1>Title</h1><h2>Subtitle 1</h2><p>Content...</p><h2>Subtitle 2</h2>`
            }));
        }
    }
};
