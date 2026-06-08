import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
    headers: string[];
    rows: any[];
}

/**
 * Parses a CSV, XLS, or XLSX file and extracts headers and data rows.
 * Attempts to handle messy formats by filtering out completely empty rows.
 */
export const parseSpreadsheet = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    resolve({
                        headers,
                        rows: results.data
                    });
                },
                error: (error) => reject(error)
            });
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert sheet to json
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[][];
                    
                    if (jsonData.length === 0) {
                        return resolve({ headers: [], rows: [] });
                    }

                    // Assume first non-empty row contains headers
                    // Some users might have weird data at the very top, but header:1 returns arrays
                    // We'll just take the first row as headers, and the rest as data
                    // To make it robust for AI, we'll keep the raw keys as they are found
                    let headerIndex = 0;
                    for (let i = 0; i < jsonData.length; i++) {
                        if (jsonData[i].length > 0) {
                            headerIndex = i;
                            break;
                        }
                    }

                    const rawHeaders = jsonData[headerIndex] || [];
                    // Ensure headers are strings
                    const headers = rawHeaders.map((h, i) => h ? String(h).trim() : `Columna ${i + 1}`);

                    const rows = [];
                    for (let i = headerIndex + 1; i < jsonData.length; i++) {
                        const rowData = jsonData[i];
                        if (!rowData || rowData.length === 0) continue;
                        
                        const rowObj: any = {};
                        headers.forEach((header, index) => {
                            rowObj[header] = rowData[index] !== undefined ? rowData[index] : null;
                        });
                        rows.push(rowObj);
                    }

                    resolve({
                        headers,
                        rows
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error("Formato no soportado. Por favor sube un CSV o Excel (.xlsx, .xls)"));
        }
    });
};
