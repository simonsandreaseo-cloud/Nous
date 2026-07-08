export type AIProvider = 'groq' | 'gemini' | 'openai';

export interface AIRequest {
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    label?: string; // Activates the correct hierarchy in executeWithKeyRotation
    forceModel?: boolean; // Bypasses the label-based hierarchy and strictly uses the requested model
    timeoutMs?: number;
    explicitHierarchy?: string[];
    provider?: 'google-ai-studio' | 'vertex-ai' | 'auto';
}

export interface AIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
