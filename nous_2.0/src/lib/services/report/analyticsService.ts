import { google } from 'googleapis';
import { supabase as sharedSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Helper to get a specialized client (Admin if possible, Shared otherwise)
const getSupabaseClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key) {
        return createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    }
    // Fallback to shared client if service role is missing
    return sharedSupabase;
};

export const AnalyticsService = {

    // Helper: Get Authenticated Client
    async getAuthClient(userId: string) {
        const supabase = getSupabaseClient();
        const { data: tokens } = await supabase
            .from('user_gsc_tokens')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!tokens) throw new Error("Google account not connected");

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: new Date(tokens.expires_at).getTime() // Ensure consistent naming with DB
        });

        // Auto-refresh if needed
        oauth2Client.on('tokens', async (newTokens) => {
            if (newTokens.access_token) {
                const supabaseAdmin = getSupabaseClient();
                await supabaseAdmin.from('user_gsc_tokens').upsert({
                    user_id: userId,
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token || tokens.refresh_token,
                    expires_at: new Date(newTokens.expiry_date || Date.now() + 3500 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
        });

        return oauth2Client;
    },

    // 1. List all GA4 Properties
    async findProperties(userId: string): Promise<{ id: string, name: string }[]> {
        try {
            const auth = await this.getAuthClient(userId);
            const admin = google.analyticsadmin({ version: 'v1beta', auth });

            const res = await admin.accountSummaries.list();
            const summaries = res.data.accountSummaries || [];

            const allProps: { id: string, name: string }[] = [];

            for (const account of summaries) {
                for (const prop of account.propertySummaries || []) {
                    allProps.push({
                        id: prop.property?.split('/')[1] || '',
                        name: prop.displayName || ''
                    });
                }
            }

            return allProps.filter(p => p.id);
        } catch (e) {
            console.error("Error listing GA4 Properties:", e);
            return [];
        }
    },

    // 2. Auto-discover GA4 Property ID based on Domain (Fallback or for legacy use)
    async findPropertyId(domain: string, userId: string): Promise<string | null> {
        try {
            const props = await this.findProperties(userId);
            const cleanDomain = domain.replace(/https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();

            for (const prop of props) {
                if (prop.name.toLowerCase().includes(cleanDomain)) {
                    return prop.id;
                }
            }

            // Fallback: If only one exists
            if (props.length === 1) return props[0].id;

            return null;
        } catch (e) {
            console.error("Error finding GA4 Property:", e);
            return null;
        }
    },

    // 3. Fetch Session Sources (to identify AI)
    async fetchTrafficSources(propertyId: string, userId: string, startDate: string, endDate: string) {
        const auth = await this.getAuthClient(userId);
        const analytics = google.analyticsdata({ version: 'v1beta', auth });

        const response = await analytics.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'sessionSource' }],
                metrics: [{ name: 'sessions' }, { name: 'activeUsers' }]
            }
        });

        return response.data.rows?.map(row => ({
            source: row.dimensionValues?.[0].value || '(not set)',
            sessions: parseInt(row.metricValues?.[0].value || '0'),
            users: parseInt(row.metricValues?.[1].value || '0')
        })) || [];
    },

    // 4. Fetch Pages for Specific Sources (The AI Traffic Detail)
    async fetchPagesBySource(propertyId: string, userId: string, sources: string[], startDate: string, endDate: string) {
        const auth = await this.getAuthClient(userId);
        const analytics = google.analyticsdata({ version: 'v1beta', auth });

        // Build Filter Expression
        const filterExpression = {
            orGroup: {
                expressions: sources.map(source => ({
                    filter: {
                        fieldName: 'sessionSource',
                        stringFilter: {
                            matchType: 'EXACT',
                            value: source,
                            caseSensitive: false
                        }
                    }
                }))
            }
        };

        const response = await analytics.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'sessionSource' }], // Page + Query ensures we see exact content
                metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
                dimensionFilter: filterExpression
            }
        });

        return response.data.rows?.map(row => ({
            page: row.dimensionValues?.[0].value || '',
            source: row.dimensionValues?.[1].value || '',
            sessions: parseInt(row.metricValues?.[0].value || '0'),
            engagementRate: parseFloat(row.metricValues?.[1].value || '0')
        })) || [];
    }
};
