import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AI_CONFIG } from './config';
import { AIRequest, AIResponse } from './types';

class AIRouter {
    private groq?: Groq;
    private openai?: OpenAI;
    private gemini?: GoogleGenerativeAI;

    constructor() {
        if (AI_CONFIG.groq.apiKey) {
            this.groq = new Groq({ apiKey: AI_CONFIG.groq.apiKey, dangerouslyAllowBrowser: true });
        }
        if (AI_CONFIG.openai.apiKey) {
            this.openai = new OpenAI({ apiKey: AI_CONFIG.openai.apiKey, dangerouslyAllowBrowser: true });
        }
        if (AI_CONFIG.gemini.apiKey) {
            this.gemini = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey);
        }
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        const { model, prompt, systemPrompt, temperature = 0.7, maxTokens, jsonMode } = request;

        // 1. Route to Groq (Speed Mode)
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

        // 2. Route to Gemini (Deep Context)
        if (model.includes('gemini')) {
            if (!this.gemini) throw new Error('Gemini API Key missing');

            const geminiModel = this.gemini.getGenerativeModel({
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

        // 3. Route to OpenAI (Precision Architect)
        if (model.includes('gpt') || model.includes('o1')) {
            // FALLBACK STRATEGY: If OpenAI is requested but no key exists, fallback to Gemini 1.5 Pro
            if (!this.openai) {
                console.warn(`[AIRouter] OpenAI key missing. Redirecting ${model} request to Gemini 1.5 Pro.`);
                return this.generate({
                    ...request,
                    model: 'gemini-1.5-pro'
                });
            }

            const messages: any[] = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const completion = await this.openai.chat.completions.create({
                messages,
                model,
                temperature: model.includes('o1') ? 1 : temperature, // o1 handles temp differently
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
