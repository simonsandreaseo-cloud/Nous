export const fetchJinaExtraction = async (url: string, apiKey: string): Promise<{ content: string; title: string }> => {
    try {
        const cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http')) {
            throw new Error(`Invalid URL format: ${url}`);
        }

        console.log(`[Jina] Extracting: ${cleanUrl}`);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (apiKey && apiKey.trim() !== "") {
            headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }

        console.log(`[Jina] Extracting: ${cleanUrl} (Key present: ${!!apiKey})`);
        
        const response = await fetch(`https://r.jina.ai`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ url: cleanUrl })
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => "No details");
            throw new Error(`Jina error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return {
            content: data.data?.content || "",
            title: data.data?.title || ""
        };
    } catch (e) {
        console.error("[Jina] Extraction failed:", e);
        throw e;
    }
};
