
import { ProviderConfig, ExternalApiKeys } from "../types";

// Service for communicating with External Content/SERP APIs
// Supports: Jina, Firecrawl, Tavily, Unstructured.io, Serper.dev, DuckDuckGo (Free)

// Simple in-memory cache
const requestCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface SerpResponse {
    markdown: string;
    urls: string[];
}

/**
 * Standardizes markdown from different providers.
 */
const cleanMarkdown = (md: string): string => {
    if (!md) return "";
    let clean = md;
    clean = clean.replace(/!\[.*?\]\(.*?\)/g, ''); // Remove images
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Remove links, keep text
    clean = clean.replace(/Skip to content|Toggle navigation|Sign in|Log in/gi, ''); // Boilerplate
    clean = clean.replace(/[-=]{3,}/g, ''); // Dividers
    clean = clean.replace(/\n\s*\n/g, '\n\n'); // Max 2 newlines
    
    // Heuristic footer crop
    const lower = clean.toLowerCase();
    const copyrightIdx = lower.lastIndexOf('copyright ©');
    if (copyrightIdx > clean.length * 0.8) {
        clean = clean.substring(0, copyrightIdx);
    }
    return clean.trim();
};

// --- ADAPTERS ---

const fetchJinaContent = async (url: string, apiKey?: string) => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = { 
        'Accept': 'text/plain', 
        'X-Return-Format': 'markdown' 
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const response = await fetch(jinaUrl, { method: 'GET', headers });
    if (!response.ok) throw new Error(`Jina Error: ${response.status}`);
    return await response.text();
};

const fetchFirecrawlContent = async (url: string, apiKey: string) => {
    // Firecrawl /scrape
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            url: url,
            formats: ['markdown']
        })
    });
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Firecrawl Error: ${response.status} - ${err}`);
    }
    
    const json = await response.json();
    return json.data?.markdown || "";
};

const fetchUnstructuredContent = async (url: string, apiKey: string) => {
    // Unstructured.io requires a file. We must fetch the HTML first.
    // WARNING: This assumes the target URL allows CORS. If not, we use a proxy.
    let htmlBlob: Blob;
    try {
        // Try direct fetch first
        const pageRes = await fetch(url);
        if (!pageRes.ok) throw new Error(`Direct fetch failed`);
        htmlBlob = await pageRes.blob();
    } catch (e: any) {
        // Fallback: Proxy
        console.log("Direct fetch failed, trying proxy for Unstructured...");
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) throw new Error(`Proxy fetch failed: ${proxyRes.status}`);
        htmlBlob = await proxyRes.blob();
    }

    const formData = new FormData();
    formData.append('files', htmlBlob, 'website.html');
    formData.append('strategy', 'fast'); 
    formData.append('output_format', 'application/json');

    const response = await fetch('https://api.unstructured.io/general/v0/general', {
        method: 'POST',
        headers: {
            'unstructured-api-key': apiKey,
            'accept': 'application/json'
        },
        body: formData
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Unstructured API Error: ${response.status} - ${err}`);
    }

    const json = await response.json();
    
    // Convert Unstructured JSON elements to simple Markdown text
    if (Array.isArray(json)) {
        return json.map((el: any) => {
            if (el.type === 'Title' || el.type === 'Header') return `## ${el.text}`;
            if (el.type === 'ListItem') return `- ${el.text}`;
            return el.text;
        }).join('\n\n');
    }
    
    return "";
};

const fetchTavilySerp = async (query: string, apiKey: string): Promise<SerpResponse> => {
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 5
        })
    });

    if (!response.ok) throw new Error(`Tavily Error: ${response.status}`);
    
    const json = await response.json();
    const urls: string[] = [];
    
    let md = `## SERP Summary for "${query}"\n\n`;
    if (json.answer) md += `**Quick Answer:** ${json.answer}\n\n`;
    
    if (json.results && Array.isArray(json.results)) {
        json.results.forEach((r: any, i: number) => {
            md += `### ${i+1}. ${r.title}\n`;
            md += `URL: ${r.url}\n`;
            md += `Snippet: ${r.content}\n\n`;
            urls.push(r.url);
        });
    }
    return { markdown: md, urls };
};

const fetchJinaSerp = async (query: string, countryCode: string, langCode: string, apiKey?: string): Promise<SerpResponse> => {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=${countryCode}&hl=${langCode}&pws=0`;
    const text = await fetchJinaContent(googleUrl, apiKey);
    
    // Extract URLs from Markdown links as a fallback since Jina just dumps text
    // Regex to find links [text](url)
    const urls: string[] = [];
    const linkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    let count = 0;
    while ((match = linkRegex.exec(text)) !== null && count < 5) {
        const u = match[1];
        if (!u.includes('google') && !u.includes('search')) {
             urls.push(u);
             count++;
        }
    }

    return { markdown: text, urls };
};

const fetchSerperSerp = async (query: string, countryCode: string, langCode: string, apiKey: string): Promise<SerpResponse> => {
    const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            q: query,
            gl: countryCode,
            hl: langCode,
            num: 10
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Serper Error: ${response.status} - ${err}`);
    }

    const json = await response.json();
    const urls: string[] = [];
    
    let md = `## Google SERP for "${query}" (via Serper)\n\n`;
    
    if (json.organic && Array.isArray(json.organic)) {
        json.organic.forEach((r: any) => {
            md += `### ${r.position}. ${r.title}\n`;
            md += `URL: ${r.link}\n`;
            md += `Snippet: ${r.snippet}\n\n`;
            urls.push(r.link);
        });
    }
    
    if (json.peopleAlsoAsk && Array.isArray(json.peopleAlsoAsk)) {
        md += `\n### People Also Ask:\n`;
        json.peopleAlsoAsk.forEach((q: any) => md += `- ${q.question}\n`);
    }

    return { markdown: md, urls };
};

