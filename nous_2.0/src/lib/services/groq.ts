import Groq from "groq-sdk";

const getGroqKey = () => process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || "";

/**
 * Ejecutor para modelos de Groq (Llama 3.1, 3.3, Mixtral)
 * Optimizado para velocidad extrema.
 * Soporta ejecución en cliente (vía proxy) y servidor (vía SDK).
 */
export const executeWithGroq = async (
    prompt: string, 
    systemPrompt: string = "Eres un experto en SEO y redacción de contenidos.",
    model: string = "llama-3.1-8b-instant",
    jsonResponse: boolean = true
) => {
    // 1. Detect environment
    const isClient = typeof window !== "undefined";

    if (isClient) {
        console.log(`[Groq Service] Ejecutando vía Proxy (Cliente)...`);
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/tools/groq`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, systemPrompt, model, jsonResponse })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Groq Proxy Error: ${err.error || response.statusText}`);
        }

        const data = await response.json();
        return data.result || "";
    }

    // 2. Server-side Execution (SDK)
    const apiKey = getGroqKey();
    if (!apiKey) throw new Error("GROQ_API_KEY no configurada en el servidor.");

    const groq = new Groq({ apiKey });

    try {
        console.log(`[Groq Service] Ejecutando vía SDK (Servidor): ${model}...`);
        
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: model,
            temperature: 0.2,
            max_tokens: 4096,
            response_format: jsonResponse ? { type: "json_object" } : undefined,
        });

        return completion.choices[0]?.message?.content || "";
    } catch (e: any) {
        console.error("[Groq Service] Error:", e.message);
        throw e;
    }
};
