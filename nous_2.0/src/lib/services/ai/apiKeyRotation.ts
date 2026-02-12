export const ApiKeyRotationService = {
    /**
     * Gets a random API key from a list of keys provided in environment variables.
     * Key list should be comma-separated in GEMINI_API_KEYS.
     * Fallback to GEMINI_API_KEY or GOOGLE_API_KEY if the list is not available.
     */
    getApiKey(): string {
        const multiKeys = process.env.GEMINI_API_KEYS;
        const singleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (multiKeys) {
            const keys = multiKeys.split(',').map(k => k.trim()).filter(Boolean);
            if (keys.length > 0) {
                // Simple random rotation
                const randomIndex = Math.floor(Math.random() * keys.length);
                const selected = keys[randomIndex];
                console.log(`[API-ROTATION] Using key ${randomIndex + 1} of ${keys.length}`);
                return selected;
            }
        }

        if (!singleKey) {
            console.error("[API-ROTATION] No API keys found in environment variables (GEMINI_API_KEYS, GEMINI_API_KEY, GOOGLE_API_KEY)");
        }

        return singleKey || '';
    }
};
