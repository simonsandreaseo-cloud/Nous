export interface SplitOptions {
    limitType: 'words' | 'characters';
    limitMode: 'exact' | 'max_h2';
    limitValue: number;
}

export interface SplitChunk {
    id: string;
    html: string;
    text: string;
    wordCount: number;
    charCount: number;
}

export class ContentSplitterService {
    static splitContent(html: string, options: SplitOptions): SplitChunk[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nodes = Array.from(doc.body.childNodes);
        
        const chunks: SplitChunk[] = [];
        let currentNodes: Node[] = [];
        let currentWordCount = 0;
        let currentCharCount = 0;
        
        const createChunk = (): SplitChunk => {
            const tempDiv = document.createElement('div');
            currentNodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
            const chunkHtml = tempDiv.innerHTML;
            const chunkText = tempDiv.textContent || "";
            const chunkWords = chunkText.trim() === "" ? 0 : chunkText.trim().split(/\s+/).length;
            const chunkChars = chunkText.length;
            return {
                id: crypto.randomUUID(),
                html: chunkHtml,
                text: chunkText,
                wordCount: chunkWords,
                charCount: chunkChars
            };
        };

        const pushCurrentChunk = () => {
            if (currentNodes.length > 0) {
                chunks.push(createChunk());
                currentNodes = [];
                currentWordCount = 0;
                currentCharCount = 0;
            }
        };

        if (options.limitMode === 'exact') {
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const text = node.textContent || "";
                const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
                const chars = text.length;
                
                const valueToAdd = options.limitType === 'words' ? words : chars;
                const currentValue = options.limitType === 'words' ? currentWordCount : currentCharCount;
                
                if (currentValue + valueToAdd > options.limitValue && currentNodes.length > 0) {
                    pushCurrentChunk();
                }
                
                currentNodes.push(node);
                currentWordCount += words;
                currentCharCount += chars;
            }
            pushCurrentChunk();
            
        } else {
            // max_h2 mode: group by H2 sections
            // First, group nodes into H2 sections
            const sections: { nodes: Node[], wordCount: number, charCount: number }[] = [];
            let currentSectionNodes: Node[] = [];
            let currentSectionWords = 0;
            let currentSectionChars = 0;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const isH2 = node.nodeName.toLowerCase() === 'h2';
                
                if (isH2 && currentSectionNodes.length > 0) {
                    sections.push({
                        nodes: currentSectionNodes,
                        wordCount: currentSectionWords,
                        charCount: currentSectionChars
                    });
                    currentSectionNodes = [];
                    currentSectionWords = 0;
                    currentSectionChars = 0;
                }
                
                const text = node.textContent || "";
                const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
                const chars = text.length;
                
                currentSectionNodes.push(node);
                currentSectionWords += words;
                currentSectionChars += chars;
            }
            if (currentSectionNodes.length > 0) {
                sections.push({
                    nodes: currentSectionNodes,
                    wordCount: currentSectionWords,
                    charCount: currentSectionChars
                });
            }

            // Now, pack sections into chunks without exceeding the limit
            for (const section of sections) {
                const valueToAdd = options.limitType === 'words' ? section.wordCount : section.charCount;
                const currentValue = options.limitType === 'words' ? currentWordCount : currentCharCount;
                
                if (currentValue + valueToAdd > options.limitValue && currentNodes.length > 0) {
                    pushCurrentChunk();
                }
                
                currentNodes.push(...section.nodes);
                currentWordCount += section.wordCount;
                currentCharCount += section.charCount;
            }
            pushCurrentChunk();
        }

        return chunks;
    }
}
