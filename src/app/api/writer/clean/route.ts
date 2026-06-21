import { NextResponse } from 'next/server';
import { runFinalCleaningLayer } from '@/lib/actions/aiActions';

export const maxDuration = 300;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { html } = body;

        if (!html) return NextResponse.json({ error: 'HTML required' }, { status: 400 });

        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: 'Iniciando limpieza final con Gemini 3.5...' }) + '\n'));
                
                const keepAlive = setInterval(() => {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'keep-alive' }) + '\n'));
                }, 5000);

                try {
                    const result = await runFinalCleaningLayer(html, (msg) => {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
                    });
                    
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
