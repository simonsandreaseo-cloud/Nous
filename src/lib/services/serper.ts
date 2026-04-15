export async function fetchSerperSearch(query: string, gl = "es", hl = "es", num = 30): Promise<{organic: any[], faqs: any[]}> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
    const proxyUrl = `${origin}/api/tools/serper`;
    
    console.log(`[Serper Service] Buscando: ${query}`);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl, hl, num }),
      signal: AbortSignal.timeout(30000) // Increase to 30s for 100 results
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Serper Service] Proxy Error (${response.status}):`, errorData.error || response.statusText);
        throw new Error(`Serper Proxy error: ${response.status}`);
    }

    const data = await response.json();
    return {
      organic: (data.organic || []).map((r: any, index: number) => ({ ...r, originalPosition: index + 1 })),
      faqs: data.peopleAlsoAsk || []
    };
  } catch (error: any) {
    console.error("[Serper Service] Error:", error.message);
    return { organic: [], faqs: [] };
  }
}
