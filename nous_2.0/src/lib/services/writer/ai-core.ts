import { GoogleGenerativeAI as GoogleGenAI } from "@google/generative-ai";

// Helper to check if a key is roughly valid
const isValidKey = (k: string) => k && k.trim().length > 10;

// Executor that handles rotation across multiple keys
export const executeWithKeyRotation = async <T>(
    operation: (client: GoogleGenAI) => Promise<T>,
    modelName: string = 'gemini-2.5-flash',
    keys?: string[] | string
): Promise<T> => {
    // 1. Cloud Execution (Rotating Keys)
    let validKeys: string[] = [];
    
    if (keys) {
        validKeys = (Array.isArray(keys) ? keys : [keys]).filter(isValidKey);
    }

    if (validKeys.length === 0) {
        const envKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (envKeys) {
            validKeys = envKeys.split(',').map(k => k.trim()).filter(isValidKey);
        }
    }

    if (validKeys.length === 0) {
        throw new Error("API Keys faltantes o inválidas en el entorno.");
    }

    let lastError: any = null;

    for (let i = 0; i < validKeys.length; i++) {
        const currentKey = validKeys[i];
        try {
            const client = new GoogleGenAI(currentKey);
            return await operation(client);
        } catch (e: any) {
            lastError = e;
            const isQuotaError = e.status === 429 || e.code === 429 || (e.message && e.message.includes('quota'));
            const isServerIssue = e.status === 503 || e.status === 500;

            if (isQuotaError || isServerIssue) {
                console.warn(`⚠️ Key failed. Rotating...`);
                if (i === validKeys.length - 1) throw e;
                continue;
            }
            if (e.status === 400 || e.status === 403) {
                console.warn(`⚠️ Key invalid. Rotating...`);
                if (i === validKeys.length - 1) throw e;
                continue;
            }
            throw e;
        }
    }
    throw lastError;
};
