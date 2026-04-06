// import { google } from 'googleapis'; // Removed for static export
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';
import { SegmentationService } from '@/lib/services/report/segmentationService';
import { sanitizeUrl } from '@/utils/domain';

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
    } else {
        // If no date requested (aggregated), we might want to assign a dummy or inputs date
    }

    return result;
};

import { AnalyticsService } from './analyticsService';

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

                // Try with standard client first
                const { data: stdProject, error: stdError } = await supabase.from('projects').select('user_id, gsc_site_url, domain, gsc_account_email').eq('id', projectId).maybeSingle();
                if (stdProject) return { data: { ...stdProject, source: 'standard' }, error: null };
                if (stdError) console.warn("[GSC-SERVICE] Standard client project lookup error:", stdError.message);

                // Fallback to Admin Client if we have the key
                if (adminKey) {
                    console.log("[GSC-SERVICE] Falling back to Admin Client for project lookup...");
                    const adminClient = createClient(url, adminKey);
                    const { data: admProject, error: admError } = await adminClient.from('projects').select('user_id, gsc_site_url, domain, gsc_account_email').eq('id', projectId).maybeSingle();
                    if (admProject) return { data: { ...admProject, source: 'admin' }, error: null };
                    return { data: null, error: admError }; // Return admin error if project not found with admin client
                }

                return { data: null, error: stdError }; // If no admin key, return the original standard error
            };

            const { data: project, error: projectError } = await getProject();

            if (projectError) {
                console.error("[GSC-SERVICE] Project lookup error:", projectError);
                throw new Error(`Error al buscar proyecto: ${projectError.message}`);
            }

            if (!project) {
                console.error("[GSC-SERVICE] Project not found in DB (checked standard and admin Fallback)");
                // Check if any projects exist at all to debug RLS
                const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
                console.log(`[GSC-SERVICE] RLS Check - Total projects visible to standard client: ${count || 0}`);
                throw new Error("No se encontró el proyecto. Por favor, asegúrate de que el proyecto exista y de que hayas configurado las variables de entorno correctamente en Vercel.");
            }

            console.log(`[GSC-SERVICE] Found Project: ${project.domain} (Site: ${project.gsc_site_url}). Source: ${project.source}`);

            if (!project.gsc_site_url) {
                console.error("[GSC-SERVICE] Project found but gsc_site_url is missing.");
                throw new Error("El proyecto no tiene una Propiedad de GSC vinculada. Ve a Ajustes y selecciónala.");
            }

            console.log(`[GSC-SERVICE] Found Project: ${project.domain} (Site: ${project.gsc_site_url}). Fetching tokens for User: ${project.user_id}`);

            const { data: tokens, error: tokenError } = await (async () => {
                const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const email = (project as any).gsc_account_email;

                let query = supabase.from('user_gsc_tokens').select('*').eq('user_id', project.user_id);
                if (email) query = query.eq('email', email);
                else query = query.order('updated_at', { ascending: false });

                const { data: stdTokens } = await query.maybeSingle();
                if (stdTokens) return { data: stdTokens, error: null };

                if (adminKey) {
                    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey);
                    let admQuery = adminClient.from('user_gsc_tokens').select('*').eq('user_id', project.user_id);
                    if (email) admQuery = admQuery.eq('email', email);
                    else admQuery = admQuery.order('updated_at', { ascending: false });

                    return await admQuery.maybeSingle();
                }
                return { data: null, error: null };
            })();

            if (tokenError || !tokens?.refresh_token) {
                console.error("[GSC-SERVICE] Token lookup failed:", tokenError);
                throw new Error(`Google account ${(project as any).gsc_account_email || ''} not connected or token missing.`);
            }

            if (!project.gsc_site_url) {
                throw new Error("Selecciona una Propiedad de GSC en los Ajustes del Proyecto primero.");
            }

            // 2. Auth Client
            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({ refresh_token: tokens.refresh_token });
            const searchconsole = google.searchconsole({ version: 'v1', auth });

            // 3. Define Site URL
            const siteUrl = project.gsc_site_url;

            // Helper: Pagination Loop (Simplified for debugging)
            const fetchAll = async (dimensions: string[]) => {
                const rows: any[] = [];
                let startRow = 0;
                const rowLimit = 25000;

                try {
                    while (rows.length < 100000) { // Deep scan to 100k
                        console.log(`[GSC-API] Querying ${siteUrl} for [${dimensions.join(',')}] - StartRow: ${startRow}`);
                        const res = await searchconsole.searchanalytics.query({
                            siteUrl,
                            requestBody: {
                                startDate,
                                endDate,
                                dimensions,
                                rowLimit: 25000,
                                startRow
                            }
                        });

                        if (!res.data.rows || res.data.rows.length === 0) break;
                        
                        // Log example of URL format
                        if (rows.length === 0 && res.data.rows[0]?.keys) {
                            console.log(`[GSC-API] Example row keys:`, res.data.rows[0].keys);
                        }

                        rows.push(...res.data.rows.map(r => formatRow(r, dimensions)));

                        startRow += rowLimit;
                        // If the number of rows returned is less than rowLimit, it means we've reached the end
                        if (res.data.rows.length < rowLimit) break;
                    }
                } catch (e: any) {
                    console.error(`[GSC-API] Error fetching dimensions [${dimensions.join(',')}]:`, e.message);
                    if (e.response?.data) console.error("[GSC-API] API Error Details:", JSON.stringify(e.response.data));
                    throw e; // Re-throw to be caught by the main fetchData try-catch
                }
                return rows;
            };

            console.log("[GSC-SERVICE] Starting Parallel Fetch...");
            const [pageMetrics, queryMetrics, jointMetrics] = await Promise.all([
                fetchAll(['page', 'date', 'country']),
                fetchAll(['query', 'date', 'country']),
                fetchAll(['page', 'query', 'date', 'country'])
            ]);
            console.log(`[GSC-SERVICE] Fetch Complete. Rows: Pages=${pageMetrics.length}, Queries=${queryMetrics.length}, Joint=${jointMetrics.length}`);

            return { pageMetrics, queryMetrics, jointMetrics };

        } catch (e: any) {
            console.error("[GSC-SERVICE] Fatal Error:", e);
            throw new Error(`GSC Service Error: ${e.message}`);
        }
    },

    async fetchAndStoreIndexedUrls(projectId: string): Promise<{ count: number }> {
        console.log(`[GSC-SERVICE] Fetching and storing indexed URLs for ProjectId: ${projectId}`);
        try {
            const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const client = adminKey ? createClient(url, adminKey) : supabase;

            // 1. Get Project and Token (Using admin client to bypass RLS in background sync)
            const { data: project, error: projectError } = await client.from('projects').select('user_id, gsc_site_url, gsc_account_email').eq('id', projectId).single();
            if (projectError || !project) throw new Error("Proyecto no encontrado o DB inaccesible (Backend Sync).");
            if (!project.gsc_site_url) throw new Error("El proyecto no tiene Propiedad GSC vinculada.");
            
            let tokenQuery = client.from('user_gsc_tokens').select('*').eq('user_id', project.user_id);
            if ((project as any).gsc_account_email) tokenQuery = tokenQuery.eq('email', (project as any).gsc_account_email);
            const { data: tokens } = await tokenQuery.maybeSingle();

            if (!tokens?.refresh_token) throw new Error("Google account no conectada o token perdido.");

            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
            auth.setCredentials({ refresh_token: tokens.refresh_token });
            const searchconsole = google.searchconsole({ version: 'v1', auth });

            // Fetch data over the last 90 days for trends
            const endDate = format(new Date(), 'yyyy-MM-dd');
            const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
            
            let siteUrl = project.gsc_site_url;
            if (siteUrl.startsWith('http') && !siteUrl.endsWith('/')) {
                siteUrl += '/';
            }

            console.log(`[GSC-SERVICE] DEEP-SYNC: Requesting page+query data for ${siteUrl}`);

            const rowLimit = 10000;
            const uniqueUrls = new Map<string, any>();

            // --- CALL 1: MASTER URL METRICS (dimensions: ['page']) ---
            console.log(`[GSC-SERVICE] Master Sync: Fetching aggregate URL metrics...`);
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
                    const pageUrl = sanitizeUrl(row.keys![0]);
                    const normUrl = normalizeUrl(pageUrl);
                    let derivedTitle = pageUrl.replace(/\/$/, '').split('/').pop()?.replace(/-/g, ' ') || 'Página Indexada';
                    if (derivedTitle.length < 3) derivedTitle = "Página Principal / Home";

                    uniqueUrls.set(normUrl, {
                        project_id: projectId,
                        url: pageUrl,
                        title: derivedTitle.charAt(0).toUpperCase() + derivedTitle.slice(1),
                        impressions_gsc: row.impressions || 0,
                        organic_traffic_gsc: row.clicks || 0,
                        ctr_gsc: row.ctr || 0,
                        position_gsc: row.position || 0,
                        top_query_list: [],
                        keywords_data: []
                    });
                }
                startRowPage += 5000;
                if (resPage.data.rows.length < 5000) break;
            }

            // --- CALL 2: DEEP QUERY METRICS (dimensions: ['page', 'query']) ---
            console.log(`[GSC-SERVICE] Deep Sync: Fetching Keyword-level data...`);
            let startRowDeep = 0;
            let totalMatches = 0;
            let totalMisses = 0;
            
            while (true) {
                const resDeep = await searchconsole.searchanalytics.query({
                    siteUrl,
                    requestBody: {
                        startDate, endDate,
                        dimensions: ['page', 'query'],
                        rowLimit,
                        startRow: startRowDeep
                    }
                });

                if (!resDeep.data.rows || resDeep.data.rows.length === 0) break;

                for (const row of resDeep.data.rows) {
                    const pageUrl = row.keys![0];
                    const query = row.keys![1];
                    const normUrl = normalizeUrl(pageUrl);
                    const entry = uniqueUrls.get(normUrl);
                    
                    if (entry) {
                        entry.top_query_list.push(query);
                        entry.keywords_data.push({
                            project_id: projectId,
                            keyword: query,
                            impressions: row.impressions || 0,
                            clicks: row.clicks || 0,
                            ctr: row.ctr || 0,
                            position: row.position || 0
                        });
                        totalMatches++;
                    } else {
                        totalMisses++;
                        if (totalMisses === 1) {
                            console.log(`[DEBUG-GSC] First Miss Example: URL[${pageUrl}] -> Normalized[${normUrl}]`);
                        }
                    }
                }
                startRowDeep += rowLimit;
                if (resDeep.data.rows.length < rowLimit || startRowDeep > 100000) break;
            }
            
            console.log(`[GSC-SERVICE] Mapping Finished: ${totalMatches} keywords mapped, ${totalMisses} failures.`);

            const urlsArray = Array.from(uniqueUrls.values());
            console.log(`[GSC-SERVICE] Mapping ${urlsArray.length} URLs for total sync...`);

            if (urlsArray.length > 0) {
                // 1. Prepare Pages updates
                const pagesToUpsert = urlsArray.map(u => {
                    return {
                        project_id: projectId,
                        url: u.url,
                        title: u.title,
                        impressions_gsc: u.impressions_gsc,
                        organic_traffic_gsc: u.organic_traffic_gsc,
                        last_synced_at: new Date().toISOString()
                    };
                });

                console.log(`[GSC-SERVICE] Data Preview: URL[${pagesToUpsert[0]?.url.slice(0, 30)}...] -> Impressions[${pagesToUpsert[0]?.impressions_gsc}]`);

                const chunkSize = 400;
                for (let i = 0; i < pagesToUpsert.length; i += chunkSize) {
                    await client.from('project_urls').upsert(pagesToUpsert.slice(i, i + chunkSize), { onConflict: 'project_id,url' });
                }
            }

            return { count: urlsArray.length };
        } catch (e: any) {
            console.error("[GSC-SERVICE] Fatal Error during Deep Sync:", e);
            throw new Error(`Sync Error: ${e.message}`);
        }
    },

    async findSites(userId: string, email?: string): Promise<{ url: string; permission: string; accountEmail?: string }[]> {
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        let query = supabase.from('user_gsc_tokens').select('*').eq('user_id', userId);
        if (email) query = query.eq('email', email);

        const { data: accounts } = await query;
        if (!accounts || accounts.length === 0) {
            // Fallback to admin client if possible
            if (adminKey) {
                const adminClient = createClient(supabaseUrl, adminKey);
                const { data: admAccounts } = await adminClient.from('user_gsc_tokens').select('*').eq('user_id', userId);
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
                const auth = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
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
    }
};
