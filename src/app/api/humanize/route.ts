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

        console.log(`[Humanizer-API] Processing ${content.length} chars`);

        // status callback (simplified for server logs)
        const onStatus = (msg: string) => console.log(`[Humanizer-API] ${msg}`);

        // Call the service (this now runs server-side)
        const result = await runHumanizerPipeline(
            content,
            config,
            intensity || 50,
            onStatus,
            'gemma-4-31b-it'
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Humanizer-API] Error:', error);
        // Ensure strictly JSON response
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
