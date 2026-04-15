import { Groq } from 'groq-sdk';
import { AI_CONFIG } from "../../ai/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';


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
                text: () => completion.choices[0]?.message?.content || '',
                reasoning: completion.choices[0]?.message?.reasoning || ''
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

// --- COMPATIBILITY LAYER FOR OPENROUTER (Emulating Gemini interface) ---

class OpenRouterGenerativeModelCompatibility {
    constructor(private client: OpenAI, private model: string, private systemInstruction?: string) {}

    async generateContent(req: any) {
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

        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        });

        return {
            response: {
                text: () => completion.choices[0]?.message?.content || '',
                usage: completion.usage
            }
        };
    }
}

class OpenRouterClientCompatibility {
    constructor(private client: OpenAI) {}
    getGenerativeModel(config: any) {
        return new OpenRouterGenerativeModelCompatibility(this.client, config.model, config.systemInstruction);
    }
}

// --- COMPATIBILITY LAYER FOR CEREBRAS (Emulating Gemini interface) ---

class CerebrasGenerativeModelCompatibility {
    constructor(private client: OpenAI, private model: string, private systemInstruction?: string) {}

    async generateContent(req: any) {
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

        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        });

        return {
            response: {
                text: () => completion.choices[0]?.message?.content || '',
                usage: completion.usage
            }
        };
    }
}

class CerebrasClientCompatibility {
    constructor(private client: OpenAI) {}
    getGenerativeModel(config: any) {
        return new CerebrasGenerativeModelCompatibility(this.client, config.model, config.systemInstruction);
    }
}

