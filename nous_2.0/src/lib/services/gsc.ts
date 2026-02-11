import { supabase } from '@/lib/supabase';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

export const GscService = {
    /**
     * Get the current user's provider token (Google Access Token) from the session.
     * NOTE: In a Server Component/Action, you should pass the session or token directly.
     * This function attempts to get it from the client-side supabase instance if running on client,
     * but for server actions, we will expect the token to be passed.
     */
    async getAccessToken() {
        // 1. Check active session (Client-side only)
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
};
