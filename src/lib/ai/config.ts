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
const cerebrasKeyRaw = process.env.CEREBRAS_API_KEY || process.env.NEXT_PUBLIC_CEREBRAS_API_KEY || "";
const cerebrasKey = cerebrasKeyRaw.trim().split(',').filter(k => k && k.length > 10);

export const AI_CONFIG = {
    cerebras: {
        apiKey: cerebrasKey.length > 0 ? cerebrasKey[0] : "",
        models: {
            ultra: 'zai-glm-4.7',
            high: 'qwen-3-235b-a22b-instruct-2507',
            balanced: 'gpt-oss-120b',
            fast: 'llama3.1-8b'
        }
    },
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
            gemma4_31b: 'gemma-4-31b-it'
        },
        hierarchies: {
            research: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Editorial 3.1
                'gemini-3-flash-preview',      // Fallback 1: Stability 3.0
                'gemini-2.5-flash',            // Fallback 2: Versatility 2.5
                'gemini-2.5-flash-lite',       // Fallback 3: Efficiency 2.5
                'gemma-4-31b-it',              // Fallback 4: Reasoning
                'gemma-4-26b-a4b-it'           // Fallback 5: Deep Logic
            ],
            writing: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Editorial 3.1
                'gemma-4-31b-it',               // Fallback 1: Calidad Premium
                'gemma-4-26b-a4b-it',           // Fallback 2: Editorial Dense
                'gemini-3-flash-preview',       // Fallback 3: High Impact
                'gemini-2.5-flash',              // Fallback 4: Flow Stable
                'gemini-2.5-flash-lite'          // Fallback 5: Lightweight
            ],
            technical: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Técnico estable
                'gemma-4-31b-it',                // Fallback 1: Estructura JSON
                'gemma-4-26b-a4b-it',            // Fallback 2: JSON Strict
                'gemini-2.5-flash',               // Fallback 3: Logic 2.5
                'gemini-2.5-flash-lite'           // Fallback 4: JSON Fast
            ],
            extraction: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Volumen técnico
                'gemma-4-31b-it',                // Fallback 1: Estabilidad JSON
                'gemini-2.5-flash-lite'          // Fallback 2: Extraction Fast
            ],
            ui: [
                'gemini-3.1-flash-lite-preview', // Priority 1: UI Reactiva
                'gemma-4-26b-a4b-it',            // Fallback 1: Estabilidad
                'gemini-2.5-flash-lite',         // Fallback 2: Velocidad Extrema
                'gemini-3-flash-preview'         // Fallback 3: Creatividad
            ],
            cognitive_filter: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Reasoning 3.1
                'gemini-3-flash-preview',        // Fallback 1: Filter 3.0
                'gemma-4-31b-it'                 // Fallback 2: Deep Analysis
            ],
            reasoning: [
                'gemini-3.1-flash-lite-preview', // Priority 1: Direct Reasoning
                'gemma-4-31b-it',                // Fallback 1: Dense Thought
                'gemini-3-flash-preview'         // Fallback 2: Fast Reasoning
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
// ... (mantener el inicio igual hasta la línea 136)
// ...
    openrouter: {
        apiKey: openRouterKey,
        models: {
            sonnet: 'anthropic/claude-3.5-sonnet',
            gpt4o: 'openai/gpt-4o-2024-08-06',
            deepseek: 'deepseek/deepseek-chat',
            r1: 'deepseek/deepseek-r1',
            free_llama: 'meta-llama/llama-3.3-70b-instruct:free',
            free_gemma: 'google/gemma-4-31b-it:free',
            free_qwen: 'qwen/qwen3-next-80b-a3b-instruct:free'
        }
    }
};

export const TRANSLATION_EXPERTS = {
    catalan: AI_CONFIG.gemini.models.flash2_5_lite,
    asian: AI_CONFIG.groq.models.balanced,
    complex: AI_CONFIG.groq.models.quality,
    default: AI_CONFIG.gemini.models.flash2_5_lite,
    fallbacks: [
        AI_CONFIG.gemini.models.flash2_5_lite,
        AI_CONFIG.openrouter.models.free_llama,
        AI_CONFIG.openrouter.models.free_gemma,
        AI_CONFIG.openrouter.models.free_qwen
    ]
};

export const getGroqKey = () => groqKeys[Math.floor(Math.random() * groqKeys.length)] || "";
// ... (resto igual)
export const getGeminiKey = () => geminiKeys[Math.floor(Math.random() * geminiKeys.length)] || "";
export const getCerebrasKey = () => cerebrasKey[Math.floor(Math.random() * cerebrasKey.length)] || "";

