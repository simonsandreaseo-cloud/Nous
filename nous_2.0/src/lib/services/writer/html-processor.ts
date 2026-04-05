import { ContentItem } from "./types";
import { sanitizeUrl } from "@/utils/domain";

/**
 * SMART AUTO-INTERLINKING PIPELINE
 * Phase 1: Categorization (Rules) -> Phase 2: Filtering (Intent) -> Phase 3: Reranking
 */
export const autoInterlinkAsync = async (
    html: string, 
    inventory: ContentItem[], 
    architectureRules?: { name: string, regex: string }[],
    architectureInstructions?: string
): Promise<string> => {
    if (!inventory || inventory.length === 0) return html;

    // 1. Enrich inventory with categories if missing using rules
    const enrichedInventory = inventory.map(item => {
        if (item.category) return item;
        if (architectureRules) {
            for (const rule of architectureRules) {
                try {
                    const reg = new RegExp(rule.regex, 'i');
                    if (reg.test(item.url)) return { ...item, category: rule.name };
                } catch (_) { /* ignore invalid regex */ }
            }
        }
        return item;
    });

    // 2. Simple Intent Detection: Extract headers from HTML to find current topics
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headers = Array.from(doc.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent?.toLowerCase() || '')
        .filter(t => t.length > 5);
    
    // 3. Scoring & Sorting Pipeline
    const candidates = enrichedInventory
        .filter(i => i.type === 'product' || i.type === 'collection' || i.type === 'static' || i.type === 'blog')
        .map(item => {
            let score = 0;
            // Type Boost (Transactional first)
            if (item.type === 'product') score += 500;
            if (item.type === 'collection') score += 300;
            
            // Category Context Boost
            if (item.category) {
                const catLower = item.category.toLowerCase();
                if (headers.some(h => h.includes(catLower) || catLower.includes(h))) score += 400;
            }

            // Title Length Tie-breaker (more specific is usually better)
            score += item.title.length;

            return { ...item, _score: score };
        });

    candidates.sort((a, b) => b._score - a._score);

    let linkedHtml = html;
    const alreadyLinked = new Set<string>();
    let linkCount = 0;
    const MAX_LINKS = 15;

    // Use only top candidates to keep regex processing fast
    const topCandidates = candidates.slice(0, 400);

    for (let i = 0; i < topCandidates.length; i++) {
        // Yield to prevent UI freeze
        if (i > 0 && i % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const item = topCandidates[i];
        if (linkCount >= MAX_LINKS) break;
        if (item.title.length < 3) continue; // Allow slightly shorter titles (e.g. "BMW")
        if (alreadyLinked.has(item.url)) continue;

        // Create variations of the title to improve matching
        const variations = [
            item.title,
            item.title.replace(/\s+/g, ' '), // normalized spaces
            item.title.split(' - ')[0],      // Before dash (often brand/model)
            item.title.split(' | ')[0]       // Before pipe
        ].filter((v, i, self) => v && v.length >= 4 && self.indexOf(v) === i);

        let replacedThisRound = false;

        for (const variation of variations) {
            if (replacedThisRound || linkCount >= MAX_LINKS) break;

            const safeTitle = escapeRegExp(variation);
            // Ensure we don't link inside existing tags, attributes, or already linked text
            // Negative lookahead/lookbehind for HTML tags and existing anchors
            const titleRegex = new RegExp(`(?<!<[^>]*)(?<!<a[^>]*>)\\b${safeTitle}\\b(?![^<]*</a>)`, 'i');

            if (titleRegex.test(linkedHtml)) {
                // Avoid duplicate links to same URL
                if (linkedHtml.includes(`href="${item.url}"`) || linkedHtml.includes(`href='${item.url}'`)) {
                    alreadyLinked.add(item.url);
                    replacedThisRound = true;
                    continue;
                }

                linkedHtml = linkedHtml.replace(titleRegex, (match) => {
                    if (replacedThisRound) return match;
                    replacedThisRound = true;
                    alreadyLinked.add(item.url);
                    linkCount++;
                    const finalUrl = sanitizeUrl(item.url);
                    return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" title="Ver ${match}">${match}</a>`;
                });
            }
        }
    }

    return linkedHtml;
};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const cleanAndFormatHtml = (html: string): string => {
    if (typeof window === 'undefined') return html; // Safety check for SSR
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let cleanString = doc.body.innerHTML;
    cleanString = cleanString.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    cleanString = cleanString.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    cleanString = cleanString.replace(/^## (.*$)/gm, '<h2>$1</h2>');

    doc.body.innerHTML = cleanString;

    const listItems = doc.querySelectorAll('li');
    listItems.forEach(li => {
        if (li.textContent?.includes(':') && !li.querySelector('strong')) {
            const parts = li.innerHTML.split(':');
            if (parts.length > 1) {
                const label = parts[0];
                const rest = parts.slice(1).join(':');
                li.innerHTML = `<strong>${label}</strong>:${rest}`;
            }
        }
    });

    return doc.body.innerHTML;
};

export const refineStyling = (html: string): string => {
    if (typeof window === 'undefined') return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('p strong, p b').forEach(el => {
        const text = document.createTextNode(el.textContent || '');
        el.parentNode?.replaceChild(text, el);
    });

    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
        if (p.closest('blockquote')) return;
        if (p.querySelector('a')) return;

        const text = p.textContent || "";
        const words = text.split(/\s+/);

        if (words.length < 25) return;

        if (Math.random() > 0.4) {
            const safeStartMin = Math.floor(words.length * 0.15);
            const safeStartMax = Math.floor(words.length * 0.70);

            if (safeStartMax > safeStartMin) {
                const startIdx = Math.floor(Math.random() * (safeStartMax - safeStartMin)) + safeStartMin;
                const length = Math.floor(Math.random() * 5) + 4;

                const pre = words.slice(0, startIdx).join(' ');
                const target = words.slice(startIdx, startIdx + length).join(' ');
                const post = words.slice(startIdx + length).join(' ');

                if (target.trim().length > 0) {
                    p.innerHTML = `${pre} <strong>${target}</strong> ${post}`;
                }
            }
        }
    });

    doc.querySelectorAll('h2, h3, h4').forEach(h => {
        if (!h.textContent?.trim()) h.remove();
    });

    return doc.body.innerHTML;
};
