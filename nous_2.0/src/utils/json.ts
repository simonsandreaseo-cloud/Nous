/**
 * Extract and parse JSON from a string that may contain surrounding text or markdown blocks.
 * Useful for handling LLM responses that might include markdown backticks.
 */
export function safeJsonExtract<T>(text: string, defaultValue: T): T {
    if (!text) return defaultValue;

    try {
        // First try standard JSON parse
        return JSON.parse(text);
    } catch (e) {
        // If that fails, try to find JSON in markdown blocks (e.g. ```json ... ```)
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch (e2) {
                // Nested failure, continue to other methods
            }
        }

        // Try to find the first and last bracket to extract the JSON object/array
        try {
            const firstBrace = text.indexOf('{');
            const firstBracket = text.indexOf('[');
            
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
                const lastIdx = text.lastIndexOf(endChar);
                if (lastIdx !== -1 && lastIdx > startIdx) {
                    const jsonStr = text.substring(startIdx, lastIdx + 1);
                    return JSON.parse(jsonStr);
                }
            }
        } catch (e3) {
            // Extraction failure
        }

        console.error("safeJsonExtract: Failed to parse JSON from text. Returning default value.", {
            textPreview: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
            error: e.message
        });
        
        return defaultValue;
    }
}
