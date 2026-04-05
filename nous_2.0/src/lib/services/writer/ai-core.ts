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
    modelName: string = 'gemini-2.5-flash',
    keys?: string[] | string,
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void,
    isStrictModel: boolean = false
): Promise<T> => {
    // 1. Determine Model Fallback Order
    const primary = modelName;
    const secondary = primary === 'gemini-3.1-flash-lite-preview' ? 'gemma-3-27b-it' : 'gemini-3.1-flash-lite-preview';
    const parachute1 = 'gemini-2.5-flash-lite';
    const baseline = 'gemini-2.5-flash';
    
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

    // Loop through fallback models
    for (const targetModel of modelsToTry) {
        let attempts = 0;
        const maxAttempts = sessionKeys.length;
        
        console.log(`[AI-CORE] Probando Modelo: ${targetModel} (Pool: ${maxAttempts} keys)`);

        while (attempts < maxAttempts) {
            const currentKey = sessionKeys[0];
            
            try {
                const client = new GoogleGenerativeAI(currentKey);
                // PASS the current model to the operation
                const result = await operation(client, targetModel);
                return result;
            } catch (e: any) {
                attempts++;
                lastError = e;

                const isQuotaError = e.status === 429 || e.code === 429 || (e.message && e.message.toLowerCase().includes('quota'));
                const isServerIssue = e.status === 503 || e.status === 500;
                const isInvalidKey = e.status === 400 || e.status === 403 || e.status === 401;
                const isModelError = e.status === 404 || (e.message && e.message.toLowerCase().includes('not found'));

                if (isQuotaError || isServerIssue || isInvalidKey) {
                    const reason = isQuotaError ? "Quota exhausted" : isInvalidKey ? "Invalid/Unauthorized key" : "Server issue";
                    if (onRotation) onRotation(currentKey, reason, attempts, maxAttempts);

                    sessionKeys.shift();
                    sessionKeys.push(currentKey);
                    
                    if (isQuotaError && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 800));
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
    onRotation?: (failedKey: string, reason: string, attempt: number, max: number) => void
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
            console.log(`[AI-CORE-IMAGEN] Intento ${attempts + 1}/${maxAttempts} con key ${currentKey.substring(0, 8)}...`);
            const client = new GoogleGenAI({ apiKey: currentKey, apiVersion: 'v1beta' });
            const result = await operation(client, modelName);
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
