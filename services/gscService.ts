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
    }
};
