import { NextResponse } from 'next/server';
import { runHumanizerPipeline } from '@/lib/actions/aiActions';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, config, intensity } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        console.log(`[Humanizer-API] Processing ${content.length} chars (Streaming)`);

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                const onStatus = (msg: string) => {
                    console.log(`[Humanizer-API] ${msg}`);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
                };

                const onChunk = (chunkHtml: string) => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', html: chunkHtml }) + '\n'));
                };

                try {
                    const result = await runHumanizerPipeline(
                        content,
                        config,
                        intensity || 50,
                        onStatus,
                        'gemini-2.5-flash-lite',
                        onChunk
                    );

                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', result }) + '\n'));
                    controller.close();
                } catch (err: any) {
                    console.error('[Humanizer-API] Pipeline Error:', err);
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
        console.error('[Humanizer-API] Outer Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
