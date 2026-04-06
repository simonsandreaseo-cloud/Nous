import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";


// Module-level persistent state for key rotation
let sessionKeys: string[] = [];

// Helper to check if a key is roughly valid
const isValidKey = (k: string) => k && k.trim().length > 10;

/**
 * Executor that handles rotation across multiple Gemini API keys.
 * If a key fails due to quota (429), it's moved to the end of the rotation list 
 * to optimize subsequent calls.
 */
export const executeWithKeyRotation = async <T>(
    operation: (client: GoogleGenerativeAI, currentModel: string) => Promise<T>,
    modelName: string = 'gemini-3.1-flash-lite-preview',
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    isStrictModel: boolean = false,
    label: string = 'Operación AI',
    timeoutMs: number = 90000
): Promise<T> => {
    // 1. Determine Model Fallback Order
    const primary = modelName;
    const secondary = primary === 'gemini-3.1-flash-lite-preview' ? 'gemma-3-27b-it' : 'gemini-3.1-flash-lite-preview';
    const parachute1 = 'gemini-2.5-flash';
    const baseline = 'gemini-2.5-flash-lite';
    
    // If strict, only use the requested model
    const modelsToTry = isStrictModel 
        ? [primary] 
        : Array.from(new Set([primary, secondary, parachute1, baseline]));

    // 2. Initialize sessionKeys if needed
    let currentPool: string[] = [];
    if (keys) {
        currentPool = (Array.isArray(keys) ? keys : [keys]).filter(isValidKey);
    } else {
        const envKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (envKeys) {
            currentPool = envKeys.split(',').map(k => k.trim()).filter(isValidKey);
        }
    }

    if (sessionKeys.length === 0) {
        sessionKeys = [...currentPool];
    } else {
        const newKeys = currentPool.filter(k => !sessionKeys.includes(k));
        if (newKeys.length > 0) sessionKeys.push(...newKeys);
    }

    if (sessionKeys.length === 0) {
        throw new Error("API Keys faltantes o inválidas en el entorno.");
    }

    let lastError: any = null;
    let totalAttempts = 0;
    const GLOBAL_MAX_ATTEMPTS = 10; // Prevent infinite loops in batch mode

    // Loop through fallback models
    for (const targetModel of modelsToTry) {
        let attempts = 0;
        const maxAttempts = sessionKeys.length;
        
        if (totalAttempts >= GLOBAL_MAX_ATTEMPTS) break;

        console.log(`[AI-CORE] Probando Modelo: ${targetModel} (Pool: ${maxAttempts} keys)`);

        while (attempts < maxAttempts && totalAttempts < GLOBAL_MAX_ATTEMPTS) {
            const currentKey = sessionKeys[0];
            totalAttempts++;

            try {
                const client = new GoogleGenerativeAI(currentKey);
                
                // Add a local timeout for the AI operation itself
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
                );

                const result = await Promise.race([
                    operation(client, targetModel),
                    timeoutPromise
                ]) as T;

                return result;
            } catch (e: any) {
                attempts++;
                lastError = e;

                // LOG CRÍTICO PARA EL USUARIO
                console.error(`[AI-CORE] Fallo en [${label}] usando ${targetModel}. Llave: ${currentKey.substring(0, 5)}... Motivo: ${e.message}`);

                const isQuotaError = e.status === 429 || e.code === 429 || 
                    (e.message && (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('limit') || e.message.includes('429')));
                const isServerIssue = e.status === 503 || e.status === 500 || 
                    (e.message && (e.message.includes('503') || e.message.includes('500') || e.message.toLowerCase().includes('high demand') || e.message.toLowerCase().includes('overloaded') || e.message.toLowerCase().includes('temporary issue')));
                const isInvalidKey = e.status === 400 || e.status === 403 || e.status === 401 ||
                    (e.message && (e.message.includes('400') || e.message.includes('401') || e.message.includes('403') || e.message.toLowerCase().includes('unauthorized') || e.message.toLowerCase().includes('invalid api key')));
                const isModelError = e.status === 404 || (e.message && (e.message.toLowerCase().includes('not found') || e.message.includes('404')));
                const isTimeout = e.message && e.message.includes('AI_TIMEOUT');
                
                // NEW: Handle safety block without infinite retry
                const isSafetyBlock = e.message && (e.message.toLowerCase().includes('safety') || e.message.toLowerCase().includes('blocked'));

                if (isSafetyBlock) {
                    console.error(`[AI-CORE] Bloqueo de seguridad detectado con llave ${currentKey.substring(0, 5)}...`);
                    // Rotate and continue to next key or model, but don't treat as fatal yet if we have more keys
                    sessionKeys.shift();
                    sessionKeys.push(currentKey);
                    continue;
                }

                if (isQuotaError || isServerIssue || isInvalidKey || isTimeout) {
                    const reason = isTimeout ? "Timeout" : isQuotaError ? "Quota exhausted" : isInvalidKey ? "Invalid/Unauthorized key" : "Server issue";
                    if (onRotation) onRotation(currentKey, reason, attempts, maxAttempts);

                    sessionKeys.shift();
                    sessionKeys.push(currentKey);
                    
                    if ((isQuotaError || isServerIssue) && attempts < maxAttempts) {
                        // Backoff for quota or server issue
                        await new Promise(resolve => setTimeout(resolve, isQuotaError ? 800 : 1500));
                    }
                    continue;
                }

                if (isModelError) {
                    console.warn(`[AI-CORE] Modelo ${targetModel} no soportado en esta key. Rotando.`);
                    sessionKeys.shift();
                    sessionKeys.push(currentKey);
                    continue;
                }
                
                throw e;
            }
        }
        
        console.warn(`[AI-CORE] Fallaron todas las keys para ${targetModel}. Pasando al siguiente modelo en la cadena de fallback.`);
    }

    throw lastError || new Error("Se agotaron todas las API Keys y modelos de respaldo.");
};

