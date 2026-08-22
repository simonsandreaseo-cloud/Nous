export interface SplitOptions {
    limitType: 'words' | 'characters';
    limitMode: 'exact' | 'max_h2';
    limitValue: number;
    excludeRegex?: string | string[];
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

        // Apply regex exclusions if specified
        if (options.excludeRegex) {
            try {
                const regexes = Array.isArray(options.excludeRegex) ? options.excludeRegex : [options.excludeRegex];
                
                for (const regexStr of regexes) {
                    if (!regexStr || !regexStr.trim()) continue;
                    const regex = new RegExp(regexStr, 'g');
                    const walk = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
                    let textNode = walk.nextNode();
                    while (textNode) {
                        if (textNode.nodeValue) {
                            textNode.nodeValue = textNode.nodeValue.replace(regex, '');
                        }
                        textNode = walk.nextNode();
                    }
                }
            } catch (e) {
                console.warn("Invalid regex in ContentSplitterService:", e);
            }
        }

        // Helper: Extract flat list of block-level DOM nodes from body
        const getFlatBlockNodes = (container: Node): Node[] => {
            const blocks: Node[] = [];
            const children = Array.from(container.childNodes);
            let inlineAccumulator: Node[] = [];

            const flushInline = () => {
                if (inlineAccumulator.length > 0) {
                    const temp = document.createElement('p');
                    inlineAccumulator.forEach(n => temp.appendChild(n.cloneNode(true)));
                    if ((temp.textContent || '').trim().length > 0) {
                        blocks.push(temp);
                    }
                    inlineAccumulator = [];
                }
            };

            for (const child of children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const el = child as HTMLElement;
                    const tag = el.tagName.toLowerCase();

                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'table', 'figure', 'hr', 'pre'].includes(tag)) {
                        flushInline();
                        blocks.push(el);
                    } else if (['div', 'article', 'section', 'main', 'header', 'footer', 'form', 'details'].includes(tag)) {
                        flushInline();
                        const innerBlocks = getFlatBlockNodes(el);
                        if (innerBlocks.length > 0) {
                            blocks.push(...innerBlocks);
                        } else if ((el.textContent || '').trim().length > 0) {
                            blocks.push(el);
                        }
                    } else {
                        inlineAccumulator.push(child);
                    }
                } else if (child.nodeType === Node.TEXT_NODE) {
                    if ((child.textContent || '').trim().length > 0) {
                        inlineAccumulator.push(child);
                    }
                }
            }
            flushInline();
            return blocks;
        };

        const blocks = getFlatBlockNodes(doc.body);
        if (blocks.length === 0) return [];

        // Metrics helpers
        const getMetrics = (nodes: Node | Node[]) => {
            const nodeList = Array.isArray(nodes) ? nodes : [nodes];
            let text = '';
            nodeList.forEach(n => {
                text += (n.textContent || '') + ' ';
            });
            text = text.trim();
            const words = text === '' ? 0 : text.split(/\s+/).length;
            const chars = text.length;
            return { text, words, chars };
        };

        const getValue = (metrics: { words: number; chars: number }, limitType: 'words' | 'characters') => {
            return limitType === 'words' ? metrics.words : metrics.chars;
        };

        const createChunk = (nodes: Node[]): SplitChunk => {
            const tempDiv = document.createElement('div');
            nodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
            const chunkHtml = tempDiv.innerHTML;
            const chunkText = (tempDiv.textContent || '').trim();
            const chunkWords = chunkText === '' ? 0 : chunkText.split(/\s+/).length;
            const chunkChars = chunkText.length;

            return {
                id: crypto.randomUUID(),
                html: chunkHtml,
                text: chunkText,
                wordCount: chunkWords,
                charCount: chunkChars
            };
        };

        // Helper: Split an oversized single block element into smaller <p> blocks
        const splitOversizedBlock = (node: Node, limitType: 'words' | 'characters', limitValue: number): Node[] => {
            const text = (node.textContent || '').trim();
            if (!text) return [];

            const resultNodes: Node[] = [];
            if (limitType === 'words') {
                const words = text.split(/\s+/);
                for (let i = 0; i < words.length; i += limitValue) {
                    const chunkText = words.slice(i, i + limitValue).join(' ');
                    const p = document.createElement('p');
                    p.textContent = chunkText;
                    resultNodes.push(p);
                }
            } else {
                for (let i = 0; i < text.length; i += limitValue) {
                    const chunkText = text.slice(i, i + limitValue);
                    const p = document.createElement('p');
                    p.textContent = chunkText;
                    resultNodes.push(p);
                }
            }
            return resultNodes;
        };

        // Pack a flat array of block nodes into SplitChunks without exceeding limitValue
        const packBlocks = (flatBlocks: Node[]): SplitChunk[] => {
            const chunks: SplitChunk[] = [];
            let currentNodes: Node[] = [];
            let currentVal = 0;

            const pushChunk = () => {
                if (currentNodes.length > 0) {
                    chunks.push(createChunk(currentNodes));
                    currentNodes = [];
                    currentVal = 0;
                }
            };

            for (const block of flatBlocks) {
                const blockMetrics = getMetrics(block);
                const blockVal = getValue(blockMetrics, options.limitType);

                if (blockVal > options.limitValue) {
                    // Block by itself exceeds limit: flush current and sub-split block
                    pushChunk();
                    const subBlocks = splitOversizedBlock(block, options.limitType, options.limitValue);
                    for (const sub of subBlocks) {
                        const subVal = getValue(getMetrics(sub), options.limitType);
                        if (currentVal + subVal > options.limitValue && currentNodes.length > 0) {
                            pushChunk();
                        }
                        currentNodes.push(sub);
                        currentVal += subVal;
                    }
                } else {
                    if (currentVal + blockVal > options.limitValue && currentNodes.length > 0) {
                        pushChunk();
                    }
                    currentNodes.push(block);
                    currentVal += blockVal;
                }
            }
            pushChunk();
            return chunks;
        };

        // H2 Boundary check
        const isH2Boundary = (node: Node): boolean => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (tag === 'h2') return true;
            const firstHeading = el.querySelector('h1, h2, h3, h4, h5, h6');
            return firstHeading ? firstHeading.tagName.toLowerCase() === 'h2' : false;
        };

        if (options.limitMode === 'exact') {
            return packBlocks(blocks);
        }

        // max_h2 mode: Group blocks into H2 sections first
        const sections: Node[][] = [];
        let currentSection: Node[] = [];

        for (const block of blocks) {
            if (isH2Boundary(block) && currentSection.length > 0) {
                sections.push(currentSection);
                currentSection = [];
            }
            currentSection.push(block);
        }
        if (currentSection.length > 0) {
            sections.push(currentSection);
        }

        // Pack H2 sections into chunks
        const chunks: SplitChunk[] = [];
        let currentNodes: Node[] = [];
        let currentVal = 0;

        const pushChunk = () => {
            if (currentNodes.length > 0) {
                chunks.push(createChunk(currentNodes));
                currentNodes = [];
                currentVal = 0;
            }
        };

        for (const sec of sections) {
            const secMetrics = getMetrics(sec);
            const secVal = getValue(secMetrics, options.limitType);

            if (currentVal + secVal <= options.limitValue) {
                currentNodes.push(...sec);
                currentVal += secVal;
            } else {
                if (currentNodes.length > 0) {
                    pushChunk();
                }

                if (secVal <= options.limitValue) {
                    currentNodes.push(...sec);
                    currentVal = secVal;
                } else {
                    // Section itself exceeds limitValue: pack its individual blocks
                    const secChunks = packBlocks(sec);
                    chunks.push(...secChunks);
                }
            }
        }
        pushChunk();

        return chunks;
    }
}
