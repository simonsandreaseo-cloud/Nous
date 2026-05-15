import { NextResponse } from "next/server";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY || 'fc-1a6816cc1b414aacbb04e101d5da6479';
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

/**
 * POST /api/tools/firecrawl
 * Proxy server-side para Firecrawl — evita CORS y protege la API key.
 * 
 * Body:
 *   action: "batch_start" | "batch_poll" | "scrape"
 *   urls?: string[]      (para batch_start)
 *   jobId?: string       (para batch_poll)
 *   url?: string         (para scrape individual)
 */
export async function POST(req: Request) {
    try {
        const { action, urls, jobId, url } = await req.json();

        if (action === "batch_start") {
            const res = await fetch(`${FIRECRAWL_BASE}/batch/scrape`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urls, formats: ["markdown"] }),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.ok ? 200 : res.status });
        }

        if (action === "batch_poll") {
            if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
            const res = await fetch(`${FIRECRAWL_BASE}/batch/scrape/${jobId}`, {
                headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
                signal: AbortSignal.timeout(15000)
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.ok ? 200 : res.status });
        }

        if (action === "scrape") {
            if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
            const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, formats: ["markdown"] }),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.ok ? 200 : res.status });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("[FIRECRAWL-PROXY] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
