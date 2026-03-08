import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AI_CONFIG, getGeminiKey } from './config';
import { AIRequest, AIResponse } from './types';
import { LocalNodeBridge } from '../local-node/bridge';

class AIRouter {
    private groq?: Groq;
    private openai?: OpenAI;

    constructor() {
        if (AI_CONFIG.groq.apiKey) {
            this.groq = new Groq({ apiKey: AI_CONFIG.groq.apiKey, dangerouslyAllowBrowser: true });
        }
        if (AI_CONFIG.openai.apiKey) {
            this.openai = new OpenAI({ apiKey: AI_CONFIG.openai.apiKey, dangerouslyAllowBrowser: true });
        }
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        let { model, prompt, systemPrompt, temperature = 0.7, maxTokens, jsonMode } = request;

        // --- GLOBAL AI MODE OVERRIDE ---
        // If the user's aiMode cookie or state is 'local', force the model to 'gemma-local'
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

            // Construir un prompt compatible con Llama/Gemma combinando System y User
            let finalPrompt = prompt;
            if (systemPrompt) {
                finalPrompt = `[System]: ${systemPrompt}\n\n[User]: ${prompt}`;
            }

            try {
                const responseText = await bridge.promptAI(finalPrompt);
                return {
                    text: responseText,
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            } catch (error) {
                console.error("[AIRouter] Fallo en la IA Local:", error);
                throw new Error("Error en IA Local: " + (error as Error).message);
            }
        }

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
            const apiKey = getGeminiKey();
            if (!apiKey) throw new Error('Gemini API Key missing');

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
