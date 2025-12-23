import { supabase } from '../lib/supabase';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export const GscService = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     */
    async getAccessToken() {
        // 1. Check active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) return session.provider_token;

        // 2. Fallback to persisted token in database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_gsc_tokens')
            .select('access_token, refresh_token, expires_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error || !data) return null;

        // If we had an Edge Function for refreshing, we would call it here if expires_at < now()
        return data.access_token;
    },

    /**
     * List all verified sites for the user.
     */
    async getSites() {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No Google Access Token found. Please sign in with Google.');

        const response = await fetch(`${GSC_API_BASE}/sites`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No access token. Please sign in with Google.');
            }
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching sites');
        }

        const data = await response.json();
        return data.siteEntry || [];
    },

    /**
     * Get search analytics (clicks, impressions, ctr, position) for a specific site.
     * @param siteUrl The URL of the property (e.g., "https://example.com/")
     * @param startDate Format: 'YYYY-MM-DD'
     * @param endDate Format: 'YYYY-MM-DD'
     * @param dimensions Array of dimensions: ['date', 'query', 'page', 'country', 'device']
     */
    async getSearchAnalytics(siteUrl: string, startDate: string, endDate: string, dimensions: string[] = ['date'], filters: { page?: string, query?: string, operator?: 'equals' | 'contains' | 'includingRegex' } = {}) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token. Please sign in with Google.');

        // Site URL must be URL-encoded for the path
        const encodedSiteUrl = encodeURIComponent(siteUrl);

        const requestBody: any = {
            startDate,
            endDate,
            dimensions,
            rowLimit: 5000,
        };

        if (filters.page || filters.query) {
            requestBody.dimensionFilterGroups = [{
                filters: []
            }];

            if (filters.page) {
                requestBody.dimensionFilterGroups[0].filters.push({
                    dimension: 'page',
                    operator: filters.operator || 'equals',
                    expression: filters.page
                });
            }
            if (filters.query) {
                requestBody.dimensionFilterGroups[0].filters.push({
                    dimension: 'query',
                    operator: 'contains',
                    expression: filters.query
                });
            }
        }

        const response = await fetch(`${GSC_API_BASE}/sites/${encodedSiteUrl}/searchAnalytics/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No access token. Please sign in with Google.');
            }
            const error = await response.json();
            // Handle "User does not have sufficient permissions" etc.
            throw new Error(error.error?.message || 'Error fetching analytics');
        }

        const data = await response.json();
        return data.rows || [];
    },
    /**
     * Get sitemaps for a specific site.
     */
    async getSitemaps(siteUrl: string) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token. Please sign in with Google.');

        const encodedSiteUrl = encodeURIComponent(siteUrl);
        const response = await fetch(`${GSC_API_BASE}/sites/${encodedSiteUrl}/sitemaps`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No access token. Please sign in with Google.');
            }
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching sitemaps');
        }

        const data = await response.json();
        return data.sitemap || [];
    },

    /**
     * Sync GSC data to Supabase for backup and offline use.
     * Fetches daily totals and top queries/pages for the specified range.
     */
    async syncProjectAnalytics(projectId: string, siteUrl: string, startDate: string, endDate: string) {
        // 1. Fetch Daily Totals (Clicks, Impressions, CTR, Position)
        const dailyTotals = await this.getSearchAnalytics(siteUrl, startDate, endDate, ['date']);

        // 2. Fetch Top Queries per Date
        // We fetch with date dimension to group them. Note: 5000 row limit might truncate if range is large and many queries.
        // For distinct daily backups, it's safer to loop, but for performance we try one batch first. 
        // If the period is 28 days, 5000 rows / 28 = ~178 queries per day. Acceptable for "Top Queries".
        const dailyQueries = await this.getSearchAnalytics(siteUrl, startDate, endDate, ['date', 'query']);

        // 3. Fetch Top Pages per Date
        const dailyPages = await this.getSearchAnalytics(siteUrl, startDate, endDate, ['date', 'page']);

        // Group by Date
        const groupedData = new Map<string, {
            clicks: number, impressions: number, ctr: number, position: number,
            queries: any[], pages: any[]
        }>();

        // Initialize with totals
        for (const row of dailyTotals) {
            const date = row.keys[0]; // 'YYYY-MM-DD'
            groupedData.set(date, {
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position,
                queries: [],
                pages: []
            });
        }

        // Fill Queries
        for (const row of dailyQueries) {
            const date = row.keys[0];
            const entry = groupedData.get(date);
            if (entry) {
                // Determine if we want to store ALL or just top.
                // storing simplified object
                entry.queries.push({
                    term: row.keys[1],
                    clicks: row.clicks,
                    impressions: row.impressions,
                    ctr: row.ctr,
                    position: row.position
                });
            }
        }

        // Fill Pages
        for (const row of dailyPages) {
            const date = row.keys[0];
            const entry = groupedData.get(date);
            if (entry) {
                entry.pages.push({
                    url: row.keys[1],
                    clicks: row.clicks,
                    impressions: row.impressions,
                    ctr: row.ctr,
                    position: row.position
                });
            }
        }

        // Prepare Upsert Payload
        const payload = Array.from(groupedData.entries()).map(([date, data]) => ({
            project_id: projectId,
            date,
            clicks: data.clicks,
            impressions: data.impressions,
            ctr: data.ctr,
            position: data.position,
            top_queries: data.queries.slice(0, 500), // Limit to top 500 to save space
            top_pages: data.pages.slice(0, 500),
            updated_at: new Date().toISOString()
        }));

        if (payload.length > 0) {
            const { error } = await supabase
                .from('gsc_daily_metrics')
                .upsert(payload, { onConflict: 'project_id,date' });

            if (error) throw new Error(error.message);
        }

        return payload.length;
    },

    /**
     * Get analytics from local database.
     */
    async getLocalAnalytics(projectId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('gsc_daily_metrics')
            .select('*')
            .eq('project_id', projectId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    }
};
