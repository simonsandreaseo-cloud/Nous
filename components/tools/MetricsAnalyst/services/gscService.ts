import { CSVRow } from '../types';

const SEARCH_CONSOLE_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export interface GSCProperty {
    siteUrl: string;
    permissionLevel: string;
}

export const fetchSites = async (accessToken: string): Promise<GSCProperty[]> => {
    try {
        const response = await fetch(`${SEARCH_CONSOLE_API_BASE}/sites`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching sites: ${response.statusText}`);
        }

        const data = await response.json();
        return data.siteEntry || [];
    } catch (error) {
        console.error('Error in fetchSites:', error);
        throw error;
    }
};

export const fetchSearchAnalytics = async (
    accessToken: string,
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[]
): Promise<CSVRow[]> => {
    try {
        const response = await fetch(`${SEARCH_CONSOLE_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate,
                endDate,
                dimensions,
                rowLimit: 25000 // Max limit to get good dataset
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`GSC API Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const rows = data.rows || [];

        return rows.map((row: any) => adaptToCSVRow(row, dimensions));
    } catch (error) {
        console.error('Error in fetchSearchAnalytics:', error);
        throw error;
    }
};

const adaptToCSVRow = (gscRow: any, dimensions: string[]): CSVRow => {
    const keys = gscRow.keys || [];

    // Default values
    let dateStr = '';
    let page = '';
    let keyword = '';
    let country = '';

    // Map dimensions to row fields based on position
    dimensions.forEach((dim, index) => {
        if (dim === 'date') dateStr = keys[index];
        if (dim === 'page') page = keys[index];
        if (dim === 'query') keyword = keys[index];
        if (dim === 'country') country = keys[index];
    });

    // Fallback if date is missing (aggregation without date?) -> This tool relies on dates.
    // So we MUST request date dimension.

    const date = new Date(dateStr);

    return {
        date: isNaN(date.getTime()) ? new Date() : date,
        clicks: gscRow.clicks || 0,
        impressions: gscRow.impressions || 0,
        position: gscRow.position || 0,
        page: page || undefined,
        keyword: keyword || undefined,
        country: country || undefined,
        segment: page ? extractSegment(page) : undefined
    };
};

function extractSegment(urlString: string): string | null {
    if (!urlString) return 'Home';
    try {
        let urlStr = urlString.trim();
        if (!urlStr.startsWith('http')) {
            if (urlStr.startsWith('/')) urlStr = 'https://example.com' + urlStr;
            else urlStr = 'https://' + urlStr;
        }
        const url = new URL(urlStr);
        if (url.pathname === '/' || url.pathname === '') return 'Home';
        const parts = url.pathname.split('/').filter(p => p.length > 0);
        if (parts.length === 0) return 'Home';
        return `/${parts[0]}/`;
    } catch (e) {
        return 'Otros';
    }
}
