/**
 * LocalAIService - Centralized communication with Local AI Nodes (Ollama, ComfyUI, etc.)
 * 
 * This service handles WebSocket connections and prompt orchestration 
 * for local deployments, ensuring fallback mechanisms and unified state.
 */

export class LocalAIService {
    private static AUTH_TOKEN = 'nous-dev-token-2026';
    private static TEXT_NODE_URL = 'ws://localhost:11434';
    private static IMAGE_NODE_URL = 'ws://localhost:8181';

    /**
     * Queries a local LLM node (compatible with the Nous local protocol).
     */
    static async queryText(prompt: string, timeoutMs: number = 120000): Promise<string> {
        return new Promise((resolve, reject) => {
            const isBrowser = typeof window !== 'undefined';
            const WS = isBrowser ? window.WebSocket : require('ws');
            
            const ws = new WS(this.TEXT_NODE_URL);
            const promptId = crypto.randomUUID();
            let fullText = "";

            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("Timeout waiting for Local AI Text Node"));
            }, timeoutMs);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'AUTH', payload: { token: this.AUTH_TOKEN } }));
            };

            ws.onmessage = (event: any) => {
                try {
                    const data = JSON.parse(isBrowser ? event.data : event);
                    if (data.type === 'AUTH_SUCCESS') {
                        ws.send(JSON.stringify({ type: 'AI_PROMPT', payload: { id: promptId, text: prompt } }));
                    } else if (data.type === 'AI_RESPONSE_CHUNK' && data.payload.id === promptId) {
                        fullText += data.payload.textChunk;
                    } else if (data.type === 'AI_RESPONSE_COMPLETE' && data.payload.id === promptId) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(data.payload.fullText);
                    } else if (data.type === 'AI_ERROR' && data.payload.id === promptId) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(data.payload.message));
                    }
                } catch (e) {}
            };

            ws.onerror = (e: any) => {
                clearTimeout(timeout);
                reject(new Error("Local Text Node unavailable: " + (e.message || "Connection refused")));
            };
        });
    }

    /**
     * Queries a local Image node (SDXL Turbo / ComfyUI based).
     */
    static async generateImage(prompt: string, timeoutMs: number = 120000): Promise<string> {
        return new Promise((resolve, reject) => {
            const isBrowser = typeof window !== 'undefined';
            const WS = isBrowser ? window.WebSocket : require('ws');

            const ws = new WS(this.IMAGE_NODE_URL);
            const promptId = crypto.randomUUID();

            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("Timeout waiting for Local Image Node"));
            }, timeoutMs);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'AUTH', payload: { token: this.AUTH_TOKEN } }));
            };

            ws.onmessage = (event: any) => {
                try {
                    const data = JSON.parse(isBrowser ? event.data : event);
                    if (data.type === 'AUTH_SUCCESS') {
                        ws.send(JSON.stringify({ type: 'IMAGE_PROMPT', payload: { id: promptId, text: prompt } }));
                    } else if (data.type === 'IMAGE_RESPONSE_COMPLETE' && data.payload.id === promptId) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(data.payload.base64);
                    } else if (data.type === 'IMAGE_ERROR' && data.payload.id === promptId) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(data.payload.message));
                    }
                } catch (e) {}
            };

            ws.onerror = (e: any) => {
                clearTimeout(timeout);
                reject(new Error("Local Image Node unavailable. Verify proxy/server is running on 8181."));
            };
        });
    }
}
