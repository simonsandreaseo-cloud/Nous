import { AI_CONFIG, getGeminiKey } from './config';
import { AIRequest, AIResponse } from './types';
import { LocalNodeBridge } from '../local-node/bridge';

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

        // ... existing logic for aiMode ...
        let aiMode = 'cloud';
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(^| )nous_ai_mode=([^;]+)/);
            if (match && match[2] === 'local') {
                aiMode = 'local';
            }
        }

        if (aiMode === 'local') {
            model = 'gemma-local';
            console.log("[AIRouter] Using Local AI Mode");
        }

        if (model === 'gemma-local') {
            const bridge = LocalNodeBridge as any;
            let finalPrompt = prompt;
            if (systemPrompt) {
                finalPrompt = `[System]: ${systemPrompt}\n\n[User]: ${prompt}`;
            }

            const responseText = await bridge.promptAI(finalPrompt);
            return {
                text: responseText,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
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
            const apiKey = getGeminiKey();
            if (!apiKey) throw new Error('Gemini API Key missing');

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
        }

        // 3. Route to OpenAI
        if (model.includes('gpt') || model.includes('o1')) {
            if (!this.openai) {
                return this.generate({ ...request, model: 'gemini-1.5-pro' });
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
