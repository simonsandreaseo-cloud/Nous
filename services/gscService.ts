import { supabase } from '../lib/supabase';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export const GscService = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     */
    async getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.provider_token;
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
    async getSearchAnalytics(siteUrl: string, startDate: string, endDate: string, dimensions: string[] = ['date']) {
        const token = await this.getAccessToken();
        if (!token) throw new Error('No access token');

        // Site URL must be URL-encoded for the path
        const encodedSiteUrl = encodeURIComponent(siteUrl);

        const response = await fetch(`${GSC_API_BASE}/sites/${encodedSiteUrl}/searchAnalytics/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                startDate,
                endDate,
                dimensions,
                rowLimit: 5000,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            // Handle "User does not have sufficient permissions" etc.
            throw new Error(error.error?.message || 'Error fetching analytics');
        }

        const data = await response.json();
        return data.rows || [];
    }
};
