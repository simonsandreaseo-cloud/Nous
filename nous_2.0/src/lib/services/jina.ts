export async function fetchJinaExtraction(url: string, apiKey: string): Promise<{ content: string; title: string }> {
  try {
    const cleanUrl = url.trim();
    
    // Obtenemos el origen de la ventana para construir la URL del proxy
    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "";
    const proxyUrl = `${baseUrl}/api/tools/jina-reader`;
    
    console.log(`[Jina Service] Extrayendo vía Proxy: ${cleanUrl.substring(0, 55)}...`);

    const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            url: cleanUrl,
            apiKey: apiKey // Pasamos la key si viene desde el cliente, si no el proxy usará la del server
        }),
        signal: AbortSignal.timeout(40000) // Timeout extendido a 40s para el proxy
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || errorData.error || response.statusText || "Error en el proxy";
      throw new Error(`Proxy Jina Error: ${msg}`);
    }

    const result = await response.json();
    
    if (!result.ok || !result.content || result.content.length < 50) {
      throw new Error(`Contenido insuficiente o error en proxy: ${result.message || "Sin contenido"}`);
    }
    
    return {
      content: result.content,
      title: result.title || "Extraído vía Jina"
    };
  } catch (e: any) {
    console.warn(`[Jina Service] Fallo en la extracción para ${url.substring(0, 30)}:`, e.message);
    throw e;
  }
}

