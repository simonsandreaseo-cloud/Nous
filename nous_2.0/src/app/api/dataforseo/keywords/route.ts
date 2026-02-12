import { NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataforseo';

export async function POST(req: Request) {
    try {
        const { keywords, locationCode, languageCode } = await req.json();

        if (!keywords || !Array.isArray(keywords)) {
            return NextResponse.json({ error: 'Keywords must be an array' }, { status: 400 });
        }

        const data = await DataForSeoService.getKeywordsMetrics(keywords, locationCode, languageCode);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('DataForSEO API Route Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
