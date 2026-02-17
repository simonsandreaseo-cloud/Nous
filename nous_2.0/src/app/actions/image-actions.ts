'use server';

import { GoogleGenAI } from "@google/genai";
import { ImagePlan, AspectRatio, SupportedLanguage, InlineImageCount } from '@/types/images';
import { getGeminiKey } from '@/lib/ai/config';

// Robust AI initialization
const getAI = () => {
    const apiKey = getGeminiKey();
    if (!apiKey) {
        throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");
    }
    return new GoogleGenAI({ apiKey });
};

export const analyzeTextAndPlanImagesAction = async (
    paragraphs: string[],
    instructions: string = "",
    language: SupportedLanguage = 'en',
    inlineImageCount: InlineImageCount = 'auto'
): Promise<ImagePlan> => {
    const content = paragraphs.join("\n\n");

    // Simple prompt to get JSON
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
        const response = await ai.models.generateContent({
            // Use a stable TEXT model for planning
            model: 'gemini-1.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.3
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error("[NOUS_DEBUG] AI Planner returned empty text candidates.");
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
    try {
        console.log(`[NOUS_DEBUG] Generating image with model: ${modelId}`);
        const ai = getAI();
        const isImagen4 = modelId.startsWith('imagen-4.0') || modelId.startsWith('imagen-3');

        if (isImagen4) {
            const response = await ai.models.generateImages({
                model: modelId,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio as any,
                },
            });

            const image = response.generatedImages?.[0];
            if (!image?.image?.imageBytes) {
                console.error("[NOUS_DEBUG] Imagen 4 returned no bytes in response.");
                throw new Error("Imagen 4 returned no bytes.");
            }

            console.log("[NOUS_DEBUG] Image generated successfully (Imagen 4).");
            return `data:image/png;base64,${image.image.imageBytes}`;
        } else {
            // Gemini Multimodal (Nano Banana)
            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                        aspectRatio: aspectRatio as any
                    }
                }
            });

            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!part?.inlineData?.data) {
                console.error("[NOUS_DEBUG] Gemini failed to return inlineData for image.");
                throw new Error("Gemini Image conversion failed.");
            }

            console.log("[NOUS_DEBUG] Image generated successfully (Nano Banana).");
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    } catch (error: any) {
        console.error("[NOUS_DEBUG] CRITICAL GENERATION ERROR:", error);
        throw new Error(error.message || "Failed to generate image.");
    }
};
