import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';
import { SegmentationService } from '@/lib/services/report/segmentationService';

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
            console.log(`[GSC-SERVICE] Searching in DB for Project ID: "${projectId}"`);

            // 1. Get Project
            const getProject = async () => {
                const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

                // Try with standard client first
                const { data: stdProject, error: stdError } = await supabase.from('projects').select('user_id, gsc_site_url, domain').eq('id', projectId).maybeSingle();
                if (stdProject) return { data: { ...stdProject, source: 'standard' }, error: null };
                if (stdError) console.warn("[GSC-SERVICE] Standard client project lookup error:", stdError.message);

                // Fallback to Admin Client if we have the key
                if (adminKey) {
                    console.log("[GSC-SERVICE] Falling back to Admin Client for project lookup...");
                    const adminClient = createClient(url, adminKey);
                    const { data: admProject, error: admError } = await adminClient.from('projects').select('user_id, gsc_site_url, domain').eq('id', projectId).maybeSingle();
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
                const { data: stdTokens } = await supabase.from('user_gsc_tokens').select('refresh_token').eq('user_id', project.user_id).maybeSingle();
                if (stdTokens) return { data: stdTokens, error: null };

                if (adminKey) {
                    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey);
                    return await adminClient.from('user_gsc_tokens').select('refresh_token').eq('user_id', project.user_id).maybeSingle();
                }
                return { data: null, error: null };
            })();

            if (tokenError || !tokens?.refresh_token) {
                console.error("[GSC-SERVICE] Token lookup failed:", tokenError);
                throw new Error("Usuario no ha conectado GSC (Token no encontrado o acceso denegado)");
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

