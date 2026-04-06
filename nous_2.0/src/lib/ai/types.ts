export type AIProvider = 'groq' | 'gemini' | 'openai';

export interface AIRequest {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}

export interface AIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
