import { CSVRow } from '../types';
import { supabase } from '@/lib/supabase';

const SEARCH_CONSOLE_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export interface GSCProperty {
    siteUrl: string;
    permissionLevel: string;
}

export const GscService = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     */
    async getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) return session.provider_token;
        return null;
    },

    /**
     * Fetch all verified sites.
     * Can optionally take a token, or fetch it internally.
     */
    async getSites(token?: string): Promise<GSCProperty[]> {
        const accessToken = token || await this.getAccessToken();
        if (!accessToken) throw new Error('No access token. Please sign in with Google.');

        try {
            const response = await fetch(`${SEARCH_CONSOLE_API_BASE}/sites`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // If 401, maybe throw specific error
                throw new Error(`Error fetching sites: ${response.statusText}`);
            }

            const data = await response.json();
            return data.siteEntry || [];
        } catch (error) {
            console.error('Error in getSites:', error);
            throw error;
        }
    },

    /**
     * Fetch data from GSC and transform it into the tool's CSVRow format.
     */
    async getSearchAnalytics(
        siteUrl: string,
        startDate: string,
        endDate: string,
        dimensions: string[]
    ): Promise<CSVRow[]> {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token. Please sign in with Google.');

        try {
            const response = await fetch(`${SEARCH_CONSOLE_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    dimensions,
                    rowLimit: 25000
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
    },

    /**
     * Get analytics from local database.
     */
    async getLocalAnalytics(projectId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('gsc_daily_metrics')
            .select('*')
            .eq('project_id', parseInt(projectId))
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    }
};

// --- Helpers ---

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
