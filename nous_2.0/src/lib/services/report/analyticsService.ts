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

            console.log("[ANALYTICS-SERVICE] Fetching properties for user:", userId);

            // Try Account Summaries first (most efficient)
            let res;
            try {
                res = await admin.accountSummaries.list();
            } catch (summariesError: any) {
                console.warn("[ANALYTICS-SERVICE] accountSummaries.list failed, trying fallback...", summariesError.message);
                // If this failed with 403, it's likely a scope issue
                if (summariesError.code === 403) {
                    throw new Error("Permisos insuficientes. Por favor, desvincula y vuelve a vincular tu cuenta de Google en la pestaña Integraciones para activar GA4.");
                }
            }

            const allProps: { id: string, name: string }[] = [];

            if (res?.data?.accountSummaries) {
                for (const account of res.data.accountSummaries) {
                    for (const prop of account.propertySummaries || []) {
                        allProps.push({
                            id: prop.property?.split('/')[1] || '',
                            name: prop.displayName || ''
                        });
                    }
                }
            } else {
                // Fallback: List accounts then properties for each
                console.log("[ANALYTICS-SERVICE] Fallback: Listing accounts manually...");
                const accountsRes = await admin.accounts.list();
                const accounts = accountsRes.data.accounts || [];

                for (const account of accounts) {
                    const propertiesRes = await admin.properties.list({ filter: `parent:${account.name}` });
                    const props = propertiesRes.data.properties || [];
                    for (const prop of props) {
                        allProps.push({
                            id: prop.name?.split('/')[1] || '',
                            name: prop.displayName || ''
                        });
                    }
                }
            }

            console.log(`[ANALYTICS-SERVICE] Found ${allProps.length} GA4 properties.`);
            return allProps.filter(p => p.id);
        } catch (e: any) {
            console.error("[ANALYTICS-SERVICE] Error listing GA4 Properties:", e);
            throw e; // Throw so the action can catch it
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
