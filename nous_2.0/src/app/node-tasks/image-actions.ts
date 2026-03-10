import { ImagePlan, AspectRatio, SupportedLanguage, InlineImageCount } from '@/types/images';
import { getGeminiKey } from '@/lib/ai/config';

// Helper to get ai mode from cookies (server) or localStorage/document.cookie (client)
async function getAiMode(): Promise<string> {
    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        return cookieStore.get('nous_ai_mode')?.value || 'local';
    } else {
        // Simple cookie parser for browser
        const match = document.cookie.match(new RegExp('(^| )nous_ai_mode=([^;]+)'));
        if (match) return match[2];
        return 'local';
    }
}

// Promisified WebSocket function to query Local Node from Server Components/Actions
async function queryLocalAI(promptText: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const WebSocket = global.WebSocket || require('ws');
        const ws = new WebSocket('ws://localhost:11434');
        const promptId = crypto.randomUUID();
        let fullText = "";

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));
        };

        ws.onmessage = (event: any) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'AUTH_SUCCESS') {
                    ws.send(JSON.stringify({ type: 'AI_PROMPT', payload: { id: promptId, text: promptText } }));
                } else if (data.type === 'AI_RESPONSE_CHUNK' && data.payload.id === promptId) {
                    fullText += data.payload.textChunk;
                } else if (data.type === 'AI_RESPONSE_COMPLETE' && data.payload.id === promptId) {
                    ws.close();
                    resolve(data.payload.fullText);
                } else if (data.type === 'AI_ERROR' && data.payload.id === promptId) {
                    ws.close();
                    reject(new Error(data.payload.message));
                }
            } catch (e) {
                // Ignore parse errors from node stats
            }
        };

        ws.onerror = (e: any) => {
            reject(new Error("Local Node unavailable: " + e.message));
        };

        // Timeout (120s)
        setTimeout(() => {
            ws.close();
            reject(new Error("Timeout waiting for Local AI"));
        }, 120000);
    });
}

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
        const aiMode = await getAiMode();

        let text = "";

        if (aiMode === 'local') {
            console.log("[NOUS_DEBUG] Starting Image Planning on Local Node...");
            const fullPrompt = `[System]: ${systemPrompt}\n\n[User]: ${userPrompt}`;
            text = await queryLocalAI(fullPrompt);
        } else {
            console.log("[NOUS_DEBUG] Starting Image Planning on Cloud AI...");
            const apiKey = getGeminiKey();
            if (!apiKey) throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");

            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const ai = new GoogleGenerativeAI(apiKey);
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
            text = response.response.text();
        }

        // Limpieza de formato para asegurar parse JSON
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.replace('```json', '');
        if (cleanText.startsWith('```')) cleanText = cleanText.replace('```', '');
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3).trim();

        if (!cleanText) {
            throw new Error("No response from Local AI Planner.");
        }

        console.log("[NOUS_DEBUG] Plan generated successfully.");
        return JSON.parse(cleanText) as ImagePlan;
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
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");

        console.log(`[NOUS_DEBUG] Generating image with model: ${modelId} (Key rotation active)`);

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey });

        // Ensure aspectRatio is valid for the SDK
        const validRatio = aspectRatio === 'custom' ? '16:9' : aspectRatio;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: validRatio as any
                }
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("Safety filters blocked the generation or key quota exceeded.");

        for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }

        throw new Error("No image data returned from model.");
    } catch (error: any) {
        console.error("[NOUS_DEBUG] IMAGE GENERATION ERROR:", error);
        throw new Error(error.message || "Image generation failed.");
    }
};

