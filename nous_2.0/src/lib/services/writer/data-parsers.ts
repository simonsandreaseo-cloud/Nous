import { ContentItem } from "./types";
import mammoth from 'mammoth';
import { sanitizeUrl } from "@/utils/domain";

export const categorizeUrl = (url: string): string => {
    if (!url) return 'other';
    const l = url.toLowerCase();
    if (l.includes('/products/') || l.includes('/producto/') || l.includes('/p/') || l.includes('/item/')) return 'product';
    if (l.includes('/collections/') || l.includes('/coleccion/') || l.includes('/category/') || l.includes('/c/')) return 'collection';
    if (l.includes('/blogs/') || l.includes('/blog/') || l.includes('/news/') || l.includes('/noticias/') || l.includes('/journal/')) return 'blog';
    if (l.includes('/pages/') || l.includes('nosotros') || l.includes('contacto') || l.includes('about')) return 'static';
    return 'other';
};

export const extractDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return "";
    }
};

export const extractTitleFromUrl = (url: string): string => {
    try {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const lastSegment = cleanUrl.split('/').pop() || "";
        let title = lastSegment.split('?')[0].replace(/\.html$/, '').replace(/\.php$/, '');
        title = title.replace(/-/g, ' ').replace(/_/g, ' ');
        return title.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
        return "Enlace";
    }
};

export const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    const parseLine = (line: string) => {
        const result = [];
        let startValueIndex = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === delimiter && !inQuotes) {
                let val = line.substring(startValueIndex, i).trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1).replace(/""/g, '"');
                }
                result.push(val);
                startValueIndex = i + 1;
            }
        }
        let lastVal = line.substring(startValueIndex).trim();
        if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
            lastVal = lastVal.slice(1, -1).replace(/""/g, '"');
        }
        result.push(lastVal);
        return result;
    };

    const data: ContentItem[] = [];
    const seenUrls = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        row.forEach(cell => {
            if (!cell || cell.length < 4) return;
            const cellContent = cell.trim();
            const isUrl = cellContent.includes('/') && (
                cellContent.startsWith('http') ||
                cellContent.startsWith('www') ||
                cellContent.startsWith('/')
            );

            if (isUrl) {
                let cleanUrl = cellContent;
                if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('/')) {
                    cleanUrl = 'https://' + cleanUrl;
                }
                
                // Final sanitize to fix duplicated domains
                cleanUrl = sanitizeUrl(cleanUrl);
                if (!seenUrls.has(cleanUrl)) {
                    seenUrls.add(cleanUrl);
                    const title = extractTitleFromUrl(cleanUrl);
                    let type = categorizeUrl(cleanUrl) as any;
                    if (type === 'other' && cleanUrl.split('/').length > 4) type = 'product';
                    data.push({
                        url: cleanUrl,
                        title,
                        type,
                        search_index: `${title} ${type} ${cleanUrl}`.toLowerCase()
                    });
                }
            }
        });
    }

    if (data.length === 0) {
        throw new Error("No se detectaron URLs válidas en el archivo.");
    }
    return { headers: [], data };
};

export const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
};

export const parseHtml = async (file: File): Promise<string> => {
    return await file.text();
};
