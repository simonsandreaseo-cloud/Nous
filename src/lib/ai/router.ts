import { executeWithKeyRotation } from '../services/writer/ai-core';
import { GoogleGenAI } from '@google/genai';
import { AIRequest, AIResponse } from './types';

class AIRouter {
    async generate(request: AIRequest): Promise<AIResponse> {
        const { model, prompt, systemPrompt, temperature = 0.7, maxTokens, jsonMode, label: callerLabel, forceModel = false } = request;

        // CRITICAL: Use the caller's label to activate the correct hierarchy.
        // Fall back to intent-based detection only if no label is provided.
        const resolvedLabel = callerLabel || (
            (prompt.toLowerCase().includes('escribe') || prompt.toLowerCase().includes('redact') ||
             (systemPrompt && systemPrompt.toLowerCase().includes('escritor')))
                ? 'Redacción SEO'
                : 'Investigación SEO'
        );

        const text = await executeWithKeyRotation(
            async (client, currentModel) => {
                // The client object can be either:
                //   - GoogleGenAI instance (from @google/genai) → use client.models.generateContent()
                //   - GroqClientCompatibility instance → has getGenerativeModel() mimicking Gemini SDK
                // We detect which one by checking for the 'models' property (native Google SDK).

                const isGoogleNative = client instanceof GoogleGenAI || (client as any).models;
                const isGemma = currentModel.toLowerCase().includes('gemma');

                if (isGoogleNative) {
                    // Native @google/genai SDK path
                    const finalPrompt = (isGemma && systemPrompt) ? `${systemPrompt}\n\n${prompt}` : prompt;
                    const response = await (client as GoogleGenAI).models.generateContent({
                        model: currentModel,
                        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                        config: {
                            systemInstruction: isGemma ? undefined : systemPrompt,
                            temperature,
                            maxOutputTokens: maxTokens,
                            responseMimeType: jsonMode ? 'application/json' : 'text/plain',
                        }
                    });
                    return response.text ?? '';
                } else {
                    // Compatible path (GroqClientCompatibility or OpenRouterClientCompatibility)
                    // These mimic the Gemini SDK interface
                    const modelObj = client.getGenerativeModel({
                        model: currentModel,
                        systemInstruction: systemPrompt,
                        generationConfig: {
                            temperature,
                            maxOutputTokens: maxTokens,
                            responseMimeType: jsonMode ? 'application/json' : 'text/plain',
                        }
                    });
                    const res = await modelObj.generateContent(prompt);
                    return res.response.text();
                }
            },
            model,
            undefined,
            undefined,
            forceModel,
            resolvedLabel
        );

        return {
            text,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
    }
}

export const aiRouter = new AIRouter();
