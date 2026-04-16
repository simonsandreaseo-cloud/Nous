// import { google } from 'googleapis'; // Removed for static export
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';
import { SegmentationService } from '@/lib/services/report/segmentationService';
import { sanitizeUrl } from '@/utils/domain';
import { AnalyticsService } from './analyticsService';
import { I18nService } from './i18nService';

// Helper to format rows
const formatRow = (row: any, dimensions: string[]) => {
    const result: any = {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    };

    // Dynamic mapping based on requested dimensions
    dimensions.forEach((dim, index) => {
        // keys array matches dimensions order
        result[dim] = row.keys[index];
    });

    // Ensure date is standardized if present
    if (result.date) {
        result.date = new Date(result.date);
    }

    return result;
};

// Helper to normalize URLs for smarter matching (ignores protocol, www, trailing slashes, and params)
const normalizeUrl = (url: string): string => {
    if (!url) return '';
    return url
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('?')[0]
        .split('#')[0];
};

export const GscService = {
    async fetchData(projectId: string, startDate: string, endDate: string) {
        console.log(`[GSC-SERVICE] Fetching data for ProjectId: ${projectId}, Range: ${startDate} to ${endDate}`);
        try {
            console.log(`[GSC-SERVICE] Searching in DB for Project ID: "${projectId}"`);

            // 1. Get Project
            const getProject = async () => {
                const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

                const { data: stdProject, error: stdError } = await supabase.from('projects').select('user_id, gsc_site_url, domain, gsc_account_email').eq('id', projectId).maybeSingle();
                if (stdProject) return { data: { ...stdProject, source: 'standard' }, error: null };
                if (stdError) console.warn("[GSC-SERVICE] Standard client project lookup error:", stdError.message);

                if (adminKey) {
                    console.log("[GSC-SERVICE] Falling back to Admin Client for project lookup...");
                    const adminClient = createClient(url, adminKey);
                    const { data: admProject, error: admError } = await adminClient.from('projects').select('user_id, gsc_site_url, domain, gsc_account_email').eq('id', projectId).maybeSingle();
                    if (admProject) return { data: { ...admProject, source: 'admin' }, error: null };
                    return { data: null, error: admError };
                }

                return { data: null, error: stdError };
            };

            const { data: project, error: projectError } = await getProject();

            if (projectError || !project) {
                throw new Error(`Error al buscar proyecto o no encontrado.`);
            }

            // 2. Auth Client
            const { data: tokens } = await (async () => {
                const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const client = adminKey ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey) : supabase;
                return await client.from('user_google_connections').select('*').eq('user_id', project.user_id).order('updated_at', { ascending: false }).maybeSingle();
            })();

            if (!tokens?.refresh_token) {
                throw new Error(`Google account no conectada o token perdido.`);
            }

            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({ refresh_token: tokens.refresh_token });
            const searchconsole = google.searchconsole({ version: 'v1', auth });

            const siteUrl = project.gsc_site_url;
            if (!siteUrl) throw new Error("No GSC Site URL.");

            const fetchAll = async (dimensions: string[]) => {
                const rows: any[] = [];
                let startRow = 0;
                const rowLimit = 25000;

                try {
                    while (rows.length < 100000) {
                        const res = await searchconsole.searchanalytics.query({
                            siteUrl,
                            requestBody: {
                                startDate, endDate,
                                dimensions,
                                rowLimit: 25000,
                                startRow
                            }
                        });

                        if (!res.data.rows || res.data.rows.length === 0) break;
                        rows.push(...res.data.rows.map(r => formatRow(r, dimensions)));
                        startRow += rowLimit;
                        if (res.data.rows.length < rowLimit) break;
                    }
                } catch (e: any) {
                    throw e;
                }
                return rows;
            };

            const [pageMetrics, queryMetrics, jointMetrics] = await Promise.all([
                fetchAll(['page', 'date', 'country']),
                fetchAll(['query', 'date', 'country']),
                fetchAll(['page', 'query', 'date', 'country'])
            ]);

            return { pageMetrics, queryMetrics, jointMetrics };

        } catch (e: any) {
            console.error("[GSC-SERVICE] Fatal Error:", e);
            throw new Error(`GSC Service Error: ${e.message}`);
        }
    },

    async fetchAndStoreIndexedUrls(projectId: string): Promise<{ count: number }> {
        console.log(`[GSC-SERVICE] Unified Sync (GSC + GA4) for ProjectId: ${projectId}`);
        try {
            const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const client = adminKey ? createClient(url, adminKey) : supabase;

            const { data: project } = await client.from('projects').select('user_id, gsc_site_url, domain, i18n_settings').eq('id', projectId).single();
            if (!project?.gsc_site_url) throw new Error("Proyecto no configurado correctamente.");
            
            const { data: tokens } = await client.from('user_google_connections').select('*').eq('user_id', project.user_id).order('updated_at', { ascending: false }).maybeSingle();
            if (!tokens?.refresh_token) throw new Error("No hay tokens de Google.");

            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
            auth.setCredentials({ refresh_token: tokens.refresh_token });
            const searchconsole = google.searchconsole({ version: 'v1', auth });

            const endDate = format(new Date(), 'yyyy-MM-dd');
            const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
            
            let siteUrl = project.gsc_site_url;
            if (siteUrl.startsWith('http') && !siteUrl.endsWith('/')) siteUrl += '/';

            const uniqueUrls = new Map<string, any>();

            // --- STEP 1: GSC URL METRICS ---
            let startRowPage = 0;
            while (true) {
                const resPage = await searchconsole.searchanalytics.query({
                    siteUrl,
                    requestBody: {
                        startDate, endDate,
                        dimensions: ['page'],
                        rowLimit: 5000,
                        startRow: startRowPage
                    }
                });
                if (!resPage.data.rows || resPage.data.rows.length === 0) break;

                for (const row of resPage.data.rows) {
                    const rawUrl = row.keys![0];
                    const pagePath = '/' + normalizeUrl(rawUrl);
                    const normUrl = normalizeUrl(rawUrl);
                    let derivedTitle = pagePath.replace(/\/$/, '').split('/').pop()?.replace(/-/g, ' ') || 'Página Indexada';
                    if (derivedTitle.length < 3) derivedTitle = "Home";

                    const langCode = I18nService.detectLanguage(rawUrl, project.i18n_settings);

                    uniqueUrls.set(normUrl, {
                        project_id: projectId,
                        url: pagePath,
                        title: derivedTitle.charAt(0).toUpperCase() + derivedTitle.slice(1),
                        language_code: langCode,
                        impressions_gsc: row.impressions || 0,
                        organic_traffic_gsc: row.clicks || 0,
                        position_gsc: row.position || 0,
                        sessions: 0,
                        top_sources: [],
                        keywords_data: []
                    });
                }
                startRowPage += 5000;
                if (resPage.data.rows.length < 5000) break;
            }

            // --- STEP 2: GSC KEYWORD DATA (Filter < 3 impressions) ---
            let startRowDeep = 0;
            while (true) {
                const resDeep = await searchconsole.searchanalytics.query({
                    siteUrl,
                    requestBody: {
                        startDate, endDate,
                        dimensions: ['page', 'query'],
                        rowLimit: 5000,
                        startRow: startRowDeep
                    }
                });
                if (!resDeep.data.rows || resDeep.data.rows.length === 0) break;

                for (const row of resDeep.data.rows) {
                    if ((row.impressions || 0) < 3) continue;

                    const normUrl = normalizeUrl(row.keys![0]);
                    const query = row.keys![1];
                    const entry = uniqueUrls.get(normUrl);
                    
                    if (entry) {
                        entry.keywords_data.push({
                            project_id: projectId,
                            keyword: query,
                            impressions: row.impressions || 0,
                            clicks: row.clicks || 0,
                            position: row.position || 0,
                            updated_at: new Date().toISOString()
                        });
                    }
                }
                startRowDeep += 5000;
                if (resDeep.data.rows.length < 5000 || startRowDeep > 100000) break;
            }

            // --- STEP 3: GA4 DATA INTEGRATION ---
            try {
                console.log(`[GSC-SERVICE] Integrating GA4 data...`);
                const ga4Data = await AnalyticsService.fetchFullUrlMetrics(projectId, startDate, endDate);
                for (const item of ga4Data) {
                    const normUrl = normalizeUrl(item.path);
                    const entry = uniqueUrls.get(normUrl);
                    if (entry) {
                        entry.sessions = item.sessions || 0;
                        entry.top_sources = item.top_sources; // Already stringified or JSON
                        entry.avg_session_duration = item.avg_session_duration;
                        entry.bounce_rate = item.bounce_rate;
                    }
                }
            } catch (ga4Error) {
                console.error("[GSC-SERVICE] GA4 data integration failed, continuing with GSC only:", ga4Error);
            }

            // --- STEP 4: UPSERT TO DATABASE (DISABLED FOR EGRESS PROTECTION) ---
            /*
            const urlsArray = Array.from(uniqueUrls.values());
            if (urlsArray.length > 0) {
                // 1. Upsert Registry (Base URLs)
                const pagesToUpsert = urlsArray.map(u => ({
                    project_id: projectId,
                    url: u.url,
                    title: u.title,
                    language_code: u.language_code,
                    status: 'indexed',
                    last_updated_at: new Date().toISOString()
                }));

                const chunkSize = 400;
                for (let i = 0; i < pagesToUpsert.length; i += chunkSize) {
                    await client.from('project_urls').upsert(pagesToUpsert.slice(i, i + chunkSize), { onConflict: 'project_id,url' });
                }

                // 2. Fetch IDs to link metrics
                const { data: dbUrls } = await client
                    .from('project_urls')
                    .select('id, url')
                    .eq('project_id', projectId);

                const urlIdMap = new Map(dbUrls?.map(u => [u.url, u.id]));

                // 3. Prepare Metrics & Sources (Only for active URLs)
                const metricsToUpsert: any[] = [];
                const sourcesToUpsert: any[] = [];

                for (const u of urlsArray) {
                    const dbId = urlIdMap.get(u.url);
                    if (!dbId) continue;

                    // Metrics
                    if (u.organic_traffic_gsc > 0 || u.impressions_gsc > 0 || u.sessions > 0) {
                        metricsToUpsert.push({
                            url_id: dbId,
                            clicks: u.organic_traffic_gsc,
                            impressions: u.impressions_gsc,
                            position: u.position_gsc,
                            sessions: u.sessions,
                            bounce_rate: u.bounce_rate,
                            avg_session_duration: u.avg_session_duration,
                            updated_at: new Date().toISOString()
                        });
                    }

                    // Sources
                    if (u.top_sources && Array.isArray(u.top_sources)) {
                        for (const src of u.top_sources) {
                            if (src.sessions > 0) {
                                sourcesToUpsert.push({
                                    url_id: dbId,
                                    source: src.source,
                                    sessions: src.sessions,
                                    updated_at: new Date().toISOString()
                                });
                            }
                        }
                    }
                }

                // 4. Batch Upsert Metrics & Sources
                if (metricsToUpsert.length > 0) {
                    for (let i = 0; i < metricsToUpsert.length; i += chunkSize) {
                        await client.from('project_url_metrics').upsert(metricsToUpsert.slice(i, i + chunkSize), { onConflict: 'url_id' });
                    }
                }

                if (sourcesToUpsert.length > 0) {
                    for (let i = 0; i < sourcesToUpsert.length; i += chunkSize) {
                        await client.from('url_traffic_sources').upsert(sourcesToUpsert.slice(i, i + chunkSize), { onConflict: 'url_id,source' });
                    }
                }

                // 5. Update Keywords (Legacy behavior kept but with chunks)
                const keywordsToUpsert = urlsArray.flatMap(u => u.keywords_data);
                if (keywordsToUpsert.length > 0) {
                    for (let i = 0; i < keywordsToUpsert.length; i += chunkSize) {
                        await client.from('project_kws').upsert(keywordsToUpsert.slice(i, i + chunkSize), { onConflict: 'project_id,keyword' });
                    }
                }
                // 6. Queue for Scraping
                for (const u of urlsArray) {
                    const dbId = urlIdMap.get(u.url);
                    if (dbId) {
                        await I18nService.queueForScraping(dbId, projectId);
                    }
                }
            }
            */

            return { count: 0 }; // Return 0 to indicate no DB changes made


        } catch (e: any) {
            console.error("[GSC-SERVICE] Fatal Error during Unified Sync:", e);
            throw new Error(`Sync Error: ${e.message}`);
        }
    },

    async findSites(userId: string, email?: string): Promise<{ url: string; permission: string; accountEmail?: string }[]> {
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        let query = supabase.from('user_google_connections').select('*').eq('user_id', userId);
        if (email) query = query.eq('email', email);

        const { data: accounts } = await query;
        if (!accounts || accounts.length === 0) {
            if (adminKey) {
                const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey);
                const { data: admAccounts } = await adminClient.from('user_google_connections').select('*').eq('user_id', userId);
                if (admAccounts && admAccounts.length > 0) return this.listFromAccounts(admAccounts);
            }
            return [];
        }
        return this.listFromAccounts(accounts);
    },

    async listFromAccounts(accounts: any[]) {
        const allSites: { url: string; permission: string; accountEmail?: string }[] = [];
        for (const token of accounts) {
            try {
                const { google } = await import('googleapis');
                const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
                auth.setCredentials({ refresh_token: token.refresh_token });
                const sc = google.searchconsole({ version: 'v1', auth });
                const res = await sc.sites.list();

                (res.data.siteEntry || []).forEach(s => {
                    if (s.siteUrl) {
                        allSites.push({
                            url: s.siteUrl,
                            permission: s.permissionLevel || '',
                            accountEmail: token.email
                        });
                    }
                });
            } catch (err) {
                console.error(`Error fetching sites for account ${token.email}:`, err);
            }
        }
        return allSites;
    },

    async getAccessToken(supabaseClient?: any, connectionId?: string) {
        const client = supabaseClient || supabase;
        const { data: { user } } = await client.auth.getUser();
        if (!user) return null;

        let query = client.from('user_google_connections').select('access_token').eq('user_id', user.id);
        if (connectionId) query = query.eq('id', connectionId);
        else query = query.order('updated_at', { ascending: false });

        const { data } = await query.maybeSingle();
        return data?.access_token || null;
    },
};
