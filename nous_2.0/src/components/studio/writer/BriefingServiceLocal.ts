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
const WS_URL = "ws://127.0.0.1:8181";
const AUTH_TOKEN = "nous-dev-token-2026";

/**
 * Helper to communicate with local node via WebSockets
 */
async function callLocalNode(type: string, payload: any): Promise<any> {
    console.log(`[BriefingServiceLocal] Attempting ${type} via ${WS_URL}...`);
    return new Promise((resolve, reject) => {
        let ws: WebSocket;
        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            console.error("[BriefingServiceLocal] Failed to create WebSocket instance:", e);
            return reject(new Error("No se pudo iniciar la conexión WebSocket."));
        }

        const requestId = Math.random().toString(36).substring(7);

        const timeout = setTimeout(() => {
            console.error(`[BriefingServiceLocal] Timeout (${type}) reached after 30s.`);
            ws.close();
            reject(new Error(`Tiempo de espera agotado para ${type}. ¿Está encendido el servidor Python?`));
        }, 30000);

        ws.onopen = () => {
            console.log(`[BriefingServiceLocal] WS Open. Sending AUTH...`);
            ws.send(JSON.stringify({ type: "AUTH", payload: { token: AUTH_TOKEN } }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`[BriefingServiceLocal] Received: ${data.type}`);

                if (data.type === "AUTH_SUCCESS") {
                    console.log(`[BriefingServiceLocal] Auth Success. Sending request ${requestId}`);
                    ws.send(JSON.stringify({ type, payload: { ...payload, id: requestId } }));
                } else if (data.type === "AUTH_FAILED") {
                    console.error(`[BriefingServiceLocal] Authentication Failed. check token.`);
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error("Error de autenticación con el nodo local."));
                } else if (data.type === `${type.replace('_REQUEST', '')}_RESPONSE`) {
                    if (data.payload.id === requestId) {
                        console.log(`[BriefingServiceLocal] Match found for ${requestId}. Resolving.`);
                        clearTimeout(timeout);
                        ws.close();
                        resolve(data.payload.results);
                    }
                } else if (data.type.endsWith("_ERROR")) {
                    console.error(`[BriefingServiceLocal] Server Error:`, data.payload.message);
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error(data.payload.message || "Error en el nodo local"));
                }
            } catch (err) {
                console.error("[BriefingServiceLocal] Error parsing message:", err);
            }
        };

        ws.onerror = (err) => {
            console.error(`[BriefingServiceLocal] WebSocket ERROR event:`, err);
            clearTimeout(timeout);
            reject(new Error("No se pudo conectar con el servidor local (ws://localhost:8181)."));
        };

        ws.onclose = (event) => {
            console.log(`[BriefingServiceLocal] WS Closed. Code: ${event.code}, Reason: ${event.reason}`);
            clearTimeout(timeout);
        };
    });
}

export const BriefingService = {
    /**
     * Fetch Google SERP results using the local Desktop Crawler
     */
    async fetchSERP(keyword: string, countryCode: string): Promise<SERPResult[]> {
        if (!isTauri) {
            console.log("BriefingService: Fetching SERP via WebSocket fallback...");
            try {
                return await callLocalNode("SERP_REQUEST", { keyword });
            } catch (error) {
                console.error("BriefingService: WebSocket SERP error", error);
                // Fallback to mock only if everything fails
                return [
                    { rank: 1, title: `Guía Completa de ${keyword}`, url: "https://example.com/guia", description: "Aprende todo sobre..." },
                ];
            }
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
            console.log("BriefingService: Scraping content via WebSocket fallback...");
            try {
                return await callLocalNode("SCRAPE_REQUEST", { urls });
            } catch (error) {
                console.error("BriefingService: WebSocket Scrape error", error);
                return urls.map(url => ({
                    url,
                    title: "Error al scrapear",
                    content: "No se pudo conectar con el nodo local.",
                    headers: []
                }));
            }
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

