import { AIImageRequest, ImageGenConfig } from '../../types/ai';

export const generateArticleStream = async (model: string, prompt: string) => {
    // This is a placeholder for actual streaming via a new API route.
    // Right now, since the actual implementation of stream is complex via fetch,
    // we'll emulate it by calling the non-streaming API but returning a mock stream 
    // to appease the current UI without breaking it immediately.
    
    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            model: model || 'gemini-2.5-flash',
            systemPrompt: 'Eres un redactor HTML experto. Generas HTML limpio.',
            maxTokens: 8192
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al generar artículo');
    }

    const data = await response.json();
    
    // Simulating stream for UI compatibility
    return (async function* () {
        // We yield the whole text in chunks or at once.
        const chunkSize = 200;
        let p = 0;
        while(p < data.text.length) {
            yield { text: data.text.substring(p, p + chunkSize) };
            p += chunkSize;
            await new Promise(r => setTimeout(r, 10)); // tiny delay to allow UI to catch up
        }
    })();
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

    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            model: modelName || 'gemini-2.5-flash'
        })
    });

    if (!response.ok) throw new Error('Refinement failed');
    const data = await response.json();
    const resText = data.text || (isSelection ? selectedText : currentHtml);
    return resText.replace(/```html/g, '').replace(/```/g, '').trim();
}

export const suggestImagePlacements = async (articleHtml: string, count: string): Promise<AIImageRequest[]> => {
    const truncated = articleHtml.substring(0, 30000);
    const numImages = count === 'auto' ? "3 to 5" : count;

    const prompt = `
    Eres Director de Arte. Analiza este artículo HTML. Sugiere ${numImages} ubicaciones para imágenes en el cuerpo.
    FORMATO OUTPUT (JSON):
    [{"id": "body_1", "type": "body", "placement": "...", "context": "...", "prompt": "...", "alt": "...", "title": "...", "filename": "..."}]
    `;

    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: truncated + "\\n\\n" + prompt,
            model: 'gemini-2.5-flash',
            jsonMode: true
        })
    });

    if (!response.ok) throw new Error('Image placement generation failed');
    const data = await response.json();
    let json;
    try {
        json = JSON.parse(data.text);
    } catch(e) {
        json = [];
    }
    return json.map((item: any, idx: number) => ({ ...item, id: `body_${idx}`, status: 'pending' }));
};
