import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataforseo';

/**
 * POST /api/seo/data
 * 
 * Server-side unified proxy for DataForSEO.
 * Prevents CORS issues and centralizes credentials.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, target, keyword, locationCode, languageCode } = body;

        console.log(`[SEO-Proxy] Action: ${action}, Target/Keyword: ${target || keyword}`);

        if (action === 'keywords_for_site') {
            if (!target) return NextResponse.json({ error: 'Target URL required' }, { status: 400 });
            const result = await DataForSeoService.getKeywordsForSite(target, 'page', locationCode || 2724, languageCode || 'es');
            return NextResponse.json({ result });
        }

        if (action === 'search_volume') {
            if (!keyword) return NextResponse.json({ error: 'Keyword required' }, { status: 400 });
            const metrics = await DataForSeoService.getKeywordsMetrics([keyword], locationCode || 2724, languageCode || 'es');
            return NextResponse.json({ result: metrics });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[SEO-Proxy] Error:', error.message);
        return NextResponse.json(
            { error: error.message, result: [] },
            { status: 500 }
        );
    }
}
