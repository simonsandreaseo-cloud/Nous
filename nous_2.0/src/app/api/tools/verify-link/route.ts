import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

        const response = await fetch(url, { 
            method: 'GET', // Some sites block HEAD
            next: { revalidate: 0 },
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });

        return NextResponse.json({ 
            status: response.status,
            ok: response.status >= 200 && response.status < 400,
        });
    } catch {
        return NextResponse.json({ ok: false, status: 500 });
    }
}
