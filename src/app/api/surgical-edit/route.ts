import { NextResponse } from 'next/server';
import { runSurgicalEditorPipeline } from '@/lib/actions/aiActions';
import { aiUsageContext } from '@/lib/services/writer/ai-core';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, config, intensity, model } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        console.log(`[SurgicalEditor-API] Processing ${content.length} chars (Streaming)`);

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                const onStatus = (msg: string) => {
                    console.log(`[SurgicalEditor-API] ${msg}`);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
                };

                const onChunk = (chunkHtml: string) => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', html: chunkHtml }) + '\n'));
                };

                // Keep-alive mechanism to prevent Vercel timeout on long processes
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                }, 5000);

                try {
                    const ctxState = { usages: [] as any[] };
                    const result = await aiUsageContext.run(ctxState, async () => {
                        return await runSurgicalEditorPipeline(
                            content,
                            config,
                            intensity || 50,
                            onStatus,
                            model || 'gemini-3.5-flash',
                            onChunk
                        );
                    });

                    clearInterval(keepAlive);
                    
                    const totalUsage = ctxState.usages.reduce((acc, u) => ({
                        promptTokens: acc.promptTokens + u.promptTokens,
                        completionTokens: acc.completionTokens + u.completionTokens,
                        totalTokens: acc.totalTokens + u.totalTokens,
                        costUsd: acc.costUsd + u.costUsd
                    }), { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 });

                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', result, usage: totalUsage }) + '\n'));
                    controller.close();
                } catch (err: any) {
                    clearInterval(keepAlive);
                    console.error('[SurgicalEditor-API] Pipeline Error:', err);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: err.message || 'Internal error' }) + '\n'));
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
        console.error('[SurgicalEditor-API] Outer Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
