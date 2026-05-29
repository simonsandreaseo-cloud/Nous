import { NextResponse } from 'next/server';
import { generateArticleJSON } from '@/lib/actions/aiActions';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, model, hierarchy } = body;

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                // Enqueue an initial byte to start the stream immediately
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: 'Iniciando redacción...' }) + '\n'));
                
                // Set up a keep-alive interval to prevent Vercel from timing out
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                }, 5000);

                try {
                    const result = await generateArticleJSON(model, prompt, hierarchy);
                    clearInterval(keepAlive);
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', text: result }) + '\n'));
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

