/**
 * SemanticAnchorManager
 * High-precision engine for locating optimal injection points in HTML based on textual anchors.
 */
export class SemanticAnchorManager {
    /**
     * Finds the best character position in the DOM where the anchor phrase occurs.
     * @param root The DOM element to search in (usually document.body).
     * @param anchor The exact phrase to look for.
     * @returns { pos: number, node: Node | null }
     */
    static findBestPosition(root: HTMLElement, anchor: string): { pos: number; node: Node | null } {
        if (!anchor || anchor.trim().length === 0) return { pos: -1, node: null };

        const walker = root.ownerDocument.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
        let currentPos = 0;
        let node;

        while ((node = walker.nextNode())) {
            const text = node.textContent || "";
            const index = text.toLowerCase().indexOf(anchor.toLowerCase());
            
            if (index !== -1) {
                // We return the position at the end of the anchor phrase
                return { 
                    pos: currentPos + index + anchor.length, 
                    node: node 
                };
            }
            currentPos += text.length;
        }

        return { pos: -1, node: null };
    }
}
