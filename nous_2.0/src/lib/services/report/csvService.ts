import Papa from 'papaparse';
import { GscRow } from '@/types/report';

// Reusing the robust logic from original code
export const parseCSV = (file: File): Promise<GscRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedData: GscRow[] = [];

                    // Detect headers dynamically (Support English/Spanish)
                    const firstRow = results.data[0] as any;
                    const dateKey = Object.keys(firstRow).find(k => k.match(/date|fecha/i)) || 'Date';
                    const pageKey = Object.keys(firstRow).find(k => k.match(/page|página|landing/i)) || 'Page';
                    const queryKey = Object.keys(firstRow).find(k => k.match(/query|keyword|consulta/i)) || 'Query';
                    const countryKey = Object.keys(firstRow).find(k => k.match(/country|país/i)) || 'Country';

                    const clicksKey = Object.keys(firstRow).find(k => k.match(/click|clic/i)) || 'Clicks';
                    const impKey = Object.keys(firstRow).find(k => k.match(/impression|impresion/i)) || 'Impressions';
                    const posKey = Object.keys(firstRow).find(k => k.match(/position|posic/i)) || 'Position';
                    const ctrKey = Object.keys(firstRow).find(k => k.match(/ctr/i)) || 'CTR';

                    results.data.forEach((row: any) => {
                        const page = row[pageKey];
                        const keyword = row[queryKey];
                        const dateStr = row[dateKey];
                        const country = row[countryKey] || 'Global';

                        if (!dateStr || !page) return; // Skip invalid rows

                        const date = parseDateRobust(dateStr);
                        if (!date) return;

                        // Robust Number Parse
                        const clicks = parseNumber(row[clicksKey], true);
                        const impressions = parseNumber(row[impKey], true);
                        const position = parseNumber(row[posKey], false);
                        const ctr = parseNumber(row[ctrKey], false) || (impressions > 0 ? (clicks / impressions) * 100 : 0);

                        parsedData.push({
                            page,
                            keyword: keyword || '', // Allow empty for page-only rows
                            date,
                            country,
                            clicks,
                            impressions,
                            position,
                            ctr
                        });
                    });

                    if (parsedData.length === 0) reject(new Error("No valid rows found"));
                    resolve(parsedData);
                } catch (e) {
                    reject(e);
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
        s = s.replace(/\D/g, ''); // Remove all non-digits
        return parseInt(s, 10) || 0;
    } else {
        // Handle 1.5 and 1,5
        s = s.replace(/['"]/g, '').replace(',', '.').replace('%', '');
        return parseFloat(s) || 0;
    }
}

function parseDateRobust(dateString: string): Date | null {
    if (!dateString) return null;
    let match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));

    match = dateString.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
        // Assume DD/MM/YYYY or MM/DD/YYYY? 
        // Heuristic: if first > 12, it's DD. If second > 12, it's MM (invalid in second pos for US).
        // Let's standardise on DD/MM/YYYY for Spanish context, but support ISO.
        const n1 = +match[1];
        const n2 = +match[2];
        const y = +match[3];
        if (n1 > 12) return new Date(Date.UTC(y, n2 - 1, n1)); // MM/DD/YYYY
        return new Date(Date.UTC(y, n2 - 1, n1)); // DD/MM/YYYY default
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
}
