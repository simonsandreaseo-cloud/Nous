/**
 * exportUtils.ts - Motor de exportación de Nous 2.0
 * 
 * @GentlemanAI: "El conocimiento estático es como un monumento olvidado. 
 * Nuestra misión es hacerlo fluido, permitiendo que la data viaje de 
 * nuestra catedral a cualquier hoja de cálculo del mundo."
 */

import { Task } from '@/types/project';
import Papa from 'papaparse';

/**
 * Formatea tareas para copiar a Google Sheets (TSV)
 * Las columnas siguen un orden lógico para edición editorial rápida.
 */
export const formatTasksToTSV = (tasks: Task[]): string => {
    const headers = [
        'Título', 
        'Fecha', 
        'Estado', 
        'KW Principal', 
        'Volumen', 
        'Viabilidad', 
        'Palabras Obj.', 
        'Palabras Reales',
        'SEO Title',
        'Meta Desc'
    ];

    const rows = tasks.map(t => [
        t.title || '',
        t.scheduled_date || '',
        t.status || '',
        t.target_keyword || '',
        t.volume || 0,
        t.viability || '',
        t.word_count || 0,
        t.word_count_real || 0,
        t.seo_title || '',
        t.meta_description || ''
    ]);

    const content = [headers, ...rows]
        .map(row => row.join('\t'))
        .join('\n');

    return content;
};

/**
 * Genera contenido CSV completo incluyendo Outline y Cuerpo de Texto
 */
export const formatTasksToCSV = (tasks: Task[]): string => {
    const data = tasks.map(t => ({
        'ID': t.id,
        'Título': t.title,
        'Fecha': t.scheduled_date,
        'Estado': t.status,
        'KW Principal': t.target_keyword,
        'Volumen': t.volume,
        'Viabilidad': t.viability,
        'Palabras Obj': t.word_count,
        'Palabras Reales': t.word_count_real,
        'SEO Title': t.seo_title,
        'Meta Description': t.meta_description,
        'Slug': t.target_url_slug,
        'Outline': formatOutlineForCSV(t.outline_structure),
        'Contenido': cleanHtmlForCSV(t.content_body || '')
    }));

    return Papa.unparse(data, {
        quotes: true,
        delimiter: ","
    });
};

/**
 * Limpia el HTML para que no rompa el formato del CSV
 */
const cleanHtmlForCSV = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
};

/**
 * Convierte el objeto de outline en una cadena de texto legible
 */
const formatOutlineForCSV = (outline: any): string => {
    if (!outline) return '';
    
    // Si es el formato nuevo { headers: [...] }
    if (outline.headers && Array.isArray(outline.headers)) {
        return outline.headers.map((h: any) => `${h.tag || 'H'}: ${h.text || h.title}`).join('\n');
    }
    
    // Si es un array simple de strings
    if (Array.isArray(outline)) {
        return outline.join('\n');
    }

    return JSON.stringify(outline);
};
