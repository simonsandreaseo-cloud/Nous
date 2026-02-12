import { GoogleGenerativeAI } from "@google/generative-ai";

interface SegmentRule {
    name: string;
    regex: string;
}

export const SegmentationService = {
    async generateSegmentRules(urls: string[], apiKey: string): Promise<SegmentRule[]> {
        // 1. Separation: Structured vs Root/Orphan URLs
        const architectureMap = new Map<string, { count: number, sample: string }>();
        const orphans: string[] = [];

        urls.forEach(u => {
            try {
                const path = u.startsWith('http') ? new URL(u).pathname : u.split('?')[0];
                const parts = path.split('/').filter(Boolean);

                // Logic: If it has a subdirectory (e.g. /blog/title), it's structured.
                // If it's just /title, it's a root URL (orphan).
                if (parts.length >= 2) {
                    const stem = `/${parts[0]}/`;
                    const entry = architectureMap.get(stem) || { count: 0, sample: u };
                    entry.count++;
                    architectureMap.set(stem, entry);
                } else if (path !== '/' && path !== '') {
                    orphans.push(path);
                }
            } catch (e) { }
        });

        // 2. Layer 1: Folder Based Segments
        let layer1Rules: SegmentRule[] = [];
        const sortedArchitecture = Array.from(architectureMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 50); // Top 50 folders

        if (sortedArchitecture.length > 0) {
            const summary = sortedArchitecture.map(([stem, data]) =>
                `- Folder: ${stem} | Count: ${data.count} | Example: ${data.sample}`
            ).join('\n');

            layer1Rules = await generateAiRules(summary, "Folder Structure", apiKey);
        }

        // 3. Layer 2: Semantic Root Segments
        // If we have many root URLs, they might be Products, Leaves, or Static Pages.
        let layer2Rules: SegmentRule[] = [];
        if (orphans.length > 0) {
            // Sample orphans to find patterns
            const orphanSample = orphans.sort(() => 0.5 - Math.random()).slice(0, 100);
            const summary = orphanSample.join('\n');

            layer2Rules = await generateAiRules(summary, "Root URL Patterns", apiKey);
        }

        return [...layer1Rules, ...layer2Rules];
    }
};

async function generateAiRules(summary: string, contextType: string, apiKey: string): Promise<SegmentRule[]> {
    // Specialized prompt based on context
    const isRoot = contextType === "Root URL Patterns";

    const systemPrompt = `
    You are a Regex Expert for SEO. 
    Analyze the provided ${contextType} summary and group URLs into business segments.
    
    RULES:
    1. Create a Javascript Regex for each group.
    2. ${isRoot ? 'Look for patterns in the slug (e.g. keywords, prefixes, suffixes) or list critical static pages.' : 'Map folders to segment names.'}
    3. Return JSON array: [{ "name": "Segment Name", "regex": "pattern" }]
    4. ${isRoot ? 'If patterns are weak, group by page type (e.g. "Core Pages" for about/contact).' : 'Combine similar folders if they mean same thing (e.g. /en/blog and /es/blog -> "Blog").'}
    
    IMPORTANT: Return ONLY JSON.
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash'
    ];

    let lastError: any = null;

    for (const modelId of modelsToTry) {
        try {
            console.log(`[AI-SEGMENTATION] Trying model: ${modelId}`);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent([
                { text: systemPrompt },
                { text: `SUMMARY:\n${summary}` }
            ]);
            const text = result.response.text();
            if (text) return JSON.parse(text);
        } catch (e: any) {
            console.warn(`[AI-SEGMENTATION] Model ${modelId} failed:`, e.message?.substring(0, 100));
            lastError = e;
            // If it's a 404 or 429, try next model
            continue;
        }
    }

    console.error(`[AI-SEGMENTATION] All models failed for ${contextType}`);
    return [];
}
