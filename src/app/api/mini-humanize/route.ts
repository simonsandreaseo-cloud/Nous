import { NextResponse } from 'next/server';
import { runMiniHumanizerPipeline } from '@/lib/actions/aiActions';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, config, intensity, mode } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        console.log(`[MiniHumanizer-API] Processing ${content.length} chars (Streaming), Mode: ${mode || 'standard'}`);

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                const onStatus = (msg: string) => {
                    console.log(`[MiniHumanizer-API] ${msg}`);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
                };

                const onLog = (msg: string) => {
                    console.log(`[MiniHumanizer-LOG] ${msg}`); // Keep server log too
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'log', message: msg }) + '\n'));
                };

                const onChunk = (chunkHtml: string) => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', html: chunkHtml }) + '\n'));
                };

                // Keep-alive mechanism to prevent Vercel timeout on long processes
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                }, 5000);

                try {
                    const result = await runMiniHumanizerPipeline(
                        content,
                        config,
                        intensity || 50,
                        onStatus,
                        body.model || 'gemma-4-31b-it',
                        onChunk,
                        onLog,
                        mode || 'standard'
                    );

                    clearInterval(keepAlive);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', result }) + '\n'));
                    controller.close();
                } catch (err: any) {
                    clearInterval(keepAlive);
                    console.error('[MiniHumanizer-API] Pipeline Error:', err);
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
        console.error('[MiniHumanizer-API] Outer Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
