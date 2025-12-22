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
    private ai: GoogleGenAI;
    private dataManager: DataManager;
    private modelName: string;

    constructor(dataManager: DataManager, modelName: string, apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey: apiKey });
        this.dataManager = dataManager;
        this.modelName = modelName.includes("flash") ? "gemini-2.5-flash" : "gemini-3-pro-preview"; // Force concise tools models
    }

    /**
     * Executes the Agentic Loop.
     * 1. Planner: Decides what data is needed based on user context.
     * 2. Executor: Calls DataManager tools.
     * 3. Analyst: Synthesizes results.
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

        // Chat History
        const chat = this.ai.chats.create({
            model: this.modelName,
            config: {
                systemInstruction: systemPrompt,
                tools: tools,
                temperature: 0.2, // Low temp for precision
            }
        });

        let response: GenerateContentResponse = await chat.sendMessage({
            message: `Contexto del Usuario: "${userContext}". Empieza tu investigación.`
        });

        let turns = 0;
        const maxTurns = 6; // Safety limit

        while (turns < maxTurns) {
            // 1. Check for Function Calls
            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const parts = [];

                for (const call of functionCalls) {
                    logCallback(`🕵️ Agente: Ejecutando herramienta [${call.name}]...`);

                    try {
                        const result = this.executeTool(call);
                        // logCallback(`   > Datos obtenidos: ${JSON.stringify(result).substring(0, 100)}...`);

                        parts.push({
                            functionResponse: {
                                name: call.name,
                                id: call.id, // Mandatory in new SDK
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

                // 2. Send Tool Results back to Model
                response = await chat.sendMessage({ message: parts });
            } else {
                // No function calls -> Final Answer or More Questions
                const text = response.text || "";
                logCallback("🕵️ Agente: Conclusión generada.");
                return text;
            }
            turns++;
        }

        return "El agente alcanzó el límite de pasos sin conclusión definitiva.";
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
            const rows = this.dataManager.query('pages', filter); // Default to pages for metrics unless context implies otherwise, simpler for now
            // Note: Ideally query_metrics should decide source based on args, but for simplicity:
            // If keyword filter exists, query 'queries', else 'pages'
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
