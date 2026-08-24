import { NextResponse } from 'next/server';
import { generateArticleStream } from '@/lib/actions/aiActions';
import { aiUsageContext } from '@/lib/services/writer/ai-core';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, model, hierarchy, provider, reasoning } = body;

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: 'Iniciando redacción...' }) + '\n'));
                
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                }, 5000);

                const onChunk = (chunkHtml: string) => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', html: chunkHtml }) + '\n'));
                };

                try {
                    const ctxState = { usages: [] as any[] };
                    const result = await aiUsageContext.run(ctxState, async () => {
                        return await generateArticleStream(model, prompt, hierarchy, onChunk);
                    });
                    
                    clearInterval(keepAlive);
                    
                    const totalUsage = ctxState.usages.reduce((acc, u) => ({
                        promptTokens: acc.promptTokens + u.promptTokens,
                        completionTokens: acc.completionTokens + u.completionTokens,
                        totalTokens: acc.totalTokens + u.totalTokens,
                        costUsd: acc.costUsd + u.costUsd
                    }), { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 });

                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', text: result, usage: totalUsage }) + '\n'));
                    controller.close();
                } catch (err: any) {
                    clearInterval(keepAlive);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: err.message }) + '\n'));
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

