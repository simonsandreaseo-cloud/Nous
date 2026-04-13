export type AIProvider = 'groq' | 'gemini' | 'openai';

export interface AIRequest {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    label?: string; // Activates the correct hierarchy in executeWithKeyRotation
}

export interface AIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