// Module-level persistent state for key rotation
const sessionKeys: string[] = [];

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
    explicitHierarchy?: string[],
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    isStrictModel: boolean = false,
    label: string = 'Operación AI',
    timeoutMs: number = 90000
): Promise<T> => {
    // 1. Determine Hierarchy based on label/intent
    type Step = { provider: 'google' | 'groq' | 'openrouter' | 'cerebras', model: string };
    
    const isInternal = (m: string) => m.includes('llama') || m.includes('groq') || m.includes('qwen') || m.includes('kimi');
    const isOpenRouter = (m: string) => m.includes('/') && (!m.includes('google') || m.includes(':free'));
    const isCerebras = (m: string) => m.includes('zai-') || m.includes('gpt-oss') || m.includes('qwen-3-') || m.includes('llama3');

    const resolveStep = (m: string): Step => {
        if (isCerebras(m)) return { provider: 'cerebras', model: m };
        if (isOpenRouter(m)) return { provider: 'openrouter', model: m };
        if (isInternal(m)) return { provider: 'groq', model: m };
        return { provider: 'google', model: m };
    };

    let hierarchy: Step[] = [];

    if (explicitHierarchy && explicitHierarchy.length > 0) {
        hierarchy = explicitHierarchy.map(resolveStep);
    } else {
        const isResearch = label.toLowerCase().includes('seo') || label.toLowerCase().includes('investigación') || label.toLowerCase().includes('research');
        const isWriting = label.toLowerCase().includes('redacción') || label.toLowerCase().includes('humanización') || label.toLowerCase().includes('writing') || label.toLowerCase().includes('artículo');

        const isTechnical = label.toLowerCase().includes('json') || label.toLowerCase().includes('técnico') || label.toLowerCase().includes('schema') || label.toLowerCase().includes('extracción');
        const isExtraction = label.toLowerCase().includes('helios') || label.toLowerCase().includes('limpieza') || label.toLowerCase().includes('cleaner');
        const isUI = label.toLowerCase().includes('ui') || label.toLowerCase().includes('html') || label.toLowerCase().includes('chat') || label.toLowerCase().includes('interfaz');
        const isReasoning = label.toLowerCase().includes('razonamiento') || label.toLowerCase().includes('pensamiento') || label.toLowerCase().includes('reasoning') || label.toLowerCase().includes('lógica');
        const isCognitiveFilter = label.toLowerCase().includes('cognitive_filter') || label.toLowerCase().includes('filtro cognitivo');

        if (isStrictModel) {
            hierarchy = [resolveStep(modelName)];
        } else if (isCognitiveFilter) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.cognitive_filter.map(resolveStep)
            ];
        } else if (isExtraction) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.extraction.map(resolveStep)
            ];
        } else if (isResearch) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.research.map(resolveStep)
            ];
        } else if (isWriting) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.writing.map(resolveStep)
            ];
        } else if (isTechnical) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.technical.map(resolveStep)
            ];
        } else if (isUI) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.ui.map(resolveStep)
            ];
        } else if (isReasoning) {
            hierarchy = [
                ...AI_CONFIG.gemini.hierarchies.reasoning.map(resolveStep)
            ];
        } else {
            // Default logic
            if (modelName.includes('gemini') || modelName.includes('gemma')) {
                 hierarchy = [{ provider: 'google', model: modelName }];
                 hierarchy.push({ provider: 'google', model: AI_CONFIG.gemini.models.flash3_1_lite });
            } else if (isOpenRouter(modelName)) {
                 hierarchy = [{ provider: 'openrouter', model: modelName }];
            } else {
                 hierarchy = [{ provider: 'groq', model: modelName === 'default' ? AI_CONFIG.groq.models.quality : modelName }];
            }
            
            if (!isStrictModel) {
                hierarchy.push(...AI_CONFIG.groq.rotation.map(m => ({ provider: 'groq', model: m } as Step)));
            }
        }
    }

    // Unify all hierarchy to avoid duplicates
    const finalHierarchy = Array.from(new Set(hierarchy.map(s => JSON.stringify(s)))).map(s => JSON.parse(s) as Step);

    const googleKeys = AI_CONFIG.gemini.apiKeys || [];
    const groqKeys = AI_CONFIG.groq.apiKeys || [];
    const openRouterKeys = AI_CONFIG.openrouter.apiKey ? [AI_CONFIG.openrouter.apiKey] : [];
    const cerebrasKeys = AI_CONFIG.cerebras.apiKey ? [AI_CONFIG.cerebras.apiKey] : [];

    if (googleKeys.length === 0 && groqKeys.length === 0 && cerebrasKeys.length === 0) {
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
        const currentKeys = step.provider === 'google' ? googleKeys : (step.provider === 'groq' ? groqKeys : (step.provider === 'cerebras' ? cerebrasKeys : openRouterKeys));
        if (!currentKeys || currentKeys.length === 0) {
            console.warn(`[AI-ORCHESTRATOR] ⚠️ Saltando ${step.provider} porque no hay llaves configuradas.`);
            continue;
        }


        let allKeysFailedRotationReason = true;
        let allKeysFailedQuota = true;

        for (let kIndex = 0; kIndex < currentKeys.length; kIndex++) {
            const apiKey = currentKeys[kIndex];
            totalAttempts++;
            if (totalAttempts > MAX_TOTAL_ATTEMPTS) break;

            try {
                let client: any;
                if (step.provider === 'google') {
                    client = new GoogleGenerativeAI(apiKey);
                } else if (step.provider === 'groq') {
                    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
                    client = new GroqClientCompatibility(groq);
                } else if (step.provider === 'cerebras') {
                    const cerebras = new OpenAI({ 
                        apiKey, 
                        baseURL: 'https://api.cerebras.ai/v1',
                        dangerouslyAllowBrowser: true
                    });
                    client = new CerebrasClientCompatibility(cerebras);
                } else {
                    const openai = new OpenAI({ 
                        apiKey, 
                        baseURL: 'https://openrouter.ai/api/v1',
                        dangerouslyAllowBrowser: true,
                        defaultHeaders: {
                            "HTTP-Referer": "https://nous-seo.com",
                            "X-Title": "Nous 2.0"
                        }
                    });
                    client = new OpenRouterClientCompatibility(openai);
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
                const isServerErr = e.status >= 500 || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503') || errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('deadline');
                const isSize = e.status === 413 || errorMsg.includes('413') || errorMsg.includes('too large') || errorMsg.includes('context_length_exceeded');

                if (isQuota || isServerErr || isSize) {
                    errorLog.push(`${step.provider}/${step.model}: ${e.status || 'ERR'}`);
                    if (onRotation) onRotation(apiKey.slice(-5), isQuota ? "Quota" : (isServerErr ? "Server" : "Size"), totalAttempts, MAX_TOTAL_ATTEMPTS);
                    if (isQuota || isServerErr) await sleep(500 * (kIndex + 1));
                    if (!isQuota) allKeysFailedQuota = false;
                    continue; 
                }

                allKeysFailedRotationReason = false; // It's not a rotation-triggering error, it's something else

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
            console.warn(`[AI-ORCHESTRATOR] ⚠️ Proveedor ${step.provider} parece estar agotado. Pero continuaremos intentando otros modelos si existen en la jerarquía.`);
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
            // The standard @google/genai SDK v2.x constructor takes an options object
            const client = new GoogleGenAI({ apiKey: currentKey });
            return await operation(client, modelName.replace('4.0', 'Imagen-4-Pro'));
        } catch (e: any) {

            attempts++;
            lastError = e;
            console.warn(`[AI-CORE-IMAGEN] Fallo con llave ${attempts}/${maxAttempts}. Motivo: ${e.message}`);
            continue;
        }
    }
    throw lastError || new Error("Se agotaron todas las API Keys para Imagen.");
};

/**
 * Specialized executor for translations that implements a fallback cascade based on language expertise.
 * Uses a delimiter-based prompt to avoid injection and preserve formatting.
 */
export const executeTranslation = async (
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'English'
): Promise<string> => {
    const { TRANSLATION_EXPERTS } = await import('../../ai/config');
    
    // 1. Determine Expert based on language
    let expertModel: string;
    const lang = targetLanguage.toLowerCase();
    
    if (lang.includes('cat') || lang.includes('catalan')) {
        expertModel = TRANSLATION_EXPERTS.catalan;
    } else if (['zh', 'ja', 'ko', 'chinese', 'japanese', 'korean'].some(l => lang.includes(l))) {
        expertModel = TRANSLATION_EXPERTS.asian;
    } else if (['ar', 'ru', 'arabic', 'russian'].some(l => lang.includes(l))) {
        expertModel = TRANSLATION_EXPERTS.complex;
    } else {
        expertModel = TRANSLATION_EXPERTS.default;
    }

    // 2. Build the fallback chain: [Expert, Default, ...FreeModels] preserving order and deduping
    const seen = new Set<string>();
    const explicitHierarchy: string[] = [];
    const addIfUnique = (model: string) => {
        if (!seen.has(model)) {
            seen.add(model);
            explicitHierarchy.push(model);
        }
    };
    addIfUnique(expertModel);
    addIfUnique(TRANSLATION_EXPERTS.default);
    for (const fallback of TRANSLATION_EXPERTS.fallbacks) {
        addIfUnique(fallback);
    }

    // 3. Standardized Prompt with Delimiter to avoid injection
    const delimiter = "<<<TRANSLATION_INPUT>>>";
    const prompt = `### ROLE: You are a professional linguistic expert specializing in ${targetLanguage} translation.
### INSTRUCTION: Translate the following text from ${sourceLanguage} to ${targetLanguage}. Output ONLY the translation, preserving the original formatting and nuance.
### INPUT TEXT:
${delimiter}
${text}
${delimiter}
### TRANSLATION:`;

    // 4. Execute through the rotation system
    try {
        return await executeWithKeyRotation(
            async (client, currentModel) => {
                const model = client.getGenerativeModel({ model: currentModel });
                const result = await model.generateContent(prompt);
                return result.response.text();
            },
            explicitHierarchy[0], // Use the expert as the primary model
            explicitHierarchy,
            undefined,
            undefined,
            false,
            'Translation Cascade'
        );
    } catch (e) {
        console.error("[TRANSLATION-ORCHESTRATOR] Cascade failed, falling back to original text...");
        // Let I18nService handle fallback and logging
        throw e;
    }
};

