import { aiRouter } from "@/lib/ai/router";
import { safeJsonExtract } from "@/utils/json";

export interface SemanticMap {
    source: string;
    map: string;
}

export interface AnchorMapNode {
    level: number;
    text: string;
    semantic_anchors: string[]; // e.g. ["[S1-P2]", "[S3-P0]"]
    lsi_targets: string[];      // e.g. ["marketing digital", "estrategia"]
    instructions?: string;      // Specific guidelines for the drafter
}

export class ExperimentalEditor {
    
    /**
     * The Editor (Inteligencia Táctica)
     * Consume el mapa semántico truncado y las Golden Keywords (matemáticas)
     * para generar un Anchor Map (Esquema quirúrgico).
     */
    static async generateOutline(params: {
        keyword: string,
        semanticMaps: SemanticMap[],
        lsiKeywords: string[],
        leaderKeywords: any[],
        facts?: string[],
        argot?: string[],
        masterIntent?: string,
        taskContext?: any
    }): Promise<AnchorMapNode[]> {
        
        const { keyword, semanticMaps, lsiKeywords, leaderKeywords, facts = [], argot = [], masterIntent = "", taskContext = {} } = params;

        // Limitar la cantidad de mapas semánticos a 3 para evitar desbordar el contexto de forma innecesaria
        const mapsText = semanticMaps.slice(0, 3).map(sm => `\n--- FUENTE: ${sm.source} ---\n${sm.map}`).join('\n');
        
        const leaderKwsStr = leaderKeywords && leaderKeywords.length > 0 
            ? leaderKeywords.slice(0, 10).map(k => k.keyword).join(', ') 
            : 'No disponible';

        const userBrief = taskContext?.brief ? `\n\n[INSTRUCCIÓN MAESTRA DEL USUARIO]:\n${taskContext.brief}\nDEBES ADAPTAR TODA LA ESTRUCTURA A ESTA REGLA.` : '';
        const userObs = taskContext?.metadata?.observaciones || taskContext?.observaciones ? `\n\n[OBSERVACIONES ESPECÍFICAS]:\n${taskContext?.metadata?.observaciones || taskContext?.observaciones}\n` : '';

        const systemPrompt = `Eres el "Editor Táctico" de un motor de contenido SEO de nueva generación.
Tu misión es diseñar un esquema (Outline) quirúrgico y matemáticamente preciso para posicionar por la keyword: "${keyword}".

[INTENCIÓN DE BÚSQUEDA DEL MERCADO]:
${masterIntent}

[KEYWORDS LSI (Extraídas por TF-IDF - ¡Úsalas!)]:
${lsiKeywords.join(', ')}

[KEYWORDS DEL LÍDER DEL SERP]:
${leaderKwsStr}

[FACTS (DATOS DUROS A INCLUIR)]:
${facts.length > 0 ? facts.join('\n- ') : 'No detectados'}

[ARGOT (JERGA DEL NICHO)]:
${argot.length > 0 ? argot.join(', ') : 'No detectada'}

[MAPA SEMÁNTICO DE LA COMPETENCIA (FRAGMENTADO)]:
(Cada línea tiene un ID quirúrgico del tipo [S1-P2] que indica Sección y Párrafo, seguido del texto truncado).
${mapsText}
${userBrief}${userObs}

REGLAS ESTRICTAS DE SALIDA (FORMATO JSON):
1. Debes generar una lista de objetos JSON que representan el esquema del artículo (H2 y H3).
2. Cada objeto debe tener el formato estricto:
{
  "level": 2 o 3,
  "text": "Título del encabezado",
  "semantic_anchors": ["ID", "ID"], 
  "lsi_targets": ["keyword1", "keyword2"],
  "instructions": "Pautas específicas para el redactor..."
}
3. "semantic_anchors": Array de IDs (ej. "[S2-P1]") del Mapa Semántico que el redactor deberá consultar para escribir esa sección. Escoge solo los fragmentos más relevantes.
4. "lsi_targets": Asigna entre 1 y 3 LSI keywords de la lista proporcionada que obligatoriamente deben usarse en esa sección.
5. "instructions": Debes redactar una pauta específica para el redactor (ej. "Usa un tono persuasivo y menciona el fact del 80%."). Usa los Facts y el Argot disponibles.
6. El esquema debe ser lógico, persuasivo y seguir las mejores prácticas SEO.
7. RETORNA EXCLUSIVAMENTE EL JSON VÁLIDO EN UN BLOQUE DE CÓDIGO (array de objetos). Sin explicaciones adicionales.`;

        try {
            // Intentamos con un modelo rápido y capaz de razonar estructura
            const response = await aiRouter.generate({
                systemPrompt: systemPrompt,
                userPrompt: "Genera el Anchor Map JSON ahora.",
                model: "gemini-3.1-flash-lite-preview",
                fallbackModels: ["gemini-3-flash-preview", "gemini-2.5-flash-lite"],
                temperature: 0.3
            });

            const parsed = safeJsonExtract<AnchorMapNode[]>(response, []);
            
            if (parsed && parsed.length > 0) {
                return parsed;
            } else {
                throw new Error("El LLM no devolvió un JSON válido para el Anchor Map.");
            }

        } catch (error) {
            console.error("🔥 [ExperimentalEditor] Error generando Anchor Map:", error);
            // Fallback súper básico en caso de error crítico del LLM
            return [
                {
                    level: 2,
                    text: `Guía Completa sobre ${keyword}`,
                    semantic_anchors: [],
                    lsi_targets: lsiKeywords.slice(0, 3)
                }
            ];
        }
    }
}
