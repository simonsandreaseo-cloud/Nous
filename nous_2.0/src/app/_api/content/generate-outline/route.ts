import { NextResponse } from 'next/server';
import { IntelligenceService } from '@/lib/services/intelligence';

export async function POST(req: Request) {
    try {
        const { competitorStructures, targetKeywords, topic } = await req.json();

        if (!competitorStructures || !targetKeywords || !topic) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        console.log(`[GenerateOutline] Designing master outline for: ${topic}`);

        const outline = await IntelligenceService.generateNeuralOutline(
            competitorStructures,
            targetKeywords,
            topic
        );

        return NextResponse.json(outline);

    } catch (error: any) {
        console.error('[GenerateOutline Error]:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
