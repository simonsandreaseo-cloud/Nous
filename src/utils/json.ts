/**
 * Extract and parse JSON from a string that may contain surrounding text or markdown blocks.
 * Useful for handling LLM responses that might include markdown backticks.
 */
export function safeJsonExtract<T>(text: string, defaultValue: T): T {
    if (!text) return defaultValue;

    // Nous 3.0 Subtlety: Strip <think>...</think> blocks from reasoning models (e.g. DeepSeek)
    // to prevent JSON parsing errors if the reasoning block contains brackets.
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    try {
        // First try standard JSON parse
        return JSON.parse(cleanText);
    } catch (e) {
        // If that fails, try to find JSON in markdown blocks (e.g. ```json ... ```)
        const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch (e2) {
                // Nested failure, continue to other methods
            }
        }

        // Try to find the first and last bracket to extract the JSON object/array
        try {
            const firstBrace = cleanText.indexOf('{');
            const firstBracket = cleanText.indexOf('[');
            
            let startIdx = -1;
            let endChar = '';

            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                startIdx = firstBrace;
                endChar = '}';
            } else if (firstBracket !== -1) {
                startIdx = firstBracket;
                endChar = ']';
            }

            if (startIdx !== -1) {
                const lastIdx = cleanText.lastIndexOf(endChar);
                if (lastIdx !== -1 && lastIdx > startIdx) {
                    const jsonStr = cleanText.substring(startIdx, lastIdx + 1);
                    return JSON.parse(jsonStr);
                }
            }
        } catch (e3) {
            // Extraction failure
        }

        console.error("safeJsonExtract: Failed to parse JSON from text. Returning default value.", {
            textPreview: cleanText.substring(0, 200) + (cleanText.length > 200 ? "..." : ""),
            error: e instanceof Error ? e.message : String(e)
        });
        
        return defaultValue;
    }
}
