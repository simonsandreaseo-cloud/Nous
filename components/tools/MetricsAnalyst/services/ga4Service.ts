import { supabase } from '@/lib/supabase';

const ANALYTICS_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

// Known AI sources to help with initial classification
export const AI_SOURCES = [
    'chatgpt', 'openai', 'bing', 'copilot', 'gemini', 'bard', 'claude', 'anthropic', 'perplexity', 'jasper', 'copy.ai', 'writesonic'
];

export interface Ga4ReportRequest {
    startDate: string;
    endDate: string;
    metrics?: string[];
    dimensions?: string[];
}

export const Ga4Service = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     */
    async getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) return session.provider_token;
        return null;
    },

    /**
     * Fetch Account Summaries to list available properties.
     * Use this to let the user select a property.
     */
    async getAccountSummaries() {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token. Please sign in with Google.');

        // GA4 Admin API for listing accounts/properties
        const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

        try {
            const response = await fetch(`${ADMIN_API_BASE}/accountSummaries`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`GA4 Admin API Error: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.accountSummaries || [];
        } catch (error) {
            console.error('Error in getAccountSummaries:', error);
            throw error;
        }
    },

    /**
     * Run a report on a specific GA4 property.
     * Specifically used to fetch session sources and sessions for AI analysis.
     */
    async runReport(propertyId: string, request: Ga4ReportRequest) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token. Please sign in with Google.');

        const { startDate, endDate, metrics = ['sessions'], dimensions = ['sessionSource'] } = request;

        try {
            const response = await fetch(`${ANALYTICS_DATA_API_BASE}/properties/${propertyId}:runReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateRanges: [{ startDate, endDate }],
                    dimensions: dimensions.map(d => ({ name: d })),
                    metrics: metrics.map(m => ({ name: m }))
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`GA4 Data API Error: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error in runReport:', error);
            throw error;
        }
    },

    /**
     * Specialized function to fetch data for AI Session analysis.
     * Fetches 'sessionSource' and 'sessions' (and optionally checks changes if needed).
     */
    async getAiSessionData(propertyId: string, startDate: string, endDate: string) {
        // We fetch sessionSource and sessions
        const report = await this.runReport(propertyId, {
            startDate,
            endDate,
            dimensions: ['sessionSource'],
            metrics: ['sessions']
        });

        // Parse result
        const rows = report.rows || [];

        // Transform into a cleaner format
        const sources = rows.map((row: any) => ({
            source: row.dimensionValues[0].value,
            sessions: parseInt(row.metricValues[0].value, 10)
        }));

        // Sort by sessions desc
        sources.sort((a: any, b: any) => b.sessions - a.sessions);

        return sources;
    },

    /**
     * Fetch comparison data to calculate changes.
     */
    async getComparisonAiSessionData(propertyId: string, dateRange: { startDate: string, endDate: string }, prevDateRange: { startDate: string, endDate: string }) {
        const currentData = await this.getAiSessionData(propertyId, dateRange.startDate, dateRange.endDate);
        const prevData = await this.getAiSessionData(propertyId, prevDateRange.startDate, prevDateRange.endDate);

        // Map previous data for quick lookup
        const prevMap = new Map(prevData.map((d: any) => [d.source, d.sessions]));

        // Combine
        const comparison = currentData.map((d: any) => {
            const prevSessions = prevMap.get(d.source) || 0;
            const change = d.sessions - prevSessions;
            return {
                ...d,
                prevSessions,
                change,
                isAi: AI_SOURCES.some(ai => d.source.toLowerCase().includes(ai)) // Basic heuristic, to be improved by AI
            };
        });

        return comparison;
    },

    /**
     * Fetch session data grouped by source and date.
     * Useful for plotting trends of AI vs Non-AI traffic over time.
     */
    async getAiSessionDataByDate(propertyId: string, startDate: string, endDate: string) {
        const report = await this.runReport(propertyId, {
            startDate,
            endDate,
            dimensions: ['sessionSource', 'date'],
            metrics: ['sessions']
        });

        const rows = report.rows || [];

        return rows.map((row: any) => ({
            source: row.dimensionValues[0].value,
            date: row.dimensionValues[1].value, // YYYYMMDD format usually
            sessions: parseInt(row.metricValues[0].value, 10)
        }));
    }
};
