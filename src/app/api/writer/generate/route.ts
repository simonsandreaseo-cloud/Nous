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
                    
                    let inHtml = false;
                    let fullBuffer = '';

                    for await (const chunk of streamIterable) {
                        const text = chunk.text ? (typeof chunk.text === 'function' ? chunk.text() : chunk.text) : '';
                        if (!text) continue;
                        
                        fullBuffer += text;
                        
                        if (!inHtml) {
                            const matchIndex = fullBuffer.indexOf('<articulo_html>');
                            if (matchIndex !== -1) {
                                inHtml = true;
                                const contentAfterTag = fullBuffer.slice(matchIndex + '<articulo_html>'.length);
                                const cleanText = contentAfterTag.replace(/<\/articulo_html>/g, '');
                                if (cleanText) {
                                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', text: cleanText }) + '\n'));
                                }
                            }
                        } else {
                            const cleanText = text.replace(/<\/articulo_html>/g, '');
                            if (cleanText) {
                                controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', text: cleanText }) + '\n'));
                            }
                        }
                    }
                    
                    // Fallback: Si el modelo desobedeció por completo y nunca abrió la etiqueta, devolvemos todo lo capturado para que no quede en blanco
                    if (!inHtml && fullBuffer.trim().length > 0) {
                        const cleanFallback = fullBuffer.replace(/<razonamiento_interno>[\s\S]*?<\/razonamiento_interno>/g, '').trim();
                        if (cleanFallback) {
                            controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', text: cleanFallback }) + '\n'));
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
