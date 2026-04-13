// import { google } from 'googleapis'; // Removed for static export
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
    async getAuthClient(userId: string, connectionId?: string) {
        const supabase = getSupabaseClient();
        let query = supabase.from('user_google_connections').select('*').eq('user_id', userId);

        if (connectionId) {
            query = query.eq('id', connectionId);
        } else {
            // Default to most recently updated if none specified
            query = query.order('updated_at', { ascending: false });
        }

        const { data: results } = await query;
        const tokens = results?.[0];

        if (!tokens) throw new Error("No Google account connected");

        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: new Date(tokens.expires_at).getTime()
        });

        // Auto-refresh if needed
        oauth2Client.on('tokens', async (newTokens) => {
            if (newTokens.access_token) {
                const supabaseAdmin = getSupabaseClient();
                await supabaseAdmin.from('user_google_connections').update({
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token || tokens.refresh_token,
                    expires_at: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : new Date(Date.now() + 3500 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', tokens.id); // Use the unique ID for safe updates
            }
        });

        return oauth2Client;
    },

    // 1. List all GA4 Properties (from all connected accounts by default)
    async findProperties(userId: string, connectionId?: string): Promise<{ id: string, name: string, accountEmail?: string }[]> {
        try {
            const supabase = getSupabaseClient();
            let query = supabase.from('user_google_connections').select('*').eq('user_id', userId);
            
            if (connectionId) query = query.eq('id', connectionId);

            const { data: accounts } = await query;
            console.log(`[GA4-DISCOVERY] Found ${accounts?.length || 0} connected tokens for user ${userId}`);
            if (!accounts || accounts.length === 0) return [];

            const allProps: { id: string, name: string, accountEmail?: string }[] = [];

            for (const token of accounts) {
                try {
                    console.log(`[GA4-DISCOVERY] START for: ${token.email}`);
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET
                    );
                    auth.setCredentials({
                        access_token: token.access_token,
                        refresh_token: token.refresh_token,
                        expiry_date: new Date(token.expires_at).getTime()
                    });
                    
                    const admin = google.analyticsadmin({ version: 'v1beta', auth });
                    
                    // --- STRATEGY A: Account Summaries (Fast) ---
                    console.log(`[GA4-DISCOVERY] Trying accountSummaries.list...`);
                    const res = await admin.accountSummaries.list({ pageSize: 200 });

                    if (res.data.accountSummaries && res.data.accountSummaries.length > 0) {
                        for (const account of (res.data.accountSummaries || [])) {
                            for (const prop of (account.propertySummaries || [])) {
                                allProps.push({
                                    id: prop.property?.split('/')[1] || '',
                                    name: prop.displayName || '',
                                    accountEmail: token.email
                                });
                            }
                        }
                    } 
                    
                    // --- STRATEGY B: Fallback to Manual Accounts Listing if A is empty ---
                    if (allProps.length === 0) {
                        console.log(`[GA4-DISCOVERY] Strategy A empty. Trying manual accounts.list...`);
                        const accountsRes = await admin.accounts.list();
                        console.log(`[GA4-DISCOVERY] Strategy B: Found ${accountsRes.data.accounts?.length || 0} direct accounts.`);
                        
                        for (const account of (accountsRes.data.accounts || [])) {
                            console.log(`[GA4-DISCOVERY] Fetching properties for Account: ${account.displayName} (${account.name})`);
                            const propsRes = await admin.properties.list({ filter: `parent:${account.name}`, pageSize: 200 });
                            console.log(`[GA4-DISCOVERY] Found ${propsRes.data.properties?.length || 0} properties in account ${account.displayName}`);
                            
                            for (const prop of (propsRes.data.properties || [])) {
                                allProps.push({
                                    id: prop.name?.split('/')[1] || '',
                                    name: prop.displayName || '',
                                    accountEmail: token.email
                                });
                            }
                        }
                    }

                } catch (err: any) {
                    console.error(`[GA4-DISCOVERY] Error for ${token.email}:`, err.message);
                    if (err.code === 403) {
                        console.error(`[GA4-DISCOVERY] !!! CRITICAL: Analytics Admin API not enabled in Google Cloud Console or insufficient permissions.`);
                    }
                }
            }

            console.log(`[GA4-DISCOVERY] END. Total: ${allProps.length}`);
            return allProps.filter(p => p.id);
        } catch (e: any) {
            console.error("[GA4-DISCOVERY] Fatal Error:", e.message);
            throw e;
        }
    },

    // 2. Auto-discover GA4 Property ID based on Domain (Fallback or for legacy use)
    async findPropertyId(domain: string, userId: string, email?: string): Promise<string | null> {
        try {
            const props = await this.findProperties(userId, email);
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
    async fetchTrafficSources(propertyId: string, userId: string, startDate: string, endDate: string, email?: string) {
        const auth = await this.getAuthClient(userId, email);
        const { google } = await import('googleapis');
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
    async fetchPagesBySource(propertyId: string, userId: string, sources: string[], startDate: string, endDate: string, email?: string) {
        const auth = await this.getAuthClient(userId, email);
        const { google } = await import('googleapis');
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
    },

    // 5. EXTRACT BEHAVIOR METRICS BY URL
    async fetchFullUrlMetrics(propertyId: string, userId: string, email?: string) {
        try {
            console.log(`[GA4-SYNC] Fetching deep behavior metrics for property: ${propertyId}`);
            const auth = await this.getAuthClient(userId, email);
            const { google } = await import('googleapis');
            const analytics = google.analyticsdata({ version: 'v1beta', auth });

            const endDate = 'today';
            const startDate = '90daysAgo';

            const response = await analytics.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [
                        { name: 'fullPageUrl' }, // "URL de página completa" as requested
                        { name: 'sessionSource' }
                    ],
                    metrics: [
                        { name: 'sessions' },
                        { name: 'averageSessionDuration' },
                        { name: 'bounceRate' }
                    ],
                    limit: 20000 
                }
            } as any); // Cast to any to avoid complex TS library overload issues

            if (!response || !response.data) {
                console.warn("[GA4-SYNC] No data returned from GA4 report.");
                return [];
            }

            // Group by URL to consolidate sources for each page
            const pageMap = new Map<string, any>();

            (response.data.rows || []).forEach((row: any) => {
                const rawPath = row.dimensionValues?.[0].value || '/';
                // Normalize path to match GSC format: remove protocol, www, trailing slash and query params
                const path = rawPath
                    .toLowerCase()
                    .replace(/^https?:\/\//, '')
                    .replace(/^www\./, '')
                    .replace(/\/$/, '')
                    .split('?')[0]
                    .split('#')[0];

                const source = row.dimensionValues?.[1].value || '(direct)';
                const sessions = parseInt(row.metricValues?.[0].value || '0');
                const avgDuration = parseFloat(row.metricValues?.[1].value || '0');
                const bounceRate = parseFloat(row.metricValues?.[2].value || '0');

                if (!pageMap.has(path)) {
                    pageMap.set(path, {
                        path,
                        sessions: 0,
                        durations: [],
                        bounces: [],
                        sources: []
                    });
                }

                const entry = pageMap.get(path);
                entry.sessions += sessions;
                entry.durations.push(avgDuration * sessions); // Weighted average prep
                entry.bounces.push(bounceRate * sessions);
                entry.sources.push({ source, sessions });
            });

            // Calculate final averages and top sources
            return Array.from(pageMap.values()).map(entry => {
                const avgDuration = entry.sessions > 0 ? entry.durations.reduce((a: any, b: any) => a + b, 0) / entry.sessions : 0;
                const bounceRate = entry.sessions > 0 ? entry.bounces.reduce((a: any, b: any) => a + b, 0) / entry.sessions : 0;
                const sortedSources = entry.sources.sort((a: any, b: any) => b.sessions - a.sessions).slice(0, 5);

                return {
                    path: entry.path,
                    sessions: entry.sessions,
                    avg_session_duration: avgDuration,
                    bounce_rate: bounceRate,
                    top_sources: JSON.stringify(sortedSources)
                };
            });
        } catch (e: any) {
            console.error("[GA4-SYNC] Fatal Error:", e.message);
            return [];
        }
    }
};
