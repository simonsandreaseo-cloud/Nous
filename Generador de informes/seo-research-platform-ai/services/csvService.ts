import Papa from 'papaparse';
import { CSVRow } from '../types';

export const parseCSV = (file: File, onProgress: (msg: string) => void): Promise<CSVRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedData: CSVRow[] = [];
                    let invalidDateRows = 0;
                    let invalidNumericRows = 0;
                    let nullSegmentRows = 0;

                    // Detect headers
                    const firstRow = results.data[0] as any;
                    const dateKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('fecha')) || 'Date';
                    const pageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('page') || k.toLowerCase().includes('página') || k.toLowerCase().includes('landing')) || 'Page';
                    const queryKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('query') || k.toLowerCase().includes('keyword') || k.toLowerCase().includes('consulta')) || 'Query';
                    const countryKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('country') || k.toLowerCase().includes('país')) || 'Country';
                    
                    const clicksKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('click') || k.toLowerCase().includes('clic')) || 'Clicks';
                    const impKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('impression') || k.toLowerCase().includes('impresion')) || 'Impressions';
                    const posKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('position') || k.toLowerCase().includes('posic')) || 'Position';

                    results.data.forEach((row: any) => {
                        const landingPage = row[pageKey];
                        const keyword = row[queryKey] || 'N/A';
                        const dateStr = row[dateKey];
                        const country = row[countryKey] || 'Global';

                        if (!dateStr) {
                            invalidDateRows++;
                            return;
                        }

                        const dateResult = parseDateRobust(dateStr);
                        if (!dateResult) {
                            invalidDateRows++;
                            return;
                        }

                        // Robust Number Parsing
                        // Pass true for clicks/impressions (integers), false for position (float)
                        const clicks = parseNumber(row[clicksKey], true); 
                        const impressions = parseNumber(row[impKey], true); 
                        const position = parseNumber(row[posKey], false); 

                        if (isNaN(clicks) || isNaN(impressions) || !landingPage) {
                            invalidNumericRows++;
                            return;
                        }

                        const segment = extractSegment(landingPage);
                        if (segment === null) {
                            nullSegmentRows++;
                            return;
                        }

                        parsedData.push({
                            page: landingPage,
                            keyword: keyword,
                            date: dateResult,
                            country: country,
                            segment: segment,
                            clicks: clicks,
                            impressions: impressions,
                            position: position
                        });
                    });

                    onProgress(`Filas válidas procesadas: ${parsedData.length}`);
                    if (invalidDateRows > 0) onProgress(`Advertencia: ${invalidDateRows} filas ignoradas por fecha inválida.`);
                    
                    if (parsedData.length === 0) {
                        reject(new Error("No se encontraron datos válidos. Revise el formato del CSV."));
                    } else {
                        resolve(parsedData);
                    }
                } catch (error) {
                    reject(error);
                }
            },
            error: (err) => reject(err)
        });
    });
};

function parseNumber(val: any, isInteger: boolean): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let s = val.toString().trim();
    
    if (isInteger) {
        // CRITICAL FIX: For Clicks/Impressions, GSC exports are ALWAYS integers.
        // We handle potential decimals added by Excel (e.g., "1200.00") before removing non-digits.

        // Remove spaces
        s = s.replace(/\s/g, '');

        // If it has both . and , assume the last one is the decimal separator and remove it and what follows
        if (s.includes('.') && s.includes(',')) {
            const lastIdx = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
            s = s.substring(0, lastIdx);
        } else {
            // If it has only one separator and it looks like a decimal (1-2 digits at the end),
            // but NOT a thousands separator (exactly 3 digits at the end)
            const match = s.match(/[.,](\d+)$/);
            if (match && match[1].length <= 2) {
                s = s.substring(0, s.length - match[0].length);
            }
        }

        // Remove ALL remaining non-digit characters (thousands separators)
        s = s.replace(/\D/g, '');
        return parseInt(s, 10) || 0;
    } else {
        // For Position (Float), handle both dot and comma
        s = s.replace(/['"%\s]/g, '');
        if (s.includes('.') && s.includes(',')) {
            const lastDot = s.lastIndexOf('.');
            const lastComma = s.lastIndexOf(',');
            if (lastComma > lastDot) {
                // EU format: 1.234,56
                s = s.replace(/\./g, '').replace(',', '.');
            } else {
                // US format: 1,234.56
                s = s.replace(/,/g, '');
            }
        } else if (s.includes(',')) {
            // Heuristic: "1,234" is likely 1234, "1,5" is likely 1.5
            if (s.match(/\d,\d{3}$/)) {
                s = s.replace(',', '');
            } else {
                s = s.replace(',', '.');
            }
        }
        return parseFloat(s) || 0;
    }
}

function parseDateRobust(dateString: string): Date | null {
    if (!dateString) return null;
    let match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/); // YYYY-MM-DD
    if (match) return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));

    match = dateString.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
        const n1 = +match[1];
        const n2 = +match[2];
        const y = +match[3];
        if (n1 > 12) return new Date(Date.UTC(y, n2 - 1, n1)); // DD/MM/YYYY
        return new Date(Date.UTC(y, n1 - 1, n2)); // MM/DD/YYYY
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
}

function extractSegment(urlString: string): string | null {
    try {
        if (!urlString.startsWith('http')) {
            if (urlString.startsWith('/')) urlString = 'https://example.com' + urlString;
            else urlString = 'https://' + urlString;
        }
        const url = new URL(urlString);
        const parts = url.pathname.split('/').filter(Boolean);
        return parts.length > 0 ? `/${parts[0]}/` : '/';
    } catch (e) {
        return '/';
    }
}