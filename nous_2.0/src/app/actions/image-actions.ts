import { GoogleGenerativeAI } from "@google/generative-ai";
import { ImagePlan, AspectRatio, SupportedLanguage, InlineImageCount } from '@/types/images';
import { getGeminiKey } from '@/lib/ai/config';

// Robust AI initialization
const getAI = () => {
    const apiKey = getGeminiKey();
    if (!apiKey) {
        throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");
    }
    return new GoogleGenerativeAI(apiKey);
};

export const analyzeTextAndPlanImagesAction = async (
    paragraphs: string[],
    instructions: string = "",
    language: SupportedLanguage = 'en',
    inlineImageCount: InlineImageCount = 'auto'
): Promise<ImagePlan> => {
    const content = paragraphs.join("\n\n");

    const systemPrompt = `You are an expert SEO Content Editor. 
    Analyze the text and plan 1 featured image and some inline images.
    Return ONLY a valid JSON object.
    
    JSON Schema:
    {
      "featuredImage": { "prompt": "visual prompt in English", "filename": "seo-name.png", "rationale": "...", "altText": "...", "title": "..." },
      "inlineImages": [
        { "paragraphIndex": number, "prompt": "...", "filename": "...", "rationale": "...", "altText": "...", "title": "..." }
      ]
    }`;

    const userPrompt = `
    ARTICLE TEXT:
    ${content}
    
    INSTRUCTIONS:
    - Language: ${language}
    - Image density: ${inlineImageCount}
    - Style guidelines: ${instructions}
    
    Plan the images now.`;

    try {
        console.log("[NOUS_DEBUG] Starting Image Planning...");
        const ai = getAI();
        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3
            }
        });

        const text = response.response.text();
        if (!text) {
            throw new Error("No response from AI Planner.");
        }

        console.log("[NOUS_DEBUG] Plan generated successfully.");
        return JSON.parse(text) as ImagePlan;
    } catch (error: any) {
        console.error("[NOUS_DEBUG] CRITICAL PLANNING ERROR:", error);
        throw new Error(error.message || "Failed to plan images.");
    }
};

export const generateImageAction = async (
    prompt: string,
    modelId: string,
    aspectRatio: AspectRatio = '16:9',
    customWidth?: number,
    customHeight?: number
): Promise<string> => {
    // Note: Standard Gemini SDK does not support direct image generation yet.
    // We should fallback to a REST call or a specific implementation if needed.
    // For now, let's keep it safe to not break build.
    throw new Error("La generación de imágenes requiere una implementación de API REST directa para compatibilidad con navegador.");
};

