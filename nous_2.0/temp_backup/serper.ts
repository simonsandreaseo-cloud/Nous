export const fetchSerperSearch = async (query: string, apiKey: string): Promise<any> => {
    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: query, gl: 'es', hl: 'es' })
        });
        
        if (!response.ok) throw new Error(`Serper API error: ${response.status}`);
        const data = await response.json();
        return (data.organic || []).map((item: any) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
        }));
    } catch (e) {
        console.error("[Serper] Fetch failed:", e);
        return [];
    }
};
