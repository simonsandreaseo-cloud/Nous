import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/unstructured
 * 
 * Server-side proxy para Unstructured.io API.
 * El navegador no puede llamar directamente a esta API (CORS), 
 * por eso se enruta a través de Next.js server.
 */
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL requerida' },
                { status: 400 }
            );
        }

        const apiKey = process.env.UNSTRUCTURED_API_KEY
            || process.env.NEXT_PUBLIC_UNSTRUCTURED_API_KEY
            || 'cVhP6F5TmXggdTGus5Z23lGo5ALtuj';

        const formData = new FormData();
        formData.append('url', url);
        formData.append('strategy', 'fast');

        const response = await fetch('https://api.unstructuredapp.io/general/v0/general', {
            method: 'POST',
            headers: {
                'unstructured-api-key': apiKey,
                'accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            console.warn(`[Unstructured Proxy] API Warning (${response.status}). Retrying with Jina AI fallback: ${url}`);
            const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (jinaRes.ok) {
                const jinaData = await jinaRes.json();
                return NextResponse.json({ text: jinaData.data?.content || jinaData.text || '' });
            }
            return NextResponse.json({ text: '' });
        }

        const data = await response.json();

        let text = '';
        if (Array.isArray(data)) {
            text = data.map((el: any) => el.text).filter(Boolean).join('\n\n');
        }

        // Final fallback if text is too short after Unstructured
        if (text.length < 100) {
            console.log(`[Unstructured Proxy] Text too short, trying Jina AI for better quality: ${url}`);
            const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (jinaRes.ok) {
                const jinaData = await jinaRes.json();
                const jinaContent = jinaData.data?.content || jinaData.text || '';
                if (jinaContent.length > text.length) text = jinaContent;
            }
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('[Unstructured Proxy] Main Error:', error.message);
        return NextResponse.json({ text: '' }, { status: 200 });
    }
}