const fetchDuckDuckGoSerp = async (query: string, countryCode: string): Promise<SerpResponse> => {
    const regionMap: Record<string, string> = {
        'es': 'es-es', 'mx': 'mx-es', 'ar': 'ar-es', 'co': 'co-es', 
        'us': 'us-en', 'uk': 'uk-en', 'fr': 'fr-fr', 'de': 'de-de'
    };
    const region = regionMap[countryCode] || 'us-en';
    
    const targetUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=${region}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`DuckDuckGo Fetch Error: ${response.status}`);
    
    const html = await response.text();
    const urls: string[] = [];
    let md = `## DuckDuckGo SERP for "${query}"\n\n`;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table:last-of-type tr');
    
    let position = 1;
    let lastTitle = '';
    let lastUrl = '';
    
    rows.forEach((row) => {
        const link = row.querySelector('a.result-link');
        const snippet = row.querySelector('.result-snippet');
        
        if (link) {
            lastTitle = link.textContent?.trim() || '';
            lastUrl = link.getAttribute('href') || '';
        } else if (snippet && lastTitle) {
            const snippetText = snippet.textContent?.trim() || '';
            md += `### ${position}. ${lastTitle}\n`;
            md += `URL: ${lastUrl}\n`;
            md += `Snippet: ${snippetText}\n\n`;
            urls.push(lastUrl);
            position++;
            lastTitle = ''; 
        }
    });

    if (position === 1) md += "No results found or parsing failed.";
    
    return { markdown: md, urls };
};

// --- MAIN EXPORTS ---

export const fetchContentWithJina = async (
    url: string, 
    keys: ExternalApiKeys, 
    provider: ProviderConfig['reader'] = 'JINA'
): Promise<string> => {
    if (!url) return '';
    const cacheKey = `CONTENT:${provider}:${url}`;
    const cached = requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) return cached.data;

    let text = '';
    try {
        if (provider === 'FIRECRAWL') {
            if (!keys.firecrawl) throw new Error("Firecrawl API Key missing");
            text = await fetchFirecrawlContent(url, keys.firecrawl);
        } else if (provider === 'UNSTRUCTURED') {
            if (!keys.unstructured) throw new Error("Unstructured API Key missing");
            text = await fetchUnstructuredContent(url, keys.unstructured);
        } else {
            // Default Jina
            text = await fetchJinaContent(url, keys.jina);
        }
        
        text = cleanMarkdown(text);
        requestCache.set(cacheKey, { data: text, timestamp: Date.now() });
        return text;
    } catch (e) {
        console.warn(`${provider} Fetch Failed for ${url}:`, e);
        return "";
    }
};

export const fetchSerpWithJina = async (
    query: string, 
    countryCode: string, 
    langCode: string, 
    keys: ExternalApiKeys,
    provider: ProviderConfig['serp'] = 'JINA'
): Promise<SerpResponse> => {
    const cacheKey = `SERP:${provider}:${query}:${countryCode}`;
    const cached = requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) return cached.data as SerpResponse;

    let result: SerpResponse = { markdown: '', urls: [] };
    try {
        if (provider === 'TAVILY') {
            if (!keys.tavily) throw new Error("Tavily API Key missing");
            result = await fetchTavilySerp(query, keys.tavily);
        } else if (provider === 'SERPER') {
            if (!keys.serper) throw new Error("Serper API Key missing");
            result = await fetchSerperSerp(query, countryCode, langCode, keys.serper);
        } else if (provider === 'DUCKDUCKGO') {
            result = await fetchDuckDuckGoSerp(query, countryCode);
        } else {
            // Default Jina
            result = await fetchJinaSerp(query, countryCode, langCode, keys.jina);
        }
        
        if (provider === 'JINA') result.markdown = cleanMarkdown(result.markdown);
        
        requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (e) {
        console.warn(`${provider} SERP Failed for ${query}:`, e);
        return { markdown: "", urls: [] };
    }
};

export const validateExternalKey = async (provider: string, key: string): Promise<boolean> => {
    if (!key) return false;
    try {
        if (provider === 'JINA') {
            // Check reader
            await fetch('https://r.jina.ai/https://example.com', { headers: { 'Authorization': `Bearer ${key}` } });
            return true;
        }
        if (provider === 'FIRECRAWL') {
            // Check balance or mock scrape
            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://example.com' })
            });
            return res.ok;
        }
        if (provider === 'TAVILY') {
            const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: key, query: 'test' })
            });
            return res.ok;
        }
        if (provider === 'SERPER') {
            const res = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: 'test' })
            });
            return res.ok;
        }
        if (provider === 'UNSTRUCTURED') {
             // Harder to validate without file, but can check auth endpoint if available. 
             // We'll try a dummy call that fails on auth
             // For now assume true if length > 5 as unstructured calls are heavy to test on simple validation
             return key.length > 10;
        }
        if (provider === 'VOYAGE') {
             const res = await fetch("https://api.voyageai.com/v1/embeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({ input: ["test"], model: "voyage-3-lite" })
            });
            return res.ok;
        }
        return false;
    } catch (e) {
        return false;
    }
}
