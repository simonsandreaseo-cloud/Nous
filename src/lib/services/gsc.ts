import { supabase } from '@/lib/supabase';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export const GscService = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     * NOTE: In a Server Component/Action, you should pass the session or token directly.
     * This function attempts to get it from the client-side supabase instance if running on client,
     * but for server actions, we will expect the token to be passed.
     */
    async getAccessToken(connectionId?: string) {
        // 1. Check active session (Client-side only)
        // Note: provider_token only exists if the user just logged in. 
        // For recurring use, we must use the database.
        const { data: { session } } = await supabase.auth.getSession();
        
        // 2. Fetch from database (unified connections table)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        let query = supabase
            .from('user_google_connections')
            .select('access_token, refresh_token, expires_at')
            .eq('user_id', user.id);

        if (connectionId) {
            query = query.eq('id', connectionId);
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
            // Fallback for transition: check old table if not found in new one
            const { data: oldData } = await supabase
                .from('user_gsc_tokens')
                .select('access_token')
                .eq('user_id', user.id)
                .maybeSingle();
            
            return oldData?.access_token || null;
        }

        return data.access_token;
    },

    /**
     * List all verified sites for the user.
     */
    async getSites(accessToken?: string) {
        const token = accessToken || await this.getAccessToken();
        if (!token) throw new Error('No Google Access Token found.');

        const response = await fetch(`${GSC_API_BASE}/sites`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized GSC Access');
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching sites');
        }

        const data = await response.json();
        return data.siteEntry || [];
    },

    /**
     * Get search analytics (clicks, impressions, ctr, position)
     */
    async getSearchAnalytics(
        siteUrl: string,
        startDate: string,
        endDate: string,
        dimensions: string[] = ['date'],
        filters: { page?: string, query?: string, operator?: 'equals' | 'contains' | 'includingRegex' } = {},
        accessToken?: string
    ) {
        const token = accessToken || await this.getAccessToken();
        if (!token) throw new Error('No Google Access Token found.');

        const encodedSiteUrl = encodeURIComponent(siteUrl);

        const requestBody: any = {
            startDate,
            endDate,
            dimensions,
            rowLimit: 5000,
        };

        if (filters.page || filters.query) {
            requestBody.dimensionFilterGroups = [{ filters: [] }];
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
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching analytics');
        }

        const data = await response.json();
        return data.rows || [];
    },

    /**
     * fetchProjectInventory - specialized call to get all indexed pages
     * that have had any traffic/impressions in the last 180 days.
     */
    async fetchProjectInventory(siteUrl: string, accessToken?: string) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const rows = await this.getSearchAnalytics(
            siteUrl,
            startDate,
            endDate,
            ['page'],
            {},
            accessToken
        );

        return rows.map((row: any) => ({
            url: row.keys[0],
            clicks: row.clicks,
            impressions: row.impressions
        }));
    },
};
