import { AIRequest, AIResponse } from '../types';

export class OllamaProvider {
    private baseUrl = 'http://localhost:11434';

    async generate(request: AIRequest): Promise<AIResponse> {
        const { model, prompt, systemPrompt, temperature = 0.6, maxTokens, jsonMode } = request;

        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model: model || 'gemma3',
                prompt: prompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                },
                format: jsonMode ? 'json' : undefined
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            text: data.response,
            usage: {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
            }
        };
    }
}
