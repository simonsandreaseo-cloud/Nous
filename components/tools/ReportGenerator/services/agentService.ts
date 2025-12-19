import { GoogleGenAI, FunctionDeclaration, Type, Tool, FunctionCall, GenerateContentResponse } from "@google/genai";
import { DataManager } from "./dataManager";
import { FilterOptions } from "../types";

// --- Tool Definitions (Schema) ---

const queryMetricsTool: FunctionDeclaration = {
    name: "query_metrics",
    description: "Calcula métricas agregadas (clics, impresiones, CTR, posición) filtrando por fechas, país, URL o palabra clave. Úsalo para ver el rendimiento general de un segmento específico.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            startDate: { type: Type.STRING, description: "Fecha inicio (YYYY-MM-DD)." },
            endDate: { type: Type.STRING, description: "Fecha fin (YYYY-MM-DD)." },
            country: { type: Type.STRING, description: "Filtro exacto de país (ej: 'esp', 'mex')." },
            urlIncludes: { type: Type.STRING, description: "Texto parcial que debe contener la URL." },
            keywordIncludes: { type: Type.STRING, description: "Texto parcial que debe contener la keyword." }
        }
    }
};

const getTopItemsTool: FunctionDeclaration = {
    name: "get_top_items",
    description: "Obtiene un ranking (top X) de páginas, keywords o países ordenados por una métrica. Úsalo para encontrar ganadores, perdedores o patrones.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            dimension: { type: Type.STRING, description: "Qué listar: 'page', 'keyword' o 'country'.", enum: ["page", "keyword", "country"] },
            metric: { type: Type.STRING, description: "Métrica para ordenar: 'clicks' o 'impressions'.", enum: ["clicks", "impressions"] },
            limit: { type: Type.INTEGER, description: "Número de resultados (máx 20)." },
            // Filters
            startDate: { type: Type.STRING, description: "Fecha inicio (YYYY-MM-DD)." },
            endDate: { type: Type.STRING, description: "Fecha fin (YYYY-MM-DD)." },
            country: { type: Type.STRING, description: "Filtro país." },
            urlIncludes: { type: Type.STRING, description: "Filtro URL." },
            keywordIncludes: { type: Type.STRING, description: "Filtro Keyword." }
        },
        required: ["dimension", "metric"]
    }
};

const tools: Tool[] = [
    {
        functionDeclarations: [queryMetricsTool, getTopItemsTool]
    }
];

// --- Agent Service ---

export class AgentService {
    private apiKeys: string[];
    private dataManager: DataManager;
    private modelName: string;
    private currentKeyIndex: number = 0;

    constructor(dataManager: DataManager, modelName: string, apiKeys: string[]) {
        this.apiKeys = apiKeys;
        this.dataManager = dataManager;
        this.modelName = modelName.includes("flash") ? "gemini-2.5-flash" : "gemini-3-pro-preview"; 
    }

    private getClient(): GoogleGenAI {
        return new GoogleGenAI({ apiKey: this.apiKeys[this.currentKeyIndex] });
    }

    private rotateKey(): boolean {
        if (this.currentKeyIndex < this.apiKeys.length - 1) {
            this.currentKeyIndex++;
            return true;
        }
        return false;
    }

    /**
     * Executes the Agentic Loop.
     */
    public async runInvestigation(userContext: string, logCallback: (msg: string) => void): Promise<string> {
        logCallback("🕵️ Agente: Iniciando investigación autónoma...");
        
        const systemPrompt = `Eres un Investigador SEO Senior experto en Data Mining. 
        Tu objetivo es responder a la inquietud del usuario usando EXCLUSIVAMENTE las herramientas de datos proporcionadas.
        
        REGLAS:
        1. Si el usuario pregunta por "caídas", investiga primero la tendencia general, luego busca las URLs/Keywords que más perdieron.
        2. Sé eficiente. No pidas datos redundantes.
        3. Cuando tengas suficientes datos para una conclusión sólida, genera una respuesta final que empiece con "INFORME FINAL:".
        4. Si no encuentras nada relevante, dilo honestamente basándote en los datos.
        
        Rango de fechas disponible: ${JSON.stringify(this.dataManager.getGlobalDateRange())}`;

        // Initialize Chat
        // Note: Managing chat history across key rotations is complex because `chats.create` doesn't export history easily in a structured way for re-init 
        // in new SDK versions without some effort.
        // STRATEGY: We will try to execute the whole agent session with one key. If it fails early, we retry the whole session with the next key.
        // This is safer than trying to stitch chat history between failed calls.

        for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
            const ai = new GoogleGenAI({ apiKey: this.apiKeys[attempt] });
            const chat = ai.chats.create({
                model: this.modelName,
                config: {
                    systemInstruction: systemPrompt,
                    tools: tools,
                    temperature: 0.2,
                }
            });

            try {
                let response = await chat.sendMessage({ 
                    message: `Contexto del Usuario: "${userContext}". Empieza tu investigación.` 
                });

                let turns = 0;
                const maxTurns = 6; 

                while (turns < maxTurns) {
                    const functionCalls = response.functionCalls;

                    if (functionCalls && functionCalls.length > 0) {
                        const parts = [];

                        for (const call of functionCalls) {
                            logCallback(`🕵️ Agente: Ejecutando herramienta [${call.name}]...`);
                            
                            try {
                                const result = this.executeTool(call);
                                parts.push({
                                    functionResponse: {
                                        name: call.name,
                                        id: call.id,
                                        response: { result: result }
                                    }
                                });
                            } catch (e: any) {
                                logCallback(`⚠️ Error en herramienta: ${e.message}`);
                                parts.push({
                                    functionResponse: {
                                        name: call.name,
                                        id: call.id,
                                        response: { error: e.message }
                                    }
                                });
                            }
                        }
                        response = await chat.sendMessage({ message: parts });
                    } else {
                        const text = response.text || "";
                        logCallback("🕵️ Agente: Conclusión generada.");
                        return text;
                    }
                    turns++;
                }
                
                return "El agente alcanzó el límite de pasos sin conclusión definitiva.";

            } catch (e: any) {
                const isQuota = e.message?.includes('429') || e.message?.includes('Quota') || e.status === 429;
                if (isQuota) {
                    logCallback(`⚠️ API Key ${attempt + 1} agotada durante la investigación. Reintentando con siguiente llave...`);
                    continue; // Loop to next key
                }
                throw e; // Fatal error
            }
        }

        return "No se pudo completar la investigación (Todas las llaves fallaron).";
    }

    private executeTool(call: FunctionCall): any {
        const args = call.args as any;
        
        // Build Filter Object
        const filter: FilterOptions = {};
        if (args.startDate) filter.startDate = new Date(args.startDate);
        if (args.endDate) filter.endDate = new Date(args.endDate);
        if (args.country) filter.country = args.country;
        if (args.urlIncludes) filter.urlIncludes = args.urlIncludes;
        if (args.keywordIncludes) filter.keywordIncludes = args.keywordIncludes;

        if (call.name === 'query_metrics') {
            const source = args.keywordIncludes ? 'queries' : 'pages';
            const data = this.dataManager.query(source, filter);
            return this.dataManager.aggregate(data);
        }

        if (call.name === 'get_top_items') {
            const source = args.dimension === 'keyword' ? 'queries' : 
                           args.dimension === 'country' ? 'countries' : 'pages';
            
            const rows = this.dataManager.query(source, filter);
            return this.dataManager.getGroupedRanking(
                rows, 
                args.dimension, 
                args.metric, 
                args.limit || 10
            );
        }

        throw new Error(`Herramienta desconocida: ${call.name}`);
    }
}