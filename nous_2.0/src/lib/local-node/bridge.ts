import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';

export type NodeState = {
    status: 'IDLE' | 'CRAWLING' | 'PROCESSING' | 'ERROR';
    activeProcess: any;
    lastError: string | null;
};

type NodeEventCallback = (payload: any) => void;

class LocalBridge {
    private ws: WebSocket | null = null;
    private listeners: Map<string, Set<NodeEventCallback>> = new Map();
    public isConnected: boolean = false;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor() {
        // Only auto-connect in development or Tauri desktop app, not in production web
        if (typeof window !== 'undefined') {
            const isDev = process.env.NODE_ENV === 'development';
            const isTauriApp = (window as any).__TAURI__ !== undefined;

            if (isDev || isTauriApp) {
                this.connect();
            }
        }
    }

    private connect() {
        try {
            this.ws = new WebSocket('ws://127.0.0.1:9001');

            this.ws.onopen = () => {
                console.log('[NOUS BRIDGE] Conectado. Enviando autenticación...');
                this.isConnected = true;
                this.emit('CONNECTED', { timestamp: Date.now() });

                // Handshake (Phase 1: Hardcoded Token)
                this.send('AUTH', { token: "nous-dev-token-2026" });
            };

            this.ws.onclose = () => {
                console.log('[NOUS BRIDGE] Desconectado. Reintentando en 3s...');
                this.isConnected = false;
                this.emit('DISCONNECTED', { timestamp: Date.now() });
                this.scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                console.warn('[NOUS BRIDGE] Error de conexión:', err);
                this.ws?.close();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Emitir evento específico si existe (ej: STATE_UPDATE)
                    if (data.type) {
                        this.emit(data.type, data.payload);
                    }
                } catch (e) {
                    console.error('[NOUS BRIDGE] Error parseando mensaje:', e);
                }
            };
        } catch (e) {
            console.error('[NOUS BRIDGE] Fallo fatal al conectar:', e);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }

    // --- Public API ---

