import { ContentItem } from "./types";
import { Project } from "@/types/project";
import { sanitizeUrl } from "@/utils/domain";
import { LinkPatcherService } from "../link-patcher";
import { escapeRegExp } from "@/utils/html-parser";

/**
 * Ensures all links in the document have the required attributes for security and accessibility.
 * Now takes a Document element to avoid redundant parsing.
 */
export const processLinksInDoc = (doc: Document | HTMLElement): void => {
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
        link.setAttribute('tabindex', '0');
    });
};

/**
 * Legacy wrapper for backward compatibility, but prefers processLinksInDoc internally.
 */
export const processHtmlLinks = (html: string): string => {
    if (typeof window === 'undefined' || !html) return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    processLinksInDoc(doc);
    return doc.body.innerHTML;
};

export const cleanAndFormatHtml = (html: string): string => {
    if (!html) return html;
    
    // 1. Limpieza inicial segura de Markdown a HTML sobre la cadena cruda antes de parsear
    let processedHtml = html
        .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^###\s+(.*$)/gim, '<h3>$1</h3>')
        .replace(/^##\s+(.*$)/gim, '<h2>$1</h2>');

    // Remove any trailing hallucinated JSON metadata object
    const jsonMatch = processedHtml.match(/\{[\s\S]*"title"[\s\S]*"slug"[\s\S]*\}$/);
    if (jsonMatch) {
        processedHtml = processedHtml.replace(jsonMatch[0], '');
    }

    if (typeof window === 'undefined') return processedHtml;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');

    // 2. Process list items in the same doc
    const listItems = doc.querySelectorAll('li');
    listItems.forEach(li => {
        if (li.querySelector('a')) return;
        const text = li.textContent || "";
        if (text.includes(':') && !li.querySelector('strong')) {
            const parts = li.innerHTML.split(':');
            if (parts.length > 1) {
                const label = parts[0];
                const rest = parts.slice(1).join(':');
                if (!label.includes('<') && !label.includes('>')) {
                    li.innerHTML = `<strong>${label}</strong>:${rest}`;
                }
            }
        }
    });

    // 3. Process links directly in the doc
    processLinksInDoc(doc);

    return doc.body.innerHTML;
};

export const refineStyling = (html: string): string => {
    if (typeof window === 'undefined' || !html) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const paragraphs = doc.querySelectorAll('p');
    // Random bolding removed to preserve AI-generated semantic bold tags.

    doc.querySelectorAll('h2, h3, h4').forEach(h => {
        if (!h.textContent?.trim()) h.remove();
    });

    processLinksInDoc(doc);
    return doc.body.innerHTML;
};

/**
 * SMART AUTO-INTERLINKING PIPELINE (Optimized)
 */
export const autoInterlinkAsync = async (
    html: string, 
    inventory: ContentItem[], 
    architectureRules?: { name: string, regex: string }[],
    architectureInstructions?: string,
    project?: Project | null
): Promise<string> => {
    if (!inventory || inventory.length === 0 || !html) return html;

    // Pre-compile architecture rules to avoid recompiling inside a massive loop
    const compiledRules = (architectureRules || []).map(r => {
        try {
            return { name: r.name, reg: new RegExp(r.regex, 'i') };
        } catch (_) {
            return null;
        }
    }).filter(r => r !== null) as { name: string, reg: RegExp }[];

    // 1. Enrich inventory (Cached/pre-processed if possible)
    const enrichedInventory = inventory.map(item => {
        if (item.category) return item;
        if (compiledRules.length > 0) {
            for (const rule of compiledRules) {
                if (rule.reg.test(item.url)) return { ...item, category: rule.name };
            }
        }
        return item;
    });

    // Yield to allow UI to breathe after a potentially large map operation
    await new Promise(resolve => setTimeout(resolve, 0));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const headers = Array.from(doc.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent?.toLowerCase() || '')
        .filter(t => t.length > 5);
    
    const candidates = enrichedInventory
        .filter(i => i.type === 'product' || i.type === 'collection' || i.type === 'static' || i.type === 'blog')
        .map(item => {
            let score = 0;
            if (item.type === 'product') score += 500;
            if (item.type === 'collection') score += 300;
            if (item.category) {
                const catLower = item.category.toLowerCase();
                if (headers.some(h => h.includes(catLower) || catLower.includes(h))) score += 400;
            }
            score += item.title.length;
            return { ...item, _score: score };
        });

    candidates.sort((a, b) => b._score - a._score);
    const topCandidates = candidates.slice(0, 200); // Further reduced for faster regex matching

    const variationMap = new Map<string, typeof topCandidates[0]>();
    const variations: string[] = [];

    for (const item of topCandidates) {
        // Optimized variations list: only first 2 significant parts
        const itemVariations = [
            item.title,
            item.title.split(/ - | \| /)[0]
        ].filter((v, i, self) => v && v.length >= 5 && self.indexOf(v) === i);

        for (const v of itemVariations) {
            const vLower = v.toLowerCase();
            if (!variationMap.has(vLower)) {
                variationMap.set(vLower, item);
                variations.push(v);
            }
        }
    }

    variations.sort((a, b) => b.length - a.length);
    if (variations.length === 0) return html; // Prevent infinite loop when no valid variations

    // Construct megaRegex in small batches if variations > 100 to avoid regex stack issues in some engines, 
    // although Modern V8 handles it, we keep it tight.
    const megaRegex = new RegExp(`\\b(${variations.map(escapeRegExp).join('|')})\\b`, 'gi');

    const alreadyLinkedUrls = new Set<string>();
    Array.from(doc.querySelectorAll('a')).forEach(a => {
        const href = a.getAttribute('href');
        if (href) alreadyLinkedUrls.add(href);
    });

    let linkCount = 0;
    const MAX_LINKS = 12; // Reduced slightly for better quality/performance balance
    let nodeCount = 0;

    const walk = async (node: Node) => {
        if (linkCount >= MAX_LINKS) return;

        nodeCount++;
        if (nodeCount % 30 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to unblock main thread
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();
            // Skip non-text or high-density interactive containers
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'script', 'style', 'nav', 'footer', 'header', 'iframe'].includes(tag)) return;
            
            const children = Array.from(node.childNodes);
            for (const child of children) {
                await walk(child);
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.length < 30) return; // Ignore very short sentences

            megaRegex.lastIndex = 0;
            if (!megaRegex.test(text)) return;
            megaRegex.lastIndex = 0;

            let lastIndex = 0;
            let match;
            const fragments = document.createDocumentFragment();
            let hasMatches = false;

            while ((match = megaRegex.exec(text)) !== null && linkCount < MAX_LINKS) {
                if (match[0].length === 0) {
                    megaRegex.lastIndex++;
                    continue;
                }

                const matchedText = match[0];
                const item = variationMap.get(matchedText.toLowerCase());

                // Guard: don't link if the matched text is part of a larger word (already handled by \b but double checking)
                if (item && !alreadyLinkedUrls.has(item.url)) {
                    hasMatches = true;
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));

                    let finalUrl = item.url;
                    if (finalUrl && !finalUrl.startsWith('http')) {
                        const cleanPath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
                        let domain = project?.domain || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'www.opticabassol.com';
                        domain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                        finalUrl = `https://${domain}${cleanPath}`;
                    }

                    finalUrl = sanitizeUrl(finalUrl);
                    if (project) {
                        finalUrl = LinkPatcherService.patchUrlForProcess(finalUrl, project, 'internal_linking');
                    }

                    const link = document.createElement('a');
                    link.setAttribute('href', finalUrl);
                    link.target = "_blank";
                    link.rel = "noopener";
                    link.tabIndex = 0;
                    link.title = `Ver ${matchedText}`;
                    link.textContent = matchedText;

                    fragments.appendChild(link);
                    alreadyLinkedUrls.add(item.url);
                    linkCount++;
                    lastIndex = megaRegex.lastIndex;
                }
            }

            if (hasMatches) {
                fragments.appendChild(document.createTextNode(text.substring(lastIndex)));
                node.parentNode?.replaceChild(fragments, node);
            }
        }
    };

    await walk(doc.body);
    return doc.body.innerHTML;
};
