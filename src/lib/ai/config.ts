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

export const AI_CONFIG = {
    groq: {
        apiKeys: groqKeys,
        models: {
            fast: 'llama-3.1-8b-instant',
            brute: 'llama-3.1-8b-instant',
            quality: 'llama-3.3-70b-versatile',
            balanced: 'qwen/qwen3-32b',
            reasoning: 'llama-3.3-70b-versatile',
            heavy: 'openai/gpt-oss-120b',
            extreme: 'groq/compound'
        },
        rotation: [
            'llama-3.3-70b-versatile',
            'openai/gpt-oss-120b',
            'groq/compound',
            'qwen/qwen3-32b',
            'openai/gpt-oss-20b',
            'llama-3.1-8b-instant'
        ]
    },
    gemini: {
        apiKeys: geminiKeys,
        models: {
            flash3_lite: 'gemini-3.1-flash-lite-preview',
            flash2_5: 'gemini-2.5-flash',
            flash2_5_lite: 'gemini-2.5-flash-lite',
            gemma3: 'gemma-3-27b-it'
        },
        hierarchies: {
            research: [
                'gemini-3.1-flash-lite-preview',
                'gemini-2.5-flash',
                'gemini-2.5-flash-lite'
            ],
            writing: [
                'gemma-3-27b-it',
                'gemini-3.1-flash-lite-preview'
            ]
        }
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        models: {
            architect: 'gpt-4o',
            reasoning: 'o1-preview'
        }
    }
};

export const getGroqKey = () => groqKeys[Math.floor(Math.random() * groqKeys.length)] || "";
export const getGeminiKey = () => geminiKeys[Math.floor(Math.random() * geminiKeys.length)] || "";

