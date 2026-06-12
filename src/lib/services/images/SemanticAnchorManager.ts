import { CheerioAPI, Element } from 'cheerio';

/**
 * SemanticAnchorManager
 * High-precision engine for locating optimal injection points in HTML based on textual anchors.
 */
export class SemanticAnchorManager {
    /**
     * Finds the best character position in the DOM where the anchor phrase occurs.
     * @param $ The Cheerio API loaded with HTML
     * @param anchor The exact phrase to look for.
     * @returns { pos: number, node: Element | null }
     */
    static findBestPosition($: CheerioAPI, anchor: string): { pos: number; node: Element | null } {
        if (!anchor || anchor.trim().length === 0) return { pos: -1, node: null };

        let targetNode: Element | null = null;
        let currentPos = 0;

        // Iterate over block elements that might contain the text
        const elements = $('p, h1, h2, h3, h4, h5, h6, li, blockquote');
        
        elements.each((i, el) => {
            const text = $(el).text() || "";
            const index = text.toLowerCase().indexOf(anchor.toLowerCase());
            
            if (index !== -1) {
                targetNode = el;
                currentPos = index + anchor.length;
                return false; // Break loop
            }
        });

        if (targetNode) {
            return { pos: currentPos, node: targetNode };
        }

        return { pos: -1, node: null };
    }
}
