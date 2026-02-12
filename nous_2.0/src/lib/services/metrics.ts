import { supabase } from '@/lib/supabase';
import { GscDailyMetric, MetricSummary } from '@/types/metrics';

export const MetricsService = {
    /**
     * Fetch daily metrics for a project within a date range.
     */
    async getDailyMetrics(projectId: string, startDate?: string, endDate?: string): Promise<GscDailyMetric[]> {
        let query = supabase
            .from('gsc_daily_metrics')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: true }); // Important for charts

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching metrics:', error);
            return [];
        }

        return (data as GscDailyMetric[]) || [];
    },

    /**
     * Calculate summary stats (Total Clicks, Avg CTR, etc.)
     */
    calculateSummary(metrics: GscDailyMetric[]): MetricSummary {
        if (!metrics.length) return { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };

        const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
        const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);

        // Weighted CTR/Position or simple average? GSC usually weights. 
        // For simplicity, we'll do weighted average based on impressions/clicks where appropriate
        // But CTR is clicks/impressions * 100
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        // Position is harder to weight without knowing per-query breakdown perfectly, 
        // but usually weighted by impressions is a good approximation for "Average Position".
        const totalWeightedPos = metrics.reduce((sum, m) => sum + (m.position * m.impressions), 0);
        const avgPosition = totalImpressions > 0 ? totalWeightedPos / totalImpressions : 0;

        return {
            totalClicks,
            totalImpressions,
            avgCtr: parseFloat(avgCtr.toFixed(2)),
            avgPosition: parseFloat(avgPosition.toFixed(1))
        };
    }
};
