import { Groq } from 'groq-sdk';
import { AI_CONFIG } from "../../ai/config";
import { GoogleGenerativeAI as GoogleGenAI } from "@google/generative-ai";

// --- COMPATIBILITY LAYER FOR GROQ (Mocking Gemini SDK) ---

class GroqGenerativeModelCompatibility {
    constructor(private groq: Groq, private model: string, private systemInstruction?: string) {}

    async generateContent(req: any) {
        const prompt = typeof req === 'string' ? req : 
                      (req.contents?.[0]?.parts?.[0]?.text || req.prompt || "");
        
        const messages: any[] = [];
        if (this.systemInstruction) {
            messages.push({ role: 'system', content: this.systemInstruction });
        } else if (req.systemInstruction) {
             messages.push({ role: 'system', content: req.systemInstruction });
        }
        
        // Handle Gemini contents array or string
        if (Array.isArray(req.contents)) {
            req.contents.forEach((c: any) => {
                messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts[0].text });
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const completion = await this.groq.chat.completions.create({
            messages,
            model: this.model,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        });

        return {
            response: {
                text: () => completion.choices[0]?.message?.content || ''
            }
        };
    }

    async generateContentStream(req: any) {
        const prompt = typeof req === 'string' ? req : 
                      (req.contents?.[0]?.parts?.[0]?.text || req.prompt || "");
        
        const messages: any[] = [];
        if (this.systemInstruction) messages.push({ role: 'system', content: this.systemInstruction });
        
        if (Array.isArray(req.contents)) {
            req.contents.forEach((c: any) => {
                messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts[0].text });
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const stream = await this.groq.chat.completions.create({
            messages,
            model: this.model,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            stream: true,
        });

        return {
            stream: (async function* () {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) {
                        yield { text: () => text };
                    }
                }
            })()
        };
    }
}

class GroqClientCompatibility {
    constructor(private groq: Groq) {}
    getGenerativeModel(config: any) {
        // Map Gemini models to Groq models
        let model = config.model;
        if (model.includes('gemini') || model.includes('gemma')) {
            const isQuality = model.includes('pro') || model.includes('27b');
            model = isQuality ? AI_CONFIG.groq.models.quality : AI_CONFIG.groq.models.brute;
        }
        return new GroqGenerativeModelCompatibility(this.groq, model, config.systemInstruction);
    }
}

// Module-level persistent state for key rotation
let sessionKeys: string[] = [];

// Helper to check if a key is roughly valid for Groq (usually starts with gsk_)
const isGroqKey = (k: string) => k && k.trim().startsWith('gsk_');
const isValidKey = (k: string) => k && k.trim().length > 10;

/**
 * Executor that handles rotation across multiple Groq API keys. (Formerly Gemini)
 */
/**
 * Unified executor that handles rotation across multiple providers (Google Native and Groq).
 */
