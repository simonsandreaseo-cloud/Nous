import { NextResponse } from 'next/server';
import { runHumanizerPipeline } from '@/lib/actions/aiActions';

export async function POST(req: Request) {
    try {
        const { content, config, intensity } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

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
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
