import { ContentItem } from '../types/content';

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const autoInterlink = (html: string, csvData: ContentItem[]): string => {
    const candidates = csvData.filter(i => i.type === 'product' || i.type === 'collection');
    candidates.sort((a, b) => b.title.length - a.title.length);

    let linkedHtml = html;
    const alreadyLinked = new Set<string>();
    let linkCount = 0;

    const topCandidates = candidates.slice(0, 300);

    for (const item of topCandidates) {
        if (linkCount >= 15) break;
        if (item.title.length < 4) continue;
        if (alreadyLinked.has(item.url)) continue;

        const safeTitle = escapeRegExp(item.title);
        // Improved Regex for Interlinking: allow case insensitivity and optional word boundaries strictly
        const titleRegex = new RegExp(`(?<!<[^>]*)\\b${safeTitle}\\b`, 'i');

        if (titleRegex.test(linkedHtml)) {
            if (linkedHtml.includes(item.url)) {
                alreadyLinked.add(item.url);
                continue;
            }
            let replaced = false;
            linkedHtml = linkedHtml.replace(titleRegex, (match) => {
                if (replaced) return match;
                replaced = true;
                alreadyLinked.add(item.url);
                linkCount++;
                return `<a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Ver ${match}">${match}</a>`;
            });
        }
    }
    return linkedHtml;
};

export const cleanAndFormatHtml = (html: string): string => {
    if (typeof window === 'undefined') {
        // Fallback for SSR
        let cleanText = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
        cleanText = cleanText.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        cleanText = cleanText.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        return cleanText;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. CLEAN MARKDOWN & ARTIFACTS
    let cleanString = doc.body.innerHTML;
    cleanString = cleanString.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    cleanString = cleanString.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    cleanString = cleanString.replace(/^## (.*$)/gm, '<h2>$1</h2>');

    doc.body.innerHTML = cleanString;

    // 2. LIST FORMATTING
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

// --- Strict Style Refinement (The "Phase") ---
export const refineStyling = (html: string): string => {
    if (typeof window === 'undefined') return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. REMOVE ALL EXISTING BOLD TAGS WITHIN PARAGRAPHS
    doc.querySelectorAll('p strong, p b').forEach(el => {
        const text = document.createTextNode(el.textContent || '');
        el.parentNode?.replaceChild(text, el);
    });

    // 2. APPLY STRICT BOLDING LOGIC (Using basic logic for now; should be replaced by AI)
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
                const length = Math.floor(Math.random() * 5) + 4; // 4,5,6,7,8

                const pre = words.slice(0, startIdx).join(' ');
                const target = words.slice(startIdx, startIdx + length).join(' ');
                const post = words.slice(startIdx + length).join(' ');

                if (target.trim().length > 0) {
                    p.innerHTML = `${pre} <strong>${target}</strong> ${post}`;
                }
            }
        }
    });

    // Ensure no empty headers
    doc.querySelectorAll('h2, h3, h4').forEach(h => {
        if (!h.textContent?.trim()) h.remove();
    });

    return doc.body.innerHTML;
}
