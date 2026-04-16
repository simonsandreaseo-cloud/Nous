import { supabase } from '@/lib/supabase';
import { GscService } from './report/gscService';
import { IntelligenceService } from './intelligence';
import { subDays, format } from 'date-fns';

export class ProjectAuditorService {
    /**
     * Audits a project by fetching GSC data for all URLs and updating the inventory.
     */
    static async auditProject(projectId: string) {
        console.log(`[ProjectAuditor] Starting audit for project: ${projectId}`);

        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

        // 1. Fetch data from GSC
        // We need jointMetrics to know which queries belong to which pages
        const { jointMetrics } = await GscService.fetchData(projectId, startDate, endDate);

        if (!jointMetrics || jointMetrics.length === 0) {
            console.warn("[ProjectAuditor] No metrics found for this project in GSC.");
            return;
        }

        // 2. Aggregate metrics PER page
        const pageAggregation: Record<string, {
            clicks: number;
            impressions: number;
            totalPosition: number;
            rowCount: number;
            queries: Record<string, { clicks: number; impressions: number; position: number; ctr: number }>;
        }> = {};

        jointMetrics.forEach((row: any) => {
            const url = row.page;
            if (!pageAggregation[url]) {
                pageAggregation[url] = {
                    clicks: 0,
                    impressions: 0,
                    totalPosition: 0,
                    rowCount: 0,
                    queries: {}
                };
            }

            const agg = pageAggregation[url];
            agg.clicks += row.clicks;
            agg.impressions += row.impressions;
            agg.totalPosition += row.position;
            agg.rowCount += 1;

            // Map queries for this page
            if (!agg.queries[row.query]) {
                agg.queries[row.query] = {
                    clicks: row.clicks,
                    impressions: row.impressions,
                    position: row.position,
                    ctr: row.ctr
                };
            } else {
                agg.queries[row.query].clicks += row.clicks;
                agg.queries[row.query].impressions += row.impressions;
                // Weighted position for the query over time would be better, but we keep it simple for now
            }
        });

        // 3. Process each page and prepare for upsert
        const upsertData = Object.entries(pageAggregation).map(([url, data]) => {
            const avgPosition = data.totalPosition / data.rowCount;
            const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;

            // Find Top Query for this URL (by clicks, then impressions)
            const topQueryEntry = Object.entries(data.queries).sort((a, b) => {
                if (b[1].clicks !== a[1].clicks) return b[1].clicks - a[1].clicks;
                return b[1].impressions - a[1].impressions;
            })[0];

            const topQuery = topQueryEntry?.[0] || 'N/A';

            // Calculate strategic score
            const strategicScore = IntelligenceService.calculateStrategicScore({
                clicks: data.clicks,
                impressions: data.impressions,
                position: avgPosition,
                ctr: ctr
            });

            return {
                project_id: projectId,
                url: url,
                clicks_30d: data.clicks,
                impressions_30d: data.impressions,
                ctr_30d: ctr,
                position_30d: avgPosition,
                top_query: topQuery,
                strategic_score: strategicScore,
                last_audited_at: new Date().toISOString()
            };
        });

        // 4. Batch upsert to Supabase (DISABLED FOR EGRESS PROTECTION)
        /*
        console.log(`[ProjectAuditor] Upserting ${upsertData.length} URLs to project_urls table...`);

        // Split into chunks of 100 to avoid request size limits
        const chunkSize = 100;
        for (let i = 0; i < upsertData.length; i += chunkSize) {
            const chunk = upsertData.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('project_urls')
                .upsert(chunk, { onConflict: 'project_id,url' });

            if (error) {
                console.error("[ProjectAuditor] Error upserting chunk:", error);
                throw error;
            }
        }
        */

        console.log(`[ProjectAuditor] Audit complete (DB Update Skipped) for project ${projectId}.`);

    }
}
