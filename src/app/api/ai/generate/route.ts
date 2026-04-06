import { NextRequest, NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai/router';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, model, systemPrompt, temperature, maxTokens, jsonMode } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Falta el prompt' }, { status: 400 });
        }

        const response = await aiRouter.generate({
            prompt,
            model: model || 'gemini-2.5-flash',
            systemPrompt: systemPrompt || 'Eres un experto redactor SEO y generador de HTML.',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 8000,
            jsonMode: jsonMode || false,
        });

        return NextResponse.json({ text: response.text, usage: response.usage });

    } catch (error: any) {
        console.error('API /ai/generate error:', error);
        return NextResponse.json({ error: error.message || 'Error en la generación' }, { status: 500 });
    }
}
