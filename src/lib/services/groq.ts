import Groq from "groq-sdk";

const getGroqKey = () => 
    process.env.NEXT_PUBLIC_GROQ_API_KEYS || 
    process.env.NEXT_PUBLIC_GROQ_API_KEY || 
    process.env.GROQ_API_KEYS || 
    process.env.GROQ_API_KEY || 
    "";

import { executeWithKeyRotation } from "./writer/ai-core";

/**
 * Ejecutor para modelos de Groq/Gemini con Cascada Hierárquica.
 * Optimizado para velocidad extrema y resiliencia.
 */
export const executeWithGroq = async (
    prompt: string, 
    systemPrompt: string = "Eres un experto en SEO.",
    preferredModel: string = "default",
    jsonResponse: boolean = true
) => {
    // Detectamos la intención basado en el contenido del prompt o el sistema
    const isWriting = prompt.toLowerCase().includes('escribe') || prompt.toLowerCase().includes('redact') || systemPrompt.toLowerCase().includes('escritor');
    const label = isWriting ? 'Redacción SEO' : 'Investigación SEO';

    return executeWithKeyRotation(
        async (client, model) => {
            const modelObj = client.getGenerativeModel({
                model,
                systemInstruction: systemPrompt,
                generationConfig: {
                    responseMimeType: jsonResponse ? "application/json" : "text/plain",
                    temperature: 0.2
                }
            });
            const res = await modelObj.generateContent(prompt);
            return res.response.text();
        },
        preferredModel,
        undefined,
        undefined,
        false,
        label
    );
};

