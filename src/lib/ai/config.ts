const groqKeysRaw = (
    process.env.NEXT_PUBLIC_GROQ_API_KEYS || 
    process.env.NEXT_PUBLIC_GROQ_API_KEY || 
    process.env.GROQ_API_KEYS || 
    process.env.GROQ_API_KEY || 
    ""
);
const geminiKeysRaw = (
    process.env.NEXT_PUBLIC_GEMINI_API_KEYS || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
    process.env.GEMINI_API_KEYS || 
    process.env.GEMINI_API_KEY || 
    ""
);

const groqKeys = groqKeysRaw.split(',').map(key => key.trim()).filter(k => k && k.length > 10);
const geminiKeys = geminiKeysRaw.split(',').map(key => key.trim()).filter(k => k && k.length > 10);
const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

export const AI_CONFIG = {
    groq: {
        apiKeys: groqKeys,
        models: {
            fast: 'meta-llama/llama-4-scout-17b-16e-instruct',
            brute: 'llama-3.1-8b-instant',
            quality: 'llama-3.3-70b-versatile',
            balanced: 'qwen/qwen3-32b',
            reasoning: 'groq/compound',
            heavy: 'openai/gpt-oss-120b',
            scout: 'meta-llama/llama-4-scout-17b-16e-instruct'
        },
        rotation: [
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'llama-3.3-70b-versatile',
            'groq/compound',
            'qwen/qwen3-32b',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'allam-2-7b'
        ]
    },
    gemini: {
        apiKeys: geminiKeys,
        models: {
            flash3_1: 'gemini-3.1-flash-preview',
            flash3_1_lite: 'gemini-3.1-flash-lite-preview',
            flash2_5_lite: 'gemini-2.5-flash-lite',
            gemma3_27b: 'gemma-3-27b-it',
            gemma3_4b: 'gemma-3-4b-it'
        },
        hierarchies: {
            research: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Redacción Premium
                'gemini-3.1-flash-preview',      // Fallback 1: Stability
                'groq/compound',         // Fallback 2: Quality Reasoning
                'llama-3.3-70b-versatile' // Fallback 3: Robustness
            ],
            writing: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Editorial
                'gemini-3.1-flash-preview',      // Fallback 1: High Impact
                'groq/compound',         // Fallback 2: Deep Reasoning
                'llama-3.3-70b-versatile' // Fallback 3: Refined Tone
            ],
            technical: [
                'gemma-3-4b-it',         // Priority 1: Estructura JSON
                'gemini-3.1-flash-lite-preview', // Fallback 1: Técnico estable
                'meta-llama/llama-4-scout-17b-16e-instruct', // Fallback 2: Lógica pura (Groq)
                'qwen/qwen3-32b'         // Fallback 3: Razonamiento código
            ],
            extraction: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Volumen técnico
                'gemma-3-4b-it',         // Fallback 1: Estabilidad JSON
                'meta-llama/llama-4-scout-17b-16e-instruct', // Fallback 2: Técnico HTML
                'groq/compound'          // Fallback 3: Clasificación
            ],
            ui: [
                'gemini-3.1-flash-lite-preview', // Priority 1: UI Reactiva
                'gemma-3-4b-it',         // Fallback 1: Estabilidad
                'meta-llama/llama-4-scout-17b-16e-instruct', // Fallback 2: Velocidad Extrema
                'kimi-k2-instruct'       // Fallback 3: Creatividad (Moonshot)
            ],
            reasoning: [
                'gemma-3-27b-it',        // Priority 1: Razonamiento Denso
                'gemini-3.1-flash-preview',      // Fallback 1: Strategic
                'groq/compound',         // Fallback 2: Ensamble Inteligente
                'openai/gpt-oss-120b'    // Fallback 3: Strategic Quality
            ]
        }
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        models: {
            architect: 'gpt-4o',
            reasoning: 'o1-preview'
        }
    },
    openrouter: {
        apiKey: openRouterKey,
        models: {
            sonnet: 'anthropic/claude-3.5-sonnet',
            gpt4o: 'openai/gpt-4o-2024-08-06',
            deepseek: 'deepseek/deepseek-chat',
            r1: 'deepseek/deepseek-r1'
        }
    }
};

export const getGroqKey = () => groqKeys[Math.floor(Math.random() * groqKeys.length)] || "";
export const getGeminiKey = () => geminiKeys[Math.floor(Math.random() * geminiKeys.length)] || "";

