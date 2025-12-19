import Papa from 'papaparse';
import { CSVRow, FileType } from '../types';

export const parseCSV = (file: File, type: FileType, onProgress: (msg: string) => void): Promise<CSVRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedData: CSVRow[] = [];
                    let invalidDateRows = 0;
                    let invalidNumericRows = 0;
                    
                    const firstRow = results.data[0] as any;
                    if (!firstRow) {
                         reject(new Error("El archivo CSV parece estar vacío."));
                         return;
                    }
                    
                    const keys = Object.keys(firstRow);
                    const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c)));

                    // Common Keys
                    const dateKey = findKey(['date', 'fecha']);
                    const clicksKey = findKey(['click', 'clic']);
                    const impKey = findKey(['impression', 'impresion']);
                    const posKey = findKey(['position', 'posic', 'media']);

                    if (!dateKey || !clicksKey) {
                        reject(new Error(`Faltan columnas esenciales (Fecha o Clics). Columnas encontradas: ${keys.join(', ')}`));
                        return;
                    }

                    // Specific Keys based on Type
                    let pageKey: string | undefined;
                    let queryKey: string | undefined;
                    let countryKey: string | undefined;

                    if (type === 'pages') {
                        pageKey = findKey(['page', 'página', 'landing', 'destino']);
                        if (!pageKey) { reject(new Error("Este archivo debe contener la columna 'Landing Page' o 'Página'.")); return; }
                    } else if (type === 'queries') {
                        queryKey = findKey(['query', 'keyword', 'consulta', 'palabra', 'término']);
                        pageKey = findKey(['page', 'página', 'landing', 'destino']); // Optional in query file but good to have
                        if (!queryKey) { reject(new Error("Este archivo debe contener la columna 'Query' o 'Consulta'.")); return; }
                    } else if (type === 'countries') {
                        countryKey = findKey(['country', 'país', 'pais']);
                        if (!countryKey) { reject(new Error("Este archivo debe contener la columna 'Country' o 'País'.")); return; }
                    }

                    results.data.forEach((row: any) => {
                        const dateStr = row[dateKey];
                        if (!dateStr || dateStr.toString().trim() === '') return;

                        const dateResult = parseDateRobust(dateStr);
                        if (!dateResult) {
                            invalidDateRows++;
                            return;
                        }

                        const clicks = parseNumber(row[clicksKey], true); 
                        const impressions = parseNumber(row[impKey], true); 
                        const position = parseNumber(row[posKey], false); 

                        if (isNaN(clicks) && isNaN(impressions)) {
                            invalidNumericRows++;
                            return;
                        }

                        const newRow: CSVRow = {
                            date: dateResult,
                            clicks: clicks || 0,
                            impressions: impressions || 0,
                            position: position || 0
                        };

                        if (type === 'pages' && pageKey) {
                            newRow.page = row[pageKey] || 'Unknown';
                            newRow.segment = extractSegment(newRow.page!);
                        }
                        if (type === 'queries') {
                            if (queryKey) newRow.keyword = row[queryKey] || 'N/A';
                            if (pageKey) newRow.page = row[pageKey] || 'Unknown';
                        }
                        if (type === 'countries' && countryKey) {
                            newRow.country = row[countryKey] || 'Global';
                        }

                        parsedData.push(newRow);
                    });

                    if (invalidDateRows > 0) {
                        onProgress(`Advertencia: Se omitieron ${invalidDateRows} filas por fecha no reconocida.`);
                    }
                    
                    if (parsedData.length === 0) {
                        reject(new Error("No se encontraron datos válidos."));
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
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    
    let s = val.toString().trim();
    
    if (isInteger) {
        s = s.replace(/\D/g, ''); 
        return parseInt(s, 10) || 0;
    } else {
        s = s.replace(/['"]/g, '');
        s = s.replace(',', '.');
        if ((s.match(/\./g) || []).length > 1) {
             const lastDot = s.lastIndexOf('.');
             s = s.substring(0, lastDot).replace('.', '') + s.substring(lastDot);
        }
        return parseFloat(s) || 0;
    }
}

const monthMap: { [key: string]: number } = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'jan': 0, 'apr': 3, 'aug': 7, 'dec': 11,
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
};

function parseDateRobust(dateString: string): Date | null {
    if (!dateString) return null;
    const cleanStr = dateString.toLowerCase().trim();

    if (/^\d{5}$/.test(cleanStr)) {
       const serial = parseInt(cleanStr, 10);
       const utc_days  = Math.floor(serial - 25569);
       const utc_value = utc_days * 86400;                                        
       return new Date(utc_value * 1000);
    }

    let match = cleanStr.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
    if (match) return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));

    match = cleanStr.match(/^(\d{1,2})[\s\-\/]([a-z]{3,})[\s\-\/,]*(\d{2,4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const monthStr = match[2]; 
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        if (monthMap.hasOwnProperty(monthStr)) {
            return new Date(Date.UTC(year, monthMap[monthStr], day));
        }
    }

    match = cleanStr.match(/^([a-z]{3,})[\s]+(\d{1,2})[\s,]+(\d{4})$/);
    if (match) {
        const monthStr = match[1];
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        if (monthMap.hasOwnProperty(monthStr)) {
            return new Date(Date.UTC(year, monthMap[monthStr], day));
        }
    }

    match = cleanStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (match) {
        const n1 = +match[1];
        const n2 = +match[2];
        let y = +match[3];
        if (y < 100) y += 2000;
        if (n1 > 12) return new Date(Date.UTC(y, n2 - 1, n1));
        if (n2 > 12) return new Date(Date.UTC(y, n1 - 1, n2));
        return new Date(Date.UTC(y, n2 - 1, n1)); 
    }

    const d = new Date(dateString);
    if (!isNaN(d.getTime())) return d;

    return null;
}

function extractSegment(urlString: string): string | null {
    if (!urlString) return 'Home';
    try {
        let urlStr = urlString.trim();
        if (!urlStr.startsWith('http')) {
            if (urlStr.startsWith('/')) urlStr = 'https://example.com' + urlStr;
            else urlStr = 'https://' + urlStr;
        }
        const url = new URL(urlStr);
        // Exclude homepage
        if (url.pathname === '/' || url.pathname === '') return 'Home';
        
        // Extract first folder
        const parts = url.pathname.split('/').filter(p => p.length > 0);
        
        if (parts.length === 0) return 'Home';
        
        // Return /folder/ format
        return `/${parts[0]}/`;
    } catch (e) {
        return 'Otros';
    }
}