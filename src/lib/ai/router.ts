import { executeWithKeyRotation } from '../services/writer/ai-core';
import { AIRequest, AIResponse } from './types';

class AIRouter {
    async generate(request: AIRequest): Promise<AIResponse> {
        let { model, prompt, systemPrompt, temperature = 0.7, maxTokens, jsonMode } = request;

        // Intent detection for hierarchical fallback
        const isWriting = prompt.toLowerCase().includes('escribe') || prompt.toLowerCase().includes('redact') || (systemPrompt && systemPrompt.toLowerCase().includes('escritor'));
        const label = isWriting ? 'Redacción SEO' : 'Investigación SEO';

        const text = await executeWithKeyRotation(
            async (client, currentModel) => {
                const modelObj = client.getGenerativeModel({
                    model: currentModel,
                    systemInstruction: systemPrompt,
                    generationConfig: {
                        temperature,
                        maxOutputTokens: maxTokens,
                        responseMimeType: jsonMode ? "application/json" : "text/plain"
                    }
                });
                const res = await modelObj.generateContent(prompt);
                return res.response.text();
            },
            model,
            undefined,
            undefined,
            false,
            label
        );

        return {
            text,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
    }
}

export const aiRouter = new AIRouter();

