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

    // 1. Enrich inventory and prepare candidate map
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

    // 2. Intent Detection
    const headers = Array.from(doc.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent?.toLowerCase() || '')
        .filter(t => t.length > 5);
    
    // 3. Scoring & Sorting
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
    const topCandidates = candidates.slice(0, 400);

    // 4. PRE-FLIGHT: Gather all possible anchor variations and map them to candidates
    const variationMap = new Map<string, typeof topCandidates[0]>();
    const variations: string[] = [];

    for (const item of topCandidates) {
        const itemVariations = [
            item.title,
            item.title.split(' - ')[0],
            item.title.split(' | ')[0]
        ].filter((v, i, self) => v && v.length >= 4 && self.indexOf(v) === i);

        for (const v of itemVariations) {
            if (!variationMap.has(v.toLowerCase())) {
                variationMap.set(v.toLowerCase(), item);
                variations.push(v);
            }
        }
    }

    // Sort variations by length descending to match longest possible anchor first
    variations.sort((a, b) => b.length - a.length);
    
    // Create one massive regex for all variations
    // This is much faster than running 1000s of small regexes
    const megaRegex = new RegExp(`\\b(${variations.map(escapeRegExp).join('|')})\\b`, 'gi');

    const alreadyLinkedUrls = new Set<string>();
    // Pre-populate alreadyLinkedUrls from existing links in HTML
    Array.from(doc.querySelectorAll('a')).forEach(a => {
        const href = a.getAttribute('href');
        if (href) alreadyLinkedUrls.add(href);
    });

    let linkCount = 0;
    const MAX_LINKS = 15;

    // 5. SINGLE PASS DOM TRAVERSAL
    const walk = (node: Node) => {
        if (linkCount >= MAX_LINKS) return;

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();
            // Do not link inside these tags
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'script', 'style'].includes(tag)) return;
            
            // Process children
            const children = Array.from(node.childNodes);
            for (const child of children) {
                walk(child);
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.length < 10) return; // Skip very short nodes

            // Optimization: check if anything matches at all before complex processing
            if (!megaRegex.test(text)) return;
            megaRegex.lastIndex = 0; // Reset after test()

            let lastIndex = 0;
            let match;
            const fragments = document.createDocumentFragment();
            let hasMatches = false;

            while ((match = megaRegex.exec(text)) !== null && linkCount < MAX_LINKS) {
                const matchedText = match[0];
                const item = variationMap.get(matchedText.toLowerCase());

                if (item && !alreadyLinkedUrls.has(item.url)) {
                    hasMatches = true;
                    // Add text before match
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));

                    // Create link
                    let finalUrl = item.url;
                    
                    // NORMALIZE DOMAIN: Ensure internal links are absolute
                    if (finalUrl && !finalUrl.startsWith('http')) {
                        // Ensure it starts with a single slash
                        const cleanPath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
                        
                        // Detect domain: Project Domain > Environment Default > Hardcoded Fallback
                        let domain = project?.domain || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'www.opticabassol.com';
                        
                        // Clean domain (remove protocol and trailing slashes)
                        domain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                        
                        // Reconstruct absolute URL
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
                // Add remaining text
                fragments.appendChild(document.createTextNode(text.substring(lastIndex)));
                node.parentNode?.replaceChild(fragments, node);
            }
        }
    };

    walk(doc.body);

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
        // BUG-04 fix: solo procesar si no hay elementos <a> con URLs que contengan ':'
        if (li.querySelector('a')) return;
        if (li.textContent?.includes(':') && !li.querySelector('strong')) {
            const parts = li.innerHTML.split(':');
            if (parts.length > 1) {
                const label = parts[0];
                const rest = parts.slice(1).join(':');
                // Solo wrappear si el label parece texto plano (sin tags HTML)
                if (!label.includes('<') && !label.includes('>')) {
                    li.innerHTML = `<strong>${label}</strong>:${rest}`;
                }
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

        // BUG-06 fix: deterministic pseudo-random based on text content
        // Same text always gets the same bold placement
        const seed = text.length % 10;
        if (seed > 3) { // equivalent probability to Math.random() > 0.4
            const safeStartMin = Math.floor(words.length * 0.15);
            const safeStartMax = Math.floor(words.length * 0.70);

            if (safeStartMax > safeStartMin) {
                const startIdx = safeStartMin + ((text.charCodeAt(0) + text.length) % (safeStartMax - safeStartMin));
                const length = 4 + (text.charCodeAt(1) % 5); // 4-8 words, deterministic

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
