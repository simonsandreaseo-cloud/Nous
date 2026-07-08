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

        const requestPayload: any = {
            messages,
            model: this.model,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        };

        if (this.model.includes('gemma')) {
            delete requestPayload.response_format;
        }

        const completion = await this.groq.chat.completions.create(requestPayload);

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

        const requestPayload: any = {
            model: this.model,
            messages,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        };

        if (this.model.includes('gemma')) {
            delete requestPayload.response_format;
        }

        const completion = await this.client.chat.completions.create(requestPayload);

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

        const requestPayload: any = {
            model: this.model,
            messages,
            temperature: req.generationConfig?.temperature ?? 0.7,
            max_tokens: req.generationConfig?.maxOutputTokens ?? 4096,
            response_format: req.generationConfig?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        };

        if (this.model.includes('gemma')) {
            delete requestPayload.response_format;
        }

        const completion = await this.client.chat.completions.create(requestPayload);

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
const apiKeyPenalties = new Map<string, number>();

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
    timeoutMs: number = 20000,
    providerOverride?: 'google-ai-studio' | 'vertex-ai' | 'auto'
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

        const isTechnical = label.toLowerCase().includes('json') || label.toLowerCase().includes('técnico') || label.toLowerCase().includes('técnica') || label.toLowerCase().includes('technical') || label.toLowerCase().includes('schema') || label.toLowerCase().includes('extracción');
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
                 hierarchy.push({ provider: 'google', model: AI_CONFIG.gemini.models.flash3_1_lite || 'gemini-3.1-flash-lite-preview' });
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

    const envKeys = process.env.NEXT_PUBLIC_NOUS_API_KEYS || process.env.NOUS_API_KEYS || "";
    console.log(`[AI-ORCHESTRATOR-DEBUG] NOUS_API_KEYS value length: ${envKeys.length}, starts with: ${envKeys.substring(0, 5)}`);
    const allKeys = envKeys ? envKeys.split(',').map(k => k.trim()).filter(isValidKey) : [];
    
    const now = Date.now();
    for (const [key, penaltyExpiry] of apiKeyPenalties.entries()) {
        if (now > penaltyExpiry) apiKeyPenalties.delete(key);
    }
    
    allKeys.sort((a, b) => {
        const penA = apiKeyPenalties.get(a) || 0;
        const penB = apiKeyPenalties.get(b) || 0;
        return penA - penB;
    });
    
    // We categorize them based on prefix or just treat them as a unified pool if the user manages provider-specific keys elsewhere.
    // For now, to keep it simple and safe, we treat all keys in NOUS_API_KEYS as Google keys for the Google provider.
    // Adjust if you have different variables for Groq/OpenRouter.
    // Filtramos para usar SOLO la llave en el index 6 como pidió el usuario (Llave 7)
    const googleKeys = allKeys;
    const groqKeys = AI_CONFIG.groq.apiKeys || [];
    const openRouterKeys = AI_CONFIG.openrouter.apiKey ? [AI_CONFIG.openrouter.apiKey] : [];
    const cerebrasKeys = AI_CONFIG.cerebras.apiKey ? [AI_CONFIG.cerebras.apiKey] : [];

    console.log(`[AI-ORCHESTRATOR] Llaves cargadas: Google(${googleKeys.length}), Groq(${groqKeys.length}), OpenRouter(${openRouterKeys.length}), Cerebras(${cerebrasKeys.length})`);

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
        let useVertex = false;
        if (step.provider === 'google') {
            useVertex = !!process.env.GCP_SERVICE_ACCOUNT;
            if (providerOverride === 'vertex-ai' || step.model === 'gemini-3.1-pro-preview') {
                useVertex = true;
            } else if (providerOverride === 'google-ai-studio') {
                useVertex = false;
            }
        }

        const currentKeys = step.provider === 'google' ? googleKeys : (step.provider === 'groq' ? groqKeys : (step.provider === 'cerebras' ? cerebrasKeys : openRouterKeys));
        if (!currentKeys || currentKeys.length === 0) {
            console.warn(`[AI-ORCHESTRATOR] ⚠️ Saltando ${step.provider} porque no hay llaves configuradas.`);
            continue;
        }

        let allKeysFailedRotationReason = true;
        let allKeysFailedQuota = true;
        let kIndex = 0; // Mantenemos variable para compatibilidad de logs

        while (totalAttempts < MAX_TOTAL_ATTEMPTS) {
            // Ordenar en CADA iteración para asegurar que tomamos la llave con menos penalización actual
            currentKeys.sort((a, b) => {
                const penA = apiKeyPenalties.get(a) || 0;
                const penB = apiKeyPenalties.get(b) || 0;
                return penA - penB;
            });
            
            const apiKey = currentKeys[0];
            
            // Si la MEJOR llave disponible sigue penalizada, evaluamos si esperamos o saltamos de proveedor
            const penaltyExpiry = apiKeyPenalties.get(apiKey) || 0;
            const now = Date.now();
            if (now < penaltyExpiry) {
                const waitTime = penaltyExpiry - now;
                
                // Si el cooldown mínimo es mayor a 120s, es mejor saltar al siguiente proveedor (fallback)
                if (waitTime > 120000) {
                    console.log(`[AI-ORCHESTRATOR] ⏳ Tiempo de espera excesivo (${Math.ceil(waitTime/1000)}s) en ${step.provider}. Abortando este proveedor...`);
                    break;
                }
                
                console.log(`[AI-ORCHESTRATOR] ⏳ Todas las llaves en cooldown para ${step.provider}. Esperando ${Math.ceil(waitTime/1000)}s por la llave ${apiKey.slice(-5)}...`);
                await sleep(waitTime);
            }

            totalAttempts++;
            kIndex++;

            try {
                let client: any;
                if (step.provider === 'google') {
                    if (useVertex) {
                        // Para Vertex AI, extraemos el project_id y pasamos las credenciales directamente via googleAuthOptions
                        let projectId = 'nous-seo-447514';
                        let vertexCredentials = undefined;

                        if (process.env.GCP_SERVICE_ACCOUNT) {
                            try {
                                const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
                                if (creds.project_id) projectId = creds.project_id;
                                vertexCredentials = creds;
                            } catch (e) {
                                console.warn("[executeWithKeyRotation] Error parsing GCP_SERVICE_ACCOUNT", e);
                            }
                        }

                        const { GoogleGenAI } = await import('@google/genai');
                        
                        let vertexLocation = 'us-central1';
                        if (step.model.includes('gemini-3.5') || step.model.includes('gemini-3.1')) {
                            vertexLocation = 'global';
                        }
                        
                        const genAiConfig: any = {
                            project: projectId,
                            location: vertexLocation,
                            vertexai: {
                                project: projectId,
                                location: vertexLocation
                            }
                        };
                        
                        if (vertexCredentials) {
                            genAiConfig.googleAuthOptions = { credentials: vertexCredentials };
                        }
                        
                        const rawGoogleClient = new GoogleGenAI(genAiConfig);

                        client = {
                            getGenerativeModel: (config: any) => {
                                return {
                                    generateContent: async (prompt: any) => {
                                        let finalPrompt = prompt;
                                        if (config.systemInstruction && typeof prompt === 'string') {
                                            finalPrompt = `${config.systemInstruction}\n\n${prompt}`;
                                        }
                                        const result = await rawGoogleClient.models.generateContent({
                                            model: config.model,
                                            contents: finalPrompt
                                        });
                                        return {
                                            response: {
                                                text: () => result.text
                                            }
                                        };
                                    },
                                    generateContentStream: async (prompt: any) => {
                                        let finalPrompt = prompt;
                                        if (config.systemInstruction && typeof prompt === 'string') {
                                            finalPrompt = `${config.systemInstruction}\n\n${prompt}`;
                                        }
                                        const resultStream = await rawGoogleClient.models.generateContentStream({
                                            model: config.model,
                                            contents: finalPrompt
                                        });
                                        return {
                                            stream: (async function* () {
                                                for await (const chunk of resultStream) {
                                                    yield { text: () => chunk.text };
                                                }
                                            })()
                                        };
                                    }
                                };
                            }
                        };
                    } else {
                        const rawGoogleClient = new GoogleGenerativeAI(apiKey);
                        client = {
                            getGenerativeModel: (config: any) => {
                                if (config.model.includes('gemma')) {
                                    const newConfig = { ...config };
                                    const sysInst = newConfig.systemInstruction;
                                    delete newConfig.systemInstruction;
                                    if (newConfig.generationConfig) {
                                        delete newConfig.generationConfig.responseSchema;
                                        delete newConfig.generationConfig.responseMimeType;
                                    }
                                    const nativeModel = rawGoogleClient.getGenerativeModel(newConfig);
                                    return {
                                        generateContent: async (prompt: any) => {
                                            let finalPrompt = prompt;
                                            if (sysInst && typeof prompt === 'string') {
                                                finalPrompt = `${sysInst}\n\n${prompt}`;
                                            }
                                            return nativeModel.generateContent(finalPrompt);
                                        },
                                        generateContentStream: async (prompt: any) => {
                                            let finalPrompt = prompt;
                                            if (sysInst && typeof prompt === 'string') {
                                                finalPrompt = `${sysInst}\n\n${prompt}`;
                                            }
                                            return nativeModel.generateContentStream(finalPrompt);
                                        }
                                    };
                                }
                                return rawGoogleClient.getGenerativeModel(config);
                            }
                        };
                    }
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

                if (useVertex) {
                    console.warn(`[AI-ORCHESTRATOR] ⚠️ Fallo en modelo Vertex. Omitiendo rotación de llaves para Vertex.`);
                    break;
                }

                const isQuota = e.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit');
                const isServerErr = e.status >= 500 || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503') || errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('deadline');
                const isInvalid = e.status === 400 || errorMsg.includes('400') || errorMsg.includes('invalid') || errorMsg.includes('not found');
                const isSize = e.status === 413 || errorMsg.includes('413') || errorMsg.includes('too large') || errorMsg.includes('context_length_exceeded');

                if (isQuota || isServerErr || isInvalid || isSize) {
                    errorLog.push(`${step.provider}/${step.model}: ${e.status || 'ERR'}`);
                    if (onRotation) onRotation(apiKey.slice(-5), isQuota ? "Quota" : (isServerErr ? "Server" : "Invalid"), totalAttempts, MAX_TOTAL_ATTEMPTS);
                    
                    if (isQuota) {
                        let delayMs = 0;
                        const delayMatch = errorMsg.match(/retry(?:delay|\s+in)?\s*"?:?\s*"?(\d+(?:\.\d+)?)\s*s"?/i);
                        
                        if (delayMatch && delayMatch[1]) {
                            delayMs = Math.ceil(parseFloat(delayMatch[1])) * 1000;
                        } else {
                            const isDailyQuota = errorMsg.includes('perday') || errorMsg.includes('daily') || (errorMsg.includes('free_tier_requests') && !errorMsg.includes('retry'));
                            delayMs = isDailyQuota ? (1000 * 60 * 60 * 24) : 60000; // 24h o 60s
                        }

                        apiKeyPenalties.set(apiKey, Date.now() + delayMs);
                        console.warn(`[AI-ORCHESTRATOR] ⚠️ Cuota excedida. Llave ${apiKey.slice(-5)} penalizada por ${Math.ceil(delayMs/1000)}s.`);
                        continue;
                    } else if (isServerErr) {
                        await sleep(500 * (kIndex % currentKeys.length + 1));
                        apiKeyPenalties.set(apiKey, Date.now() + 2000); // Pequeña penalización para forzar rotación
                    } else if (isInvalid || isSize) {
                        // Para errores de payload (413) o request inválido (400), iterar por llaves no sirve de nada. Abortar.
                        break; 
                    }
                    
                    if (!isQuota) allKeysFailedQuota = false;
                    continue; 
                }

                allKeysFailedRotationReason = false; // It's not a rotation-triggering error, it's something else

                // If it's a model not found, don't try other keys for this model
                if (errorMsg.includes('not found') || errorMsg.includes('not exist') || errorMsg.includes('invalid model')) {
                    console.log(`[AI-ORCHESTRATOR] Modelo ${step.model} no disponible en ${step.provider}. Buscando alternativa...`);
                    break;
                }

                // Error no catalogado: penalizar levemente para rotar de llave y no caer en loop infinito
                apiKeyPenalties.set(apiKey, Date.now() + 1000);
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
        const envKeys = process.env.NEXT_PUBLIC_NOUS_API_KEYS || process.env.NOUS_API_KEYS || "";
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

