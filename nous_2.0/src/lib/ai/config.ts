export const AI_CONFIG = {
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        models: {
            fast: 'llama-3.3-70b-versatile', // Valid & Faster
            balanced: 'llama-3.1-70b-versatile'
        }
    },
    gemini: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
        models: {
            pro: 'gemini-3-flash-preview', // Newest Frontier
            flash: 'gemini-2.5-flash', // Stable Workhorse
            lite: 'gemini-2.5-flash-lite', // Cost Efficient
            fallback: 'gemini-1.5-flash' // Legacy Safety
        }
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        models: {
            architect: 'gpt-4o', // Precision and logic
            reasoning: 'o1-preview' // Complex problem solving
        }
    }
};
