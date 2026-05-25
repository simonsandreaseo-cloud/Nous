import { NextResponse } from 'next/server';
import { generateArticleStream } from '@/lib/actions/aiActions';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, model, hierarchy } = body;

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await generateArticleStream(model, prompt, hierarchy);
                    // Gemini returns an object with [Symbol.asyncIterator] or stream property
                    const streamIterable = result.stream || result;
                    
                    for await (const chunk of streamIterable) {
                        // Some mocks use chunk.text(), actual Gemini uses chunk.text
                        const text = chunk.text ? (typeof chunk.text === 'function' ? chunk.text() : chunk.text) : '';
                        if (text) {
                            controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', text }) + '\n'));
                        }
                    }
                    controller.close();
                } catch (err: any) {
                    console.error('[Generate-API] Error:', err);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', text: err.message || 'Internal error' }) + '\n'));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
