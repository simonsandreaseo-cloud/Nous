import { AI_CONFIG, getGeminiKey } from './config';
import { AIRequest, AIResponse } from './types';
class AIRouter {
    private groq?: any;
    private openai?: any;
    private initialized = false;

    private async init() {
        if (this.initialized) return;

        if (AI_CONFIG.groq.apiKey) {
            const { Groq } = await import('groq-sdk');
            this.groq = new Groq({ apiKey: AI_CONFIG.groq.apiKey, dangerouslyAllowBrowser: true });
        }
        if (AI_CONFIG.openai.apiKey) {
            const { default: OpenAI } = await import('openai');
            this.openai = new OpenAI({ apiKey: AI_CONFIG.openai.apiKey, dangerouslyAllowBrowser: true });
        }
        this.initialized = true;
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        await this.init();
        let { model, prompt, systemPrompt, temperature = 0.7, maxTokens, jsonMode } = request;

        // Force cloud mode
        if (model.includes('local') || model === 'ollama') {
            model = 'gemini-2.5-flash';
        }


        // 1. Route to Groq
        if (model.includes('llama') || model.includes('mixtral')) {
            if (!this.groq) throw new Error('Groq API Key missing');
            const messages: any[] = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const completion = await this.groq.chat.completions.create({
                messages,
                model,
                temperature,
                max_tokens: maxTokens,
                response_format: jsonMode ? { type: 'json_object' } : undefined
            });

            return {
                text: completion.choices[0]?.message?.content || '',
                usage: {
                    promptTokens: completion.usage?.prompt_tokens || 0,
                    completionTokens: completion.usage?.completion_tokens || 0,
                    totalTokens: completion.usage?.total_tokens || 0
                }
            };
        }

        // 2. Route to Gemini
        if (model.includes('gemini')) {
            const { getGeminiKey, getGeminiKeysCount } = await import('./config');
            const totalKeys = getGeminiKeysCount() || 1;
            let lastError: any = null;

            for (let i = 0; i < totalKeys; i++) {
                const apiKey = getGeminiKey();
                if (!apiKey) continue;

                try {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const geminiModel = genAI.getGenerativeModel({
                        model,
                        systemInstruction: systemPrompt
                    });

                    const result = await geminiModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature,
                            maxOutputTokens: maxTokens,
                            responseMimeType: jsonMode ? 'application/json' : 'text/plain'
                        }
                    });

                    const response = await result.response;
                    return {
                        text: response.text(),
                        usage: {
                            promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
                            completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
                            totalTokens: result.response.usageMetadata?.totalTokenCount || 0
                        }
                    };
                } catch (err: any) {
                    lastError = err;
                    // Rotate on quota or server errors
                    if (err.status === 429 || err.status === 503 || err.status === 500 || err.message?.includes('quota')) {
                        console.warn(`[AIRouter] Key ${i+1} failed, rotating...`, err.message);
                        continue;
                    }
                    throw err; // Other errors should fail immediately
                }
            }
            throw lastError || new Error('Gemini API Key missing');
        }

        // 3. Route to OpenAI
        if (model.includes('gpt') || model.includes('o1')) {
            if (!this.openai) {
                return this.generate({ ...request, model: 'gemini-2.5-flash' });
            }

            const messages: any[] = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const completion = await this.openai.chat.completions.create({
                messages,
                model,
                temperature: model.includes('o1') ? 1 : temperature,
                max_tokens: maxTokens,
                response_format: jsonMode ? { type: 'json_object' } : undefined
            });

            return {
                text: completion.choices[0]?.message?.content || '',
                usage: {
                    promptTokens: completion.usage?.prompt_tokens || 0,
                    completionTokens: completion.usage?.completion_tokens || 0,
                    totalTokens: completion.usage?.total_tokens || 0
                }
            };
        }

        throw new Error(`Model ${model} not supported by AIRouter`);
    }
}

export const aiRouter = new AIRouter();
