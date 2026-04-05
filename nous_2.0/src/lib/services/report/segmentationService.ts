async function queryAI(prompt: string, apiKey: string, modelId: string = 'gemini-2.5-flash', jsonResponse: boolean = false): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: modelId });
    const config: any = {};
    if (jsonResponse) config.responseMimeType = 'application/json';
    const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: config
    });
    return res.response.text();
}


interface SegmentRule {
    name: string;
    regex: string;
}

interface UrlEntry {
    url: string;
    category?: string;
}

export const SegmentationService = {
    async generateSegmentRules(urls: (string | UrlEntry)[], apiKey: string): Promise<SegmentRule[]> {
        // Normalize input to UrlEntry[]
        const entries: UrlEntry[] = urls.map(u => typeof u === 'string' ? { url: u } : u);

        // 1. Separation: Structured vs Root/Orphan URLs
        // Group by folder and category context
        const architectureMap = new Map<string, { count: number, sample: string, categories: Set<string> }>();
        const orphans: { url: string, category?: string }[] = [];

        entries.forEach(entry => {
            const u = entry.url;
            try {
                const path = u.startsWith('http') ? new URL(u).pathname : u.split('?')[0];
                const parts = path.split('/').filter(Boolean);

                if (parts.length >= 2) {
                    const stem = `/${parts[0]}/`;
                    const data = architectureMap.get(stem) || { count: 0, sample: u, categories: new Set() };
                    data.count++;
                    if (entry.category) data.categories.add(entry.category);
                    architectureMap.set(stem, data);
                } else if (path !== '/' && path !== '') {
                    orphans.push({ url: path, category: entry.category });
                }
            } catch (e) { }
        });

        // 2. Layer 1: Folder Based Segments
        let layer1Rules: SegmentRule[] = [];
        const sortedArchitecture = Array.from(architectureMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 50);

        if (sortedArchitecture.length > 0) {
            const summary = sortedArchitecture.map(([stem, data]) => {
                const catInfo = data.categories.size > 0 ? ` | User Categories: ${Array.from(data.categories).join(', ')}` : '';
                return `- Folder: ${stem} | Count: ${data.count}${catInfo} | Example: ${data.sample}`;
            }).join('\n');

            layer1Rules = await generateAiRules(summary, "Folder Structure", apiKey);
        }

        // 3. Layer 2: Semantic Root Segments
        let layer2Rules: SegmentRule[] = [];
        if (orphans.length > 0) {
            // Select representative orphans
            const orphanSample = orphans.sort(() => 0.5 - Math.random()).slice(0, 100);
            const summary = orphanSample.map(o => o.category ? `[Cat: ${o.category}] ${o.url}` : o.url).join('\n');

            layer2Rules = await generateAiRules(summary, "Root URL Patterns", apiKey);
        }

        return [...layer1Rules, ...layer2Rules];
    }
};

async function generateAiRules(summary: string, contextType: string, apiKey: string): Promise<SegmentRule[]> {
    const isRoot = contextType === "Root URL Patterns";

    const systemPrompt = `You are a Regex Expert for SEO. 
Analyze the provided ${contextType} summary and group URLs into business segments.

RULES:
1. Identify broad silos and architectural segments. AIM FOR GENERALITY.
2. For each User Category, find the common architectural parent pattern (e.g. if URLs in "Blog" start with /blogs/, the regex MUST be "/blogs/.*").
3. FLAT ARCHITECTURE DETECTION: If URLs hang from the root Domain without a directory (e.g. /product-slug vs /category-slug), look for character signatures like:
   - Presence of numbers/SKUs (e.g., [^\/]+-\d+\/.*)
   - Number of hyphens/dashes (e.g., articles often have 3+ dashes, categories have 0-1)
   - Common prefixes or suffixes in the slug.
4. STOP being specific: Do not use the unique slug of a specific product or article in the regex unless configured.
5. Return JSON array: [{ "name": "Segment Name", "regex": "pattern" }]
6. PRIORITIZE the "User Categories" provided in the data to name the segments.

IMPORTANT: Return ONLY valid JSON array without markdown blocks.`;

    const fullPrompt = `[System]: ${systemPrompt}\n\n[Data]: SUMMARY:\n${summary}`;

    try {
        console.log(`[AI-SEGMENTATION] Sending to AI (Mode: auto)...`);
        let text = await queryAI(fullPrompt, apiKey, 'gemini-2.5-flash', true);

        // Limpiar backticks si los devuelve
        if (text.startsWith('```json')) text = text.replace('```json', '');
        if (text.startsWith('```')) text = text.replace('```', '');
        text = text.trim();
        if (text.endsWith('```')) text = text.slice(0, -3).trim();

        if (text) return JSON.parse(text);
    } catch (e: any) {
        console.warn(`[AI-SEGMENTATION] AI failed:`, e.message?.substring(0, 100));
        return [];
    }

    console.error(`[AI-SEGMENTATION] All models failed for ${contextType}`);
    return [];
}
