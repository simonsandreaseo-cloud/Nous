
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Mock data for initial setup - in production this would fetch from Google Search Console API
const mockSearchConsoleData = {
    performance: {
        clicks: 1250,
        impressions: 45000,
        ctr: 2.8,
        position: 12.4
    },
    topQueries: [
        { query: "diagnóstico ia", clicks: 150, impressions: 2000, position: 3 },
        { query: "seo médico", clicks: 90, impressions: 1200, position: 5 },
        { query: "telemedicina 2026", clicks: 85, impressions: 1100, position: 4 }
    ],
    status: "connected",
    lastSync: new Date().toISOString()
};

export async function GET() {
    // Simulate network delay for a realistic "edge" feel (though it will be fast)
    // In a real scenario, we would use the GSC API here.

    return NextResponse.json(mockSearchConsoleData, {
        status: 200,
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
    });
}
