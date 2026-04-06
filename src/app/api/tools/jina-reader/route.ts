import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { url, apiKey: clientKey } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let targetUrl = url.trim();

        const jinaBaseUrl = "https://r.jina.ai/";
        const rawKey = clientKey || process.env.JINA_READER_KEY || process.env.NEXT_PUBLIC_JINA_API_KEY;
        const apiKey = rawKey?.trim();

        const baseHeaders: Record<string, string> = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-respond-with": "markdown",
            "x-reader-lm-v2": "true",
            "X-With-Generated-Alt": "true",
            "X-With-Iframe": "true",
            "X-With-Images-Summary": "true",
            "X-Retain-Images": "none",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };

        if (apiKey) {
            const token = apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;
            baseHeaders["Authorization"] = `Bearer ${token}`;
        }

        console.log(`[JINA-READER] Extracting (POST): ${targetUrl.substring(0, 60)}...`);
        let response;
        try {
            response = await fetch(jinaBaseUrl, { 
                method: "POST", 
                headers: baseHeaders,
                body: JSON.stringify({ url: targetUrl }),
                signal: AbortSignal.timeout(25000)
            });
        } catch (fetchError: any) {
            if (fetchError.name === 'TimeoutError' || fetchError.message?.includes('aborted')) {
                console.warn(`[JINA-READER] Timeout (POST) for URL: ${targetUrl}`);
                return NextResponse.json({ error: "TIMEOUT_EXCEEDED", message: "La web del competidor tardó demasiado en responder." }, { status: 504 });
            }
            throw fetchError;
        }
        
        if (!response.ok) {
            const errBody = await response.text().catch(() => "N/A");
            console.error(`[JINA-READER] API Rejected (${response.status}):`, errBody.substring(0, 500));
            
            // Return Jina's actual error message if possible
            let errorMsg = "Jina AI rejected the request";
            try {
                const errJson = JSON.parse(errBody);
                errorMsg = errJson.error || errJson.message || errorMsg;
            } catch(e) {}

            if (response.status === 429 && apiKey) {
                await new Promise(r => setTimeout(r, 2000));
                response = await fetch(jinaBaseUrl, { 
                    method: "POST", 
                    headers: baseHeaders,
                    body: JSON.stringify({ url: targetUrl })
                });
            } else if (response.status >= 400) {
                return NextResponse.json({ 
                    error: "JINA_ERROR", 
                    message: errorMsg,
                    status: response.status 
                }, { status: 500 });
            }
        }

        if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                try {
                    const data = await response.json();
                    const result = data.data || data;
                    return NextResponse.json({
                        ok: true,
                        title: result.title || "Contenido Extraído",
                        url: targetUrl,
                        content: result.content || result.markdown || "",
                        markdown: result.markdown || result.content || ""
                    });
                } catch (e) {
                    console.warn("[JINA-READER] JSON parse failed, falling back to text...");
                }
            }
            
            // Fallback for non-JSON or parse failure
            const text = await response.text();
            if (text.length > 100) {
                return NextResponse.json({
                    ok: true,
                    title: "Extracción Directa",
                    url: targetUrl,
                    content: text,
                    markdown: text
                });
            }
        }

        // EXTREME FALLBACK: Bypass Jina entirely
        console.warn(`[JINA-READER] Final fallback for ${targetUrl}`);
        try {
            const directRes = await fetch(targetUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                signal: AbortSignal.timeout(10000)
            });
            if (directRes.ok) {
                const html = await directRes.text();
                const clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '').replace(/<[^>]+>/gm, ' ').replace(/\s+/gm, ' ').trim();
                return NextResponse.json({ ok: true, title: "Auto-Extracción", url: targetUrl, content: clean.substring(0, 15000), markdown: clean.substring(0, 15000) });
            }
        } catch (e) {}

        return NextResponse.json({ error: "Extracción fallida después de múltiples intentos.", status: response.status }, { status: 500 });

    } catch (error: any) {
        console.error("[JINA-READER] Critical error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
