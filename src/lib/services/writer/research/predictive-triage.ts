import { aiRouter } from "@/lib/ai/router";
import { safeJsonExtract } from "@/utils/json";
import { SemanticMap } from "./experimental-editor";

export interface TriageResult {
    curated_lsi: string[];
    curated_leader_keywords: string[];
    facts: string[];
    argot: string[];
}

export class PredictiveTriage {
    
    /**
     * Predictive Triage (Curaduría por IA & Extracción de Autoridad)
     * Purifica las keywords matemáticas crudas y extrae "Facts" (datos duros) 
     * y "Argot" (jerga) del mapa semántico para inyectar autoridad extrema.
     */
    static async runTriage(params: {
        keyword: string,
        rawLsi: string[],
        rawLeaderKeywords: string[],
        semanticMaps: SemanticMap[]
    }): Promise<TriageResult> {
        const { keyword, rawLsi, rawLeaderKeywords, semanticMaps } = params;

        // Limit the context size
        const mapsText = semanticMaps.slice(0, 3).map(sm => `\n--- FUENTE: ${sm.source} ---\n${sm.map}`).join('\n');
        
        const systemPrompt = `Eres el "Curador de Inteligencia" de Nous 3.0.
Tu trabajo es purificar listas de palabras clave para la keyword objetivo: "${keyword}" y extraer elementos de autoridad pura (datos duros y jerga).

[KEYWORDS LSI MATEMÁTICAS CRUDAS]:
${rawLsi.join(', ')}

[KEYWORDS DEL LÍDER DEL SERP]:
${rawLeaderKeywords.join(', ')}

[MAPA SEMÁNTICO (MUESTRA DE LA COMPETENCIA)]:
${mapsText}

REGLAS DE SALIDA (FORMATO JSON ESTRICTO):
Debes retornar un único objeto JSON con estas 4 propiedades:
1. "curated_lsi": Array de strings. Filtra la lista cruda de LSI, eliminando marcas de competidores, nombres propios irrelevantes o errores matemáticos. Quédate con las 15-20 más valiosas.
2. "curated_leader_keywords": Array de strings. Filtra las keywords del líder. Elimina las que no tengan intención alineada con "${keyword}".
3. "facts": Array de strings (3 a 5). Extrae del Mapa Semántico datos duros (ej. "El 80% de...", "En 2024 se descubrió...", "La ley X de Y..."). Solo hechos reales citados en la competencia.
4. "argot": Array de strings (3 a 5). Extrae jerga técnica o términos hiper-específicos del nicho presentes en el Mapa Semántico.

RETORNA SOLO EL JSON DENTRO DE UN BLOQUE DE CÓDIGO.`;

        try {
            const response = await aiRouter.generate({
                systemPrompt,
                userPrompt: "Ejecuta el Triage Predictivo y devuelve el JSON.",
                model: "gemini-3.1-flash-lite-preview",
                fallbackModels: ["gemini-3-flash-preview", "gemini-2.5-flash-lite"],
                temperature: 0.1
            });

            const parsed = safeJsonExtract<TriageResult>(response, null);
            
            if (parsed && Array.isArray(parsed.curated_lsi)) {
                return parsed;
            }

            throw new Error("Formato JSON inválido devuelto por LLM en Predictive Triage.");

        } catch (error) {
            console.error("🔥 [PredictiveTriage] Error durante el triage:", error);
            // Fallback seguro: Devolver lo original truncado y listas vacías de authority.
            return {
                curated_lsi: rawLsi.slice(0, 20),
                curated_leader_keywords: rawLeaderKeywords.slice(0, 10),
                facts: [],
                argot: []
            };
        }
    }
}
