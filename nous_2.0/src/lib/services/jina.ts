export async function fetchJinaExtraction(url: string, apiKey: string): Promise<{ content: string; title: string }> {
  try {
    // Robust origin detection for both client and potential server environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
    const proxyUrl = `${baseUrl}/api/tools/jina-reader`;
    
    console.log(`[Jina Service] Extrayendo: ${url.substring(0, 55)}...`);

    // Use URL SearchParams or JSON body as it was, but ensure encoding
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), apiKey })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try { errorData = JSON.parse(errorText); } catch(e) {}
      
      const msg = errorData.error || errorData.message || response.statusText || "Error desconocido";
      
      // LOG POLICY: Warning if fallback is available, Error if it's the end of the line
      if (apiKey && response.status !== 401) {
          console.warn(`[Jina Service] Proxy falló (${response.status}: ${msg}). Intentando fallback directo...`);
          try {
              const directRes = await fetch("https://r.jina.ai/", {
                  method: "POST",
                  headers: { 
                      "Authorization": `Bearer ${apiKey}`,
                      "Content-Type": "application/json",
                      "Accept": "application/json",
                      "x-respond-with": "markdown",
                      "x-reader-lm-v2": "true"
                  },
                  body: JSON.stringify({ url: url.trim() }),
                  signal: AbortSignal.timeout(20000) // Timeout protector de 20s
              });
              if (directRes.ok) {
                  const data = await directRes.json();
                  const result = data.data || data;
                  if (result.content || result.markdown) {
                      return { 
                          content: result.content || result.markdown, 
                          title: result.title || "Extraído (Directo)" 
                      };
                  }
              }
          } catch (fallbackE: any) {
              console.warn(`[Jina Service] Fallback directo también falló: ${fallbackE.message}`);
          }
      } else {
          console.error(`[Jina Service] Proxy falló definitivamente (${response.status}): ${msg}`);
      }
      throw new Error(`Jina Extraction Error: ${msg}`);
    }

    const data = await response.json();
    
    if (!data.ok || (!data.content && !data.markdown) || (data.content || data.markdown || "").length < 50) {
      throw new Error(`Contenido pobre o bloqueado (${(data.content || data.markdown || "").length} chars)`);
    }
    
    return {
      content: data.content || data.markdown,
      title: data.title || "Extraído vía Jina"
    };
  } catch (e: any) {
    console.error("[Jina Service] Error:", e.message);
    throw e;
  }
}
