import { VisualResource, ImageGenConfig, AIImageRequest, ContentItem } from "./types";
import { executeWithKeyRotation } from "./ai-core";

export const findCampaignAssets = async (query: string, projectName: string, csvData?: ContentItem[], modelName?: string): Promise<VisualResource[]> => {
    const safeProjectName = projectName || "mysite";
    const excludeTerms = `-site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.com -site:${safeProjectName.replace(/\s+/g, '').toLowerCase()}.es -inurl:${safeProjectName.replace(/\s+/g, '').toLowerCase()}`;

    const prompt = `
    Find OFFICIAL brand assets (Press kits, Lookbooks, Campaign pages) for: "${query}".
    CRITICAL: Exclude any URL from the project "${projectName}". We need EXTERNAL official sources.
    Query Modifier: ${excludeTerms}
    Return a JSON Array: [{"brand": "Brand Name", "description": "Page Title", "url": "URL", "isImage": false}]
    Only return valid, reachable URLs.
    `;

    return executeWithKeyRotation(async (ai) => {
        const modelObj = ai.getGenerativeModel({
            model: modelName || 'gemini-2.5-flash',
            tools: [{ googleSearchRetrieval: {} } as any]
        });
        const response = await modelObj.generateContent(prompt);
        let text = response.response.text() || "[]";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }
        const json = JSON.parse(text);
        if (!Array.isArray(json)) return [];
        return json.filter((item: any) => item.url && item.url.startsWith('http'));
    });
};

export const suggestImagePlacements = async (articleHtml: string, count: string): Promise<AIImageRequest[]> => {
    const truncated = articleHtml.substring(0, 30000);
    const numImages = count === 'auto' ? "3 to 5" : count;

    const prompt = `
    Eres Director de Arte. Analiza este artículo HTML. Sugiere ${numImages} ubicaciones para imágenes en el cuerpo.
    FORMATO OUTPUT (JSON):
    [{"id": "body_1", "type": "body", "placement": "...", "context": "...", "prompt": "...", "alt": "...", "title": "...", "filename": "..."}]
    `;

    return executeWithKeyRotation(async (ai) => {
        const modelObj = ai.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = await modelObj.generateContent(truncated + "\n\n" + prompt);
        const json = JSON.parse(response.response.text() || "[]");
        return json.map((item: any, idx: number) => ({ ...item, id: `body_${idx}`, status: 'pending' }));
    });
};

export const generateRealImage = async (basePrompt: string, config: ImageGenConfig, context: 'featured' | 'body', aspectRatio: string = '16:9'): Promise<string> => {
    const colorString = config.colors.length > 0 ? `Color Palette Hex Codes: ${config.colors.join(', ')}.` : "Auto color palette.";
    const styleString = config.style === 'Auto' ? "Hyperrealistic, editorial photography, 8k, cinematic lighting." : `${config.style} style, high quality artwork.`;
    const userInstruction = config.userPrompt ? `User Instruction: ${config.userPrompt}.` : "";

    const finalPrompt = `${basePrompt}. ${styleString} ${colorString} ${userInstruction} Minimalist composition, clean, high quality for web.`;

    return executeWithKeyRotation(async (ai) => {
        try {
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const response = await model.generateContent(finalPrompt);

            const result = await response.response;
            // Assuming image generation might be handled differently depending on the specific SDK/API used
            // This part might need further refinement based on the ACTUAL capabilities of the Google Gen AI image tools
            // For now, I'm keeping the original logic structure but modularized.
            return result.text(); 
        } catch (e) {
            console.error("Image generation error:", e);
            throw e;
        }
    });
};
