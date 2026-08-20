const groqKeysRaw = (
    process.env.NEXT_PUBLIC_GROQ_API_KEYS || 
    process.env.GROQ_API_KEYS || 
    process.env.GROQ_API_KEY || 
    ""
);
const geminiKeysRaw = (
    process.env.NEXT_PUBLIC_NOUS_API_KEYS || 
    process.env.NOUS_API_KEYS || 
    ""
);

const groqKeys = groqKeysRaw.split(',').map(key => key.trim()).filter(k => k && k.length > 10);
const geminiKeys = geminiKeysRaw.split(',').map(key => key.trim()).filter(k => k && k.length > 10);
const openRouterKey = process.env.OPENROUTER_API_KEY || "";
const cerebrasKeyRaw = process.env.CEREBRAS_API_KEY || "";
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
            brute: 'gemini-3.5-flash',
            quality: 'gemini-3.5-flash',
            balanced: 'qwen/qwen3-32b',
            reasoning: 'groq/compound',
            heavy: 'openai/gpt-oss-120b',
            scout: 'meta-llama/llama-4-scout-17b-16e-instruct'
        },
        rotation: [
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'gemini-3.5-flash',
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
            flash3_7: 'gemini-3.7-flash',
            flash3_6: 'gemini-3.6-flash',
            flash3_5: 'gemini-3.5-flash',
            flash3_5_lite: 'gemini-3.5-flash-lite',
            flash3_1_pro: 'gemini-3.1-pro-preview',
            flash3_1_lite: 'gemini-3.1-flash-lite-preview',
            flash3: 'gemini-3-flash-preview',
            gemma4_31b: 'gemma-4-31b-it',
            gemma4_26b_a4b: 'gemma-4-26b-a4b-it',
            gemma3_27b: 'gemma-3-27b-it',
            flash2_5: 'gemini-2.5-flash',
            flash2_5_lite: 'gemini-2.5-flash-lite'
        },
        hierarchies: {
            research: [
                'gemini-3.7-flash',            // Priority 1: Editorial 3.7
                'gemini-3.6-flash',            // Priority 2: Editorial 3.6
                'gemini-3.5-flash',            // Priority 3: Editorial 3.5
                'gemini-3.5-flash-lite',       // Priority 4: Fast 3.5
                'gemini-3-flash-preview',      // Fallback 1: Stability 3.0
                'gemma-3-27b-it',              // Fallback 2: Reasoning
                'gemma-4-31b-it',              // Fallback 3: Reasoning
                'gemma-4-26b-a4b-it',          // Fallback 4: Deep Logic
                'gemini-2.5-flash',            // Fallback 5: Versatility 2.5
                'gemini-2.5-flash-lite'        // Fallback 6: Efficiency 2.5
            ],
            writing: [
                'gemma-4-31b-it',               // Priority 1: Calidad Premium (Gemma 4)
                'gemma-3-27b-it',               // Priority 2: Gemma 3
                'gemma-4-26b-a4b-it',           // Priority 3: Editorial Dense
                'gemini-3.7-flash',             // Fallback 1: Editorial 3.7
                'gemini-3.6-flash',             // Fallback 2: Editorial 3.6
                'gemini-3.5-flash',             // Fallback 3: Editorial 3.5
                'gemini-3.5-flash-lite',        // Fallback 4: Lite 3.5
                'gemini-3-flash-preview',       // Fallback 5: Editorial 3.0
                'gemini-2.5-flash',             // Fallback 6: Flow Stable
                'gemini-2.5-flash-lite'         // Fallback 7: Lightweight
            ],
            technical: [
                'gemini-3.7-flash',              // Priority 1: Técnico estable
                'gemini-3.6-flash',              // Priority 2: Técnico
                'gemini-3.5-flash',              // Priority 3: Técnico
                'gemini-3.5-flash-lite',         // Priority 4: Lite
                'gemini-3-flash-preview',        // Fallback 1: Technical 3.0
                'gemma-3-27b-it',                // Fallback 2: JSON Structure
                'gemma-4-31b-it',                // Fallback 3: Estructura JSON
                'gemma-4-26b-a4b-it',            // Fallback 4: JSON Strict
                'gemini-2.5-flash',              // Fallback 5: Logic 2.5
                'gemini-2.5-flash-lite'          // Fallback 6: JSON Fast
            ],
            extraction: [
                'gemini-3.5-flash', // Priority 1: Volumen técnico
                'gemini-3-flash-preview',        // Fallback 1: Fast Extraction 3.0
                'gemma-4-31b-it',                // Fallback 2: Estabilidad JSON
                'gemini-2.5-flash-lite'          // Fallback 3: Extraction Fast
            ],
            ui: [
                'gemini-3.5-flash', // Priority 1: UI Reactiva
                'gemini-3-flash-preview',        // Fallback 1: Fast UI 3.0
                'gemma-4-26b-a4b-it',            // Fallback 2: Estabilidad
                'gemini-2.5-flash-lite'          // Fallback 3: Velocidad Extrema
            ],
            cognitive_filter: [
                'gemini-3.7-flash',              // Priority 1: Reasoning 3.7
                'gemini-3.6-flash',              // Priority 2: Reasoning 3.6
                'gemini-3.5-flash',              // Priority 3: Reasoning 3.1
                'gemini-3-flash-preview',        // Fallback 1: Filter 3.0
                'gemma-3-27b-it',                // Fallback 2: Deep Analysis
                'gemma-4-31b-it'                 // Fallback 3: Deep Analysis
            ],
            reasoning: [
                'gemini-3.7-flash',              // Priority 1: Direct Reasoning 3.7
                'gemini-3.6-flash',              // Priority 2: Direct Reasoning 3.6
                'gemini-3.5-flash',              // Priority 3: Direct Reasoning 3.5
                'gemini-3-flash-preview',        // Fallback 1: Fast Reasoning 3.0
                'gemma-3-27b-it',                // Fallback 2: Dense Thought
                'gemma-4-31b-it'                 // Fallback 3: Dense Thought
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

