import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Convierte un string en formato Markdown a HTML limpio.
 * Útil para procesar salidas de IA que prefieren Markdown.
 */
export const mdToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    try {
        // Configurar marked para ser síncrono y simple
        const rawHtml = marked.parse(markdown) as string;
        
        // Sanitizar para evitar XSS o etiquetas mal cerradas
        return DOMPurify.sanitize(rawHtml);
    } catch (error) {
        console.error('[MarkdownUtil] Error parsing markdown:', error);
        return markdown; // Fallback al texto original en caso de error crítico
    }
};
