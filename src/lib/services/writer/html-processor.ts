import { ContentItem } from "./types";
import { Project } from "@/types/project";
import { sanitizeUrl } from "@/utils/domain";
import { LinkPatcherService } from "../link-patcher";

/**
 * SMART AUTO-INTERLINKING PIPELINE
 * Phase 1: Categorization (Rules) -> Phase 2: Filtering (Intent) -> Phase 3: Reranking
 */
export const autoInterlinkAsync = async (
    html: string, 
    inventory: ContentItem[], 
    architectureRules?: { name: string, regex: string }[],
    architectureInstructions?: string,
    project?: Project | null
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

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 2. Simple Intent Detection: Extract headers from HTML to find current topics
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

    const alreadyLinked = new Set<string>();
    let linkCount = 0;
    const MAX_LINKS = 15;

    // Use only top candidates to keep regex processing fast
    const topCandidates = candidates.slice(0, 400);

    // HELPER: Find all valid text nodes (not inside headers or links)
    const getTextNodes = (node: Node): Text[] => {
        const textNodes: Text[] = [];
        const walk = (n: Node) => {
            if (n.nodeType === Node.ELEMENT_NODE) {
                const el = n as Element;
                const tag = el.tagName.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'script', 'style'].includes(tag)) return;
                n.childNodes.forEach(walk);
            } else if (n.nodeType === Node.TEXT_NODE) {
                textNodes.push(n as Text);
            }
        };
        walk(node);
        return textNodes;
    };

    for (let i = 0; i < topCandidates.length; i++) {
        // Yield to prevent UI freeze
        if (i > 0 && i % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const item = topCandidates[i];
        if (linkCount >= MAX_LINKS) break;
        if (item.title.length < 3) continue;
        if (alreadyLinked.has(item.url)) continue;

        const variations = [
            item.title,
            item.title.split(' - ')[0],
            item.title.split(' | ')[0]
        ].filter((v, i, self) => v && v.length >= 4 && self.indexOf(v) === i);

        for (const variation of variations) {
            if (linkCount >= MAX_LINKS) break;

            const safeTitle = escapeRegExp(variation);
            const titleRegex = new RegExp(`\\b${safeTitle}\\b`, 'i');

            // Find all valid text nodes and try to replace
            const nodes = getTextNodes(doc.body);
            let replacedInItem = false;

            for (const node of nodes) {
                if (linkCount >= MAX_LINKS || replacedInItem) break;

                const text = node.textContent || '';
                if (titleRegex.test(text)) {
                    // Check if URL is already linked in the WHOLE document to avoid duplicates
                    if (doc.querySelector(`a[href="${item.url}"], a[href='${item.url}']`)) {
                        alreadyLinked.add(item.url);
                        replacedInItem = true;
                        continue;
                    }

                    const match = text.match(titleRegex);
                    if (match) {
                        const span = document.createElement('span');
                        
                        // APPLY PATCHING BEFORE INSERTION
                        let finalUrl = sanitizeUrl(item.url);
                        if (project) {
                            finalUrl = LinkPatcherService.patchUrlForProcess(finalUrl, project, 'internal_linking');
                        }

                        const parts = text.split(titleRegex);
                        
                        // Note: split can return multiple parts if there are multiple matches, 
                        // but we only want to replace the FIRST one to avoid over-linking.
                        const before = parts[0];
                        const matchedText = match[0];
                        const after = parts.slice(1).join(matchedText);

                        const link = document.createElement('a');
                        link.href = finalUrl;
                        link.target = "_blank";
                        link.rel = "noopener";
                        link.tabIndex = 0;
                        link.title = `Ver ${matchedText}`;
                        link.textContent = matchedText;

                        node.parentNode?.replaceChild(span, node);
                        span.appendChild(document.createTextNode(before));
                        span.appendChild(link);
                        span.appendChild(document.createTextNode(after));
                        
                        // Unwrap the span
                        const frag = document.createDocumentFragment();
                        while (span.firstChild) frag.appendChild(span.firstChild);
                        span.parentNode?.replaceChild(frag, span);

                        alreadyLinked.add(item.url);
                        replacedInItem = true;
                        linkCount++;
                    }
                }
            }
        }
    }

    return doc.body.innerHTML;
};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensures all links in the HTML have the required attributes for security and accessibility.
 */
export const processHtmlLinks = (html: string): string => {
    if (typeof window === 'undefined' || !html) return html;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
        link.setAttribute('tabindex', '0');
    });
    
    return doc.body.innerHTML;
};

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

    // 2. Process Links (Security & Accessibility)
    const linked = processHtmlLinks(doc.body.innerHTML);
    doc.body.innerHTML = linked;

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

    return processHtmlLinks(doc.body.innerHTML);
};
