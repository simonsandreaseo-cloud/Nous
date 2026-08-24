import { NextResponse } from 'next/server';
import { runCustomTransformPipeline, runChiefDesignerPlanning, runSingleChunkTransform } from '@/lib/actions/aiActions';
import { aiUsageContext } from '@/lib/services/writer/ai-core';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, content, presetInstructions, userInstructions, model, provider, chunks, chunk, stylesheet, pautasEspecificas , reasoning} = body;

        // Action: plan (Global architect design)
        if (action === 'plan') {
            const resolvedChunks = chunks || (content ? [content] : []);
            if (!resolvedChunks || resolvedChunks.length === 0) {
                return NextResponse.json({ error: 'Chunks are required for planning' }, { status: 400 });
            }
            console.log(`[CustomTransform-API] Planning layout for ${resolvedChunks.length} chunks`);
            
            const ctxState = { usages: [] as any[] };
            const result = await aiUsageContext.run(ctxState, async () => {
                return await runChiefDesignerPlanning(
                    resolvedChunks,
                    presetInstructions || '',
                    userInstructions || '',
                    model || 'gemini-3.1-pro',
                    provider
                , reasoning);
            });
            
            const totalUsage = ctxState.usages.reduce((acc, u) => ({
                promptTokens: acc.promptTokens + u.promptTokens,
                completionTokens: acc.completionTokens + u.completionTokens,
                totalTokens: acc.totalTokens + u.totalTokens,
                costUsd: acc.costUsd + u.costUsd
            }), { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 });

            return NextResponse.json({ ...result, usage: totalUsage });
        }

        // Action: process-chunk (Transform a single chunk using CSS Global)
        if (action === 'process-chunk') {
            const targetChunk = chunk || content;
            if (!targetChunk) {
                return NextResponse.json({ error: 'Chunk content is required' }, { status: 400 });
            }

            console.log(`[CustomTransform-API] Processing single chunk of length ${targetChunk.length} (Streaming)`);

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    const onStatus = (msg: string) => {
                        console.log(`[CustomTransform-API] ${msg}`);
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
                    };

                    const onChunk = (chunkHtml: string) => {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', html: chunkHtml }) + '\n'));
                    };

                    const keepAlive = setInterval(() => {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                    }, 5000);

                    try {
                        const ctxState = { usages: [] as any[] };
                        const result = await aiUsageContext.run(ctxState, async () => {
                            return await runSingleChunkTransform(
                                targetChunk,
                                stylesheet || '',
                                pautasEspecificas || '',
                                onStatus,
                                model || 'gemini-3.5-flash',
                                onChunk,
                                provider
                            , reasoning);
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
                        console.error('[CustomTransform-API] Chunk Processing Error:', err);
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
        }

        // Default: Original Custom Transform Pipeline
        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        console.log(`[CustomTransform-API] Processing ${content.length} chars (Streaming Original Pipeline)`);

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                const onStatus = (msg: string) => {
                    console.log(`[CustomTransform-API] ${msg}`);
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
                        return await runCustomTransformPipeline(
                            content,
                            presetInstructions || '',
                            userInstructions || '',
                            onStatus,
                            model || 'gemini-3.5-flash',
                            onChunk,
                            provider
                        , reasoning);
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
                    console.error('[CustomTransform-API] Pipeline Error:', err);
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
        console.error('[CustomTransform-API] Outer Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
