export interface ContentBlock {
    id: string;        // Identifier e.g. [S1-P2]
    sectionId: number; // Section number (S1)
    blockId: number;   // Paragraph number within section (P2)
    type: 'heading' | 'paragraph' | 'list' | 'code' | 'other';
    content: string;   // The raw text content
    parentHeading?: string; // The title of the section this belongs to
    wordCount: number;
}

export interface FragmentedDocument {
    sourceId: string; // Original URL or identifier
    blocks: ContentBlock[];
    toc: string[]; // Table of contents (Headings)
}

/**
 * El Fragmentador (Content Indexer)
 * Convierte un contenido monolítico de Markdown en una estructura de bloques indexados.
 * Esto permite a la IA hacer referencias quirúrgicas y extraer contexto sin devorar todo el texto.
 */
export class MarkdownFragmenter {
    
    /**
     * Parsea un texto Markdown en una serie de bloques indexados [S{N}-P{M}].
     * 
     * @param markdown El contenido markdown original.
     * @param sourceId Identificador (como la URL) de la fuente original.
     */
    static fragment(markdown: string, sourceId: string = 'doc'): FragmentedDocument {
        if (!markdown) {
            return { sourceId, blocks: [], toc: [] };
        }

        // Limpiar retornos de carro y dividir por párrafos (doble salto de línea)
        const rawChunks = markdown.replace(/\r\n/g, '\n').split(/\n\s*\n/);
        
        const blocks: ContentBlock[] = [];
        const toc: string[] = [];
        
        let currentSectionId = 0; // S0 = Introducción antes del primer H1/H2
        let currentBlockId = 0;
        let currentHeading = 'Introducción';
        
        for (const chunk of rawChunks) {
            const trimmed = chunk.trim();
            if (!trimmed) continue;
            
            // Detectar si el bloque es un encabezado (H1-H6)
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            
            if (headingMatch) {
                // Nuevo bloque de sección
                currentSectionId++;
                currentBlockId = 1; // Reiniciar contador de párrafos para la nueva sección
                currentHeading = headingMatch[2].trim();
                
                // Ignorar encabezados que son puro ruido
                const isNoise = this.isNoiseHeading(currentHeading);
                if (!isNoise) {
                    toc.push(currentHeading);
                }

                blocks.push({
                    id: `[S${currentSectionId}-P0]`, // El encabezado en sí es el P0
                    sectionId: currentSectionId,
                    blockId: 0,
                    type: 'heading',
                    content: trimmed,
                    parentHeading: currentHeading,
                    wordCount: this.countWords(trimmed)
                });
            } else {
                // Es un bloque de contenido regular (párrafo, lista, etc)
                currentBlockId++;
                
                let type: ContentBlock['type'] = 'paragraph';
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
                    type = 'list';
                } else if (trimmed.startsWith('```')) {
                    type = 'code';
                }

                blocks.push({
                    id: `[S${currentSectionId}-P${currentBlockId}]`,
                    sectionId: currentSectionId,
                    blockId: currentBlockId,
                    type,
                    content: trimmed,
                    parentHeading: currentHeading,
                    wordCount: this.countWords(trimmed)
                });
            }
        }
        
        return {
            sourceId,
            blocks,
            toc
        };
    }
    
    /**
     * Renderiza una vista simplificada del documento, ideal para pasar a LLMs con un mapa claro.
     */
    static buildSemanticMap(doc: FragmentedDocument, maxWordsPerBlock: number = 300): string {
        return doc.blocks.map(b => {
            // Truncate long blocks to prevent excessive token usage while preserving the core meaning
            const words = b.content.split(/\s+/);
            const truncated = words.length > maxWordsPerBlock 
                ? words.slice(0, maxWordsPerBlock).join(' ') + '... [TRUNCADO]'
                : b.content;
                
            return `${b.id} ${truncated}`;
        }).join('\n\n');
    }

    /**
     * Utilidad para filtrar encabezados que comúnmente son ruido de scraping (menús, footers).
     */
    private static isNoiseHeading(text: string): boolean {
        const lower = text.toLowerCase();
        const noiseKeywords = [
            'navegación', 'navigation', 'menú', 'menu', 'footer', 'pie de página',
            'share', 'compartir', 'leave a comment', 'deja un comentario',
            'related posts', 'artículos relacionados', 'sidebar', 'buscar', 'search'
        ];
        return noiseKeywords.some(kw => lower.includes(kw)) || text.length > 100;
    }

    private static countWords(text: string): number {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
}
