import { NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataforseo';
import { IntelligenceService } from '@/lib/services/intelligence';

export async function POST(req: Request) {
    try {
        const { url, topic, targetType = 'page' } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Fetch Real Organic Ranking Data from DataForSEO Labs
        console.log(`[AnalyzeURL] Fetching organic keywords for: ${url}`);
        const rawKeywords = await DataForSeoService.getRankedKeywords(url, targetType);

        // 2. AI Intelligence Layer: Clean and Categorize
        console.log(`[AnalyzeURL] Cleaning ${rawKeywords.length} keywords with AI...`);
        const cleanedKeywords = await IntelligenceService.cleanKeywords(
            rawKeywords,
            topic || url
        );

        return NextResponse.json({
            url,
            total_raw: rawKeywords.length,
            cleaned_count: cleanedKeywords.length,
            keywords: cleanedKeywords
        });

    } catch (error: any) {
        console.error('[AnalyzeURL Error]:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
