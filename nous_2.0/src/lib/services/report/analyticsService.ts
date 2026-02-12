import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for token retrieval
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const AnalyticsService = {

    // Helper: Get Authenticated Client
    async getAuthClient(userId: string) {
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
                await supabase.from('user_gsc_tokens').upsert({
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

    // 1. Auto-discover GA4 Property ID based on Domain
    async findPropertyId(domain: string, userId: string): Promise<string | null> {
        try {
            const auth = await this.getAuthClient(userId);
            const admin = google.analyticsadmin({ version: 'v1beta', auth });

            // List Account Summaries (lightweight way to get properties)
            const res = await admin.accountSummaries.list();
            const summaries = res.data.accountSummaries || [];

            // Normalize domain
            const cleanDomain = domain.replace(/https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();

            for (const account of summaries) {
                for (const prop of account.propertySummaries || []) {
                    // Check if property display name contains domain parts or exact match
                    const propName = prop.displayName?.toLowerCase() || '';
                    if (propName.includes(cleanDomain)) {
                        return prop.property?.split('/')[1] || null; // properties/12345 -> 12345
                    }
                }
            }

            // Fallback: Return first property found if only one exists (common for solo users)
            if (summaries.length === 1 && summaries[0].propertySummaries?.length === 1) {
                return summaries[0].propertySummaries[0].property?.split('/')[1] || null;
            }

            return null;
        } catch (e) {
            console.error("Error finding GA4 Property:", e);
            return null;
        }
    },

    // 2. Fetch Session Sources (to identify AI)
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

    // 3. Fetch Pages for Specific Sources (The AI Traffic Detail)
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
