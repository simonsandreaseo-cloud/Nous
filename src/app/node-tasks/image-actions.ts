"use server";

import { ImagePlan, AspectRatio, SupportedLanguage, InlineImageCount } from '@/types/images';
import { getGeminiKey, getGeminiKeysCount } from '@/lib/ai/config';

// Helper to get ai mode from cookies (server) or localStorage/document.cookie (client)
async function getAiMode(): Promise<string> {
    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        return cookieStore.get('nous_ai_mode')?.value || 'cloud';
    } else {
        // Simple cookie parser for browser
        const match = document.cookie.match(new RegExp('(^| )nous_ai_mode=([^;]+)'));
        if (match) return match[2];
        return 'cloud';
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
            reject(new Error("Local Node unavailable: " + (e.message || "Connection refused")));
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

        const runCloudFallback = async () => {
            const maxAttempts = getGeminiKeysCount() || 1;
            let lastError: any = null;

            for (let i = 0; i < maxAttempts; i++) {
                try {
                    console.log(`[NOUS_DEBUG] Planning on Cloud AI... Attempt ${i + 1}/${maxAttempts}`);
                    const apiKey = getGeminiKey();
                    if (!apiKey) throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");

                    const { GoogleGenAI } = await import("@google/genai");
                    const ai = new GoogleGenAI({ apiKey });
                    const model = ai.getGenerativeModel({
                        model: "gemini-3.1-flash",
                        systemInstruction: systemPrompt
                    });


                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.3
                        }
                    });
                    
                    return response.response.text();
                } catch (err: any) {
                    lastError = err;
                    if (err.status === 429 || err?.message?.includes("exceeded")) {
                        console.warn(`[NOUS_DEBUG] Planning Quota exceeded on key (Attempt ${i + 1}), rotating...`);
                        continue;
                    }
                    if (err.status === 400 || err?.message?.includes("API key not valid")) {
                        console.warn(`[NOUS_DEBUG] Invalid API key (Attempt ${i + 1}), rotating...`);
                        continue;
                    }
                    throw err; // For other errors, fail immediately
                }
            }
            throw lastError;
        };

        if (aiMode === 'local') {
            console.log("[NOUS_DEBUG] Starting Image Planning on Local Node...");
            const fullPrompt = `[System]: ${systemPrompt}\n\n[User]: ${userPrompt}`;
            try {
                text = await queryLocalAI(fullPrompt);
            } catch (err) {
                console.warn("[NOUS_DEBUG] Local AI failed, falling back to Cloud AI...", err);
                text = await runCloudFallback();
            }
        } else {
            text = await runCloudFallback();
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
        const aiMode = await getAiMode();

        if (aiMode === 'local') {
            console.log("[NOUS_DEBUG] Generating on Local Image Node (SDXL Turbo)...");
            return await new Promise((resolve, reject) => {
                const WebSocket = global.WebSocket || require('ws');
                const ws = new WebSocket('ws://localhost:8181');
                const promptId = crypto.randomUUID();

                ws.onopen = () => {
                    ws.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));
                };

                ws.onmessage = (event: any) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'AUTH_SUCCESS') {
                            ws.send(JSON.stringify({ type: 'IMAGE_PROMPT', payload: { id: promptId, text: prompt } }));
                        } else if (data.type === 'IMAGE_RESPONSE_COMPLETE' && data.payload.id === promptId) {
                            ws.close();
                            resolve(data.payload.base64);
                        } else if (data.type === 'IMAGE_ERROR' && data.payload.id === promptId) {
                            ws.close();
                            reject(new Error(data.payload.message));
                        }
                    } catch (e) {
                        // ignore
                    }
                };

                ws.onerror = (e: any) => {
                    reject(new Error("Local Image Node unavailable. Verify the Python server is running on port 8181."));
                };

                setTimeout(() => {
                    ws.close();
                    reject(new Error("Timeout waiting for Local Image Node"));
                }, 120000); // 120s timeout in case SDXL is downloading
            });
        }

        const runCloudImageFallback = async () => {
             const maxAttempts = getGeminiKeysCount() || 1;
             let lastError: any = null;

             for (let i = 0; i < maxAttempts; i++) {
                 try {
                     const apiKey = getGeminiKey();
                     if (!apiKey) throw new Error("Gemini API Key missing (GEMINI_API_KEYS).");

                     console.log(`[NOUS_DEBUG] Generating on Cloud [Attempt ${i + 1}/${maxAttempts}]: ${modelId}`);

                     const { GoogleGenAI } = await import("@google/genai");
                     const ai = new GoogleGenAI({ apiKey });


                     // Ensure aspectRatio is valid for the SDK
                     const validRatio = aspectRatio === 'custom' ? '16:9' : aspectRatio;

                     const response = await ai.models.generateContent({
                         model: "Imagen-4-Pro",
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
                     lastError = error;
                     console.error(`[NOUS_DEBUG] CLOUD IMAGE ERROR (Attempt ${i + 1}):`, error.message);
            
                     if (error?.status === 429 || error?.status === 400 || 
                         error?.message?.includes("quota") || error?.message?.includes("exceeded") ||
                         error?.message?.includes("API key not valid") || error?.message?.includes("NOT_FOUND")) {
                         console.warn(`[NOUS_DEBUG] Keys rotated due to error.`);
                         continue;
                     }

                     throw new Error(error.message || "Image generation failed.");
                 }
             }
             throw new Error(lastError?.message || "All API keys exhausted.");
        }

        return await runCloudImageFallback();

    } catch (globalError: any) {
        throw new Error(globalError.message || "All generation attempts failed.");
    }
};

