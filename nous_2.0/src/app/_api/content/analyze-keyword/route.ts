import { NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataforseo';
import { IntelligenceService } from '@/lib/services/intelligence';

export async function POST(req: Request) {
    try {
        const { keyword, topic, manualSerp } = await req.json();

        if (!keyword) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
        }

        console.log(`[AnalyzeKeyword] Using ${manualSerp ? 'Manual Desktop' : 'DataForSEO'} SERP for: ${keyword}`);

        // 1. Get Top 10 Competitors (From Manual Desktop Scraping OR DataForSEO)
        const serpItems = manualSerp || await DataForSeoService.getSerpForKeyword(keyword);

        if (serpItems.length === 0) {
            return NextResponse.json({ error: 'No organic results found' }, { status: 404 });
        }

        // 2. Select the top 3 most relevant URLs using AI
        console.log(`[AnalyzeKeyword] Identifying top 3 strategic competitors...`);
        const topCompetitors = await IntelligenceService.selectSemanticReferences(
            serpItems.map((i: any) => ({ url: i.url, title: i.title, description: i.description })),
            topic || keyword
        );

        // 3. For the very best competitor, get their ranked keywords to find "Semantic Gaps"
        // This gives us the keywords they rank for that we should also target.
        const bestCompetitorUrl = topCompetitors[0]?.url;
        let semanticKeywords: any[] = [];

        if (bestCompetitorUrl) {
            console.log(`[AnalyzeKeyword] Extracting semantic DNA from top competitor: ${bestCompetitorUrl}`);
            const rawKeywords = await DataForSeoService.getRankedKeywords(bestCompetitorUrl, 'page');

            // Clean and filter keywords with AI
            semanticKeywords = await IntelligenceService.cleanKeywords(
                rawKeywords,
                topic || keyword
            );
        }

        return NextResponse.json({
            keyword,
            competitors: topCompetitors,
            suggested_keywords: semanticKeywords,
            total_competitors_found: serpItems.length
        });

    } catch (error: any) {
        console.error('[AnalyzeKeyword Error]:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
