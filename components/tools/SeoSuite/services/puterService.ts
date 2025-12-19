
import { SerpSimulation } from "../types";

declare const puter: any;

export const simulateSerpWithPuter = async (query: string, lang: 'es' | 'en'): Promise<SerpSimulation> => {
    // Check if Puter is loaded
    if (typeof puter === 'undefined') {
        throw new Error("Puter.js is not loaded. Please ensure the script is included in index.html");
    }

    try {
        // AUTH FIX: Explicitly check and await sign in before doing anything else
        if (!puter.auth.isSignedIn()) {
            await puter.auth.signIn();
        }
    } catch (authError) {
        console.error("Puter Auth Error:", authError);
        throw new Error("Authentication failed or window closed.");
    }

    const prompt = `
    Act as a Google Search Engine simulator.
    
    Task: Generate a realistic Search Engine Results Page (SERP) for the query: "${query}".
    Language: ${lang === 'es' ? 'Spanish' : 'English'}.
    Region: ${lang === 'es' ? 'Spain/Latin America' : 'United States'}.

    Provide the top 5 organic results + 1 optional sponsored result if relevant for this query.
    For each result, provide:
    - Position (0 for sponsored, 1-5 for organic)
    - Title (Clickable blue text style)
    - URL (Display URL)
    - Snippet (Meta description style text)

    Ensure the results represent REAL competitors or highly likely authorities for this query (e.g., Wikipedia, Amazon, top niche competitors).

    Output ONLY raw JSON with this structure:
    {
        "query": "${query}",
        "results": [
            { "position": 0, "title": "...", "url": "...", "snippet": "...", "isSponsored": true },
            { "position": 1, "title": "...", "url": "...", "snippet": "...", "isSponsored": false }
        ]
    }
    `;

    try {
        // Use Puter's chat capability
        const response = await puter.ai.chat(prompt);
        
        let text = typeof response === 'string' ? response : response?.message?.content || '';
        
        // Clean markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1) {
            text = text.substring(startIndex, endIndex + 1);
        }

        return JSON.parse(text) as SerpSimulation;

    } catch (error) {
        console.error("Puter AI Error:", error);
        throw new Error("Failed to simulate SERP via Puter.");
    }
};
