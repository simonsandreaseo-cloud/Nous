import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let targetUrl = url;

        // Resolve Google Grounding Redirects
        if (url.includes('grounding-api-redirect') || url.includes('vertexaisearch')) {
            try {
                console.log("[JINA-READER] Resolving redirect for:", url.substring(0, 50) + "...");
                const resolveRes = await fetch(url, { 
                    method: "GET", 
                    redirect: "follow",
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });
                console.log(`[JINA-READER] Resolve Status: ${resolveRes.status}`);
                if (resolveRes.ok) {
                    targetUrl = resolveRes.url;
                    console.log("[JINA-READER] Resolved to:", targetUrl);
                }
            } catch (e) {
                console.warn("[JINA-READER] Failed to resolve redirect:", e);
            }
        }

        const jinaUrl = `https://r.jina.ai/${targetUrl}`;
        const apiKey = process.env.JINA_READER_KEY;

        const headers: Record<string, string> = {
            "Accept": "application/json",
            "X-With-Generated-Alt": "true"
        };

        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        let response = await fetch(jinaUrl, { method: "GET", headers });
        console.log(`[JINA-READER] Jina JSON Status: ${response.status} for ${targetUrl.substring(0, 50)}...`);

        if (!response.ok) {
            console.warn(`[JINA-READER] Jina JSON failed, retrying plain text...`);
            response = await fetch(jinaUrl, { 
                method: "GET", 
                headers: { "X-With-Generated-Alt": "true" }
            });
            console.log(`[JINA-READER] Jina Plain Status: ${response.status}`);
        }

        if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const data = await response.json();
                const result = data.data || data;
                return NextResponse.json({
                    ok: true,
                    title: result.title,
                    url: targetUrl,
                    content: result.content,
                    markdown: result.markdown || result.content
                });
            } else {
                const text = await response.text();
                return NextResponse.json({
                    ok: true,
                    title: "Fuente extraída (Texto)",
                    url: targetUrl,
                    content: text,
                    markdown: text
                });
            }
        }

        // LAST FALLBACK: Self-Extraction (Bypass Jina)
        console.warn(`[JINA-READER] Jina failed completely. Performing self-fetch fallback for: ${targetUrl}`);
        try {
            const selfRes = await fetch(targetUrl, { 
                method: "GET", 
                headers: { 'User-Agent': 'Mozilla/5.0' },
                next: { revalidate: 3600 } 
            });
            if (selfRes.ok) {
                const html = await selfRes.text();
                // Basic HTML cleaning to get readable text
                const text = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
                                 .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
                                 .replace(/<[^>]+>/gm, ' ')
                                 .replace(/\s+/gm, ' ')
                                 .trim()
                                 .substring(0, 5000);
                
                return NextResponse.json({
                    ok: true,
                    title: "Fuente extraída (Self-Fetch)",
                    url: targetUrl,
                    content: text,
                    markdown: text
                });
            }
        } catch (e: any) {
            console.error(`[JINA-READER] Self-fetch error: ${e.message}`);
        }

        return NextResponse.json({ 
            error: "No se pudo leer la fuente de ninguna forma.", 
            url: targetUrl 
        }, { status: 500 });

    } catch (error: any) {
        console.error("Jina Reader catch error:", error);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            message: error.message 
        }, { status: 500 });
    }
}