/**
 * Executor for Imagen 4 using @google/genai SDK
 */
export const executeWithImagenRotation = async <T>(
    operation: (client: GoogleGenAI, currentModel: string) => Promise<T>,
    modelName: string = 'imagen-4.0-generate-001',
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    timeoutMs: number = 90000
): Promise<T> => {
    // 1. Initialize sessionKeys if needed
    let currentPool: string[] = [];
    if (keys) {
        currentPool = (Array.isArray(keys) ? keys : [keys]).filter(isValidKey);
    } else {
        const envKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (envKeys) {
            currentPool = envKeys.split(',').map(k => k.trim()).filter(isValidKey);
        }
    }

    if (sessionKeys.length === 0) {
        sessionKeys = [...currentPool];
    } else {
        const newKeys = currentPool.filter(k => !sessionKeys.includes(k));
        if (newKeys.length > 0) sessionKeys.push(...newKeys);
    }

    if (sessionKeys.length === 0) {
        throw new Error("API Keys faltantes o inválidas en el entorno.");
    }

    let lastError: any = null;
    let attempts = 0;
    const maxAttempts = sessionKeys.length;

    while (attempts < maxAttempts) {
        const currentKey = sessionKeys[0];
        
        try {
            const client = new GoogleGenAI({ apiKey: currentKey, apiVersion: 'v1beta' });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
            );
            const result = await Promise.race([
                operation(client, modelName),
                timeoutPromise
            ]) as T;
            return result;
        } catch (e: any) {
            attempts++;
            lastError = e;
            console.error(`[AI-CORE-IMAGEN] Error en intento ${attempts}:`, e.message || e);

            const isQuotaError = e.status === 429 || e.code === 429 || (e.message && e.message.toLowerCase().includes('quota'));
            const isServerIssue = e.status === 503 || e.status === 500;
            const isInvalidKey = e.status === 400 || e.status === 403 || e.status === 401;

            if (isQuotaError || isServerIssue || isInvalidKey) {
                const reason = isQuotaError ? "Quota exhausted" : isInvalidKey ? "Invalid/Unauthorized key" : "Server issue";
                console.warn(`[AI-CORE-IMAGEN] Rotando key por razón: ${reason}`);
                if (onRotation) onRotation(currentKey, reason, attempts, maxAttempts);

                sessionKeys.shift();
                sessionKeys.push(currentKey);
                
                if (isQuotaError && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
                continue;
            }
            
            throw e;
        }
    }

    throw lastError || new Error("Se agotaron todas las API Keys para Imagen.");
};
