import { supabase } from '../lib/supabase';

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

// Known AI-related sources/mediums for "AI Consultations"
const AI_SOURCES = [
    'chatgpt', 'openai', 'bing', 'bard', 'gemini', 'perplexity', 'claude', 'anthropic', 'character.ai', 'jasper'
];

export const Ga4Service = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     * Reuses the logic from GscService/AuthContext.
     */
    async getAccessToken() {
        // 1. Check active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) return session.provider_token;

        // 2. Fallback to users table if we stored it there (AuthContext saves to user_gsc_tokens, let's try that or just rely on session)
        // The previous GscService checks 'user_gsc_tokens', so we should do the same to be consistent.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_gsc_tokens')
            .select('access_token')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error || !data) return null;
        return data.access_token;
    },

    /**
     * List GA4 Account Summaries (Accounts and Properties).
     */
    async getAccountSummaries() {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No Google Access Token found. Please sign in with Google with correct scopes.');

        const response = await fetch(`${ADMIN_API_BASE}/accountSummaries`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized or Token Expired');
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to fetch GA4 accounts');
        }

        const data = await response.json();
        return data.accountSummaries || [];
    },

    /**
     * Fetch core metrics: Active Users, Sessions, Bounce Rate, Session Duration.
     * Also fetches Traffic Sources to calculate "AI Consultations".
     */
    async getReport(propertyId: string, startDate: string, endDate: string) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token.');

        // Adjust Property ID format: 'properties/123456'
        const formattedPropertyId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

        const requestBody = {
            dateRanges: [{ startDate, endDate }],
            metrics: [
                { name: 'sessions' },
                { name: 'activeUsers' },
                { name: 'newUsers' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' }
            ],
            dimensions: [
                { name: 'sessionSource' } // breakdown by source to find AI
            ],
            keepEmptyRows: true,
        };

        const response = await fetch(`${GA4_API_BASE}/${formattedPropertyId}:runReport`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to fetch GA4 report');
        }

        const data = await response.json();

        // Process Data
        let totalSessions = 0;
        let totalActiveUsers = 0;
        let totalNewUsers = 0;
        let weightedBounceRate = 0;
        let weightedDuration = 0;
        let aiSessions = 0;

        // Use a Map to aggregate sources since we asked for dimensions
        const sourceMap = new Map<string, number>();

        const rows = data.rows || [];

        // GA4 returns one row per dimension combination.
        // If we have multiple sources, we need to sum up totals. 
        // BUT 'sessions', 'activeUsers' returned in rows are for that source.
        // NOTE: Summing 'activeUsers' across rows is inaccurate (deduplication). 
        // However, if we only want "AI Consultations" count, we iterate.
        // To get ACCURATE totals for the whole property, we should ideally make a separate request without dimensions, 
        // or rely on the totals provided by GA4 in the response if available (data.totals usually exists).

        // Let's check if 'totals' or 'maximums' are in response. GA4 API output usually has 'totals' if requested? 
        // Actually, v1beta API response structure: { dimensionHeaders, metricHeaders, rows, rowCount, metadata, propertyQuota }
        // It does NOT automatically verify totals for all metrics if dimensions are present (like Users).

        // Strategy: 
        // 1. Helper request for Totals (no dimensions).
        // 2. Request for Sources (dimension sessionSource).

        // Let's do a request for TOTALS first (Metrics only).
        const totalsResponse = await fetch(`${GA4_API_BASE}/${formattedPropertyId}:runReport`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'activeUsers' },
                    { name: 'newUsers' },
                    { name: 'bounceRate' },
                    { name: 'averageSessionDuration' }
                ]
            })
        });

        let totalsData = { sessions: 0, activeUsers: 0, newUsers: 0, bounceRate: 0, averageSessionDuration: 0 };
        if (totalsResponse.ok) {
            const tJson = await totalsResponse.json();
            if (tJson.rows && tJson.rows.length > 0) {
                const m = tJson.rows[0].metricValues;
                totalsData = {
                    sessions: parseInt(m[0].value),
                    activeUsers: parseInt(m[1].value),
                    newUsers: parseInt(m[2].value),
                    bounceRate: parseFloat(m[3].value),
                    averageSessionDuration: parseFloat(m[4].value)
                };
            }
        }

        // Now iterate valid rows from the First Request (with sources) to calculate AI Sessions and Top Sources
        const sources: { name: string, sessions: number }[] = [];

        for (const row of rows) {
            const source = row.dimensionValues[0].value;
            const sessions = parseInt(row.metricValues[0].value);

            sources.push({ name: source, sessions });

            // Check for AI
            if (AI_SOURCES.some(ai => source.toLowerCase().includes(ai))) {
                aiSessions += sessions;
            }
        }

        sources.sort((a, b) => b.sessions - a.sessions);

        return {
            ...totalsData,
            aiSessions,
            topSources: sources.slice(0, 50)
        };
    },

    /**
     * Fetch Pages Report.
     * Applies the regex logic to reconstruct full URLs.
     */
    async getPageReport(propertyId: string, startDate: string, endDate: string, projectUrl: string) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token.');
        const formattedPropertyId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

        const requestBody = {
            dateRanges: [{ startDate, endDate }],
            metrics: [
                { name: 'screenPageViews' },
                { name: 'sessions' },
                { name: 'bounceRate' }
            ],
            dimensions: [
                { name: 'pagePath' } // or fullPageUrl? 'pagePath' is standard.
            ],
            limit: 500
        };

        const response = await fetch(`${GA4_API_BASE}/${formattedPropertyId}:runReport`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error('Failed to fetch Page report');
        const data = await response.json();

        const pages = (data.rows || []).map((row: any) => {
            const path = row.dimensionValues[0].value;
            const views = parseInt(row.metricValues[0].value);
            const sessions = parseInt(row.metricValues[1].value);
            const bounceRate = parseFloat(row.metricValues[2].value);

            // REGEX / Logic to consolidate with Search Console
            // User asked for a regex. 
            // Logic: if path starts with slash, append to domain (strip trailing slash from domain).
            // If path is already http, leave it.

            let fullUrl = path;
            // Regex to check if starts with http/https
            if (!/^https?:\/\//i.test(path)) {
                const baseUrl = projectUrl.replace(/\/$/, ''); // Remove trailing slash
                const cleanPath = path.startsWith('/') ? path : `/${path}`;
                fullUrl = `${baseUrl}${cleanPath}`;
            }

            return {
                path,
                fullUrl,
                views,
                sessions,
                bounceRate
            };
        });

        return pages;
    },

    async syncToSupabase(projectId: number, propertyId: string, startDate: string, endDate: string, projectUrl: string) {
        // Fetch Metrics
        const metrics = await this.getReport(propertyId, startDate, endDate);
        const pages = await this.getPageReport(propertyId, startDate, endDate, projectUrl);

        // We are saving "Daily" stats. Note that getReport returns aggregate for the range.
        // If we want daily stats, we should loop through days OR request 'date' dimension.
        // For simplicity/efficiency, let's request 'date' dimension in a single call to batch update.
        // But the user just asked for "Incorporar metricas". 
        // The GSC service does a daily breakdown.
        // Let's implement a daily fetch for the chart data.

        return { metrics, pages }; // Placeholder return, real implementation would batch upsert to ga4_daily_metrics
    }
};
