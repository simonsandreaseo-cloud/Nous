import { executeWithKeyRotation } from "./ai-core";

export const generateArticleStream = async (model: string, prompt: string) => {
    return executeWithKeyRotation(async (ai) => {
        const modelObj = ai.getGenerativeModel({
            model: model || 'gemini-2.5-flash',
            systemInstruction: "Eres un redactor HTML experto. Generas HTML limpio.",
            generationConfig: {
                temperature: 0.7,
            }
        });
        const result = await modelObj.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // Unified stream wrapper
        return (async function* () {
            for await (const chunk of result.stream) {
                yield { text: chunk.text() };
            }
        })();
    });
};

export const refineArticleContent = async (
    currentHtml: string, 
    instructions: string, 
    modelName?: string, 
    selectedText?: string
): Promise<string> => {
    const isSelection = !!selectedText && selectedText.trim().length > 0;
    
    const target = isSelection 
        ? `TEXT TO REFINE (SPECIFIC SECTION):\n"${selectedText}"` 
        : `FULL ARTICLE TO REFINE:\n${currentHtml}`;
        
    const context = isSelection 
        ? `\nFULL ARTICLE CONTEXT (FOR REFERENCE ONLY):\n${currentHtml.substring(0, 3000)}` 
        : '';

    const prompt = `
    Role: Content Editor.
    Task: Refine the following ${isSelection ? 'SPECIFIC TEXT SECTION' : 'HTML article'} based strictly on user instructions.
    
    USER INSTRUCTIONS:
    "${instructions}"
    
    ${target}
    ${context}
    
    OUTPUT RULES:
    1. ${isSelection ? 'Return ONLY the refined version of the specific text provided. Do NOT return the whole article.' : 'Return valid HTML content for the whole article (inside body).'}
    2. Do NOT strip existing images or links unless instructed.
    3. Apply requested changes while maintaining tone and style.
    4. Return the result WITHOUT any markdown blocks (like \`\`\`html).
    `;

    return executeWithKeyRotation(async (ai) => {
        const modelObj = ai.getGenerativeModel({ model: modelName || 'gemini-2.5-flash' });
        const response = await modelObj.generateContent(prompt);
        const resText = response.response.text() || (isSelection ? selectedText : currentHtml);
        return resText.replace(/```html/g, '').replace(/```/g, '').trim();
    }, modelName);
};
