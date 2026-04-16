/**
 * SemanticAnchorManager
 * Senior engine for resilient editorial positioning.
 * Handles exact and fuzzy matching of assets to text concepts.
 */

export interface AnchorMatch {
    pos: number;
    confidence: number;
    strategy: 'exact' | 'fuzzy' | 'fallback';
}

export class SemanticAnchorManager {
    /**
     * Normalizes text for resilient comparison (removes accents, case, and special chars).
     */
    static normalize(text: string): string {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9\s]/g, "")    // Remove special chars
            .replace(/\s+/g, ' ')           // Collapse spaces
            .trim();
    }

    /**
     * Extracts a unique semantic anchor from a text block based on a concept.
     */
    static extractAnchor(paragraph: string, prompt: string): string {
        const words = paragraph.split(/\s+/);
        if (words.length < 5) return paragraph;

        // Find the 6-word window with highest overlap with the prompt
        let bestWindow = "";
        let maxOverlap = -1;

        for (let i = 0; i <= words.length - 6; i++) {
            const window = words.slice(i, i + 6).join(" ");
            const overlap = this.calculateOverlap(window, prompt);
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestWindow = window;
            }
        }

        return bestWindow || paragraph.slice(0, 100);
    }

    /**
     * Finds the best position for an anchor in a Tiptap document.
     */
    static findBestPosition(doc: any, anchor: string): AnchorMatch {
        if (!anchor) return { pos: -1, confidence: 0, strategy: 'fallback' };

        const normalizedAnchor = this.normalize(anchor);
        let bestMatch: AnchorMatch | null = null;

        doc.descendants((node: any, pos: number) => {
            if (node.isText) {
                const text = node.text;
                
                // 1. Exact Match
                const exactIdx = text.indexOf(anchor);
                if (exactIdx !== -1) {
                    bestMatch = { pos: pos + exactIdx, confidence: 1, strategy: 'exact' };
                    return false;
                }

                // 2. Normalized Match
                const normalizedText = this.normalize(text);
                if (normalizedText.includes(normalizedAnchor)) {
                    bestMatch = { pos, confidence: 0.8, strategy: 'fuzzy' };
                }
            }
            return true;
        });

        return bestMatch || { pos: -1, confidence: 0, strategy: 'fallback' };
    }

    private static calculateOverlap(window: string, prompt: string): number {
        const windowWords = new Set(this.normalize(window).split(/\s+/));
        const promptWords = this.normalize(prompt).split(/\s+/);
        let overlap = 0;
        promptWords.forEach(word => {
            if (word.length > 3 && windowWords.has(word)) overlap++;
        });
        return overlap;
    }
}
