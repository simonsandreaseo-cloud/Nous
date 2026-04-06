const getInitialKeys = () => {
    const raw = (
        process.env.NEXT_PUBLIC_GEMINI_API_KEYS ||
        process.env.GEMINI_API_KEYS ||
        process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        ""
    );
    return raw.split(',').map(key => key.trim()).filter(k => k && k !== 'OTRA_LLAVE_O_REPETIR_AQUI');
};
const geminiKeys = getInitialKeys();

let currentKeyIndex = 0;

export const getGeminiKey = () => {
    // Dynamic access to avoid build-time freezing if possible
    const rawKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    const activeKeys = rawKeys.split(',').map(key => key.trim()).filter(k => k && k !== 'OTRA_LLAVE_O_REPETIR_AQUI');
    
    if (activeKeys.length === 0) return "";
    
    const key = activeKeys[currentKeyIndex % activeKeys.length];
    currentKeyIndex = (currentKeyIndex + 1) % activeKeys.length;
    return key;
};

export const getGeminiKeysCount = () => {
    const rawKeys = process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    const activeKeys = rawKeys.split(',').map(key => key.trim()).filter(k => k && k !== 'OTRA_LLAVE_O_REPETIR_AQUI');
    return activeKeys.length;
};

export const AI_CONFIG = {
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        models: {
            fast: 'llama-3.1-8b-instant', // Ultra-fast for SEO synthesis
            balanced: 'llama-3.1-70b-versatile'
        }
    },
    gemini: {
        apiKeys: geminiKeys,
        models: {
            pro: 'gemini-3-flash-preview',
            flash: 'gemini-3.1-flash-lite-preview',
            lite: 'gemini-2.5-flash-lite',
            current: 'gemini-2.5-flash',
            fallback: 'gemini-1.5-flash'
        }
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        models: {
            architect: 'gpt-4o', // Precision and logic
            reasoning: 'o1-preview' // Complex problem solving
        }
    },
    ollama: {
        baseUrl: 'http://localhost:11434',
        models: {
            gemma3: 'nous-gemma3',
            fast: 'phi3',
            fallback: 'llama3'
        }
    }
};
