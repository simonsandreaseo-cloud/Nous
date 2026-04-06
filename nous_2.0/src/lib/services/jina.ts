export async function fetchJinaExtraction(url: string, apiKey: string): Promise<{ content: string; title: string }> {
  try {
    console.log(`[Jina Service] Extrayendo directamente con Jina: ${url.substring(0, 55)}...`);
    const cleanUrl = url.trim();

    // Prefer direct call to Jina API to avoid proxy baseUrl resolution issues on the server side
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-respond-with": "markdown",
        "x-reader-lm-v2": "true"
    };
    
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: cleanUrl }),
        signal: AbortSignal.timeout(20000) // 20s timeout
    });

    if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json();
            const result = data.data || data;

            if ((result.content || result.markdown || "").length >= 50) {
                return {
                    content: result.content || result.markdown,
                    title: result.title || "Extraído vía Jina"
                };
            }
            throw new Error(`Contenido pobre o bloqueado (${(result.content || result.markdown || "").length} chars)`);
        } else {
            const text = await response.text();
            if (text.length >= 50) {
                return {
                    content: text,
                    title: "Extraído vía Jina (Texto)"
                };
            }
            throw new Error(`Contenido pobre o bloqueado (${text.length} chars)`);
        }
    }

    const errorText = await response.text().catch(() => "N/A");
    let msg = `Error ${response.status}`;
    try {
        const errorJson = JSON.parse(errorText);
        msg = errorJson.error || errorJson.message || msg;
    } catch(e) {
        msg = response.statusText || msg;
    }
    
    console.error(`[Jina Service] Direct call failed (${response.status}): ${msg}`);
    throw new Error(`Jina Extraction Error: ${msg}`);

  } catch (e: any) {
    console.error("[Jina Service] Error:", e.message);
    throw e;
  }
}
