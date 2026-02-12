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
        // 1. Get Project & User Token
        // We join with user_gsc_tokens to get the fresher credential
        const { data: project, error } = await supabase
            .from('projects')
            .select(`
                user_id,
                gsc_site_url,
                domain
            `)
            .eq('id', projectId)
            .single();

        if (error || !project) throw new Error("Proyecto no encontrado");

        // Fetch token separately because Supabase join synthax might be complex with non-FK or if not set up
        const { data: tokens } = await supabase
            .from('user_gsc_tokens')
            .select('refresh_token')
            .eq('user_id', project.user_id)
            .single();

        if (!tokens?.refresh_token) throw new Error("Usuario no ha conectado GSC (Token no encontrado)");

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

        // Helper: Pagination Loop
        const fetchAll = async (dimensions: string[]) => {
            const rows: any[] = [];
            let startRow = 0;
            const rowLimit = 25000;

            try {
                // Cap at 250k rows to avoid timeouts/limits for now
                while (rows.length < 250000) {
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

                    const formatted = res.data.rows.map(r => formatRow(r, dimensions));
                    rows.push(...formatted);

                    startRow += rowLimit;
                }
            } catch (e: any) {
                console.error(`Error fetching dimensions [${dimensions.join(',')}]:`, e.message);
                // If partial data, return what we have? Or throw?
                // Often error 403 or quota.
                throw e;
            }
            return rows;
        };

        // 3. Parallel Execution for Separation of Concerns (Data Fidelity)
        // We fetch separately to get accurate totals for Pages and Queries individually
        // plus the joint data for relational analysis.

        const [pageMetrics, queryMetrics, jointMetrics] = await Promise.all([
            // A. Accurate URL Metrics (aggregated by page)
            // We include 'date' and 'country' to allow filtering in analysis if needed, 
            // but for pure totals we might aggregate later.
            // Actually, to replicate the CSV "Time" granularity, we need 'date'.
            fetchAll(['page', 'date', 'country']),

            // B. Accurate Query Metrics
            fetchAll(['query', 'date', 'country']),

            // C. Joint for Cannibalization/Opportunities
            // This dataset often has "filtered" totals (lower than real), so use mostly for ratios/relationships
            fetchAll(['page', 'query', 'date', 'country'])
        ]);

        return {
            pageMetrics,
            queryMetrics,
            jointMetrics
        };
    }
};
