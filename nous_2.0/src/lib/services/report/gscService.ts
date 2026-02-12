import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

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

export const GscService = {
    async fetchData(projectId: string, startDate: string, endDate: string) {
        console.log(`[GSC-SERVICE] Fetching data for ProjectId: ${projectId}, Range: ${startDate} to ${endDate}`);
        try {
            // 1. Get Project & User Token
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('user_id, gsc_site_url, domain')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                console.error("[GSC-SERVICE] Project lookup failed:", projectError);
                throw new Error(`Project lookup failed: ${projectError?.message || 'Project not found'}`);
            }

            console.log(`[GSC-SERVICE] Found Project: ${project.domain} (Site: ${project.gsc_site_url}). Fetching tokens for User: ${project.user_id}`);

            const { data: tokens, error: tokenError } = await supabase
                .from('user_gsc_tokens')
                .select('refresh_token')
                .eq('user_id', project.user_id)
                .single();

            if (tokenError || !tokens?.refresh_token) {
                console.error("[GSC-SERVICE] Token lookup failed:", tokenError);
                throw new Error("Usuario no ha conectado GSC (Token no encontrado)");
            }

            if (!project.gsc_site_url) {
                throw new Error("Selecciona una Propiedad de GSC en los Ajustes del Proyecto primero.");
            }

            // 2. Auth Client
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
                    while (rows.length < 100000) { // Limit to 100k for now to verify stability
                        console.log(`[GSC-API] Querying ${siteUrl} for [${dimensions.join(',')}] - StartRow: ${startRow}`);
                        const res = await searchconsole.searchanalytics.query({
                            siteUrl,
                            requestBody: {
                                startDate,
                                endDate,
                                dimensions,
                                rowLimit,
                                startRow
                            }
                        });

                        if (!res.data.rows || res.data.rows.length === 0) break;
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
    }
};

export async function analyzeStructureAction(projectId: string) {
    console.log("[SERVER ACTION] analyzeStructureAction started for Project:", projectId);
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key de IA no configurada");

        // Fetch just the last 28 days to analyze structure
        const end = new Date();
        const start = subDays(end, 28);
        const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

        console.log(`[SERVER ACTION] Date Range: ${fmt(start)} to ${fmt(end)}`);

        const data = await GscService.fetchData(projectId, fmt(start), fmt(end));

        if (!data || !data.pageMetrics) {
            throw new Error("No data returned from GSC Service");
        }

        const urls = data.pageMetrics.map((r: any) => r.page).filter(Boolean);
        const uniqueUrls = Array.from(new Set(urls));
        console.log(`[SERVER ACTION] Unique URLs found: ${uniqueUrls.length}`);

        if (uniqueUrls.length === 0) {
            console.warn("[SERVER ACTION] No URLs found in GSC data.");
            console.log("[SERVER ACTION] analyzeStructureAction finished for Project:", projectId);
            return { success: true, proposedRules: [], uncategorizedSample: [], totalUrls: 0, warning: "No se encontraron URLs en el período seleccionado." };
        }

        const proposedRules = await SegmentationService.generateSegmentRules(uniqueUrls, apiKey);
        console.log(`[SERVER ACTION] Rules generated: ${proposedRules?.length || 0}`);

        // Also provide a sample of uncategorized URLs for the UI
        // We'll define 'uncategorized' as not matching any proposed rule
        const categorize = (url: string) => proposedRules.some(r => new RegExp(r.regex).test(url));
        const uncategorized = uniqueUrls.filter(u => !categorize(u)).slice(0, 50);

        console.log("[SERVER ACTION] analyzeStructureAction finished for Project:", projectId);
        return { success: true, proposedRules, uncategorizedSample: uncategorized, totalUrls: uniqueUrls.length };

    } catch (e: any) {
        console.error("Structure Analysis Error:", e);
        // Important: Return a serializable object, do not throw if possible to avoid 500 crash in UI
        console.log("[SERVER ACTION] analyzeStructureAction finished with error for Project:", projectId);
        return { success: false, error: e.message || "Unknown Server Error" };
    }
}