export const executeWithKeyRotation = async <T>(
    operation: (client: any, currentModel: string) => Promise<T>,
    modelName: string = 'default',
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    isStrictModel: boolean = false,
    label: string = 'Operación AI',
    timeoutMs: number = 90000
): Promise<T> => {
    // 1. Determine Hierarchy based on label/intent
    const isResearch = label.toLowerCase().includes('seo') || label.toLowerCase().includes('investigación') || label.toLowerCase().includes('research');
    const isWriting = label.toLowerCase().includes('redacción') || label.toLowerCase().includes('humanización') || label.toLowerCase().includes('writing') || label.toLowerCase().includes('artículo');

    type Step = { provider: 'google' | 'groq', model: string };
    let hierarchy: Step[] = [];

    if (isResearch) {
        hierarchy = [
            ...AI_CONFIG.gemini.hierarchies.research.map(m => ({ provider: 'google', model: m } as Step)),
            ...AI_CONFIG.groq.rotation.map(m => ({ provider: 'groq', model: m } as Step))
        ];
    } else if (isWriting) {
        hierarchy = [
            ...AI_CONFIG.gemini.hierarchies.writing.map(m => ({ provider: 'google', model: m } as Step)),
            ...AI_CONFIG.groq.rotation.map(m => ({ provider: 'groq', model: m } as Step))
        ];
    } else {
        // Default: specific model or Groq rotation
        if (modelName.includes('gemini') || modelName.includes('gemma')) {
             hierarchy = [{ provider: 'google', model: modelName }];
        } else {
             hierarchy = [{ provider: 'groq', model: modelName === 'default' ? AI_CONFIG.groq.models.quality : modelName }];
        }
        if (!isStrictModel) {
            hierarchy.push(...AI_CONFIG.groq.rotation.map(m => ({ provider: 'groq', model: m } as Step)));
        }
    }

    // Unify all hierarchy to avoid duplicates
    const finalHierarchy = Array.from(new Set(hierarchy.map(s => JSON.stringify(s)))).map(s => JSON.parse(s) as Step);

    const googleKeys = AI_CONFIG.gemini.apiKeys || [];
    const groqKeys = AI_CONFIG.groq.apiKeys || [];

    if (googleKeys.length === 0 && groqKeys.length === 0) {
        console.error("[AI-ORCHESTRATOR] ❌ NO SE ENCONTRARON API KEYS (Check .env.local)");
    }

    let lastError: any = null;
    let totalAttempts = 0;
    const MAX_TOTAL_ATTEMPTS = 50; 
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Tracking failed providers to fast-fail
    const exhaustedProviders = new Set<string>();
    const errorLog: string[] = [];

    for (const step of finalHierarchy) {
        if (exhaustedProviders.has(step.provider)) {
            console.log(`[AI-ORCHESTRATOR] Saltando ${step.provider}/${step.model} porque el proveedor está agotado de cuota.`);
            continue;
        }

        const currentKeys = step.provider === 'google' ? googleKeys : groqKeys;
        if (!currentKeys || currentKeys.length === 0) continue;

        let allKeysFailedQuota = true;

        for (let kIndex = 0; kIndex < currentKeys.length; kIndex++) {
            const apiKey = currentKeys[kIndex];
            totalAttempts++;
            if (totalAttempts > MAX_TOTAL_ATTEMPTS) break;

            try {
                let client: any;
                if (step.provider === 'google') {
                    client = new GoogleGenAI(apiKey);
                } else {
                    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
                    client = new GroqClientCompatibility(groq);
                }

                console.log(`[AI-ORCHESTRATOR] Intento ${totalAttempts}: ${step.provider}/${step.model} (Llave index ${kIndex})`);
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
                );

                const result = await Promise.race([
                    operation(client, step.model),
                    timeoutPromise
                ]) as T;

                return result;

            } catch (e: any) {
                lastError = e;
                const errorMsg = e.message?.toLowerCase() || "";
                console.warn(`[AI-ORCHESTRATOR] Fallo en ${step.provider}/${step.model}: ${errorMsg}`);

                const isQuota = e.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit');
                const isSize = e.status === 413 || errorMsg.includes('413') || errorMsg.includes('too large') || errorMsg.includes('context_length_exceeded');

                if (isQuota || isSize) {
                    errorLog.push(`${step.provider}/${step.model}: ${isQuota ? '429' : '413'}`);
                    if (onRotation) onRotation(apiKey.slice(-5), isQuota ? "Quota" : "Size", totalAttempts, MAX_TOTAL_ATTEMPTS);
                    if (isQuota) await sleep(300 * (kIndex + 1));
                    continue; 
                }

                allKeysFailedQuota = false; // It's not a quota error, it's something else

                // If it's a model not found, don't try other keys for this model
                if (errorMsg.includes('not found') || errorMsg.includes('not exist') || errorMsg.includes('invalid model')) {
                    console.log(`[AI-ORCHESTRATOR] Modelo ${step.model} no disponible en ${step.provider}. Buscando alternativa...`);
                    break;
                }

                // For other errors (networking, etc), try next key but don't mark as quota fail
                continue;
            }
        }

        // If we tried all keys and all were Quota/RateLimit, mark provider as exhausted for this run
        if (allKeysFailedQuota && currentKeys.length > 0) {
            console.warn(`[AI-ORCHESTRATOR] ⚠️ Proveedor ${step.provider} parece estar agotado. Saltando sus modelos en esta jerarquía.`);
            exhaustedProviders.add(step.provider);
        }

        if (totalAttempts > MAX_TOTAL_ATTEMPTS) break;
    }

    const summary = errorLog.slice(-5).join(', ');
    throw lastError || new Error(`Agotada jerarquía tras ${totalAttempts} intentos. Último error: ${summary}`);
};

/**
 * Executor for Imagen 4 using @google/genai SDK (Kept for Image generation)
 */
export const executeWithImagenRotation = async <T>(
    operation: (client: GoogleGenAI, currentModel: string) => Promise<T>,
    modelName: string = 'imagen-4.0-generate-001',
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    timeoutMs: number = 90000
): Promise<T> => {
    // ... logic remains same as requested previously for image generation ...
    // ... initializing sessionKeys if needed ...
    let currentPool: string[] = [];
    if (keys) {
        currentPool = (Array.isArray(keys) ? keys : [keys]).filter(isValidKey);
    } else {
        const envKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (envKeys) {
            currentPool = envKeys.split(',').map(k => k.trim()).filter(isValidKey);
        }
    }
    // ... rotation loop ...
    let lastError: any = null;
    let attempts = 0;
    const maxAttempts = currentPool.length || sessionKeys.length;

    while (attempts < maxAttempts) {
        const currentKey = currentPool[attempts];
        try {
            // The standard @google/generative-ai SDK constructor takes the API key string
            const client = new GoogleGenAI(currentKey);
            return await operation(client, modelName);
        } catch (e: any) {
            attempts++;
            lastError = e;
            console.warn(`[AI-CORE-IMAGEN] Fallo con llave ${attempts}/${maxAttempts}. Motivo: ${e.message}`);
            continue;
        }
    }
    throw lastError || new Error("Se agotaron todas las API Keys para Imagen.");
};