    public on(eventType: string, callback: NodeEventCallback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)?.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(eventType)?.delete(callback);
        };
    }

    public emit(eventType: string, payload: any) {
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            callbacks.forEach(cb => cb(payload));
        }
    }

    public send(type: string, payload: any = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[NOUS BRIDGE] No se puede enviar mensaje: Desconectado');
            return;
        }
        this.ws.send(JSON.stringify({ type, payload }));
    }

    /**
     * Legacy/Hybrid: Checks if Tauri environment is available.
     */
    public isTauriAvailable(): boolean {
        try {
            return isTauri();
        } catch {
            return false;
        }
    }

    /**
     * Start the deep crawler via WSS
     */
    public startCrawl(options: { keyword?: string, url?: string, mode: 'search' | 'scrape' }) {
        this.send('START_CRAWL', options);
    }

    /**
     * Promisified crawl method for UI consumption
     */
    public crawl(options: { keyword?: string, url?: string, mode: 'search' | 'scrape' }): Promise<any> {
        return new Promise((resolve, reject) => {
            let resultFound = false;

            const unsubscribeLogs = this.on('LOG', (payload: any) => {
                if (payload.source === 'crawler.js') {
                    try {
                        // Extract JSON from potential mixed output
                        const jsonMatch = payload.message.match(/\{.*\}/);
                        if (jsonMatch) {
                            const data = JSON.parse(jsonMatch[0]);
                            if (data.success && data.data) {
                                resultFound = true;
                                unsubscribeLogs();
                                unsubscribeComplete();
                                resolve(data);
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            });

            const unsubscribeComplete = this.on('TASK_COMPLETE', (payload: any) => {
                if (payload.script === 'crawler.js') {
                    // Give a small grace period for log to arrive? No, usually log comes before complete.
                    if (!resultFound) {
                        unsubscribeLogs();
                        unsubscribeComplete();
                        reject(new Error('Crawler finished without returning valid data'));
                    }
                }
            });

            // Timeout after 60s
            setTimeout(() => {
                if (!resultFound) {
                    unsubscribeLogs();
                    unsubscribeComplete();
                    reject(new Error('Crawler timeout'));
                }
            }, 60000);

            this.startCrawl(options);
        });
    }

    /**
    * Start the data refinery via WSS
    */
    public startRefinery(options: any) {
        this.send('START_REFINERY', options);
    }

    /**
     * Promisified refinery method
     */
    public refineData(file: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let resultFound = false;

            const unsubscribeLogs = this.on('LOG', (payload: any) => {
                if (payload.source === 'refinery.js') {
                    try {
                        const jsonMatch = payload.message.match(/\{.*\}/);
                        if (jsonMatch) {
                            const data = JSON.parse(jsonMatch[0]);
                            if (data.success) {
                                resultFound = true;
                                unsubscribeLogs();
                                unsubscribeComplete();
                                resolve(data);
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            });

            const unsubscribeComplete = this.on('TASK_COMPLETE', (payload: any) => {
                if (payload.script === 'refinery.js') {
                    if (!resultFound) {
                        unsubscribeLogs();
                        unsubscribeComplete();
                        reject(new Error('Refinery finished without returning valid data'));
                    }
                }
            });

            // Timeout after 5 minutes (refinery can be slow)
            setTimeout(() => {
                if (!resultFound) {
                    unsubscribeLogs();
                    unsubscribeComplete();
                    reject(new Error('Refinery timeout'));
                }
            }, 300000);

            this.startRefinery({ file });
        });
    }

    // --- NOUS FLUX (Chronos + Nexus) ---

    public createFluxTask(title: string, category: string, priority: 'low' | 'medium' | 'high' = 'medium') {
        this.send('FLUX_CREATE_TASK', { title, category, priority });
    }

    public getFluxTasks() {
        this.send('FLUX_GET_TASKS');
    }

    public startFluxTimer(taskId: string, description: string) {
        this.send('FLUX_START_TIMER', { taskId, description });
    }

    public stopFluxTimer() {
        this.send('FLUX_STOP_TIMER');
    }

    public getFluxStats() {
        this.send('FLUX_GET_STATS');
    }

    // --- IA LOCAL (Unified Engine) ---

    public getAIStatus() {
        this.send('AI_GET_STATUS');
    }

    public checkModels() {
        this.send('CHECK_MODELS');
    }

    public getModelsStatus() {
        this.send('GET_MODELS_STATUS');
    }

    /**
     * Envía un prompt a la IA local y maneja la respuesta por partes (streaming).
     * Retorna una Promesa que se resuelve con el texto final generado.
     */
    public promptAI(text: string, onChunk?: (chunk: string) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const promptId = crypto.randomUUID();
            let accumulatedText = "";

            const unsubscribeChunk = this.on('AI_RESPONSE_CHUNK', (payload: any) => {
                if (payload.id === promptId) {
                    accumulatedText += payload.textChunk;
                    if (onChunk) onChunk(payload.textChunk);
                }
            });

            const unsubscribeComplete = this.on('AI_RESPONSE_COMPLETE', (payload: any) => {
                if (payload.id === promptId) {
                    unsubscribeChunk();
                    unsubscribeComplete();
                    unsubscribeError();
                    resolve(payload.fullText);
                }
            });

            const unsubscribeError = this.on('AI_ERROR', (payload: any) => {
                if (payload.id === promptId) {
                    unsubscribeChunk();
                    unsubscribeComplete();
                    unsubscribeError();
                    reject(new Error(payload.message));
                }
            });

            // Timeout tras 5 minutos (la IA podría tardar)
            setTimeout(() => {
                unsubscribeChunk();
                unsubscribeComplete();
                unsubscribeError();
                reject(new Error('AI prompt timeout'));
            }, 300000);

            this.send('AI_PROMPT', { id: promptId, text });
        });
    }
}

// Lazy singleton instance - only created when accessed
let _instance: LocalBridge | null = null;

function getInstance(): LocalBridge {
    if (!_instance) {
        _instance = new LocalBridge();
    }
    return _instance;
}

// Export a proxy that lazy-loads the instance
export const LocalNodeBridge = new Proxy({} as LocalBridge, {
    get(target, prop) {
        return getInstance()[prop as keyof LocalBridge];
    }
});
